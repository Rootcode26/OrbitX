export class SatelliteNotFoundError extends Error {
  constructor(public readonly noradCatId: number) {
    super(`Satellite with NORAD ID ${noradCatId} was not found`);
    this.name = "SatelliteNotFoundError";
  }
}

export class SatelliteStateNotFoundError extends Error {
  constructor(public readonly noradCatId: number) {
    super(`No propagated state is available for NORAD ID ${noradCatId}`);
    this.name = "SatelliteStateNotFoundError";
  }
}
