import * as Localization from 'expo-localization';
import { COUNTRIES } from '../constants/countries';

/**
 * Attempt to detect user's country from device locale
 */
export function detectCountry(): string | null {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const region = locales[0].regionCode;
      if (region) {
        // Check if we support this country
        const supported = COUNTRIES.find(c => c.code === region);
        if (supported) {
          return region;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}
