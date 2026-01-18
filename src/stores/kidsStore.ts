import { create } from 'zustand';
import { Kid } from '../types';
import { apiClient } from '../services/api';

interface KidsState {
  kids: Kid[];
  isLoading: boolean;
  error: string | null;
}

interface KidsActions {
  loadKids: () => Promise<void>;
  addKid: (name: string, grade: string, difficultyLevel: number) => Promise<Kid>;
  updateKid: (id: string, updates: Partial<{ name: string; grade: string; difficultyLevel: number }>) => Promise<void>;
  deleteKid: (id: string) => Promise<void>;
  clearKids: () => void;
}

export const useKidsStore = create<KidsState & KidsActions>((set, get) => ({
  kids: [],
  isLoading: false,
  error: null,

  loadKids: async () => {
    set({ isLoading: true, error: null });
    try {
      const kids = await apiClient.getKids();
      set({ kids, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load kids';
      console.error('Failed to load kids:', error);
      set({ kids: [], isLoading: false, error: message });
    }
  },

  addKid: async (
    name: string,
    grade: string,
    difficultyLevel: number
  ): Promise<Kid> => {
    set({ error: null });
    try {
      const newKid = await apiClient.createKid({ name, grade, difficultyLevel });
      set((state) => ({ kids: [...state.kids, newKid] }));
      return newKid;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add kid';
      set({ error: message });
      throw error;
    }
  },

  updateKid: async (
    id: string,
    updates: Partial<{ name: string; grade: string; difficultyLevel: number }>
  ) => {
    set({ error: null });
    try {
      const updatedKid = await apiClient.updateKid(id, updates);
      set((state) => ({
        kids: state.kids.map((kid) => (kid.id === id ? updatedKid : kid)),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update kid';
      set({ error: message });
      throw error;
    }
  },

  deleteKid: async (id: string) => {
    set({ error: null });
    try {
      await apiClient.deleteKid(id);
      set((state) => ({
        kids: state.kids.filter((kid) => kid.id !== id),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete kid';
      set({ error: message });
      throw error;
    }
  },

  clearKids: () => {
    set({ kids: [], error: null });
  },
}));
