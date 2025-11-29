import { createContext, useContext, useEffect, useState } from "react";
import { AppLanguage, setTmdbLanguage } from "@/lib/tmdb";

type LanguageContextValue = {
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

const STORAGE_KEY = "balkanflix-lang";

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [lang, setLangState] = useState<AppLanguage>("bs"); // default bosanski latinica

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as AppLanguage | null;
    const initial = stored && ["sr", "bs", "hr", "en"].includes(stored)
      ? stored
      : "bs";

    setLangState(initial);
    setTmdbLanguage(initial);
  }, []);

  const setLang = (newLang: AppLanguage) => {
    setLangState(newLang);
    setTmdbLanguage(newLang);
    window.localStorage.setItem(STORAGE_KEY, newLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
};
