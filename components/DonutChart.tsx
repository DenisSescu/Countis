import { View, Text } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { fontSize } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface PieSlice { value: number; color: string }
interface DonutChartProps { data: PieSlice[]; size?: number; strokeWidth?: number; centerLabel?: string; centerValue?: string; }

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export default function DonutChart({ data, size = 180, strokeWidth = 28, centerLabel, centerValue }: DonutChartProps) {
  const { colors } = useTheme();
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  if (total === 0) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}><Circle cx={cx} cy={cy} r={r} stroke={colors.backgroundSecondary} strokeWidth={strokeWidth} fill="none" /></Svg>
      </View>
    );
  }

  let currentAngle = 0;
  const arcs = data.map((slice) => {
    const sliceAngle = (slice.value / total) * 360;
    const gap = data.length > 1 ? 2 : 0;
    const sa = currentAngle + gap / 2;
    const ea = currentAngle + sliceAngle - gap / 2;
    currentAngle += sliceAngle;
    return { path: describeArc(cx, cy, r, sa, Math.max(ea, sa + 0.1)), color: slice.color };
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {arcs.map((arc, i) => <Path key={i} d={arc.path} stroke={arc.color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />)}
      </Svg>
      {(centerLabel || centerValue) && (
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          {centerValue && <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary }}>{centerValue}</Text>}
          {centerLabel && <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>{centerLabel}</Text>}
        </View>
      )}
    </View>
  );
}
