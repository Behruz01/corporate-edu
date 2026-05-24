import { z } from 'zod';

export const simulatorScoreSchema = z.object({
  overall: z.number().min(0).max(100),
  dimensions: z.object({
    correctness: z.number().min(0).max(100),
    tone: z.number().min(0).max(100),
    processAdherence: z.number().min(0).max(100),
    resolution: z.number().min(0).max(100),
    compliance: z.number().min(0).max(100),
  }),
  feedback: z.array(z.object({
    dimension: z.string(),
    comment: z.string(),
    quote: z.string().optional(),
    severity: z.enum(['praise', 'minor', 'major']),
  })),
  weakAreas: z.array(z.object({
    topic: z.string(),
    suggestKbQuery: z.string().optional(),
    suggestPersonaTags: z.array(z.string()),
  })),
});

export type SimulatorScorePayload = z.infer<typeof simulatorScoreSchema>;
