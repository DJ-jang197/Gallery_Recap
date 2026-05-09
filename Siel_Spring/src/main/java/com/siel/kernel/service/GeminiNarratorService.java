package com.siel.kernel.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import java.net.URL;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Service responsible for orchestrating the Gemini API.
 * Synthesizes the objective EXIF metadata with the subjective Survey State 
 * into a cohesive, ghostwritten narrative.
 */
@Service
public class GeminiNarratorService {
    private static final String FALLBACK_NOTICE_PREFIX = "[mock-template]";

    private static final class GeminiCallResult {
        final String text;
        final String finishReason;

        GeminiCallResult(String text, String finishReason) {
            this.text = text;
            this.finishReason = finishReason == null ? "" : finishReason;
        }
    }
    
    private static final Map<String, String> BIBLE_VERSES = Map.of(
        "Peaceful", "\"He leads me beside still waters. He restores my soul.\" - Psalm 23:2-3",
        "Hectic", "\"Come to me, all you who are weary and burdened, and I will give you rest.\" - Matthew 11:28",
        "Magical", "\"He has made everything beautiful in its time.\" - Ecclesiastes 3:11",
        "Productive", "\"Commit to the Lord whatever you do, and he will establish your plans.\" - Proverbs 16:3",
        "Adventurous", "\"Have I not commanded you? Be strong and courageous.\" - Joshua 1:9",
        "Joyful", "\"The Lord has done great things for us, and we are filled with joy.\" - Psalm 126:3",
        "Hopeful", "\"For I know the plans I have for you, plans to prosper you and not to harm you.\" - Jeremiah 29:11",
        "Stressed", "\"Cast all your anxiety on him because he cares for you.\" - 1 Peter 5:7",
        "Inspired", "\"I can do all this through him who gives me strength.\" - Philippians 4:13",
        "Quiet", "\"Be still, and know that I am God.\" - Psalm 46:10"
    );

    @Value("${gemini.api.key:YOUR_API_KEY_HERE}")
    private String apiKey;

    @Value("${gemini.api.url:}")
    private String apiUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostConstruct
    void logGeminiMode() {
        String cleanKey = apiKey == null ? "" : apiKey.trim();
        if (cleanKey.isEmpty() || "YOUR_API_KEY_HERE".equals(cleanKey)) {
            System.err.println("[Siel Kernel] Gemini API key is missing. Live journal generation is disabled until GEMINI_API_KEY is set.");
        } else {
            System.out.println("[Siel Kernel] Gemini live mode enabled.");
        }
    }

    /**
     * Synthesizes the narrative using Gemini.
     */
    public String synthesizeNarrative(
            Map<String, Object> scores,
            String reflection,
            List<Map<String, String>> metadata,
            List<Map<String, String>> images
    ) {
        String cleanKey = apiKey == null ? "" : apiKey.trim();
        
        System.out.println("[Siel Kernel] Attempting Multimodal Synthesis...");

        if (cleanKey.isEmpty() || "YOUR_API_KEY_HERE".equals(cleanKey)) {
            return "Gemini API key is missing. Set GEMINI_API_KEY and restart the Spring server.";
        }

        try {
            boolean includeImages = images != null && !images.isEmpty();
            String prompt = buildPrompt(scores, reflection, metadata, includeImages);
            System.out.println("[Siel Kernel] Sending Visual Prompt to Gemini...");
            GeminiCallResult first = callGemini(prompt, cleanKey, images);
            String narrative = first.text;
            if (narrative != null && !narrative.startsWith("Error:") && shouldRunExpansionPass(first.finishReason, narrative)) {
                try {
                    GeminiCallResult expanded = callGemini(
                            buildExpansionPrompt(narrative),
                            cleanKey,
                            List.of()
                    );
                    if (expanded.text != null && !expanded.text.isBlank() && !expanded.text.startsWith("Error:")) {
                        narrative = expanded.text.trim();
                    }
                } catch (Exception expandEx) {
                    System.err.println("[Siel Kernel] Expansion pass failed (using primary draft): " + expandEx.getMessage());
                }
            }

            // Append dynamic bible verse if requested
            if (scores != null && Boolean.TRUE.equals(scores.get("wantsVerse"))) {
                narrative += "\n\n---\n" + selectVerse(scores);
            }

            return narrative;
        } catch (Exception e) {
            System.err.println("[Siel Kernel] ERROR calling Gemini: " + e.getMessage());
            // Quota/rate-limit fallback: return a reusable narrative scaffold.
            if (isQuotaOrRateLimitError(e)) {
                return buildFallbackNarrativeTemplate(scores, reflection, metadata);
            }
            // Avoid leaking details to callers.
            return "Error calling AI. Please try again in a moment.";
        }
    }

