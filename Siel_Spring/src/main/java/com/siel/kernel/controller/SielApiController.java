package com.siel.kernel.controller;

import com.siel.kernel.service.GeminiNarratorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller for Siel API.
 * Handles the communication between the React frontend and the Gemini AI service.
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") // Relax for local development
public class SielApiController {

    @Autowired
    private GeminiNarratorService narratorService;

    /**
     * Synthesis endpoint.
     * Receives metadata and survey scores, returns the AI-generated narrative.
     */
    @PostMapping("/synthesize")
    public Map<String, String> synthesize(@RequestBody Map<String, Object> request) {
        // Extract data from request
        Map<String, Integer> scores = (Map<String, Integer>) request.get("scores");
        String reflection = (String) request.get("reflection");
        List<Map<String, String>> metadata = (List<Map<String, String>>) request.get("metadata");
        
        // Call the service with metadata
        String narrative = narratorService.synthesizeNarrative(scores, reflection, metadata);
        
        return Map.of("narrative", narrative);
    }
}
