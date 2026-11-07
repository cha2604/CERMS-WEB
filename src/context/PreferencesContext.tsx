import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";
export type Language = "en" | "fil" | "ceb";

interface PreferencesContextType {
  theme: Theme;
  language: Language;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  toggleTheme: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    reports: "Reports",
    draftReports: "Draft Reports",
    history: "History",
    profile: "Profile",
    assignments: "My Assignments",
    logout: "Log Out",
    signOut: "Sign Out",
    notifications: "Notifications",
    accounts: "Accounts",
    staffPersonnel: "Staff Personnel",
    geotaggedMap: "Geotagged Map",
    wasteWeighing: "Waste Weighing",
    archive: "Archive",
    language: "Language",
    appearance: "Appearance",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    english: "English",
    tagalog: "Tagalog",
    bisaya: "Bisaya",
    loggedInAs: "Logged in as",
    staffPortal: "Staff Portal",
    barangayTankulan: "Barangay Tankulan",
  },
  fil: {
    dashboard: "Pangunahing Pahina",
    reports: "Mga Ulat",
    draftReports: "Mga Draft na Ulat",
    history: "Kasaysayan",
    profile: "Profile",
    assignments: "Aking mga Gawain",
    logout: "Mag-logout",
    signOut: "Mag-sign Out",
    notifications: "Mga Abiso",
    accounts: "Mga Account",
    staffPersonnel: "Mga Kawani",
    geotaggedMap: "Mapa ng Lokasyon",
    wasteWeighing: "Pagtimbang ng Basura",
    archive: "Arkibo",
    language: "Wika",
    appearance: "Hitsura",
    lightMode: "Maliwanag na Mode",
    darkMode: "Madilim na Mode",
    english: "Ingles",
    tagalog: "Tagalog",
    bisaya: "Bisaya",
    loggedInAs: "Naka-log in bilang",
    staffPortal: "Portal ng Kawani",
    barangayTankulan: "Barangay Tankulan",
  },
  ceb: {
    dashboard: "Dashboard",
    reports: "Mga Report",
    draftReports: "Mga Draft nga Report",
    history: "Kasaysayan",
    profile: "Profile",
    assignments: "Akong mga Buluhaton",
    logout: "Gawas",
    signOut: "Pag-Gawas",
    notifications: "Mga Pahibalo",
    accounts: "Mga Account",
    staffPersonnel: "Mga Kawani",
    geotaggedMap: "Mapa sa Lokasyon",
    wasteWeighing: "Pagtimbang sa Basura",
    archive: "Arkibo",
    language: "Pinulongan",
    appearance: "Hitsura",
    lightMode: "Hayag nga Mode",
    darkMode: "Ngitngit nga Mode",
    english: "English",
    tagalog: "Tagalog",
    bisaya: "Bisaya",
    loggedInAs: "Naka-login isip",
    staffPortal: "Portal sa Staff",
    barangayTankulan: "Barangay Tankulan",
  },
};

const PreferencesContext =
  createContext<PreferencesContextType | undefined>(undefined);

function getSavedTheme(): Theme {
  try {
    return localStorage.getItem("cerms-theme") === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

function getSavedLanguage(): Language {
  try {
    const saved = localStorage.getItem("cerms-language");

    return saved === "fil" || saved === "ceb" ? saved : "en";
  } catch {
    return "en";
  }
}

export function PreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>(getSavedTheme);
  const [language, setLanguage] = useState<Language>(getSavedLanguage);

  useEffect(() => {
    const root = document.documentElement;

    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;

    try {
      localStorage.setItem("cerms-theme", theme);
    } catch {
      return;
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;

    root.lang = language;

    try {
      localStorage.setItem("cerms-language", language);
    } catch {
      return;
    }
  }, [language]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }, []);

  const t = useCallback(
    (key: string) => {
      return translations[language][key] ?? translations.en[key] ?? key;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      theme,
      language,
      setTheme,
      setLanguage,
      toggleTheme,
      t,
    }),
    [theme, language, toggleTheme, t]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error(
      "usePreferences must be used inside PreferencesProvider"
    );
  }

  return context;
}