    String buildPrompt(
            Map<String, Object> scores,
            String reflection,
            List<Map<String, String>> metadata,
            boolean includeImages
    ) {
        String metadataSummary = metadata == null || metadata.isEmpty() 
            ? "" 
            : "PHOTO METADATA:\n" + metadata.stream()
                .filter(m -> {
                    String loc = m.get("location");
                    return loc != null && !loc.equalsIgnoreCase("Unknown") && !loc.isBlank();
                })
                .map(m -> String.format("- %s at %s", m.get("dateTaken"), m.get("location")))
                .collect(Collectors.joining("\n"));

        Object adjObj = scores == null ? null : scores.get("adjectives");
        String adjList = (adjObj instanceof List)
                ? String.join(", ", (List<String>) adjObj)
                : "None";

        int energy = getInt(scores, "energy", 3);
        int social = getInt(scores, "social", 3);
        int stress = getInt(scores, "stress", 3);

        String photoLine = includeImages
                ? "DEEP VISUAL ANALYSIS: Look closely at the attached photos. Describe the scenery (e.g., lakes, mountains, city streets), the atmosphere, and any details that stand out. Don't just list them; tell the story of what you see."
                : "Use the metadata to infer what the period felt like, then fuse it with the reflection.";

        return String.format(
            "You are Siel, a personal journal assistant. Write a CASUAL and SIMPLE first-person journal entry. " +
            "Use everyday, friendly language—avoid sophisticated or overly formal words. " +
            "%s " +
            "VIBE: %s. ENERGY: %s/5. SOCIAL: %s/5. STRESS: %s/5.\n" +
            "%s\n\n" +
            "Requirements:\n" +
            "- Write in a conversational, relaxed tone, like I'm talking to a friend.\n" +
            "- Write exactly 3-5 full paragraphs in chronological order, targeting 300-400 words.\n" +
            "- Write in the FIRST PERSON ONLY ('I', 'me', 'my').\n" +
            "- DO NOT use 'today', 'yesterday', or 'tomorrow'. Refer to the general period instead.\n" +
            "- BE VISUAL: If there are photos, mention specific elements (like a lake, a sunset, or a busy cafe) to make it feel real.\n" +
            "- Mention 2-3 concrete metadata moments naturally if they have locations.\n" +
            "- NO analogies or poetic metaphors. Keep it grounded.\n" +
            "- CRITICAL: Ensure the entry is a COMPLETE story. Do not cut off mid-sentence. End the final paragraph with a definitive closing thought.\n" +
            "USER REFLECTION: '%s'\n" +
            "Write the casual journal entry now:",
            photoLine,
            adjList,
            energy,
            social,
            stress,
            metadataSummary,
            reflection
        );
    }

