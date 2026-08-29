import { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE user_details
      ADD COLUMN clerk_user_id TEXT,
      ALTER COLUMN email DROP NOT NULL,
      ALTER COLUMN name DROP NOT NULL,
      ALTER COLUMN password DROP NOT NULL;

    ALTER TABLE user_details
      ADD CONSTRAINT user_details_clerk_user_id_unique UNIQUE (clerk_user_id),
      ADD CONSTRAINT user_details_identity_required CHECK (
        clerk_user_id IS NOT NULL OR email IS NOT NULL
      );
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE user_details
      DROP CONSTRAINT IF EXISTS user_details_identity_required,
      DROP CONSTRAINT IF EXISTS user_details_clerk_user_id_unique,
      DROP COLUMN IF EXISTS clerk_user_id;

    UPDATE user_details
    SET
      email = COALESCE(email, id::text || '@legacy.invalid'),
      name = COALESCE(name, 'Legacy user'),
      password = COALESCE(password, 'external-auth');

    ALTER TABLE user_details
      ALTER COLUMN email SET NOT NULL,
      ALTER COLUMN name SET NOT NULL,
      ALTER COLUMN password SET NOT NULL;
  `);
};
