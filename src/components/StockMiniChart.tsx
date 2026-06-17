import React, { useRef, useState, useEffect } from "react";

interface HistoryPoint {
  date: string;
  price: number;
}

interface StockMiniChartProps {
  history: HistoryPoint[];
  color?: string;
  showTooltip?: boolean;
  height?: number;
}

export const StockMiniChart: React.FC<StockMiniChartProps> = ({
  history,
  color,
  showTooltip = false,
  height = 140,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Responsive container width tracking
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentRect.width > 20) {
          setWidth(entry.contentRect.width);
        }
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  if (!history || history.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-500 text-xs">
        No chart points available
      </div>
    );
  }

  // Calculate coordinates
  const prices = history.map((pt) => pt.price);
  const minPrice = Math.min(...prices) * 0.995; // add 0.5% buffer padding
  const maxPrice = Math.max(...prices) * 1.005;
  const priceRange = maxPrice - minPrice || 1;

  const points = history.map((pt, index) => {
    const x = (index / (history.length - 1)) * width;
    const y = height - ((pt.price - minPrice) / priceRange) * (height - 20) - 10;
    return { x, y, price: pt.price, date: pt.date };
  });

  // Calculate svg path string (Curved cubic bezier or linear)
  let pathD = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      // Control points for bezier curve smoothing
      const cpX1 = prev.x + (curr.x - prev.x) / 2;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (curr.x - prev.x) / 2;
      const cpY2 = curr.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
    }
  }

  // Calculate area gradient path
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  // Determine line color based on whether the price increased overall
  const isUp = prices[prices.length - 1] >= prices[0];
  const chartColor = color || (isUp ? "#10b981" : "#ef4444"); // emerald vs rose

  // Handle pointer hover values
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const segmentWidth = width / (history.length - 1);
    const index = Math.round(mouseX / segmentWidth);
    if (index >= 0 && index < history.length) {
      setHoverIndex(index);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div ref={containerRef} className="w-full select-none">
      {showTooltip && activePoint && (
        <div className="flex justify-between items-center px-1 mb-2 text-xs">
          <span className="text-gray-400 font-mono">{activePoint.date}</span>
          <span className="font-semibold text-gray-900 dark:text-white font-mono">
            ${activePoint.price.toFixed(2)}
          </span>
        </div>
      )}
      <div className="relative">
        <svg
          width={width}
          height={height}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={`gradient-${chartColor.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColor} stopOpacity={0.25} />
              <stop offset="100%" stopColor={chartColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Area under curve */}
          <path d={areaD} fill={`url(#gradient-${chartColor.replace("#", "")})`} className="transition-all duration-300" />

          {/* Core trendline */}
          <path
            d={pathD}
            fill="none"
            stroke={chartColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />

          {/* Hover highlight line */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={0}
              x2={activePoint.x}
              y2={height}
              stroke="currentColor"
              className="text-gray-200 dark:text-gray-800"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          )}

          {/* Hover dot */}
          {activePoint && (
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="6"
              fill={chartColor}
              stroke="white"
              strokeWidth="2"
              className="shadow-md"
            />
          )}
        </svg>
      </div>
    </div>
  );
};
