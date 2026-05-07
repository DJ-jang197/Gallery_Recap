package com.siel.kernel.service;

import com.siel.kernel.model.PhotoMetadata;
import com.siel.kernel.model.SielContext;
import com.siel.kernel.model.SurveyState;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service responsible for synchronizing the Photo Metadata clusters and the User's Survey State.
 */
@Service
public class ContextBuilder {

    /**
     * Builds the unified SielContext for AI synthesis.
     *
     * <p><b>Logic:</b> Takes a specific bucket of PhotoMetadata (already filtered by the kernel) 
     * and the React frontend's SurveyState, merging them into a single coherent context object.</p>
     * 
     * <p><b>Security:</b> Validates that the state is intact before building the context. 
     * Sensitive token data is not included in this context—only metadata.</p>
     * 
     * <p><b>Efficiency:</b> Simple O(1) object instantiation, operating entirely in memory.</p>
     *
     * @param photos List of PhotoMetadata for the specific period.
     * @param survey The SurveyState submitted by the user via the React frontend.
     * @return The unified SielContext.
     */
    public SielContext buildContext(List<PhotoMetadata> photos, SurveyState survey) {
        if (survey == null) {
            throw new IllegalArgumentException("SurveyState cannot be null when building context.");
        }
        
        return new SielContext(photos, survey);
    }
}
