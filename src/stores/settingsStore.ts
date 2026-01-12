import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { detectCountry } from '../utils/locale';

const API_KEY_STORAGE = 'openai_api_key';
const NOTIFICATION_SETTINGS_KEY = 'notification_settings';
const COUNTRY_SETTINGS_KEY = 'country_settings';
const MODEL_SETTINGS_KEY = 'llm_model';

export const LLM_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
  { value: 'gpt-5', label: 'GPT-5' },
] as const;

export type LLMModel = typeof LLM_MODELS[number]['value'];
export const DEFAULT_MODEL: LLMModel = 'gpt-4o-mini';

export interface NotificationTime {
  hour: number;
  minute: number;
}

interface NotificationSettings {
  enabled: boolean;
  time: NotificationTime;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  time: { hour: 19, minute: 30 }, // Default to 7:30 PM
};

interface SettingsState {
  hasApiKey: boolean;
  isLoading: boolean;
  notificationSettings: NotificationSettings;
  country: string | null;
  model: LLMModel;
}

interface SettingsActions {
  setApiKey: (key: string) => Promise<void>;
  getApiKey: () => Promise<string | null>;
  deleteApiKey: () => Promise<void>;
  checkApiKey: () => Promise<void>;
  loadNotificationSettings: () => Promise<void>;
  setNotificationEnabled: (enabled: boolean) => Promise<void>;
  setNotificationTime: (time: NotificationTime) => Promise<void>;
  loadCountry: () => Promise<void>;
  setCountry: (country: string) => Promise<void>;
  loadModel: () => Promise<void>;
  setModel: (model: LLMModel) => Promise<void>;
}

export const useSettingsStore = create<SettingsState & SettingsActions>((set, get) => ({
  hasApiKey: false,
  isLoading: true,
  notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
  country: null,
  model: DEFAULT_MODEL,

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

  loadNotificationSettings: async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        const settings = JSON.parse(stored) as NotificationSettings;
        set({ notificationSettings: settings });
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  },

  setNotificationEnabled: async (enabled: boolean) => {
    const { notificationSettings } = get();
    const updated = { ...notificationSettings, enabled };
    set({ notificationSettings: updated });
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
  },

  setNotificationTime: async (time: NotificationTime) => {
    const { notificationSettings } = get();
    const updated = { ...notificationSettings, time };
    set({ notificationSettings: updated });
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
  },

  loadCountry: async () => {
    try {
      const stored = await AsyncStorage.getItem(COUNTRY_SETTINGS_KEY);
      if (stored) {
        set({ country: stored });
      } else {
        // Auto-detect on first load
        const detected = detectCountry();
        if (detected) {
          set({ country: detected });
          await AsyncStorage.setItem(COUNTRY_SETTINGS_KEY, detected);
        }
      }
    } catch (error) {
      console.error('Failed to load country:', error);
    }
  },

  setCountry: async (country: string) => {
    set({ country });
    await AsyncStorage.setItem(COUNTRY_SETTINGS_KEY, country);
  },

  loadModel: async () => {
    try {
      const stored = await AsyncStorage.getItem(MODEL_SETTINGS_KEY);
      if (stored && LLM_MODELS.some(m => m.value === stored)) {
        set({ model: stored as LLMModel });
      }
    } catch (error) {
      console.error('Failed to load model:', error);
    }
  },

  setModel: async (model: LLMModel) => {
    set({ model });
    await AsyncStorage.setItem(MODEL_SETTINGS_KEY, model);
  },
}));
