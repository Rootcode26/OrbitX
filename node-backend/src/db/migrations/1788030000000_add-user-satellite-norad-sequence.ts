import { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE SEQUENCE user_satellite_norad_seq
      AS INTEGER
      MINVALUE 90000
      MAXVALUE 99999
      START WITH 90000;

    DO $$
    DECLARE
      latest_custom_norad_id INTEGER;
    BEGIN
      SELECT MAX(norad_cat_id)
      INTO latest_custom_norad_id
      FROM satellites
      WHERE norad_cat_id BETWEEN 90000 AND 99999;

      IF latest_custom_norad_id IS NULL THEN
        PERFORM setval('user_satellite_norad_seq', 90000, false);
      ELSE
        PERFORM setval('user_satellite_norad_seq', latest_custom_norad_id, true);
      END IF;
    END $$;
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql("DROP SEQUENCE IF EXISTS user_satellite_norad_seq");
};
