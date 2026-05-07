package com.siel.kernel.service;

import com.siel.kernel.model.SielContext;
import com.siel.kernel.model.SurveyState;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

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
     * Generates the narrative from the given context.
     *
     * <p><b>Logic:</b> Constructs a system prompt that adjusts its scope based on the chosen cadence. 
     * Enforces the PRD rule to never output raw numeric ratings, synthesizing them into natural prose.</p>
     * 
     * <p><b>Security:</b> Operates in MOCK mode if the API key is not yet configured, avoiding leaked failed requests. 
     * Never sends raw image binary data—only abstract metadata and text.</p>
     * 
     * <p><b>Efficiency:</b> Expected to use Spring WebClient (or RestTemplate) to make async/sync calls to Gemini 1.5 Flash.</p>
     *
     * @param context The unified SielContext.
     * @return The ghostwritten narrative.
     */
    public String synthesizeNarrative(SielContext context) {
        String prompt = buildPrompt(context);

        if ("YOUR_API_KEY_HERE".equals(apiKey) || apiKey.isEmpty()) {
            return generateMockResponse(context.getSurveyState().getCadence());
        }

        // Production implementation would execute HTTP POST to `apiUrl` with `apiKey` here.
        // For now, if the key is real, we would call the actual API.
        throw new UnsupportedOperationException("Real API call not yet fully wired. Please use mock mode.");
    }

    /**
     * Constructs the structured prompt for the Gemini AI.
     */
    public String buildPrompt(SielContext context) {
        SurveyState survey = context.getSurveyState();
        String scopeInstruction = "biweekly".equalsIgnoreCase(survey.getCadence())
                ? "Adopt a granular scope, focusing on specific day-to-day shifts, recent events, and immediate feelings over the last 14 days."
                : "Adopt a thematic scope, focusing on broad arcs, overall growth, macro reflections, and shifting trends over the last month.";

        return String.format(
            "System Instruction: You are Siel, a privacy-first digital biographer. " +
            "Your task is to ghostwrite a life journal entry based on the following metadata and reflection. " +
            "%s " +
            "CRITICAL DIRECTIVE: Do NOT mention any numbers, scores, or the 1-5 scale. " +
            "Synthesize the Energy (%d/5), Social (%d/5), and Stress (%d/5) levels into natural, descriptive prose. " +
            "User Reflection: '%s'. " +
            "Photo Coordinates count: %d. Begin journal entry:",
            scopeInstruction,
            survey.getEnergy(),
            survey.getSocial(),
            survey.getStress(),
            survey.getReflection(),
            context.getPhotos() != null ? context.getPhotos().size() : 0
        );
    }

    private String generateMockResponse(String cadence) {
        if ("biweekly".equalsIgnoreCase(cadence)) {
            return "The past fortnight has been a whirlwind of brief, intense moments. " +
                   "I've felt a vibrant surge of energy, pushing me through high-pressure situations, " +
                   "yet I found solace in quiet, meaningful connections with close friends. " +
                   "The scattered photos across the city map reflect a restless but fulfilling two weeks.";
        } else {
            return "This month has been a steady arc of resilience and reflection. " +
                   "While the weight of responsibilities was palpable, my spirit remained remarkably buoyant. " +
                   "I navigated the social currents with careful intention, savoring deep conversations over shallow crowds. " +
                   "Looking back, it was a chapter defined by quiet strength and profound growth.";
        }
    }
}
