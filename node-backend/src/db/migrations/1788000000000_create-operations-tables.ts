import { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE conjunction_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      object_a_id UUID NOT NULL REFERENCES satellites(id) ON DELETE CASCADE,
      object_b_id UUID NOT NULL REFERENCES satellites(id) ON DELETE CASCADE,
      screening_started_at TIMESTAMPTZ NOT NULL,
      screening_duration_minutes INTEGER NOT NULL
        CHECK (screening_duration_minutes BETWEEN 1 AND 1440),
      screening_step_seconds INTEGER NOT NULL
        CHECK (screening_step_seconds BETWEEN 1 AND 3600),
      computed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      tca TIMESTAMPTZ,
      minimum_separation_km DOUBLE PRECISION
        CHECK (minimum_separation_km IS NULL OR minimum_separation_km >= 0),
      relative_velocity_km_s DOUBLE PRECISION
        CHECK (relative_velocity_km_s IS NULL OR relative_velocity_km_s >= 0),
      collision_probability DOUBLE PRECISION
        CHECK (
          collision_probability IS NULL
          OR collision_probability BETWEEN 0 AND 1
        ),
      risk_score DOUBLE PRECISION
        CHECK (risk_score IS NULL OR risk_score >= 0),
      risk_level VARCHAR(8) NOT NULL
        CHECK (risk_level IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'CLEAR')),
      encounter_angle_degrees DOUBLE PRECISION
        CHECK (
          encounter_angle_degrees IS NULL
          OR encounter_angle_degrees BETWEEN 0 AND 180
        ),
      radial_uncertainty_m DOUBLE PRECISION
        CHECK (radial_uncertainty_m IS NULL OR radial_uncertainty_m >= 0),
      separation_profile JSONB,
      raw_result JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT conjunction_objects_must_differ CHECK (object_a_id <> object_b_id)
    );

    CREATE INDEX conjunction_events_pair_idx
      ON conjunction_events (object_a_id, object_b_id, computed_at DESC);
    CREATE INDEX conjunction_events_tca_idx
      ON conjunction_events (tca);
    CREATE INDEX conjunction_events_risk_idx
      ON conjunction_events (risk_level, computed_at DESC);

    CREATE TABLE alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conjunction_event_id UUID UNIQUE
        REFERENCES conjunction_events(id) ON DELETE CASCADE,
      severity VARCHAR(8) NOT NULL
        CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
      source VARCHAR(32) NOT NULL
        CHECK (
          source IN (
            'CONJUNCTION_SCREENING',
            'ORBIT_DATA',
            'PROPAGATION',
            'CATALOG_SYNC',
            'SYSTEM'
          )
        ),
      title TEXT NOT NULL CHECK (LENGTH(TRIM(title)) > 0),
      description TEXT NOT NULL CHECK (LENGTH(TRIM(description)) > 0),
      acknowledged_at TIMESTAMPTZ,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT resolved_alert_is_acknowledged CHECK (
        resolved_at IS NULL
        OR acknowledged_at IS NOT NULL
      )
    );

    CREATE INDEX alerts_queue_idx
      ON alerts (acknowledged_at, resolved_at, created_at DESC);
    CREATE INDEX alerts_severity_idx
      ON alerts (severity, created_at DESC);

    CREATE TABLE user_satellite_wishlist (
      user_id UUID NOT NULL REFERENCES user_details(id) ON DELETE CASCADE,
      satellite_id UUID NOT NULL REFERENCES satellites(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, satellite_id)
    );

    CREATE INDEX user_satellite_wishlist_satellite_idx
      ON user_satellite_wishlist (satellite_id);
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DROP TABLE IF EXISTS user_satellite_wishlist;
    DROP TABLE IF EXISTS alerts;
    DROP TABLE IF EXISTS conjunction_events;
  `);
};
