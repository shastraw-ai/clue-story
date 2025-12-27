import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Story, StoryStage, Kid, Subject } from '../types';

const STORIES_STORAGE_KEY = 'clue_story_stories';

interface StoriesState {
  stories: Story[];
  currentStory: Story | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
}

interface StoriesActions {
  loadStories: () => Promise<void>;
  addStory: (
    title: string,
    subject: Subject,
    role: string,
    theme: string,
    kids: Kid[],
    stages: StoryStage[],
    rawResponse: string
  ) => Promise<Story>;
  deleteStory: (id: string) => Promise<void>;
  setCurrentStory: (story: Story | null) => void;
  getStoryById: (id: string) => Story | undefined;
  setGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
}

export const useStoriesStore = create<StoriesState & StoriesActions>((set, get) => ({
  stories: [],
  currentStory: null,
  isLoading: true,
  isGenerating: false,
  error: null,

  loadStories: async () => {
    set({ isLoading: true });
    try {
      const stored = await AsyncStorage.getItem(STORIES_STORAGE_KEY);
      if (stored) {
        const stories = JSON.parse(stored) as Story[];
        // Sort by date, newest first
        stories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        set({ stories, isLoading: false });
      } else {
        set({ stories: [], isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load stories:', error);
      set({ stories: [], isLoading: false });
    }
  },

  addStory: async (
    title: string,
    subject: Subject,
    role: string,
    theme: string,
    kids: Kid[],
    stages: StoryStage[],
    rawResponse: string
  ): Promise<Story> => {
    const newStory: Story = {
      id: Crypto.randomUUID(),
      title,
      subject,
      role,
      theme,
      kids,
      stages,
      rawResponse,
      createdAt: new Date().toISOString(),
    };

    const { stories } = get();
    const updatedStories = [newStory, ...stories];
    set({ stories: updatedStories, currentStory: newStory });

    try {
      await AsyncStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(updatedStories));
    } catch (error) {
      console.error('Failed to save stories:', error);
    }

    return newStory;
  },

  deleteStory: async (id: string) => {
    const { stories, currentStory } = get();
    const updatedStories = stories.filter((story) => story.id !== id);
    set({
      stories: updatedStories,
      currentStory: currentStory?.id === id ? null : currentStory,
    });

    try {
      await AsyncStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(updatedStories));
    } catch (error) {
      console.error('Failed to save stories:', error);
    }
  },

  setCurrentStory: (story: Story | null) => {
    set({ currentStory: story });
  },

  getStoryById: (id: string): Story | undefined => {
    return get().stories.find((story) => story.id === id);
  },

  setGenerating: (generating: boolean) => {
    set({ isGenerating: generating });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
