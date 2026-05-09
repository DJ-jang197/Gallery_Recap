package com.siel.kernel.controller;

import com.siel.kernel.service.GeminiNarratorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * REST Controller for Siel API.
 * Handles the communication between the React frontend and the Gemini AI service.
 */
@RestController
@RequestMapping("/api")
public class SielApiController {

    @Autowired
    private GeminiNarratorService narratorService;

    private final ConcurrentHashMap<String, RateState> rateLimit = new ConcurrentHashMap<>();
    private final long rateWindowMs = 60_000;
    private final int rateMaxRequests = 6;
    private final int maxRateLimitEntries = 10000;
    private final ScheduledExecutorService cleanupExecutor = Executors.newSingleThreadScheduledExecutor();

    public SielApiController() {
        // Periodic cleanup to prevent memory exhaustion from stale IP entries.
        cleanupExecutor.scheduleAtFixedRate(() -> {
            long now = System.currentTimeMillis();
            rateLimit.entrySet().removeIf(entry -> (now - entry.getValue().windowStartMs) > rateWindowMs * 10);
        }, 1, 1, TimeUnit.HOURS);
    }

    private static class RateState {
        long windowStartMs;
        int count;

        // Tracks request count within the active per-IP rate-limit window.
        RateState(long windowStartMs, int count) {
            this.windowStartMs = windowStartMs;
            this.count = count;
        }
    }

    /**
     * Synthesis endpoint.
     * Receives metadata and survey scores, returns the AI-generated narrative.
     */
    @PostMapping("/synthesize")
    public ResponseEntity<Map<String, String>> synthesize(
            @RequestBody Map<String, Object> request,
            HttpServletRequest servletRequest,
            @AuthenticationPrincipal Jwt jwt
    ) {
        if (isRateLimited(servletRequest)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Rate Limit Exceeded."));
        }

        // AUDIT: Every request is now tied to a cryptographically verified User ID.
        // This prevents IDOR by ensuring we know exactly who is calling the kernel.
        String userId = jwt.getSubject();
        String userEmail = jwt.getClaimAsString("email");
        System.out.println("[AUDIT] Synthesis initiated by User: " + userId + " (" + userEmail + ") from IP: " + servletRequest.getRemoteAddr());

        // Input Validation & Sanitization
        try {
            validateSynthesisRequest(request);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }

        // Extract data from request
        Map<String, Object> scores = (Map<String, Object>) request.get("scores");
        String reflection = (String) request.get("reflection");
        List<Map<String, String>> metadata = (List<Map<String, String>>) request.get("metadata");
        List<Map<String, String>> images = (List<Map<String, String>>) request.get("images");
        
        // Call the service with metadata and images
        String narrative = narratorService.synthesizeNarrative(scores, reflection, metadata, images);
        
        return ResponseEntity.ok(Map.of("narrative", narrative));
    }

    private boolean isRateLimited(HttpServletRequest servletRequest) {
        // SECURITY: Do not trust X-Forwarded-For blindly from the internet.
        // In production, this should only be trusted if coming from a known reverse proxy.
        String ip = servletRequest.getRemoteAddr();

        long now = System.currentTimeMillis();
        
        // Prevent map explosion from unique IPs
        if (rateLimit.size() >= maxRateLimitEntries && !rateLimit.containsKey(ip)) {
            return true; 
        }

        RateState current = rateLimit.compute(ip, (k, v) -> {
            if (v == null || (now - v.windowStartMs) > rateWindowMs) {
                return new RateState(now, 1);
            }
            v.count += 1;
            return v;
        });

        return current.count > rateMaxRequests;
    }

    private void validateSynthesisRequest(Map<String, Object> request) {
        // Validate scores (energy, social, stress: 1-5)
        Map<String, Object> scores = (Map<String, Object>) request.get("scores");
        if (scores != null) {
            checkRange(scores.get("energy"), 1, 5, "energy");
            checkRange(scores.get("social"), 1, 5, "social");
            checkRange(scores.get("stress"), 1, 5, "stress");
            
            Object adjectives = scores.get("adjectives");
            if (adjectives instanceof List) {
                List<?> adjList = (List<?>) adjectives;
                if (adjList.size() > 20) throw new IllegalArgumentException("Too many adjectives.");
                for (Object adj : adjList) {
                    if (!(adj instanceof String) || ((String) adj).length() > 50) {
                        throw new IllegalArgumentException("Invalid adjective format.");
                    }
                }
            }
        }

        // Validate reflection length
        String reflection = (String) request.get("reflection");
        if (reflection != null && reflection.length() > 5000) {
            throw new IllegalArgumentException("Reflection text too long.");
        }

        // Validate images (limit count and sanity check base64)
        List<?> images = (List<?>) request.get("images");
        if (images != null) {
            if (images.size() > 10) throw new IllegalArgumentException("Too many images (max 10).");
            for (Object imgObj : images) {
                if (imgObj instanceof Map) {
                    Map<?, ?> img = (Map<?, ?>) imgObj;
                    String base64 = (String) img.get("base64");
                    if (base64 != null && base64.length() > 7_000_000) { // ~5MB raw
                        throw new IllegalArgumentException("Image data too large.");
                    }
                }
            }
        }

        // Validate metadata
        List<?> metadata = (List<?>) request.get("metadata");
        if (metadata != null && metadata.size() > 100) {
            throw new IllegalArgumentException("Too many metadata entries.");
        }
    }

    private void checkRange(Object val, int min, int max, String field) {
        if (val instanceof Number) {
            int i = ((Number) val).intValue();
            if (i < min || i > max) {
                throw new IllegalArgumentException(field + " must be between " + min + " and " + max);
            }
        }
    }
}
