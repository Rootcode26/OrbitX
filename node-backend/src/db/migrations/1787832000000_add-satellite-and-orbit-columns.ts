import { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE satellites
      ADD COLUMN international_designator VARCHAR(16),
      ADD COLUMN radar_cross_section DOUBLE PRECISION,
      ADD COLUMN data_status_code VARCHAR(3),
      ADD COLUMN orbit_center VARCHAR(16),
      ADD COLUMN orbit_type VARCHAR(3),

      ADD CONSTRAINT valid_international_designator
        CHECK (
          international_designator IS NULL
          OR LENGTH(TRIM(international_designator)) > 0
        ),

      ADD CONSTRAINT valid_radar_cross_section
        CHECK (
          radar_cross_section IS NULL
          OR radar_cross_section >= 0
        ),

      ADD CONSTRAINT valid_data_status_code
        CHECK (
          data_status_code IS NULL
          OR data_status_code IN ('NCE', 'NIE', 'NEA')
        ),

      ADD CONSTRAINT valid_orbit_center
        CHECK (
          orbit_center IS NULL
          OR LENGTH(TRIM(orbit_center)) > 0
        ),

      ADD CONSTRAINT valid_orbit_type
        CHECK (
          orbit_type IS NULL
          OR orbit_type IN ('ORB', 'LAN', 'IMP', 'DOC', 'R/T')
        );

    ALTER TABLE satelite_orbit_data
      ADD COLUMN raan_degrees DOUBLE PRECISION,
      ADD COLUMN revolution_number INTEGER,
      ADD COLUMN reference_frame VARCHAR(16),
      ADD COLUMN position_x_km DOUBLE PRECISION,
      ADD COLUMN position_y_km DOUBLE PRECISION,
      ADD COLUMN position_z_km DOUBLE PRECISION,
      ADD COLUMN velocity_x_km_s DOUBLE PRECISION,
      ADD COLUMN velocity_y_km_s DOUBLE PRECISION,
      ADD COLUMN velocity_z_km_s DOUBLE PRECISION,

      ADD CONSTRAINT valid_raan_degrees
        CHECK (
          raan_degrees IS NULL
          OR (raan_degrees >= 0 AND raan_degrees < 360)
        ),

      ADD CONSTRAINT valid_revolution_number
        CHECK (
          revolution_number IS NULL
          OR revolution_number >= 0
        ),

      ADD CONSTRAINT valid_reference_frame
        CHECK (
          reference_frame IS NULL
          OR LENGTH(TRIM(reference_frame)) > 0
        ),

      ADD CONSTRAINT complete_state_vectors
        CHECK (
          (
            position_x_km IS NULL
            AND position_y_km IS NULL
            AND position_z_km IS NULL
            AND velocity_x_km_s IS NULL
            AND velocity_y_km_s IS NULL
            AND velocity_z_km_s IS NULL
          )
          OR
          (
            position_x_km IS NOT NULL
            AND position_y_km IS NOT NULL
            AND position_z_km IS NOT NULL
            AND velocity_x_km_s IS NOT NULL
            AND velocity_y_km_s IS NOT NULL
            AND velocity_z_km_s IS NOT NULL
            AND reference_frame IS NOT NULL
          )
        ),

      ADD CONSTRAINT finite_state_vectors
        CHECK (
          position_x_km NOT IN ('NaN'::DOUBLE PRECISION, 'Infinity'::DOUBLE PRECISION, '-Infinity'::DOUBLE PRECISION)
          AND position_y_km NOT IN ('NaN'::DOUBLE PRECISION, 'Infinity'::DOUBLE PRECISION, '-Infinity'::DOUBLE PRECISION)
          AND position_z_km NOT IN ('NaN'::DOUBLE PRECISION, 'Infinity'::DOUBLE PRECISION, '-Infinity'::DOUBLE PRECISION)
          AND velocity_x_km_s NOT IN ('NaN'::DOUBLE PRECISION, 'Infinity'::DOUBLE PRECISION, '-Infinity'::DOUBLE PRECISION)
          AND velocity_y_km_s NOT IN ('NaN'::DOUBLE PRECISION, 'Infinity'::DOUBLE PRECISION, '-Infinity'::DOUBLE PRECISION)
          AND velocity_z_km_s NOT IN ('NaN'::DOUBLE PRECISION, 'Infinity'::DOUBLE PRECISION, '-Infinity'::DOUBLE PRECISION)
        );
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE satelite_orbit_data
      DROP COLUMN IF EXISTS velocity_z_km_s,
      DROP COLUMN IF EXISTS velocity_y_km_s,
      DROP COLUMN IF EXISTS velocity_x_km_s,
      DROP COLUMN IF EXISTS position_z_km,
      DROP COLUMN IF EXISTS position_y_km,
      DROP COLUMN IF EXISTS position_x_km,
      DROP COLUMN IF EXISTS reference_frame,
      DROP COLUMN IF EXISTS revolution_number,
      DROP COLUMN IF EXISTS raan_degrees;

    ALTER TABLE satellites
      DROP COLUMN IF EXISTS orbit_type,
      DROP COLUMN IF EXISTS orbit_center,
      DROP COLUMN IF EXISTS data_status_code,
      DROP COLUMN IF EXISTS radar_cross_section,
      DROP COLUMN IF EXISTS international_designator;
  `);
};