    Map<String, Object> buildGeminiPayload(String prompt, List<Map<String, String>> images) {
        // Gemini expects: contents[{parts:[{text}, {inline_data:{mime_type,data}}]}]
        Map<String, Object> textPart = Map.of("text", prompt);
        List<Object> parts = new ArrayList<>();
        parts.add(textPart);

        if (images != null) {
            for (Map<String, String> img : images) {
                if (img == null) continue;
                String base64 = img.get("base64");
                if (base64 == null || base64.isBlank()) continue;
                String mime = img.get("mimeType");
                if (mime == null || mime.isBlank()) mime = "image/jpeg";

                Map<String, Object> inlineData = new HashMap<>();
                inlineData.put("mime_type", mime);
                inlineData.put("data", base64);

                Map<String, Object> inlinePart = new HashMap<>();
                inlinePart.put("inline_data", inlineData);
                parts.add(inlinePart);
            }
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("contents", List.of(Map.of("parts", parts)));
        payload.put("generationConfig", Map.of(
                "temperature", 0.5,
                "topP", 0.8,
                "maxOutputTokens", 2048
        ));
        return payload;
    }

    private GeminiCallResult callGemini(String prompt, String cleanKey, List<Map<String, String>> images) throws Exception {
        if (apiUrl == null || apiUrl.isBlank()) {
            throw new IllegalStateException("Gemini API URL is not configured.");
        }
        Map<String, Object> payload = buildGeminiPayload(prompt, images);
        String fullUrl = apiUrl + "?key=" + cleanKey;
        URL url = new URL(fullUrl);
        String json = objectMapper.writeValueAsString(payload);

        int maxRetries = 3;
        int delayMs = 3000; // Start with 3 second delay

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            conn.setRequestProperty("Accept", "application/json");
            conn.setConnectTimeout(30000);
            conn.setReadTimeout(120000);
            conn.setDoOutput(true);

            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = json.getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }

            int responseCode = conn.getResponseCode();

            java.io.InputStream stream = responseCode >= 200 && responseCode < 300
                    ? conn.getInputStream()
                    : conn.getErrorStream();

            String response;
            try (java.util.Scanner scanner = new java.util.Scanner(stream, StandardCharsets.UTF_8)) {
                scanner.useDelimiter("\\A");
                response = scanner.hasNext() ? scanner.next() : "";
            }

            if ((responseCode == 429 || responseCode >= 500) && attempt < maxRetries) {
                System.out.println("[Siel Kernel] API returned " + responseCode + ". Retrying in " + delayMs + "ms... (Attempt " + attempt + " of " + maxRetries + ")");
                Thread.sleep(delayMs);
                delayMs *= 2; // Exponential backoff
                continue;
            }

            if (responseCode < 200 || responseCode >= 300) {
                throw new Exception("HTTP " + responseCode + " - " + response);
            }

            JsonNode root = objectMapper.readTree(response);
            String narrativeText = extractNarrativeText(root);
            String finishReason = extractFinishReason(root);
            if (narrativeText == null || narrativeText.isBlank()) {
                return new GeminiCallResult("Error: AI response malformed.", finishReason);
            }
            return new GeminiCallResult(narrativeText.trim(), finishReason);
        }
        throw new Exception("Max retries exceeded");
    }

    String extractFinishReason(JsonNode root) {
        JsonNode candidates = root.path("candidates");
        if (!candidates.isArray() || candidates.isEmpty()) {
            return "";
        }
        JsonNode first = candidates.get(0);
        JsonNode fr = first.get("finishReason");
        if (fr != null && !fr.isNull()) {
            return fr.asText("");
        }
        return "";
    }

    private boolean isQuotaOrRateLimitError(Exception e) {
        String message = e.getMessage();
        if (message == null) return false;
        String lower = message.toLowerCase();
        return lower.contains("http 429")
                || lower.contains("quota")
                || lower.contains("rate limit")
                || lower.contains("resource exhausted");
    }

    /**
     * Generates a deterministic mock narrative template used when Gemini quota is exhausted.
     * This keeps user flow functional while clearly indicating fallback mode.
     */
    String buildFallbackNarrativeTemplate(
            Map<String, Object> scores,
            String reflection,
            List<Map<String, String>> metadata
    ) {
        int energy = getInt(scores, "energy", 3);
        int social = getInt(scores, "social", 3);
        int stress = getInt(scores, "stress", 3);
        String safeReflection = (reflection == null || reflection.isBlank())
                ? "I focused on documenting meaningful moments from the period."
                : reflection.trim();

        String firstMoment = "a meaningful moment in my routine";
        String secondMoment = "a quieter reset point in my week";
        if (metadata != null && !metadata.isEmpty()) {
            Map<String, String> first = metadata.get(0);
            firstMoment = formatMetadataMoment(first);
            if (metadata.size() > 1) {
                secondMoment = formatMetadataMoment(metadata.get(1));
            }
        }

        return FALLBACK_NOTICE_PREFIX + "\n\n"
                + "During this period, I moved through my days with a steady rhythm and paid close attention to what mattered most. "
                + "I noticed how my energy shifted between focused stretches and slower pauses, and I tried to stay intentional with how I responded to each situation.\n\n"
                + "One moment that stood out was " + firstMoment + ". Another memorable point was " + secondMoment + ". "
                + "These moments helped me see patterns in how I handled pressure, connection, and recovery across the period.\n\n"
                + "My check-in signals were energy " + energy + "/5, social " + social + "/5, and stress " + stress + "/5. "
                + "When I felt stretched, I simplified what I could control and returned to clear next steps instead of overcomplicating things.\n\n"
                + "My reflection for this period is: \"" + safeReflection + "\". "
                + "Going into the next cycle, I want to keep what worked, reduce unnecessary friction, and stay consistent with the habits that helped me feel grounded.";
    }

    private String formatMetadataMoment(Map<String, String> metadataItem) {
        if (metadataItem == null) return "a meaningful moment in my routine";
        String date = metadataItem.getOrDefault("dateTaken", "an unspecified date");
        String location = metadataItem.getOrDefault("location", "an unspecified location");
        return "on " + date + " at " + location;
    }

    String extractNarrativeText(JsonNode root) {
        JsonNode candidates = root.path("candidates");
        if (!candidates.isArray() || candidates.isEmpty()) return null;

        JsonNode first = candidates.get(0);
        JsonNode parts = first.path("content").path("parts");
        if (!parts.isArray()) return null;

        StringBuilder sb = new StringBuilder();
        for (JsonNode part : parts) {
            JsonNode textNode = part.get("text");
            if (textNode != null && !textNode.isNull()) {
                sb.append(textNode.asText());
            }
        }

        String finishReason = first.path("finishReason").asText("");
        if (!"STOP".equalsIgnoreCase(finishReason) && !finishReason.isBlank()) {
            System.err.println("[Siel Kernel] WARNING: Gemini finishReason was " + finishReason);
        }

        return sb.length() == 0 ? null : sb.toString();
    }

    private int getInt(Map<String, Object> scores, String key, int defaultValue) {
        if (scores == null) return defaultValue;
        Object value = scores.get(key);
        if (value instanceof Number) return ((Number) value).intValue();
        return defaultValue;
    }

    boolean shouldExpandDraft(String text) {
        if (text == null) return true;
        String trimmed = text.trim();
        if (trimmed.isEmpty()) return true;
        
        // Remove common markdown artifacts that might follow punctuation
        String cleaned = trimmed.replaceAll("[\\s*\\-`]+$", "");
        
        int words = cleaned.split("\\s+").length;
        
        // If it's very short, it definitely needs expansion.
        if (words < 170) return true;
        
        // Check if it ends with a proper sentence terminator.
        // Matches sentences ending with ., !, or ? possibly followed by a closing quote or parenthesis.
        boolean endsProperly = cleaned.matches("(?s).*[.!?][\"')\\]]?$");
        return !endsProperly;
    }

    String buildExpansionPrompt(String draft) {
        return "Rewrite and expand the following first-person draft into a complete reflection log entry. " +
                "Use casual, friendly everyday language—like talking to a friend—not formal or literary prose. " +
                "Keep it realistic, chronological, and grounded in concrete observations. " +
                "No analogies, symbolism, or poetic phrasing. " +
                "Target 240-360 words across 3-5 paragraphs. " +
                "CRITICAL: You MUST finish the last sentence. Do not stop until the thought is complete and ended with punctuation.\n\n" +
                "DRAFT:\n" + (draft == null ? "" : draft);
    }

    /**
     * Second-pass expansion when the model stopped early or produced an incomplete draft.
     */
    boolean shouldRunExpansionPass(String finishReason, String narrative) {
        if (narrative == null || narrative.isBlank()) {
            return false;
        }
        if (narrative.startsWith("Error:")) {
            return false;
        }
        String reason = finishReason == null ? "" : finishReason.toUpperCase();
        if ("MAX_TOKENS".equals(reason) || "LENGTH".equals(reason)) {
            return true;
        }
        return shouldExpandDraft(narrative);
    }

    private String selectVerse(Map<String, Object> scores) {
        Object adjObj = scores.get("adjectives");
        List<String> userAdjs = (adjObj instanceof List) ? (List<String>) adjObj : List.of();
        
        for (String adj : userAdjs) {
            if (BIBLE_VERSES.containsKey(adj)) {
                return BIBLE_VERSES.get(adj);
            }
        }
        
        // Default verse if no match
        return "\"The Lord is my shepherd; I shall not want.\" - Psalm 23:1";
    }
}
