
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type StaffTheme = "light" | "dark";
export type StaffLanguage = "en" | "ceb" | "fil";

interface StaffPreferencesContextType {
  theme: StaffTheme;
  language: StaffLanguage;
  setTheme: (theme: StaffTheme) => void;
  setLanguage: (language: StaffLanguage) => void;
  toggleTheme: () => void;
  t: (key: string) => string;
}

const translations: Record<StaffLanguage, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    assignments: "My Assignments",
    history: "History",
    profile: "Profile",
    logout: "Log Out",
    settings: "Settings",
    preferences: "Preferences",
    appearance: "Appearance",
    language: "Language",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    english: "English",
    bisaya: "Bisaya",
    tagalog: "Tagalog",
    save: "Save",
    cancel: "Cancel",
    loading: "Loading...",
    welcome: "Welcome",
    notifications: "Notifications",
    changePassword: "Change Password",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmPassword: "Confirm New Password",
    updatePassword: "Update Password",
  },
  ceb: {
    dashboard: "Dashboard",
    assignments: "Akong mga Buluhaton",
    history: "Kasaysayan",
    profile: "Profile",
    logout: "Gawas",
    settings: "Mga Setting",
    preferences: "Mga Kagustuhan",
    appearance: "Hitsura",
    language: "Pinulongan",
    lightMode: "Hayag nga Mode",
    darkMode: "Ngitngit nga Mode",
    english: "English",
    bisaya: "Bisaya",
    tagalog: "Tagalog",
    save: "I-save",
    cancel: "Kanselahon",
    loading: "Nag-load...",
    welcome: "Maayong pag-abot",
    notifications: "Mga Pahibalo",
    changePassword: "Usba ang Password",
    currentPassword: "Karon nga Password",
    newPassword: "Bag-ong Password",
    confirmPassword: "Kumpirmaha ang Bag-ong Password",
    updatePassword: "I-update ang Password",
  },
  fil: {
    dashboard: "Dashboard",
    assignments: "Aking mga Takdang Gawain",
    history: "Kasaysayan",
    profile: "Profile",
    logout: "Mag-logout",
    settings: "Mga Setting",
    preferences: "Mga Kagustuhan",
    appearance: "Hitsura",
    language: "Wika",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    english: "Ingles",
    bisaya: "Bisaya",
    tagalog: "Tagalog",
    save: "I-save",
    cancel: "Kanselahin",
    loading: "Naglo-load...",
    welcome: "Maligayang pagdating",
    notifications: "Mga Abiso",
    changePassword: "Palitan ang Password",
    currentPassword: "Kasalukuyang Password",
    newPassword: "Bagong Password",
    confirmPassword: "Kumpirmahin ang Bagong Password",
    updatePassword: "I-update ang Password",
  },
};

const StaffPreferencesContext =
  createContext<StaffPreferencesContextType | undefined>(undefined);

interface StaffPreferencesProviderProps {
  children: ReactNode;
}

export function StaffPreferencesProvider({
  children,
}: StaffPreferencesProviderProps) {
  const [theme, setTheme] = useState<StaffTheme>(() => {
    const savedTheme = localStorage.getItem("staff-theme");
    return savedTheme === "dark" ? "dark" : "light";
  });

  const [language, setLanguage] = useState<StaffLanguage>(() => {
    const savedLanguage = localStorage.getItem("staff-language");

    if (savedLanguage === "ceb" || savedLanguage === "fil") {
      return savedLanguage;
    }

    return "en";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("staff-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("staff-language", language);
  }, [language]);

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === "light" ? "dark" : "light"
    );
  };

  const t = (key: string) => {
    return translations[language][key] ?? translations.en[key] ?? key;
  };

  const value = useMemo(
    () => ({
      theme,
      language,
      setTheme,
      setLanguage,
      toggleTheme,
      t,
    }),
    [theme, language]
  );

  return (
    <StaffPreferencesContext.Provider value={value}>
      {children}
    </StaffPreferencesContext.Provider>
  );
}

export function useStaffPreferences() {
  const context = useContext(StaffPreferencesContext);

  if (!context) {
    throw new Error(
      "useStaffPreferences must be used within StaffPreferencesProvider"
    );
  }

  return context;
}
