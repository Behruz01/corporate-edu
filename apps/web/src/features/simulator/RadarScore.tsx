import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { dimensionEntries } from './score-utils';
import type { ScoreDimensions } from './types';

type RadarScoreProps = {
  dimensions: ScoreDimensions;
};

export function RadarScore({ dimensions }: RadarScoreProps): JSX.Element {
  const { t } = useTranslation('simulator');
  const points = useMemo(() => {
    return dimensionEntries(dimensions).map((entry, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / 5;
      const radius = 76 * (entry.value / 100);
      return {
        ...entry,
        x: 100 + Math.cos(angle) * radius,
        y: 100 + Math.sin(angle) * radius,
        labelX: 100 + Math.cos(angle) * 94,
        labelY: 100 + Math.sin(angle) * 94,
      };
    });
  }, [dimensions]);

  const grid = [0.25, 0.5, 0.75, 1].map((scale) => {
    return Array.from({ length: 5 }, (_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / 5;
      const radius = 76 * scale;
      return `${100 + Math.cos(angle) * radius},${100 + Math.sin(angle) * radius}`;
    }).join(' ');
  });
  const axes = Array.from({ length: 5 }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / 5;
    return {
      x: 100 + Math.cos(angle) * 76,
      y: 100 + Math.sin(angle) * 76,
    };
  });

  return (
    <svg className="h-72 w-full max-w-md" viewBox="0 0 200 200" role="img" aria-label={t('score.radar')}>
      {grid.map((polygon) => (
        <polygon key={polygon} points={polygon} fill="none" stroke="hsl(var(--border))" strokeWidth="0.8" />
      ))}
      {axes.map((axis) => (
        <line
          key={`${axis.x}-${axis.y}`}
          x1="100"
          y1="100"
          x2={axis.x}
          y2={axis.y}
          stroke="hsl(var(--border))"
          strokeWidth="0.8"
        />
      ))}
      <polygon
        points={points.map((point) => `${point.x},${point.y}`).join(' ')}
        fill="hsl(var(--primary) / 0.18)"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
      />
      {points.map((point) => (
        <g key={point.key}>
          <circle cx={point.x} cy={point.y} r="3" fill="hsl(var(--primary))" />
          <text
            x={point.labelX}
            y={point.labelY}
            textAnchor={point.labelX < 90 ? 'end' : point.labelX > 110 ? 'start' : 'middle'}
            dominantBaseline="middle"
            className="fill-muted-foreground text-[8px] font-medium"
          >
            {t(`dimensions.${point.key}`)}
          </text>
        </g>
      ))}
    </svg>
  );
}
