import { MigrationBuilder } from "node-pg-migrate";

export const up = (pgm: MigrationBuilder): void => {
  pgm.dropConstraint("satelite_orbit_data", "unique_satellite_tle_epoch");
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.addConstraint("satelite_orbit_data", "unique_satellite_tle_epoch", {
    unique: ["satellite_id", "epoch"],
  });
};
