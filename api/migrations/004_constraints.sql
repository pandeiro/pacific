-- 004_constraints.sql
-- Add check constraints for data integrity

-- ── Sightings ──────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sightings_confidence_valid'
    ) THEN
        ALTER TABLE sightings
            ADD CONSTRAINT sightings_confidence_valid
            CHECK (confidence IN ('high', 'medium', 'low'));
    END IF;
END $$;

-- ── Conditions ─────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'conditions_type_valid'
    ) THEN
        ALTER TABLE conditions
            ADD CONSTRAINT conditions_type_valid
            CHECK (condition_type IN (
                'visibility', 'water_temp', 'air_temp',
                'swell_height', 'swell_period', 'wind_speed', 'wind_direction'
            ));
    END IF;
END $$;

-- ── Tides ──────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tides_type_valid'
    ) THEN
        ALTER TABLE tides
            ADD CONSTRAINT tides_type_valid
            CHECK (type IN ('high', 'low', 'predicted'));
    END IF;
END $$;

-- ── Activity Scores ────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'activity_scores_score_range'
    ) THEN
        ALTER TABLE activity_scores
            ADD CONSTRAINT activity_scores_score_range
            CHECK (score IS NULL OR (score >= 0 AND score <= 100));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'activity_scores_type_valid'
    ) THEN
        ALTER TABLE activity_scores
            ADD CONSTRAINT activity_scores_type_valid
            CHECK (activity_type IN (
                'snorkeling', 'whale_watching', 'body_surfing',
                'scenic_drive', 'tidepooling'
            ));
    END IF;
END $$;

-- ── Locations ──────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'locations_type_valid'
    ) THEN
        ALTER TABLE locations
            ADD CONSTRAINT locations_type_valid
            CHECK (location_type IN ('beach', 'tidepool', 'viewpoint', 'harbor', 'island'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'locations_region_valid'
    ) THEN
        ALTER TABLE locations
            ADD CONSTRAINT locations_region_valid
            CHECK (region IN (
                'south_coast', 'la_coast', 'ventura',
                'central_coast', 'channel_islands'
            ));
    END IF;
END $$;

-- ── Scrape Logs ────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'scrape_logs_status_valid'
    ) THEN
        ALTER TABLE scrape_logs
            ADD CONSTRAINT scrape_logs_status_valid
            CHECK (status IN ('success', 'failure', 'partial'));
    END IF;
END $$;

-- ── Seasonal Events ────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'seasonal_events_category_valid'
    ) THEN
        ALTER TABLE seasonal_events
            ADD CONSTRAINT seasonal_events_category_valid
            CHECK (category IN (
                'migration', 'spawning', 'bloom', 'season',
                'celestial', 'tidal', 'breeding', 'conditions'
            ));
    END IF;
END $$;
