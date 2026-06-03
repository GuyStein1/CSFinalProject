import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import i18n from '../i18n';
import api from '../api/axiosInstance';

type Language = 'en' | 'he';

interface LanguageContextValue {
  language: Language;
  isRTL: boolean;
  changeLanguage: (lang: Language) => Promise<void>;
  syncFromServer: (lang: Language) => void;
}

const STORAGE_KEY = '@fixit_language';

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  isRTL: false,
  changeLanguage: async () => {},
  syncFromServer: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      const lang = (stored === 'he' ? 'he' : 'en') as Language;
      setLanguage(lang);
      i18n.changeLanguage(lang);
    }).catch(() => {});
  }, []);

  const syncFromServer = useCallback((lang: Language) => {
    if (lang !== language) {
      setLanguage(lang);
      i18n.changeLanguage(lang);
      AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {});
    }
  }, [language]);

  const changeLanguage = useCallback(async (lang: Language) => {
    const needsRTLChange = I18nManager.isRTL !== (lang === 'he');
    await AsyncStorage.setItem(STORAGE_KEY, lang);
    setLanguage(lang);
    i18n.changeLanguage(lang);

    try {
      await api.put('/api/users/me', { language: lang });
    } catch {
      // non-fatal — preference saved locally
    }

    if (needsRTLChange) {
      I18nManager.allowRTL(lang === 'he');
      I18nManager.forceRTL(lang === 'he');
      try {
        await Updates.reloadAsync();
      } catch {
        // In dev or unsupported environments, reload is handled manually
      }
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language, isRTL: language === 'he', changeLanguage, syncFromServer }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
