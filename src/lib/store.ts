import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations, Language } from './translations';

interface User {
  id: string | number;
  username?: string;
  nickname: string;
  full_name?: string;
  email?: string;
  role: string;
  avatar?: string;
  elo?: number;
  is_premium?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null as User | null,
      token: null as string | null,
      isAuthenticated: false,
      setAuth: (user: User, token: string) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'uz',
      setLanguage: (lang: Language) => set({ language: lang }),
    }),
    {
      name: 'language-storage',
    }
  )
);

export const useTranslation = () => {
  const { language, setLanguage } = useLanguageStore();
  
  const t = (key: keyof typeof translations['uz'] | string, fallback?: string): string => {
    const langDict = translations[language] || translations['uz'];
    const val = (langDict as any)[key];
    if (val !== undefined) return val;
    return fallback !== undefined ? fallback : String(key);
  };
  
  return { t, locale: language, setLocale: setLanguage };
};

