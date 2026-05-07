package com.siel.kernel.service;

import com.siel.kernel.model.PhotoMetadata;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Unit tests to verify the Bi-Weekly and Monthly Cadence clustering logic.
 */
public class RecapRangeTest {

    private MetadataKernelService service;

    @BeforeEach
    public void setup() {
        service = new MetadataKernelService();
    }

    @Test
    public void testBiWeeklyCadenceClustering() {
        LocalDateTime referenceDate = LocalDateTime.of(2026, 1, 1, 0, 0);

        List<PhotoMetadata> photos = Arrays.asList(
                new PhotoMetadata("photo1.jpg", LocalDateTime.of(2026, 1, 2, 10, 0), null, null),   // Day 1 (Bucket 0)
                new PhotoMetadata("photo2.jpg", LocalDateTime.of(2026, 1, 14, 23, 59), null, null), // Day 13 (Bucket 0)
                new PhotoMetadata("photo3.jpg", LocalDateTime.of(2026, 1, 15, 0, 0), null, null),   // Day 14 (Bucket 1)
                new PhotoMetadata("photo4.jpg", LocalDateTime.of(2026, 1, 28, 12, 0), null, null)   // Day 27 (Bucket 1)
        );

        Map<Long, List<PhotoMetadata>> clusters = service.clusterByCadence(photos, MetadataKernelService.Cadence.BI_WEEKLY, referenceDate);

        // Expecting 2 buckets (Bucket 0 and Bucket 1) with 2 photos each.
        assertEquals(2, clusters.size());
        assertEquals(2, clusters.get(0L).size());
        assertEquals(2, clusters.get(1L).size());
        assertEquals("photo1.jpg", clusters.get(0L).get(0).getFilename());
        assertEquals("photo3.jpg", clusters.get(1L).get(0).getFilename());
    }

    @Test
    public void testMonthlyCadenceClustering() {
        LocalDateTime referenceDate = LocalDateTime.of(2026, 1, 1, 0, 0);

        List<PhotoMetadata> photos = Arrays.asList(
                new PhotoMetadata("photo1.jpg", LocalDateTime.of(2026, 1, 15, 10, 0), null, null),  // Day 14 (Bucket 0)
                new PhotoMetadata("photo2.jpg", LocalDateTime.of(2026, 1, 30, 23, 59), null, null), // Day 29 (Bucket 0)
                new PhotoMetadata("photo3.jpg", LocalDateTime.of(2026, 1, 31, 0, 0), null, null),   // Day 30 (Bucket 1)
                new PhotoMetadata("photo4.jpg", LocalDateTime.of(2026, 3, 2, 12, 0), null, null)    // Day 60 (Bucket 2)
        );

        Map<Long, List<PhotoMetadata>> clusters = service.clusterByCadence(photos, MetadataKernelService.Cadence.MONTHLY, referenceDate);

        // Expecting 3 buckets: Bucket 0, Bucket 1, Bucket 2
        assertEquals(3, clusters.size());
        assertEquals(2, clusters.get(0L).size());
        assertEquals(1, clusters.get(1L).size());
        assertEquals(1, clusters.get(2L).size());
        assertEquals("photo3.jpg", clusters.get(1L).get(0).getFilename());
        assertEquals("photo4.jpg", clusters.get(2L).get(0).getFilename());
    }
}
