import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Kid, Gender } from '../types';
import { BOY_ALIASES, GIRL_ALIASES } from '../constants/aliases';
import { MAX_KIDS } from '../constants/examples';

const KIDS_STORAGE_KEY = 'clue_story_kids';

interface KidsState {
  kids: Kid[];
  isLoading: boolean;
}

interface KidsActions {
  loadKids: () => Promise<void>;
  addKid: (name: string, grade: string, gender: Gender, difficultyLevel: number) => Promise<boolean>;
  updateKid: (id: string, updates: Partial<Omit<Kid, 'id' | 'alias'>>) => Promise<void>;
  deleteKid: (id: string) => Promise<void>;
  getNextAlias: (gender: Gender) => string;
}

export const useKidsStore = create<KidsState & KidsActions>((set, get) => ({
  kids: [],
  isLoading: true,

  loadKids: async () => {
    set({ isLoading: true });
    try {
      const stored = await AsyncStorage.getItem(KIDS_STORAGE_KEY);
      if (stored) {
        const kids = JSON.parse(stored) as Kid[];
        set({ kids, isLoading: false });
      } else {
        set({ kids: [], isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load kids:', error);
      set({ kids: [], isLoading: false });
    }
  },

  getNextAlias: (gender: Gender): string => {
    const aliases = gender === 'boy' ? BOY_ALIASES : GIRL_ALIASES;
    const usedAliases = get()
      .kids.filter((k) => k.gender === gender)
      .map((k) => k.alias);

    const available = aliases.find((a) => !usedAliases.includes(a));
    if (available) {
      return available;
    }
    // Fallback: use first alias with number suffix
    return `${aliases[0]}${usedAliases.length + 1}`;
  },

  addKid: async (
    name: string,
    grade: string,
    gender: Gender,
    difficultyLevel: number
  ): Promise<boolean> => {
    const { kids, getNextAlias } = get();

    if (kids.length >= MAX_KIDS) {
      return false;
    }

    const alias = getNextAlias(gender);
    const newKid: Kid = {
      id: Crypto.randomUUID(),
      name,
      grade,
      gender,
      difficultyLevel,
      alias,
    };

    const updatedKids = [...kids, newKid];
    set({ kids: updatedKids });

    try {
      await AsyncStorage.setItem(KIDS_STORAGE_KEY, JSON.stringify(updatedKids));
    } catch (error) {
      console.error('Failed to save kids:', error);
    }

    return true;
  },

  updateKid: async (id: string, updates: Partial<Omit<Kid, 'id' | 'alias'>>) => {
    const { kids } = get();
    const updatedKids = kids.map((kid) =>
      kid.id === id ? { ...kid, ...updates } : kid
    );
    set({ kids: updatedKids });

    try {
      await AsyncStorage.setItem(KIDS_STORAGE_KEY, JSON.stringify(updatedKids));
    } catch (error) {
      console.error('Failed to save kids:', error);
    }
  },

  deleteKid: async (id: string) => {
    const { kids } = get();
    const updatedKids = kids.filter((kid) => kid.id !== id);
    set({ kids: updatedKids });

    try {
      await AsyncStorage.setItem(KIDS_STORAGE_KEY, JSON.stringify(updatedKids));
    } catch (error) {
      console.error('Failed to save kids:', error);
    }
  },
}));
