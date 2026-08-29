import type { ElementSetRecord } from "../types";

interface AltitudeHistoryChartProps {
  records: ElementSetRecord[];
  cadenceHours: number;
}

export function AltitudeHistoryChart({ records, cadenceHours }: AltitudeHistoryChartProps) {
  const chronological = [...records].reverse();
  const altitudes = chronological.map(({ altitudeKm }) => altitudeKm);
  const minimum = Math.min(...altitudes);
  const maximum = Math.max(...altitudes);
  const range = Math.max(maximum - minimum, 0.5);
  const pointFor = (record: ElementSetRecord, index: number) => ({
    x: 18 + index / Math.max(chronological.length - 1, 1) * 964,
    y: 128 - (record.altitudeKm - minimum) / range * 88,
  });
  const points = chronological.map(pointFor);
  const linePath = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L982 142 L18 142 Z`;
  const increases = chronological.map((record, index) => ({ record, point: points[index] })).filter(({ record }) => record.altitudeIncrease);
  const days = (records.length - 1) * cadenceHours / 24;
  const netChange = records[0].altitudeKm - records.at(-1)!.altitudeKm;
  const dailyChange = netChange / days;

  return (
    <div className="border-b border-[var(--bd)] bg-well px-4 pt-3 pb-2">
      <div className="flex items-center justify-between gap-4 text-[10.5px] text-text-secondary">
        <span>Mean altitude · {minimum.toFixed(1)} km to {maximum.toFixed(1)} km</span>
        <span className="flex items-center gap-2 text-nominal"><i className="h-1.5 w-1.5 bg-nominal" />{increases.length} positive altitude change{increases.length === 1 ? "" : "s"}</span>
      </div>
      <svg viewBox="0 0 1000 154" className="mt-1 h-[155px] w-full" role="img" aria-label="Mean altitude over stored element sets">
        <path d={areaPath} fill="rgba(143,175,196,.08)" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="220ms" fill="freeze" />
        </path>
        <path d={linePath} fill="none" stroke="var(--acc)" strokeWidth="1.25" vectorEffect="non-scaling-stroke" pathLength="1" strokeDasharray="1" strokeDashoffset="1">
          <animate attributeName="stroke-dashoffset" from="1" to="0" dur="450ms" fill="freeze" />
        </path>
        {increases.map(({ record, point }, index) => (
          <circle key={record.epochUtc} cx={point.x} cy={point.y} r="3.2" fill="var(--nominal)" opacity="0">
            <animate attributeName="opacity" from="0" to="1" begin={`${180 + index * 70}ms`} dur="160ms" fill="freeze" />
          </circle>
        ))}
      </svg>
      <div className="flex items-center justify-between gap-4 text-[9.5px] text-text-tertiary">
        <span>{chronological[0].epochUtc}</span>
        <span className={netChange >= 0 ? "text-nominal" : "text-high"}>{netChange >= 0 ? "+" : ""}{netChange.toFixed(2)} km net altitude change · {dailyChange >= 0 ? "+" : ""}{dailyChange.toFixed(2)} km/day</span>
        <span>{chronological.at(-1)!.epochUtc}</span>
      </div>
    </div>
  );
}
