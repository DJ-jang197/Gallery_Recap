package com.siel.kernel.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.OutputStream;
import java.lang.reflect.Field;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

public class GeminiNarratorLiveFlowTest {

    private HttpServer server;

    @AfterEach
    void cleanup() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void synthesizeNarrative_sendsImagesAndParsesGeminiResponse() throws Exception {
        AtomicReference<String> firstCapturedRequestBody = new AtomicReference<>("");

        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/v1beta/models/gemini-2.5-flash:generateContent", new HttpHandler() {
            @Override
            public void handle(HttpExchange exchange) throws IOException {
                byte[] req = exchange.getRequestBody().readAllBytes();
                if (firstCapturedRequestBody.get().isEmpty()) {
                    firstCapturedRequestBody.set(new String(req, StandardCharsets.UTF_8));
                }

                String response = """
                        {
                          "candidates": [
                            {
                              "content": {
                                "parts": [
                                  {"text":"I remember the warm afternoon in Austin, "},
                                  {"text":"and how calm I felt afterward."}
                                ]
                              }
                            }
                          ]
                        }
                        """;
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(200, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(bytes);
                }
            }
        });
        server.start();
        int port = server.getAddress().getPort();

        GeminiNarratorService service = new GeminiNarratorService();
        setField(service, "apiKey", "test-key");
        setField(service, "apiUrl", "http://localhost:" + port + "/v1beta/models/gemini-2.5-flash:generateContent");

        Map<String, Object> scores = Map.of(
                "energy", 4,
                "social", 2,
                "stress", 3,
                "adjectives", List.of("Peaceful", "Reflective")
        );
        List<Map<String, String>> metadata = List.of(
                Map.of("dateTaken", "2026-05-01T17:31:00", "location", "Austin, TX")
        );
        List<Map<String, String>> images = List.of(
                Map.of("mimeType", "image/png", "base64", "AAAABBBB")
        );

        String narrative = service.synthesizeNarrative(scores, "I felt grounded.", metadata, images);
        assertEquals("I remember the warm afternoon in Austin, and how calm I felt afterward.", narrative);

        String outbound = firstCapturedRequestBody.get();
        assertFalse(outbound.isBlank());

        ObjectMapper mapper = new ObjectMapper();
        JsonNode body = mapper.readTree(outbound);

        JsonNode parts = body.path("contents").get(0).path("parts");
        assertTrue(parts.isArray());
        assertEquals("image/png", parts.get(1).path("inline_data").path("mime_type").asText());
        assertEquals("AAAABBBB", parts.get(1).path("inline_data").path("data").asText());
        assertTrue(body.path("generationConfig").has("temperature"));
        assertTrue(body.path("generationConfig").has("topP"));
    }

    @Test
    void synthesizeNarrative_withoutApiKey_returnsActionableMessage() {
        GeminiNarratorService service = new GeminiNarratorService();
        String result = service.synthesizeNarrative(
                Map.of(),
                "Test reflection",
                List.of(),
                List.of()
        );

        assertTrue(result.contains("Gemini API key is missing"));
    }

    private static void setField(Object target, String fieldName, String value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}

