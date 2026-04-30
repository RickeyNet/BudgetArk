import React from "react";
import { View } from "react-native";
import Svg, { Polyline, Line, Circle, Rect, Text as SvgText } from "react-native-svg";

export interface SparklinePoint {
  label: string;
  value: number;
}

interface SparklineChartProps {
  data: SparklinePoint[];
  width?: number;
  height?: number;
  lineColor?: string;
  fillColor?: string;
  labelColor?: string;
  dotColor?: string;
  gridColor?: string;
}

const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  width = 320,
  height = 140,
  lineColor = "#4ade80",
  fillColor,
  labelColor = "#888",
  dotColor,
  gridColor = "#333",
}) => {
  if (data.length < 1) return null;

  const paddingTop = 12;
  const paddingBottom = 24;
  const paddingX = 28;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingTop - paddingBottom;

  const resolvedDotColor = dotColor ?? lineColor;

  // Single data point — render centered dot with value
  if (data.length === 1) {
    const cx = width / 2;
    const cy = paddingTop + chartH * 0.4;
    return (
      <View style={{ alignSelf: "center" }}>
        <Svg width={width} height={height}>
          {[0, 0.5, 1].map((frac) => {
            const y = paddingTop + chartH * (1 - frac);
            return (
              <Line
                key={`grid-${frac}`}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke={gridColor}
                strokeWidth={0.5}
                strokeDasharray="4,4"
              />
            );
          })}
          {fillColor && (
            <Rect
              x={cx - 20}
              y={cy}
              width={40}
              height={paddingTop + chartH - cy}
              fill={fillColor}
              rx={4}
            />
          )}
          <Circle cx={cx} cy={cy} r={5} fill={resolvedDotColor} />
          <SvgText
            x={cx}
            y={cy - 10}
            fill={labelColor}
            fontSize={11}
            fontWeight="700"
            textAnchor="middle"
          >
            {Math.round(data[0].value).toLocaleString()}
          </SvgText>
          <SvgText
            x={cx}
            y={height - 4}
            fill={labelColor}
            fontSize={10}
            fontWeight="600"
            textAnchor="middle"
          >
            {data[0].label}
          </SvgText>
        </Svg>
      </View>
    );
  }

  const values = data.map((d) => d.value);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;

  const toX = (i: number) => paddingX + (i / (data.length - 1)) * chartW;
  const toY = (v: number) =>
    paddingTop + chartH - ((v - minVal) / range) * chartH;

  const points = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(" ");

  return (
    <View style={{ alignSelf: "center" }}>
      <Svg width={width} height={height}>
        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((frac) => {
          const y = paddingTop + chartH * (1 - frac);
          return (
            <Line
              key={`grid-${frac}`}
              x1={paddingX}
              y1={y}
              x2={width - paddingX}
              y2={y}
              stroke={gridColor}
              strokeWidth={0.5}
              strokeDasharray="4,4"
            />
          );
        })}

        {/* Optional fill area */}
        {fillColor && (
          <Polyline
            points={`${toX(0)},${toY(minVal)} ${points} ${toX(data.length - 1)},${toY(minVal)}`}
            fill={fillColor}
            stroke="none"
          />
        )}

        {/* Data line */}
        <Polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data dots */}
        {data.map((d, i) => (
          <Circle
            key={`dot-${i}`}
            cx={toX(i)}
            cy={toY(d.value)}
            r={3.5}
            fill={resolvedDotColor}
          />
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <SvgText
            key={`label-${i}`}
            x={toX(i)}
            y={height - 4}
            fill={labelColor}
            fontSize={10}
            fontWeight="600"
            textAnchor="middle"
          >
            {d.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
};

export default React.memo(SparklineChart);
