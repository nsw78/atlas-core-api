"use client";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Custom tooltip style
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-xl">
        <p className="text-xs text-gray-400">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Risk Trend Line Chart
interface TrendData {
  date: string;
  value: number;
  [key: string]: string | number;
}

interface RiskTrendChartProps {
  data: TrendData[];
  dataKeys?: { key: string; color: string; name: string }[];
}

export function RiskTrendChart({ data, dataKeys }: RiskTrendChartProps) {
  const defaultKeys = [{ key: "value", color: "#3b82f6", name: "Risk Score" }];
  const keys = dataKeys || defaultKeys;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {keys.map((k) => (
            <linearGradient key={k.key} id={`gradient-${k.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={k.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={k.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="#6b7280"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#6b7280"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
        />
        <Tooltip content={<CustomTooltip />} />
        {keys.map((k) => (
          <Area
            key={k.key}
            type="monotone"
            dataKey={k.key}
            name={k.name}
            stroke={k.color}
            strokeWidth={2}
            fill={`url(#gradient-${k.key})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Distribution Bar Chart
interface DistributionData {
  name: string;
  value: number;
  color?: string;
}

interface DistributionChartProps {
  data: DistributionData[];
  layout?: "horizontal" | "vertical";
}

export function DistributionChart({ data, layout = "horizontal" }: DistributionChartProps) {
  const colors = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6"];

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart
        data={data}
        layout={layout === "vertical" ? "vertical" : "horizontal"}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        {layout === "vertical" ? (
          <>
            <XAxis type="number" stroke="#6b7280" fontSize={12} tickLine={false} />
            <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={12} tickLine={false} width={80} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} />
            <YAxis stroke="#6b7280" fontSize={12} tickLine={false} />
          </>
        )}
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Donut Chart for Risk Distribution
interface DonutData {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutData[];
  centerLabel?: string;
  centerValue?: string | number;
}

export function DonutChart({ data, centerLabel, centerValue }: DonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {centerLabel && (
          <text
            x="50%"
            y="45%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-gray-400 text-xs"
          >
            {centerLabel}
          </text>
        )}
        {centerValue && (
          <text
            x="50%"
            y="55%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-white text-xl font-bold"
          >
            {centerValue}
          </text>
        )}
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => <span className="text-xs text-gray-400">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Sparkline for compact trends
interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export function Sparkline({ data, color = "#3b82f6", height = 40 }: SparklineProps) {
  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
