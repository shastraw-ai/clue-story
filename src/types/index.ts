export type Subject = 'math' | 'reading';

export type StoryMode = 'plot' | 'story';

export interface Kid {
  id: string;
  name: string;
  grade: string; // 'K', '1', '2', ... '12'
  difficultyLevel: number; // 1-5
  alias: string; // Auto-assigned from predefined list
}

export interface ProblemContent {
  kidAlias: string;
  kidName: string;
  text: string;
  solution: string;
}

export interface StoryStage {
  stageNumber: number;
  content: string;
  problems: ProblemContent[];
}

export interface StoryKid {
  id: string;
  name: string;
  grade: string;
  difficultyLevel: number;
  alias: string;
}

export interface Story {
  id: string;
  title: string;
  subject: Subject;
  mode: StoryMode;
  role: string;
  theme: string;
  kids: StoryKid[];
  stages: StoryStage[];
  createdAt: string;
}

export interface StoryListItem {
  id: string;
  title: string;
  subject: Subject;
  mode: StoryMode;
  numStages: number;
  numKids: number;
  kidNames: string[];
  createdAt: string;
}

export interface StoryGenerationParams {
  subject: Subject;
  mode: StoryMode;
  role: string;
  theme: string;
  questionsPerKid: number;
  kidIds: string[];
}

// Auth types
export interface User {
  id: string;
  email: string;
  name: string | null;
  pictureUrl: string | null;
  country: string;
  preferredModel: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  user: User;
}

export interface UserSettings {
  country: string;
  preferredModel: string;
}
