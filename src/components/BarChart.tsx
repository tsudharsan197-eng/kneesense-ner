interface BarChartRow {
  label: string
  count: number
  fillClass?: string // e.g. 'bar-fill-low' for the risk-category colors
}

export function BarChart({ rows }: { rows: BarChartRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count))

  return (
    <div className="bar-chart">
      {rows.map((row) => (
        <div key={row.label} className="bar-row">
          <span className="bar-label">{row.label}</span>
          <div className="bar-track">
            <div
              className={`bar-fill ${row.fillClass ?? ''}`}
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
          <span className="bar-count">{row.count}</span>
        </div>
      ))}
    </div>
  )
}
