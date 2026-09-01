import { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE conjunction_events
      DROP CONSTRAINT conjunction_events_screening_duration_minutes_check;

    ALTER TABLE conjunction_events
      ADD CONSTRAINT conjunction_events_screening_duration_minutes_check
      CHECK (screening_duration_minutes BETWEEN 1 AND 10080);
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DELETE FROM conjunction_events
    WHERE screening_duration_minutes > 1440;

    ALTER TABLE conjunction_events
      DROP CONSTRAINT conjunction_events_screening_duration_minutes_check;

    ALTER TABLE conjunction_events
      ADD CONSTRAINT conjunction_events_screening_duration_minutes_check
      CHECK (screening_duration_minutes BETWEEN 1 AND 1440);
  `);
};
