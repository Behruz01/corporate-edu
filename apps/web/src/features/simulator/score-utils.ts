import type { ScoreDimensions } from './types';

export const dimensionKeys = ['correctness', 'tone', 'processAdherence', 'resolution', 'compliance'] as const;
export type DimensionKey = (typeof dimensionKeys)[number];

export function dimensionEntries(dimensions: ScoreDimensions): Array<{ key: DimensionKey; value: number }> {
  return dimensionKeys.map((key) => ({ key, value: dimensions[key] }));
}
