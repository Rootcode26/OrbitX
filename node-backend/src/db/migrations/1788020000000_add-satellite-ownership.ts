import { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE satellites
      ADD COLUMN created_by_user_id UUID REFERENCES user_details(id) ON DELETE SET NULL;

    CREATE INDEX satellites_created_by_user_id_idx
      ON satellites (created_by_user_id);
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DROP INDEX IF EXISTS satellites_created_by_user_id_idx;

    ALTER TABLE satellites
      DROP COLUMN IF EXISTS created_by_user_id;
  `);
};
