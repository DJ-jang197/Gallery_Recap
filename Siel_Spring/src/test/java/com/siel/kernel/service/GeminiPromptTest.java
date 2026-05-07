package com.siel.kernel.service;

import com.siel.kernel.model.PhotoMetadata;
import com.siel.kernel.model.SielContext;
import com.siel.kernel.model.SurveyState;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Unit tests for the GeminiNarratorService prompt construction logic.
 */
public class GeminiPromptTest {

    private GeminiNarratorService service;

    @BeforeEach
    public void setup() {
        service = new GeminiNarratorService();
    }

    @Test
    public void testBiWeeklyPromptScopeAndNumericRules() {
        SurveyState survey = new SurveyState("biweekly", 4, 2, 5, "Felt tired but productive.");
        SielContext context = new SielContext(Collections.singletonList(new PhotoMetadata()), survey);

        String prompt = service.buildPrompt(context);

        // Verify Bi-Weekly scope
        assertTrue(prompt.contains("granular scope"));
        // Verify Privacy/Score Rule
        assertTrue(prompt.contains("Do NOT mention any numbers, scores, or the 1-5 scale"));
        assertTrue(prompt.contains("Energy (4/5)"));
    }

    @Test
    public void testMonthlyPromptScope() {
        SurveyState survey = new SurveyState("monthly", 3, 4, 2, "A good solid month.");
        SielContext context = new SielContext(Collections.emptyList(), survey);

        String prompt = service.buildPrompt(context);

        // Verify Monthly scope
        assertTrue(prompt.contains("thematic scope"));
        assertTrue(prompt.contains("broad arcs"));
    }
}
