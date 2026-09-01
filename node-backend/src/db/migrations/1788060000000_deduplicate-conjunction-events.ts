import { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    WITH ranked_events AS (
      SELECT
        event.id,
        ROW_NUMBER() OVER (
          PARTITION BY
            LEAST(event.object_a_id, event.object_b_id),
            GREATEST(event.object_a_id, event.object_b_id)
          ORDER BY event.computed_at DESC, event.id DESC
        ) AS pair_rank
      FROM conjunction_events event
    )
    DELETE FROM alerts alert
    USING ranked_events duplicate
    WHERE alert.conjunction_event_id = duplicate.id
      AND duplicate.pair_rank > 1;

    WITH ranked_events AS (
      SELECT
        event.id,
        ROW_NUMBER() OVER (
          PARTITION BY
            LEAST(event.object_a_id, event.object_b_id),
            GREATEST(event.object_a_id, event.object_b_id)
          ORDER BY event.computed_at DESC, event.id DESC
        ) AS pair_rank
      FROM conjunction_events event
    )
    DELETE FROM conjunction_events event
    USING ranked_events duplicate
    WHERE event.id = duplicate.id
      AND duplicate.pair_rank > 1;

    CREATE UNIQUE INDEX conjunction_events_unordered_pair_unique_idx
      ON conjunction_events (
        LEAST(object_a_id, object_b_id),
        GREATEST(object_a_id, object_b_id)
      );
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DROP INDEX IF EXISTS conjunction_events_unordered_pair_unique_idx;
  `);
};
