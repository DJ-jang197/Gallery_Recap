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
            String narrative = callGemini(prompt, cleanKey, images);

            // Append dynamic bible verse if requested
            if (scores != null && Boolean.TRUE.equals(scores.get("wantsVerse"))) {
                narrative += "\n\n---\n" + selectVerse(scores);
            }

            return narrative;
        } catch (Exception e) {
            System.err.println("[Siel Kernel] ERROR calling Gemini: " + e.getMessage());
            // Avoid leaking details to callers.
            return "Error calling AI: " + e.getMessage();
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
                ? "Use the attached photos and the metadata to find the soul of the day."
                : "Use the metadata to infer what the day felt like, then fuse it with the reflection.";

        return String.format(
            "You are Siel, a privacy-first assistant. Write a first-person reflection log entry in plain language. " +
            "%s " +
            "VIBE WORDS: %s. ENERGY: %s/5. SOCIAL: %s/5. STRESS: %s/5.\n" +
            "%s\n\n" +
            "Requirements:\n" +
            "- Write what I did and how the period went, like a personal activity log and reflection.\n" +
            "- Write exactly 3-5 full paragraphs in chronological order, targeting 300-400 words.\n" +
            "- IMPORTANT: Write in the FIRST PERSON ONLY (use 'I', 'me', 'my'). Never use third person or second person.\n" +
            "- IMPORTANT: Since this covers a long period (bi-weekly/monthly), DO NOT use words like 'today', 'yesterday', 'tomorrow', or 'tonight'. Refer to specific dates or periods instead.\n" +
            "- BE DETAILED: Describe the content and atmosphere of the photos. Don't just list them; weave the visual details into the story.\n" +
            "- Mention 2-3 concrete metadata moments (dateTaken and location) naturally.\n" +
            "- Keep tone grounded and direct. No analogies, no symbolism, no poetic metaphors.\n" +
            "- No bullet points. No score callouts. End with a complete sentence.\n" +
            "- CRITICAL: You must generate a FULL, complete entry. Do not cut off mid-sentence.\n" +
            "USER REFLECTION: '%s'\n" +
            "Write the log entry now (do not mention these requirements):",
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

    private String callGemini(String prompt, String cleanKey, List<Map<String, String>> images) throws Exception {
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
            conn.setReadTimeout(60000);
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
            if (narrativeText == null || narrativeText.isBlank()) {
                return "Error: AI response malformed.";
            }
            return narrativeText.trim();
        }
        throw new Exception("Max retries exceeded");
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
                "Use plain language, keep it realistic, chronological, and grounded in concrete actions. " +
                "No analogies, symbolism, or poetic phrasing. " +
                "Target 240-360 words across 3-5 paragraphs. " +
                "CRITICAL: You MUST finish the last sentence. Do not stop until the thought is complete and ended with punctuation.\n\n" +
                "DRAFT:\n" + (draft == null ? "" : draft);
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
