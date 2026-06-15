import React, { useState } from 'react';

// ==========================================
// 1. CUSTOM SVG DONUT CHART
// ==========================================
export function DonutChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let accumulatedPercent = 0;

  if (total === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No data to display</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '160px', height: '160px' }}>
        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
          {data.map((item, idx) => {
            const percentage = (item.value / total) * 100;
            const strokeDasharray = `${percentage} ${100 - percentage}`;
            const strokeDashoffset = 100 - accumulatedPercent;
            accumulatedPercent += percentage;

            return (
              <circle
                key={idx}
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke={item.color}
                strokeWidth="12"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transition: 'stroke-dashoffset 0.6s ease',
                }}
              />
            );
          })}
          {/* Inner hole */}
          <circle cx="50" cy="50" r="28" fill="var(--bg-primary)" />
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '1.2rem', fontWeight: '800' }}>{Math.round(total)}</span>
          <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '600' }}>kg CO2e</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '140px' }}>
        {data.map((item, idx) => {
          const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: item.color }} />
              <span style={{ fontWeight: '500', color: 'var(--text-primary)', textTransform: 'capitalize' }}>{item.name}:</span>
              <span style={{ marginLeft: 'auto', fontWeight: '700', color: 'var(--text-secondary)' }}>
                {Math.round(item.value)} kg ({percent}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// 2. CUSTOM SVG LINE CHART (Emissions Trend)
// ==========================================
export function LineChart({ data, categoryColors }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No history entries yet.</p>
      </div>
    );
  }

  // Dimension settings
  const width = 500;
  const height = 200;
  const padding = 30;

  // Find boundaries
  const yValues = data.map(d => d.total);
  const maxY = Math.max(...yValues, 100); // minimum height limit
  const minY = 0;

  // Chart helpers to scale values
  const getX = (index) => {
    if (data.length <= 1) return width / 2;
    return padding + (index * (width - padding * 2)) / (data.length - 1);
  };

  const getY = (val) => {
    return height - padding - ((val - minY) * (height - padding * 2)) / (maxY - minY);
  };

  // Generate line points path
  let pathD = '';
  let areaD = '';

  if (data.length > 0) {
    const startX = getX(0);
    const startY = getY(data[0].total);
    pathD = `M ${startX} ${startY}`;
    areaD = `M ${startX} ${height - padding} L ${startX} ${startY}`;

    for (let i = 1; i < data.length; i++) {
      const x = getX(i);
      const y = getY(data[i].total);
      pathD += ` L ${x} ${y}`;
      areaD += ` L ${x} ${y}`;
    }

    const endX = getX(data.length - 1);
    areaD += ` L ${endX} ${height - padding} Z`;
  }

  // Y-axis grid labels
  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount }).map((_, idx) => {
    const val = minY + (idx * (maxY - minY)) / (gridCount - 1);
    return Math.round(val);
  });

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        <defs>
          <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-color)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--accent-color)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Y Grid Lines */}
        {gridLines.map((val, idx) => {
          const y = getY(val);
          return (
            <g key={idx}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="var(--border-color)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding - 6}
                y={y + 4}
                textAnchor="end"
                fill="var(--text-secondary)"
                fontSize="8px"
                fontWeight="600"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* X Axis Labels */}
        {data.map((d, idx) => {
          const x = getX(idx);
          const dateStr = new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          return (
            <text
              key={idx}
              x={x}
              y={height - 10}
              textAnchor="middle"
              fill="var(--text-secondary)"
              fontSize="8px"
              fontWeight="600"
            >
              {dateStr}
            </text>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#chart-area-grad)" />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--accent-color)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'all 0.3s ease' }}
        />

        {/* Data points */}
        {data.map((d, idx) => {
          const x = getX(idx);
          const y = getY(d.total);
          return (
            <g key={idx} style={{ cursor: 'pointer' }}>
              <circle
                cx={x}
                cy={y}
                r="5"
                fill="var(--bg-primary)"
                stroke="var(--accent-color)"
                strokeWidth="2.5"
                onMouseEnter={() => setHoveredPoint({ ...d, x, y })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              <circle
                cx={x}
                cy={y}
                r="12"
                fill="transparent"
                onMouseEnter={() => setHoveredPoint({ ...d, x, y })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            </g>
          );
        })}
      </svg>

      {/* Tooltip Overlay */}
      {hoveredPoint && (
        <div style={{
          position: 'absolute',
          left: `${(hoveredPoint.x / width) * 100}%`,
          top: `${(hoveredPoint.y / height) * 100 - 35}%`,
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: '0.72rem',
          fontWeight: '600',
          boxShadow: 'var(--shadow-md)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          alignItems: 'center'
        }}>
          <div>{new Date(hoveredPoint.date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
          <div style={{ color: 'var(--accent-color)', fontWeight: '800' }}>{hoveredPoint.total} kg CO2e</div>
        </div>
      )}
    </div>
  );
}
