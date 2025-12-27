export type Gender = 'boy' | 'girl';

export type Subject = 'math' | 'reading';

export interface Kid {
  id: string;
  name: string;
  grade: string; // 'K', '1', '2', ... '12'
  gender: Gender;
  difficultyLevel: number; // 1-5
  alias: string; // Auto-assigned from predefined list
}

export interface ProblemContent {
  kidAlias: string;
  kidName: string;
  text: string;
}

export interface StoryStage {
  content: string;
  problem?: ProblemContent;
  solution?: string;
}

export interface Story {
  id: string;
  title: string;
  subject: Subject;
  role: string;
  theme: string;
  kids: Kid[];
  stages: StoryStage[];
  rawResponse: string;
  createdAt: string;
}

export interface StoryGenerationParams {
  subject: Subject;
  role: string;
  theme: string;
  questionsPerKid: number;
  kids: Kid[];
}
