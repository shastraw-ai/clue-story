import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const API_KEY_STORAGE = 'openai_api_key';

interface SettingsState {
  hasApiKey: boolean;
  isLoading: boolean;
}

interface SettingsActions {
  setApiKey: (key: string) => Promise<void>;
  getApiKey: () => Promise<string | null>;
  deleteApiKey: () => Promise<void>;
  checkApiKey: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState & SettingsActions>((set) => ({
  hasApiKey: false,
  isLoading: true,

  setApiKey: async (key: string) => {
    await SecureStore.setItemAsync(API_KEY_STORAGE, key);
    set({ hasApiKey: true });
  },

  getApiKey: async (): Promise<string | null> => {
    return await SecureStore.getItemAsync(API_KEY_STORAGE);
  },

  deleteApiKey: async () => {
    await SecureStore.deleteItemAsync(API_KEY_STORAGE);
    set({ hasApiKey: false });
  },

  checkApiKey: async () => {
    set({ isLoading: true });
    const key = await SecureStore.getItemAsync(API_KEY_STORAGE);
    set({ hasApiKey: !!key, isLoading: false });
  },
}));
