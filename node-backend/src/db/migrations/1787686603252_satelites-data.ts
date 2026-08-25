
import { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE satellites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        norad_cat_id INTEGER NOT NULL UNIQUE
            CHECK (norad_cat_id > 0),

        satellite_name TEXT NOT NULL,

        object_type VARCHAR(3)
            CHECK (
                object_type IS NULL
                OR object_type IN ('PAY', 'R/B', 'DEB', 'UNK')
            ),

        owner TEXT,

        operational_status CHAR(1)
            CHECK (
                operational_status IS NULL
                OR operational_status IN (
                    '+',
                    '-',
                    'P',
                    'B',
                    'S',
                    'X',
                    'D',
                    '?'
                )
            ),

        launch_date DATE,

        launch_site TEXT,

        decay_date DATE,

        created_at TIMESTAMPTZ
            NOT NULL DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMPTZ
            NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT valid_decay_date
            CHECK (
                decay_date IS NULL
                OR launch_date IS NULL
                OR decay_date >= launch_date
            )
    );
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DROP TABLE IF EXISTS satellites
  `);
};
