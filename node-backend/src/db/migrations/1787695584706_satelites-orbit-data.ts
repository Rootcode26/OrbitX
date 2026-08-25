

import { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE satelite_orbit_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        satellite_id UUID NOT NULL,

        epoch TIMESTAMPTZ NOT NULL,

        tle_line1 TEXT NOT NULL
            CHECK (LENGTH(TRIM(tle_line1)) > 0),

        tle_line2 TEXT NOT NULL
            CHECK (LENGTH(TRIM(tle_line2)) > 0),

        inclination_degrees DOUBLE PRECISION
            CHECK (
                inclination_degrees IS NULL
                OR inclination_degrees BETWEEN 0 AND 180
            ),

        orbital_period_minutes DOUBLE PRECISION
            CHECK (
                orbital_period_minutes IS NULL
                OR orbital_period_minutes > 0
            ),

        apogee_km DOUBLE PRECISION,

        perigee_km DOUBLE PRECISION,

        height_km DOUBLE PRECISION
            CHECK (
                height_km IS NULL
                OR height_km >= 0
            ),

        speed_km_s DOUBLE PRECISION
            CHECK (
                speed_km_s IS NULL
                OR speed_km_s >= 0
            ),

        latitude_degrees DOUBLE PRECISION
            CHECK (
                latitude_degrees IS NULL
                OR latitude_degrees BETWEEN -90 AND 90
            ),

        longitude_degrees DOUBLE PRECISION
            CHECK (
                longitude_degrees IS NULL
                OR longitude_degrees BETWEEN -180 AND 180
            ),

        calculated_at TIMESTAMPTZ NOT NULL,

        created_at TIMESTAMPTZ
            NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT valid_apogee_perigee
            CHECK (
                apogee_km IS NULL
                OR perigee_km IS NULL
                OR apogee_km >= perigee_km
            ),

        CONSTRAINT fk_satellite
            FOREIGN KEY (satellite_id)
            REFERENCES satellites(id)
            ON DELETE CASCADE,

        CONSTRAINT unique_satellite_calculation
            UNIQUE (satellite_id, calculated_at)
    );
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DROP TABLE IF EXISTS satelite_orbit_data
  `);
};
