package com.siel.kernel.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.Map;
import java.util.Scanner;
import java.util.stream.Collectors;

/**
 * Service responsible for orchestrating the Gemini 1.5 Flash API.
 * Synthesizes the objective EXIF metadata with the subjective Survey State 
 * into a cohesive, ghostwritten narrative.
 */
@Service
public class GeminiNarratorService {

    @Value("${gemini.api.key:YOUR_API_KEY_HERE}")
    private String apiKey;

    @Value("${gemini.api.url:}")
    private String apiUrl;

    /**
     * Synthesizes the narrative using real AI or mock fallback.
     */
    /**
     * Synthesizes the narrative using real AI (Vision + Text) or mock fallback.
     */
    public String synthesizeNarrative(Map<String, Object> scores, String reflection, List<Map<String, String>> metadata, List<String> images) {
        String cleanKey = apiKey.trim();
        
        System.out.println("[Siel Kernel] Attempting Multimodal Synthesis...");

        if ("YOUR_API_KEY_HERE".equals(cleanKey) || cleanKey.isEmpty()) {
            return generateMockResponse();
        }

        try {
            String prompt = buildPrompt(scores, reflection, metadata);
            System.out.println("[Siel Kernel] Sending Visual Prompt to Gemini...");
            return callGemini(prompt, cleanKey, images);
        } catch (Exception e) {
            System.err.println("[Siel Kernel] ERROR calling Gemini: " + e.getMessage());
            return "Error calling AI: " + e.getMessage();
        }
    }

    private String buildPrompt(Map<String, Object> scores, String reflection, List<Map<String, String>> metadata) {
        String metadataSummary = metadata == null || metadata.isEmpty() 
            ? "" 
            : "PHOTO METADATA:\n" + metadata.stream()
                .map(m -> String.format("- %s at %s", m.get("dateTaken"), m.get("location")))
                .collect(Collectors.joining("\n"));

        Object adjObj = scores.get("adjectives");
        String adjList = adjObj instanceof List ? String.join(", ", (List<String>) adjObj) : "None";

        return String.format(
            "You are Siel, a privacy-first biographer. Write a first-person poetic journal entry. " +
            "Look at the attached photos and the metadata to find the soul of the day. " +
            "VIBE WORDS: %s. ENERGY: %s/5. SOCIAL: %s/5. STRESS: %s/5. " +
            "%s\n" +
            "USER REFLECTION: '%s'\n" +
            "Write the entry now (be evocative, do not mention scores):",
            adjList,
            scores.getOrDefault("energy", 3),
            scores.getOrDefault("social", 3),
            scores.getOrDefault("stress", 3),
            metadataSummary,
            reflection
        );
    }

    private String callGemini(String prompt, String cleanKey, List<String> images) throws Exception {
        String fullUrl = apiUrl + "?key=" + cleanKey;
        URL url = new URL(fullUrl);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setConnectTimeout(60000);
        conn.setReadTimeout(60000);
        conn.setDoOutput(true);

        // Construct Multimodal JSON manually to avoid heavy dependencies
        StringBuilder json = new StringBuilder();
        json.append("{\"contents\": [{\"parts\": [");
        
        // 1. Add Text Part
        String escapedPrompt = prompt.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
        json.append("{\"text\": \"").append(escapedPrompt).append("\"}");
        
        // 2. Add Image Parts
        if (images != null) {
            for (String base64 : images) {
                json.append(", {\"inline_data\": {\"mime_type\": \"image/jpeg\", \"data\": \"")
                    .append(base64).append("\"}}");
            }
        }
        
        json.append("]}]}");

        try (OutputStream os = conn.getOutputStream()) {
            byte[] input = json.toString().getBytes("utf-8");
            os.write(input, 0, input.length);
        }

        if (conn.getResponseCode() != 200) {
             try (Scanner scanner = new Scanner(conn.getErrorStream(), "utf-8")) {
                scanner.useDelimiter("\\A");
                String error = scanner.hasNext() ? scanner.next() : "";
                throw new Exception("HTTP " + conn.getResponseCode() + ": " + error);
             }
        }

        try (Scanner scanner = new Scanner(conn.getInputStream(), "utf-8")) {
            scanner.useDelimiter("\\A");
            String response = scanner.hasNext() ? scanner.next() : "";
            
            // Extract narrative from JSON
            String searchKey = "\"text\": \"";
            int startIdx = response.indexOf(searchKey);
            if (startIdx == -1) return "Error: AI response malformed.";
            
            startIdx += searchKey.length();
            StringBuilder sb = new StringBuilder();
            boolean escaped = false;
            for (int i = startIdx; i < response.length(); i++) {
                char c = response.charAt(i);
                if (escaped) {
                    if (c == 'n') sb.append('\n');
                    else if (c == '\"') sb.append('\"');
                    else if (c == '\\') sb.append('\\');
                    else sb.append('\\').append(c);
                    escaped = false;
                } else if (c == '\\') {
                    escaped = true;
                } else if (c == '\"') {
                    break;
                } else {
                    sb.append(c);
                }
            }
            return sb.toString().trim();
        }
    }

    private String generateMockResponse() {
        return "[MOCK TEMPLATE] The past fortnight has been a whirlwind of brief, intense moments. " +
               "I've felt a vibrant surge of energy, pushing me through high-pressure situations, " +
               "yet I found solace in quiet, meaningful connections with close friends.";
    }
}
