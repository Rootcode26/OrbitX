export interface TleData {
  tle_line1: string;
  tle_line2: string;
  observation_time: string;
}

export interface TleComparisonData {
  satellite_a: {
         norad_id: string;
         name: string;
         tle_line1: string;
         tle_line2: string;
     };
     satellite_b: {
         norad_id: string;
         name: string;
         tle_line1: string;
         tle_line2: string;
     };
     start_time: string;
     duration_minutes: number;
     step_seconds: number
}

export interface MultipleTleComparisonData {
  satellites: {
      norad_id: string;
      name: string;
      tle_line1: string;
      tle_line2: string;
  }[];
  start_time: string;
  duration_minutes: number;
  step_seconds: number
}
