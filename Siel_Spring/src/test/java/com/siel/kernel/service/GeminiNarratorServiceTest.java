package com.siel.kernel.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class GeminiNarratorServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void extractNarrativeText_concatenatesAllTextParts() throws Exception {
        String mockGeminiJson = """
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          { "text": "Once, I walked " },
                          { "text": "through green streets." }
                        ]
                      }
                    }
                  ]
                }
                """;

        JsonNode root = objectMapper.readTree(mockGeminiJson);
        GeminiNarratorService service = new GeminiNarratorService();

        String extracted = service.extractNarrativeText(root);
        assertEquals("Once, I walked through green streets.", extracted);
    }

    @Test
    void buildPrompt_noImages_usesMetadataAndReflection() {
        GeminiNarratorService service = new GeminiNarratorService();

        Map<String, Object> scores = Map.of(
                "energy", 4,
                "social", 2,
                "stress", 3,
                "adjectives", List.of("Joyful", "Quiet")
        );

        List<Map<String, String>> metadata = List.of(
                Map.of("dateTaken", "2026-01-02T10:00:00", "location", "Austin, TX"),
                Map.of("dateTaken", "2026-01-14T23:59:00", "location", "Unknown Location")
        );

        String reflection = "I kept thinking about home.";

        String prompt = service.buildPrompt(scores, reflection, metadata, false);

        assertTrue(prompt.contains("VIBE WORDS: Joyful, Quiet"));
        assertTrue(prompt.contains("ENERGY: 4/5"));
        assertTrue(prompt.contains("SOCIAL: 2/5"));
        assertTrue(prompt.contains("STRESS: 3/5"));
        assertTrue(prompt.contains("USER REFLECTION: 'I kept thinking about home.'"));
        assertFalse(prompt.contains("Use the attached photos and the metadata"));
        assertTrue(prompt.contains("Use the metadata to infer what the day felt like"));
    }

    @Test
    void buildGeminiPayload_includesImagesWithProvidedMimeTypes() {
        GeminiNarratorService service = new GeminiNarratorService();

        String prompt = "Test prompt";
        List<Map<String, String>> images = List.of(
                Map.of("mimeType", "image/png", "base64", "BASE64PNG"),
                Map.of("mimeType", "image/webp", "base64", "BASE64WEBP")
        );

        Map<String, Object> payload = service.buildGeminiPayload(prompt, images);
        assertNotNull(payload);

        Object contentsObj = payload.get("contents");
        assertTrue(contentsObj instanceof List);
        List<?> contents = (List<?>) contentsObj;
        assertEquals(1, contents.size());

        Map<?, ?> content0 = (Map<?, ?>) contents.get(0);
        List<?> parts = (List<?>) content0.get("parts");
        assertEquals(1 + images.size(), parts.size());

        // Text part
        Map<?, ?> textPart = (Map<?, ?>) parts.get(0);
        assertEquals(prompt, textPart.get("text"));

        // Inline image parts
        Map<?, ?> imagePart1 = (Map<?, ?>) parts.get(1);
        Map<?, ?> inlineData1 = (Map<?, ?>) imagePart1.get("inline_data");
        assertEquals("image/png", inlineData1.get("mime_type"));
        assertEquals("BASE64PNG", inlineData1.get("data"));

        Map<?, ?> imagePart2 = (Map<?, ?>) parts.get(2);
        Map<?, ?> inlineData2 = (Map<?, ?>) imagePart2.get("inline_data");
        assertEquals("image/webp", inlineData2.get("mime_type"));
        assertEquals("BASE64WEBP", inlineData2.get("data"));
    }

    @Test
    void shouldExpandDraft_flagsShortOrIncompleteText() {
        GeminiNarratorService service = new GeminiNarratorService();

        // Too short
        assertTrue(service.shouldExpandDraft("Very short draft."));
        
        // No punctuation at the end
        assertTrue(service.shouldExpandDraft("This is a long enough draft but it ends without punctuation and just keeps going on and on for a while until it hits the word limit or something like that which is not good"));
        
        // No punctuation with trailing spaces
        assertTrue(service.shouldExpandDraft("This ends in a cliffhanger   "));

        StringBuilder longCompleteBuilder = new StringBuilder();
        for (int i = 0; i < 180; i++) {
            longCompleteBuilder.append("word").append(i).append(" ");
        }
        longCompleteBuilder.append(".");
        
        // Correct case
        assertFalse(service.shouldExpandDraft(longCompleteBuilder.toString()));
        
        // Correct case with markdown artifacts
        assertFalse(service.shouldExpandDraft(longCompleteBuilder.toString() + "\n\n---"));
        assertFalse(service.shouldExpandDraft(longCompleteBuilder.toString() + "   "));
    }

    @Test
    void buildFallbackNarrativeTemplate_includesReflectionScoresAndMetadata() {
        GeminiNarratorService service = new GeminiNarratorService();

        Map<String, Object> scores = Map.of(
                "energy", 5,
                "social", 4,
                "stress", 2
        );
        List<Map<String, String>> metadata = List.of(
                Map.of("dateTaken", "2026-05-01", "location", "Seattle"),
                Map.of("dateTaken", "2026-05-03", "location", "Portland")
        );

        String fallback = service.buildFallbackNarrativeTemplate(
                scores,
                "I noticed I stayed calm under pressure.",
                metadata
        );

        assertTrue(fallback.startsWith("[mock-template]"));
        assertTrue(fallback.contains("energy 5/5"));
        assertTrue(fallback.contains("social 4/5"));
        assertTrue(fallback.contains("stress 2/5"));
        assertTrue(fallback.contains("on 2026-05-01 at Seattle"));
        assertTrue(fallback.contains("on 2026-05-03 at Portland"));
        assertTrue(fallback.contains("I noticed I stayed calm under pressure."));
    }
}

