package com.siel.kernel.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import java.util.Scanner;

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
    public String synthesizeNarrative(Map<String, Integer> scores, String reflection) {
        if ("YOUR_API_KEY_HERE".equals(apiKey) || apiKey.isEmpty()) {
            return generateMockResponse();
        }

        try {
            String prompt = buildPrompt(scores, reflection);
            return callGemini(prompt);
        } catch (Exception e) {
            e.printStackTrace();
            return "Error: " + e.getMessage();
        }
    }

    private String buildPrompt(Map<String, Integer> scores, String reflection) {
        return String.format(
            "System Instruction: You are Siel, a privacy-first digital biographer. " +
            "Your task is to ghostwrite a short, poetic life journal entry. " +
            "CRITICAL DIRECTIVE: Do NOT mention any numbers, scores, or the 1-5 scale. " +
            "Synthesize the Energy (%d/5), Social (%d/5), and Stress (%d/5) levels into natural prose. " +
            "User Reflection: '%s'. " +
            "Begin journal entry:",
            scores.getOrDefault("energy", 3),
            scores.getOrDefault("social", 3),
            scores.getOrDefault("stress", 3),
            reflection
        );
    }

    private String callGemini(String prompt) throws Exception {
        URL url = new URL(apiUrl + "?key=" + apiKey);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);

        String jsonBody = "{\"contents\": [{\"parts\": [{\"text\": \"" + prompt.replace("\"", "\\\"") + "\"}]}]}";

        try (OutputStream os = conn.getOutputStream()) {
            byte[] input = jsonBody.getBytes("utf-8");
            os.write(input, 0, input.length);
        }

        try (Scanner scanner = new Scanner(conn.getInputStream(), "utf-8")) {
            scanner.useDelimiter("\\A");
            String response = scanner.hasNext() ? scanner.next() : "";
            // Simplified JSON parsing for result (finding "text": "...")
            int start = response.indexOf("\"text\": \"") + 9;
            int end = response.indexOf("\"", start);
            return response.substring(start, end).replace("\\n", "\n");
        }
    }

    private String generateMockResponse() {
        return "The past fortnight has been a whirlwind of brief, intense moments. " +
               "I've felt a vibrant surge of energy, pushing me through high-pressure situations, " +
               "yet I found solace in quiet, meaningful connections with close friends.";
    }
}
