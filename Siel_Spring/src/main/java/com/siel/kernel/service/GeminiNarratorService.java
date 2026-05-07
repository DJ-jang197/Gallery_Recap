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
    public String synthesizeNarrative(Map<String, Integer> scores, String reflection, List<Map<String, String>> metadata) {
        String cleanKey = apiKey.trim();
        
        System.out.println("[Siel Kernel] Attempting synthesis. Key configured: " + (!"YOUR_API_KEY_HERE".equals(cleanKey)));

        if ("YOUR_API_KEY_HERE".equals(cleanKey) || cleanKey.isEmpty()) {
            System.out.println("[Siel Kernel] API Key missing. Falling back to Mock Template.");
            return generateMockResponse();
        }

        try {
            String prompt = buildPrompt(scores, reflection, metadata);
            System.out.println("[Siel Kernel] Sending prompt to Gemini...");
            return callGemini(prompt, cleanKey);
        } catch (Exception e) {
            System.err.println("[Siel Kernel] ERROR calling Gemini: " + e.getMessage());
            return "Error calling AI: " + e.getMessage() + ". Check your console logs.";
        }
    }

    private String buildPrompt(Map<String, Integer> scores, String reflection, List<Map<String, String>> metadata) {
        String metadataSummary = metadata == null || metadata.isEmpty() 
            ? "No specific photo metadata provided." 
            : metadata.stream()
                .map(m -> String.format("- Photo at %s taken on %s", m.get("location"), m.get("dateTaken")))
                .collect(Collectors.joining("\n"));

        return String.format(
            "System Instruction: You are Siel, a privacy-first digital biographer. " +
            "Your task is to ghostwrite a short, poetic life journal entry. " +
            "CRITICAL DIRECTIVE: Do NOT mention any numbers, scores, or the 1-5 scale. " +
            "Synthesize the Energy (%d/5), Social (%d/5), and Stress (%d/5) levels into natural prose. " +
            "OBJECTIVE PHOTO METADATA:\n%s\n\n" +
            "USER REFLECTION: '%s'\n\n" +
            "Begin journal entry (write in first person, refer to the locations/times if relevant):",
            scores.getOrDefault("energy", 3),
            scores.getOrDefault("social", 3),
            scores.getOrDefault("stress", 3),
            metadataSummary,
            reflection
        );
    }

    private String callGemini(String prompt, String cleanKey) throws Exception {
        URL url = new URL(apiUrl + "?key=" + cleanKey);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);

        // Sanitize prompt for JSON
        String escapedPrompt = prompt.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
        String jsonBody = "{\"contents\": [{\"parts\": [{\"text\": \"" + escapedPrompt + "\"}]}]}";

        try (OutputStream os = conn.getOutputStream()) {
            byte[] input = jsonBody.getBytes("utf-8");
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
            
            // Extract text from Gemini response structure
            int start = response.indexOf("\"text\": \"") + 9;
            int end = response.indexOf("\"", start);
            if (start < 9 || end < 0) return "AI returned an unexpected format. Response: " + response;
            
            return response.substring(start, end).replace("\\n", "\n").replace("\\\"", "\"");
        }
    }

    private String generateMockResponse() {
        return "[MOCK TEMPLATE] The past fortnight has been a whirlwind of brief, intense moments. " +
               "I've felt a vibrant surge of energy, pushing me through high-pressure situations, " +
               "yet I found solace in quiet, meaningful connections with close friends.";
    }
}
