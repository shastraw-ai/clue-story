import {
  Kid,
  Story,
  StoryListItem,
  StoryGenerationParams,
  User,
  AuthResponse,
  UserSettings,
} from '../types';

// Configure this for your backend URL
const API_BASE_URL = __DEV__
  ? 'http://localhost:8000/api'
  : 'https://your-production-url.com/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...(options.headers || {}),
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorJson.message || errorText;
      } catch {
        errorMessage = errorText || `HTTP ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // ============================================
  // Auth
  // ============================================

  async authenticateWithGoogle(idToken: string): Promise<AuthResponse> {
    const response = await this.request<{
      access_token: string;
      token_type: string;
      user: {
        id: string;
        email: string;
        name: string | null;
        picture_url: string | null;
        country: string;
        preferred_model: string;
        created_at: string;
      };
    }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    });

    return {
      accessToken: response.access_token,
      tokenType: response.token_type,
      user: {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        pictureUrl: response.user.picture_url,
        country: response.user.country,
        preferredModel: response.user.preferred_model,
        createdAt: response.user.created_at,
      },
    };
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.request<{
      id: string;
      email: string;
      name: string | null;
      picture_url: string | null;
      country: string;
      preferred_model: string;
      created_at: string;
    }>('/auth/me');

    return {
      id: response.id,
      email: response.email,
      name: response.name,
      pictureUrl: response.picture_url,
      country: response.country,
      preferredModel: response.preferred_model,
      createdAt: response.created_at,
    };
  }

  // ============================================
  // Kids
  // ============================================

  async getKids(): Promise<Kid[]> {
    const response = await this.request<
      Array<{
        id: string;
        name: string;
        grade: string;
        difficulty_level: number;
        alias: string;
        created_at: string;
      }>
    >('/kids');

    return response.map((k) => ({
      id: k.id,
      name: k.name,
      grade: k.grade,
      difficultyLevel: k.difficulty_level,
      alias: k.alias,
    }));
  }

  async createKid(data: {
    name: string;
    grade: string;
    difficultyLevel: number;
  }): Promise<Kid> {
    const response = await this.request<{
      id: string;
      name: string;
      grade: string;
      difficulty_level: number;
      alias: string;
      created_at: string;
    }>('/kids', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        grade: data.grade,
        difficulty_level: data.difficultyLevel,
      }),
    });

    return {
      id: response.id,
      name: response.name,
      grade: response.grade,
      difficultyLevel: response.difficulty_level,
      alias: response.alias,
    };
  }

  async updateKid(
    id: string,
    data: Partial<{ name: string; grade: string; difficultyLevel: number }>
  ): Promise<Kid> {
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.grade !== undefined) body.grade = data.grade;
    if (data.difficultyLevel !== undefined)
      body.difficulty_level = data.difficultyLevel;

    const response = await this.request<{
      id: string;
      name: string;
      grade: string;
      difficulty_level: number;
      alias: string;
      created_at: string;
    }>(`/kids/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    return {
      id: response.id,
      name: response.name,
      grade: response.grade,
      difficultyLevel: response.difficulty_level,
      alias: response.alias,
    };
  }

  async deleteKid(id: string): Promise<void> {
    await this.request<void>(`/kids/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // Stories
  // ============================================

  async getStories(
    skip: number = 0,
    limit: number = 20
  ): Promise<{ stories: StoryListItem[]; total: number }> {
    const response = await this.request<{
      stories: Array<{
        id: string;
        title: string;
        subject: string;
        mode: string;
        num_stages: number;
        num_kids: number;
        kid_names: string[];
        created_at: string;
      }>;
      total: number;
    }>(`/stories?skip=${skip}&limit=${limit}`);

    return {
      stories: response.stories.map((s) => ({
        id: s.id,
        title: s.title,
        subject: s.subject as 'math' | 'reading',
        mode: s.mode as 'plot' | 'story',
        numStages: s.num_stages,
        numKids: s.num_kids,
        kidNames: s.kid_names,
        createdAt: s.created_at,
      })),
      total: response.total,
    };
  }

  async getStory(id: string): Promise<Story> {
    const response = await this.request<{
      id: string;
      title: string;
      subject: string;
      mode: string;
      role: string;
      theme: string;
      kids: Array<{
        id: string;
        name: string;
        grade: string;
        difficulty_level: number;
        alias: string;
      }>;
      stages: Array<{
        stage_number: number;
        content: string;
        problems: Array<{
          kid_alias: string;
          kid_name: string;
          text: string;
          solution: string;
        }>;
      }>;
      created_at: string;
    }>(`/stories/${id}`);

    return {
      id: response.id,
      title: response.title,
      subject: response.subject as 'math' | 'reading',
      mode: response.mode as 'plot' | 'story',
      role: response.role,
      theme: response.theme,
      kids: response.kids.map((k) => ({
        id: k.id,
        name: k.name,
        grade: k.grade,
        difficultyLevel: k.difficulty_level,
        alias: k.alias,
      })),
      stages: response.stages.map((s) => ({
        stageNumber: s.stage_number,
        content: s.content,
        problems: s.problems.map((p) => ({
          kidAlias: p.kid_alias,
          kidName: p.kid_name,
          text: p.text,
          solution: p.solution,
        })),
      })),
      createdAt: response.created_at,
    };
  }

  async generateStory(params: StoryGenerationParams): Promise<Story> {
    const response = await this.request<{
      id: string;
      title: string;
      subject: string;
      mode: string;
      role: string;
      theme: string;
      kids: Array<{
        id: string;
        name: string;
        grade: string;
        difficulty_level: number;
        alias: string;
      }>;
      stages: Array<{
        stage_number: number;
        content: string;
        problems: Array<{
          kid_alias: string;
          kid_name: string;
          text: string;
          solution: string;
        }>;
      }>;
      created_at: string;
    }>('/stories/generate', {
      method: 'POST',
      body: JSON.stringify({
        subject: params.subject,
        mode: params.mode,
        role: params.role,
        theme: params.theme,
        questions_per_kid: params.questionsPerKid,
        kid_ids: params.kidIds,
      }),
    });

    return {
      id: response.id,
      title: response.title,
      subject: response.subject as 'math' | 'reading',
      mode: response.mode as 'plot' | 'story',
      role: response.role,
      theme: response.theme,
      kids: response.kids.map((k) => ({
        id: k.id,
        name: k.name,
        grade: k.grade,
        difficultyLevel: k.difficulty_level,
        alias: k.alias,
      })),
      stages: response.stages.map((s) => ({
        stageNumber: s.stage_number,
        content: s.content,
        problems: s.problems.map((p) => ({
          kidAlias: p.kid_alias,
          kidName: p.kid_name,
          text: p.text,
          solution: p.solution,
        })),
      })),
      createdAt: response.created_at,
    };
  }

  async deleteStory(id: string): Promise<void> {
    await this.request<void>(`/stories/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // Settings
  // ============================================

  async getSettings(): Promise<UserSettings> {
    const response = await this.request<{
      country: string;
      preferred_model: string;
    }>('/settings');

    return {
      country: response.country,
      preferredModel: response.preferred_model,
    };
  }

  async updateSettings(
    settings: Partial<{ country: string; preferredModel: string }>
  ): Promise<UserSettings> {
    const body: Record<string, unknown> = {};
    if (settings.country !== undefined) body.country = settings.country;
    if (settings.preferredModel !== undefined)
      body.preferred_model = settings.preferredModel;

    const response = await this.request<{
      country: string;
      preferred_model: string;
    }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    return {
      country: response.country,
      preferredModel: response.preferred_model,
    };
  }
}

export const apiClient = new ApiClient();
