export type Difficulty = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
export type Speaker = 'EMPLOYEE' | 'AI_PERSONA';

export type ScenarioCriterion = {
  id: string;
  dimension: string;
  weight: number;
  rubric: string;
};

export type Scenario = {
  id: string;
  category: string;
  title: string;
  brief: string;
  personaDesc: string;
  difficulty: Difficulty;
  lang: 'UZ' | 'RU' | 'EN';
  active: boolean;
  createdAt: string;
  criteria: ScenarioCriterion[];
};

export type SimulatorTurn = {
  id: string;
  sessionId: string;
  turnIndex: number;
  speaker: Speaker;
  text: string;
  createdAt: string;
};

export type ScoreDimensions = {
  correctness: number;
  tone: number;
  processAdherence: number;
  resolution: number;
  compliance: number;
};

export type ScoreFeedback = {
  dimension: string;
  comment: string;
  quote?: string;
  severity: 'praise' | 'minor' | 'major';
};

export type WeakArea = {
  topic: string;
  suggestKbQuery?: string;
  suggestPersonaTags: string[];
};

export type SimulatorScore = {
  id: string;
  sessionId: string;
  overall: number;
  dimensions: ScoreDimensions;
  feedback: ScoreFeedback[];
  weakAreas: WeakArea[];
  createdAt: string;
};

export type SimulatorSession = {
  id: string;
  status: SessionStatus;
  attemptNum: number;
  startedAt: string;
  endedAt: string | null;
  scenario: Scenario;
  turns: SimulatorTurn[];
  score: SimulatorScore | null;
};
