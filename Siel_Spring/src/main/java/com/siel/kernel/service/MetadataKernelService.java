package com.siel.kernel.service;

import com.drew.metadata.Metadata;
import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.exif.ExifSubIFDDirectory;
import com.drew.metadata.exif.GpsDirectory;
import com.siel.kernel.model.PhotoMetadata;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service responsible for extracting metadata from photos and clustering them
 * based on the user's selected reflection cadence.
 */
@Service
public class MetadataKernelService {

    public enum Cadence {
        BI_WEEKLY, // 14 days
        MONTHLY    // 30 days
    }

    /**
     * Extracts EXIF metadata from a bulk list of photo paths using parallel processing.
     *
     * <p><b>Logic:</b> Iterates through local file paths, extracts the original capture date and GPS coordinates 
     * using the metadata-extractor library. It safely skips files without EXIF data.</p>
     * 
     * <p><b>Security:</b> Never saves raw image bytes or buffers them into memory permanently. 
     * Uses Java NIO InputStream that is closed immediately after the EXIF headers are parsed. 
     * This ensures strict adherence to the privacy-first PRD.</p>
     * 
     * <p><b>Efficiency:</b> Utilizes `parallelStream()` to process hundreds of photos simultaneously across 
     * available CPU cores, dramatically reducing the I/O-bound extraction time.</p>
     *
     * @param photoPaths List of local file paths to process.
     * @return List of extracted PhotoMetadata.
     */
    public List<PhotoMetadata> extractMetadataBulk(List<Path> photoPaths) {
        return photoPaths.parallelStream()
                .map(this::extractSingle)
                .filter(meta -> meta != null && meta.getCaptureDate() != null)
                .collect(Collectors.toList());
    }

    private PhotoMetadata extractSingle(Path path) {
        try (InputStream is = Files.newInputStream(path)) {
            Metadata metadata = ImageMetadataReader.readMetadata(is);
            
            LocalDateTime captureDate = null;
            ExifSubIFDDirectory directory = metadata.getFirstDirectoryOfType(ExifSubIFDDirectory.class);
            if (directory != null) {
                Date date = directory.getDateOriginal();
                if (date != null) {
                    captureDate = date.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
                }
            }

            Double lat = null;
            Double lon = null;
            GpsDirectory gpsDirectory = metadata.getFirstDirectoryOfType(GpsDirectory.class);
            if (gpsDirectory != null && gpsDirectory.getGeoLocation() != null) {
                lat = gpsDirectory.getGeoLocation().getLatitude();
                lon = gpsDirectory.getGeoLocation().getLongitude();
            }

            return new PhotoMetadata(path.getFileName().toString(), captureDate, lat, lon);
        } catch (Exception e) {
            // Safe fallback for files that fail parsing or don't have EXIF
            return null;
        }
    }

    /**
     * Clusters extracted photos based on the selected cadence.
     *
     * <p><b>Logic:</b> Groups the provided metadata into buckets representing either 14-day or 30-day intervals, 
     * relative to a baseline reference date (typically the earliest photo or start of a year).</p>
     * 
     * <p><b>Security:</b> Logic operates purely on the in-memory DTOs which have been scrubbed of image data.</p>
     * 
     * <p><b>Efficiency:</b> Groups in O(N) time using Java Streams `Collectors.groupingBy`.</p>
     *
     * @param metadataList List of photo metadata.
     * @param cadence The selected reflection cadence (Bi-Weekly or Monthly).
     * @param referenceDate The starting boundary date to anchor the intervals.
     * @return A map of interval index to the list of photos in that interval.
     */
    public Map<Long, List<PhotoMetadata>> clusterByCadence(List<PhotoMetadata> metadataList, Cadence cadence, LocalDateTime referenceDate) {
        long intervalDays = cadence == Cadence.BI_WEEKLY ? 14 : 30;

        return metadataList.stream().collect(Collectors.groupingBy(meta -> {
            long daysBetween = ChronoUnit.DAYS.between(referenceDate, meta.getCaptureDate());
            // Group index is the integer division of days by the interval
            return daysBetween >= 0 ? daysBetween / intervalDays : -1L;
        }));
    }
}
