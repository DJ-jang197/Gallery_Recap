package com.siel.kernel.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.siel.kernel.service.GeminiNarratorService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SielApiController.class)
@TestPropertySource(properties = {
        "siel.kernel.bearer-token=testtoken"
})
public class SielApiControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private GeminiNarratorService narratorService;

    private String requestBodyJson() throws Exception {
        return objectMapper.writeValueAsString(
                java.util.Map.of(
                        "scores", java.util.Map.of(
                                "energy", 3,
                                "social", 3,
                                "stress", 3,
                                "adjectives", java.util.List.of("Quiet")
                        ),
                        "reflection", "Mock reflection",
                        "metadata", java.util.List.of(
                                java.util.Map.of("dateTaken", "2026-01-02T10:00:00", "location", "Austin, TX")
                        ),
                        "images", java.util.List.of()
                )
        );
    }

    @Test
    void synthesize_requiresBearerTokenWhenConfigured() throws Exception {
        when(narratorService.synthesizeNarrative(any(), any(), any(), any())).thenReturn("OK");

        mockMvc.perform(post("/api/synthesize")
                        .contentType("application/json")
                        .content(requestBodyJson())
                        .header("X-Forwarded-For", "1.1.1.1")
                )
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Unauthorized."));
    }

    @Test
    void synthesize_allowsBearerTokenWhenCorrect() throws Exception {
        when(narratorService.synthesizeNarrative(any(), any(), any(), any())).thenReturn("OK");

        mockMvc.perform(post("/api/synthesize")
                        .contentType("application/json")
                        .content(requestBodyJson())
                        .header("X-Forwarded-For", "1.1.1.2")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer testtoken")
                        .header("Origin", "http://localhost:5173")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.narrative").value("OK"));
    }

    @Test
    void synthesize_rateLimitsRequestsPerIp() throws Exception {
        when(narratorService.synthesizeNarrative(any(), any(), any(), any())).thenReturn("OK");

        String ip = "2.2.2.2";
        for (int i = 1; i <= 6; i++) {
            mockMvc.perform(post("/api/synthesize")
                            .contentType("application/json")
                            .content(requestBodyJson())
                            .header("X-Forwarded-For", ip)
                            .header(HttpHeaders.AUTHORIZATION, "Bearer testtoken"))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(post("/api/synthesize")
                        .contentType("application/json")
                        .content(requestBodyJson())
                        .header("X-Forwarded-For", ip)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer testtoken"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error").value("Rate limit exceeded."));
    }
}

