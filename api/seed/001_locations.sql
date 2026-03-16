-- 001_locations.sql
-- Seed data for coastal locations
-- These locations correspond to NOAA CO-OPS tide gauge stations used by the scraper

INSERT INTO locations (name, slug, lat, lng, location_type, region, noaa_station_id, coastline_bearing, description) VALUES
    ('Dana Point', 'dana_point', 33.4675, -117.6986, 'harbor', 'south_coast', '9410660', NULL, 'Harbor and marina in south Orange County'),
    ('La Jolla', 'la_jolla', 32.8667, -117.2500, 'beach', 'la_coast', '9410230', NULL, 'Coastal area in north San Diego with tide pools and sea caves'),
    ('Santa Monica', 'santa_monica', 34.0117, -118.4965, 'beach', 'la_coast', '9410840', NULL, 'Iconic beach in Los Angeles County'),
    ('Santa Barbara', 'santa_barbara', 34.4000, -119.6970, 'harbor', 'ventura', '9411340', NULL, 'Harbor city on the central coast'),
    ('Morro Bay', 'morro_bay', 35.3670, -120.8510, 'harbor', 'central_coast', '9412110', NULL, 'Coastal harbor with iconic Morro Rock')
ON CONFLICT (slug) DO NOTHING;
