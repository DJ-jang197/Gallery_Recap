package com.siel.kernel.controller;

import com.siel.kernel.service.GeminiNarratorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * REST Controller for Siel API.
 * Handles the communication between the React frontend and the Gemini AI service.
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class SielApiController {

    @Autowired
    private GeminiNarratorService narratorService;

    @Value("${siel.kernel.bearer-token:}")
    private String requiredBearerToken;

    private final ConcurrentHashMap<String, RateState> rateLimit = new ConcurrentHashMap<>();
    private final long rateWindowMs = 60_000;
    private final int rateMaxRequests = 6;

    private static class RateState {
        long windowStartMs;
        int count;

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
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        if (isRateLimited(servletRequest)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Rate limit exceeded."));
        }

        // Optional bearer-token protection (enabled only when a token is configured).
        if (requiredBearerToken != null && !requiredBearerToken.isBlank()) {
            String expected = "Bearer " + requiredBearerToken.trim();
            if (authorizationHeader == null || !authorizationHeader.equals(expected)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Unauthorized."));
            }
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
        String forwardedFor = servletRequest.getHeader("X-Forwarded-For");
        String ip = (forwardedFor != null && !forwardedFor.isBlank())
                ? forwardedFor.split(",")[0].trim()
                : servletRequest.getRemoteAddr();

        long now = System.currentTimeMillis();
        RateState current = rateLimit.get(ip);
        if (current == null || (now - current.windowStartMs) > rateWindowMs) {
            rateLimit.put(ip, new RateState(now, 1));
            return false;
        }

        if (current.count >= rateMaxRequests) {
            return true;
        }

        current.count += 1;
        return false;
    }
}
