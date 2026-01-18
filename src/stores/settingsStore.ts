import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../services/api';

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

export const LLM_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
  { value: 'gpt-5', label: 'GPT-5' },
] as const;

export type LLMModel = (typeof LLM_MODELS)[number]['value'];
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
  isLoading: boolean;
  notificationSettings: NotificationSettings;
  country: string;
  model: LLMModel;
  error: string | null;
}

interface SettingsActions {
  loadSettings: () => Promise<void>;
  loadNotificationSettings: () => Promise<void>;
  setNotificationEnabled: (enabled: boolean) => Promise<void>;
  setNotificationTime: (time: NotificationTime) => Promise<void>;
  setCountry: (country: string) => Promise<void>;
  setModel: (model: LLMModel) => Promise<void>;
  clearSettings: () => void;
}

export const useSettingsStore = create<SettingsState & SettingsActions>((set, get) => ({
  isLoading: false,
  notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
  country: 'US',
  model: DEFAULT_MODEL,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await apiClient.getSettings();
      set({
        country: settings.country,
        model: settings.preferredModel as LLMModel,
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load settings';
      console.error('Failed to load settings:', error);
      set({ isLoading: false, error: message });
    }
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

  setCountry: async (country: string) => {
    set({ error: null });
    try {
      await apiClient.updateSettings({ country });
      set({ country });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update country';
      set({ error: message });
      throw error;
    }
  },

  setModel: async (model: LLMModel) => {
    set({ error: null });
    try {
      await apiClient.updateSettings({ preferredModel: model });
      set({ model });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update model';
      set({ error: message });
      throw error;
    }
  },

  clearSettings: () => {
    set({
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      country: 'US',
      model: DEFAULT_MODEL,
      error: null,
    });
  },
}));
