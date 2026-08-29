import { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DELETE FROM alerts alert
    USING conjunction_events event
    WHERE alert.conjunction_event_id = event.id
      AND alert.source = 'CONJUNCTION_SCREENING'
      AND alert.resolved_at IS NULL
      AND (
        event.minimum_separation_km IS NULL
        OR event.minimum_separation_km > 500
      );
  `);

  pgm.sql(`
    WITH conjunction_alerts AS (
      SELECT
        alert.id,
        LEAST(object_a.norad_cat_id, object_b.norad_cat_id) AS pair_a,
        GREATEST(object_a.norad_cat_id, object_b.norad_cat_id) AS pair_b,
        ROW_NUMBER() OVER (
          PARTITION BY
            LEAST(object_a.norad_cat_id, object_b.norad_cat_id),
            GREATEST(object_a.norad_cat_id, object_b.norad_cat_id)
          ORDER BY alert.created_at DESC, alert.id DESC
        ) AS pair_rank
      FROM alerts alert
      JOIN conjunction_events event
        ON event.id = alert.conjunction_event_id
      JOIN satellites object_a
        ON object_a.id = event.object_a_id
      JOIN satellites object_b
        ON object_b.id = event.object_b_id
      WHERE alert.source = 'CONJUNCTION_SCREENING'
        AND alert.resolved_at IS NULL
    ),
    duplicates AS (
      SELECT id FROM conjunction_alerts WHERE pair_rank > 1
    )
    DELETE FROM alerts alert
    USING duplicates
    WHERE alert.id = duplicates.id;
  `);
};

export const down = (): void => {};
