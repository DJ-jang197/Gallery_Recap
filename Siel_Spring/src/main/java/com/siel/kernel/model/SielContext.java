package com.siel.kernel.model;

import java.util.List;

/**
 * The final unified context combining the extracted photo metadata and the user's survey state.
 * This is the object that will be passed to the Gemini AI in Phase 4.
 */
public class SielContext {
    private List<PhotoMetadata> photos;
    private SurveyState surveyState;

    // Default constructor for JSON/object mappers.
    public SielContext() {}

    // Constructs the unified context consumed by the narrator service.
    public SielContext(List<PhotoMetadata> photos, SurveyState surveyState) {
        this.photos = photos;
        this.surveyState = surveyState;
    }

    public List<PhotoMetadata> getPhotos() { return photos; }
    public void setPhotos(List<PhotoMetadata> photos) { this.photos = photos; }

    public SurveyState getSurveyState() { return surveyState; }
    public void setSurveyState(SurveyState surveyState) { this.surveyState = surveyState; }
}
