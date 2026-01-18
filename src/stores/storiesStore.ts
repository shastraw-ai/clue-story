import { create } from 'zustand';
import { Story, StoryListItem, StoryGenerationParams } from '../types';
import { apiClient } from '../services/api';

interface StoriesState {
  stories: StoryListItem[];
  currentStory: Story | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  total: number;
}

interface StoriesActions {
  loadStories: () => Promise<void>;
  generateStory: (params: StoryGenerationParams) => Promise<Story>;
  getStoryById: (id: string) => Promise<Story>;
  deleteStory: (id: string) => Promise<void>;
  setCurrentStory: (story: Story | null) => void;
  setGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  clearStories: () => void;
}

export const useStoriesStore = create<StoriesState & StoriesActions>((set, get) => ({
  stories: [],
  currentStory: null,
  isLoading: false,
  isGenerating: false,
  error: null,
  total: 0,

  loadStories: async () => {
    set({ isLoading: true, error: null });
    try {
      const { stories, total } = await apiClient.getStories();
      set({ stories, total, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load stories';
      console.error('Failed to load stories:', error);
      set({ stories: [], total: 0, isLoading: false, error: message });
    }
  },

  generateStory: async (params: StoryGenerationParams): Promise<Story> => {
    set({ isGenerating: true, error: null });
    try {
      const story = await apiClient.generateStory(params);
      set({ currentStory: story, isGenerating: false });

      // Refresh stories list
      get().loadStories();

      return story;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate story';
      set({ error: message, isGenerating: false });
      throw error;
    }
  },

  getStoryById: async (id: string): Promise<Story> => {
    // Check if current story matches
    const { currentStory } = get();
    if (currentStory?.id === id) {
      return currentStory;
    }

    try {
      const story = await apiClient.getStory(id);
      set({ currentStory: story });
      return story;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load story';
      set({ error: message });
      throw error;
    }
  },

  deleteStory: async (id: string) => {
    set({ error: null });
    try {
      await apiClient.deleteStory(id);
      set((state) => ({
        stories: state.stories.filter((story) => story.id !== id),
        currentStory: state.currentStory?.id === id ? null : state.currentStory,
        total: state.total - 1,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete story';
      set({ error: message });
      throw error;
    }
  },

  setCurrentStory: (story: Story | null) => {
    set({ currentStory: story });
  },

  setGenerating: (generating: boolean) => {
    set({ isGenerating: generating });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearStories: () => {
    set({ stories: [], currentStory: null, total: 0, error: null });
  },
}));
