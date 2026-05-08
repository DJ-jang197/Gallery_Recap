package com.siel.kernel.model;

import java.time.LocalDateTime;

/**
 * Data Transfer Object for extracted EXIF Photo Metadata.
 */
public class PhotoMetadata {
    private String filename;
    private LocalDateTime captureDate;
    private Double latitude;
    private Double longitude;

    // Default constructor for serialization frameworks.
    public PhotoMetadata() {}

    // Constructs one metadata record extracted from a single photo.
    public PhotoMetadata(String filename, LocalDateTime captureDate, Double latitude, Double longitude) {
        this.filename = filename;
        this.captureDate = captureDate;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public LocalDateTime getCaptureDate() { return captureDate; }
    public void setCaptureDate(LocalDateTime captureDate) { this.captureDate = captureDate; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
}
