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
    geotaggedMap: "Geotagged Map",
    reports: "Reports",
    myReports: "My Reports",
    drafts: "Drafts",
    history: "History",
    notifications: "Notifications",
    profile: "Profile",
    accounts: "Manage People",
    staffPersonnel: "Staff Personnel",
    wasteWeighing: "Waste Weighing",
    archive: "Archive",
    settings: "Settings",
    logout: "Logout",
    search: "Search",
    save: "Save",
    cancel: "Cancel",
    submit: "Submit",
    delete: "Delete",
    edit: "Edit",
    view: "View",
    close: "Close",
    back: "Back",
    language: "Language",
    theme: "Theme",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    selectLanguage: "Select Language",
    english: "English",
    tagalog: "Tagalog",
    bisaya: "Bisaya",
    totalReports: "Total Reports",
    pending: "Pending",
    ongoing: "Ongoing",
    resolved: "Resolved",
    rejected: "Rejected",
    recentReports: "Recent Reports",
    reportDetails: "Report Details",
    reportStatus: "Report Status",
    location: "Location",
    description: "Description",
    dateSubmitted: "Date Submitted",
    assignedStaff: "Assigned Staff",
    severityLevel: "Severity Level",
    action: "Action",
    actions: "Actions",
    status: "Status",
    name: "Name",
    email: "Email",
    contactNumber: "Contact Number",
    address: "Address",
    username: "Username",
    password: "Password",
    welcome: "Welcome",
    welcomeBack: "Welcome Back",
    viewAll: "View All",
    noReports: "No reports available",
    noNotifications: "No notifications available",
    loading: "Loading...",
    confirm: "Confirm",
    yes: "Yes",
    no: "No",
    update: "Update",
    refresh: "Refresh",
    filter: "Filter",
    all: "All",
    pendingReports: "Pending Reports",
    ongoingReports: "Ongoing Reports",
    resolvedReports: "Resolved Reports",
    recentActivity: "Recent Activity",
    reportWaste: "Report Waste Concern",
    submitReport: "Submit Report",
    uploadPhoto: "Upload Photo",
    choosePhoto: "Choose Photo",
    reportDescription: "Report Description",
    enterDescription: "Enter your report description",
    selectLocation: "Select Location",
    currentLocation: "Current Location",
    offlineDrafts: "Offline Drafts",
    saveDraft: "Save as Draft",
    totalUsers: "Total Users",
    activeUsers: "Active Users",
    totalStaff: "Total Staff",
    manageAccounts: "Manage Accounts",
    manageReports: "Manage Reports",
    viewDetails: "View Details",
    markAsResolved: "Mark as Resolved",
    assignStaff: "Assign Staff",
    rejectReport: "Reject Report",
    saveCase: "Save Case",
    confirmRejection: "Are you sure you want to reject this report?",
    confirmAction: "Are you sure you want to continue?",
    noData: "No data available",
    perPage: "Per Page",
    showing: "Showing",
    of: "of",
    entries: "entries",
  },

  fil: {
    dashboard: "Dashboard",
    geotaggedMap: "Mapa na may Lokasyon",
    reports: "Mga Ulat",
    myReports: "Aking mga Ulat",
    drafts: "Mga Draft",
    history: "Kasaysayan",
    notifications: "Mga Abiso",
    profile: "Profile",
    accounts: "Pamahalaan ang mga Tao",
    staffPersonnel: "Mga Kawani",
    wasteWeighing: "Pagtitimbang ng Basura",
    archive: "Arkibo",
    settings: "Mga Setting",
    logout: "Mag-logout",
    search: "Maghanap",
    save: "I-save",
    cancel: "Kanselahin",
    submit: "Isumite",
    delete: "Tanggalin",
    edit: "I-edit",
    view: "Tingnan",
    close: "Isara",
    back: "Bumalik",
    language: "Wika",
    theme: "Tema",
    darkMode: "Madilim na Mode",
    lightMode: "Maliwanag na Mode",
    selectLanguage: "Pumili ng Wika",
    english: "Ingles",
    tagalog: "Tagalog",
    bisaya: "Bisaya",
    totalReports: "Kabuuang mga Ulat",
    pending: "Nakabinbin",
    ongoing: "Isinasagawa",
    resolved: "Nalutas",
    rejected: "Tinanggihan",
    recentReports: "Mga Kamakailang Ulat",
    reportDetails: "Detalye ng Ulat",
    reportStatus: "Katayuan ng Ulat",
    location: "Lokasyon",
    description: "Paglalarawan",
    dateSubmitted: "Petsa ng Pagsumite",
    assignedStaff: "Itinalagang Kawani",
    severityLevel: "Antas ng Tindi",
    action: "Aksyon",
    actions: "Mga Aksyon",
    status: "Katayuan",
    name: "Pangalan",
    email: "Email",
    contactNumber: "Numero ng Contact",
    address: "Address",
    username: "Username",
    password: "Password",
    welcome: "Maligayang Pagdating",
    welcomeBack: "Maligayang Pagbabalik",
    viewAll: "Tingnan Lahat",
    noReports: "Walang available na mga ulat",
    noNotifications: "Walang available na mga abiso",
    loading: "Naglo-load...",
    confirm: "Kumpirmahin",
    yes: "Oo",
    no: "Hindi",
    update: "I-update",
    refresh: "I-refresh",
    filter: "Salain",
    all: "Lahat",
    pendingReports: "Mga Nakabinbing Ulat",
    ongoingReports: "Mga Ulat na Isinasagawa",
    resolvedReports: "Mga Nalutas na Ulat",
    recentActivity: "Kamakailang Aktibidad",
    reportWaste: "Mag-ulat ng Suliranin sa Basura",
    submitReport: "Isumite ang Ulat",
    uploadPhoto: "Mag-upload ng Larawan",
    choosePhoto: "Pumili ng Larawan",
    reportDescription: "Paglalarawan ng Ulat",
    enterDescription: "Ilagay ang paglalarawan ng iyong ulat",
    selectLocation: "Pumili ng Lokasyon",
    currentLocation: "Kasalukuyang Lokasyon",
    offlineDrafts: "Mga Offline na Draft",
    saveDraft: "I-save bilang Draft",
    totalUsers: "Kabuuang mga User",
    activeUsers: "Mga Aktibong User",
    totalStaff: "Kabuuang Kawani",
    manageAccounts: "Pamahalaan ang mga Account",
    manageReports: "Pamahalaan ang mga Ulat",
    viewDetails: "Tingnan ang Detalye",
    markAsResolved: "Markahang Nalutas",
    assignStaff: "Magtalaga ng Kawani",
    rejectReport: "Tanggihan ang Ulat",
    saveCase: "I-save ang Kaso",
    confirmRejection: "Sigurado ka bang gusto mong tanggihan ang ulat na ito?",
    confirmAction: "Sigurado ka bang gusto mong magpatuloy?",
    noData: "Walang available na datos",
    perPage: "Bawat Pahina",
    showing: "Ipinapakita ang",
    of: "sa",
    entries: "mga entry",
  },

  ceb: {
    dashboard: "Dashboard",
    geotaggedMap: "Mapa nga naay Lokasyon",
    reports: "Mga Report",
    myReports: "Akong mga Report",
    drafts: "Mga Draft",
    history: "Kasaysayan",
    notifications: "Mga Pahibalo",
    profile: "Profile",
    accounts: "Pagdumala sa mga Tawo",
    staffPersonnel: "Mga Staff",
    wasteWeighing: "Pagtimbang sa Basura",
    archive: "Archive",
    settings: "Settings",
    logout: "Gawas",
    search: "Pangita",
    save: "I-save",
    cancel: "Kanselahon",
    submit: "I-submit",
    delete: "Tangtangon",
    edit: "Usbon",
    view: "Tan-awon",
    close: "Sirad-i",
    back: "Balik",
    language: "Pinulongan",
    theme: "Tema",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    selectLanguage: "Pagpili og Pinulongan",
    english: "English",
    tagalog: "Tagalog",
    bisaya: "Bisaya",
    totalReports: "Kinatibuk-ang mga Report",
    pending: "Naghulat",
    ongoing: "Gipadayon",
    resolved: "Nasulbad",
    rejected: "Gisalikway",
    recentReports: "Bag-ong mga Report",
    reportDetails: "Detalye sa Report",
    reportStatus: "Status sa Report",
    location: "Lokasyon",
    description: "Deskripsyon",
    dateSubmitted: "Petsa nga Gisumite",
    assignedStaff: "Gitudlong Staff",
    severityLevel: "Lebel sa Kagrabe",
    action: "Aksyon",
    actions: "Mga Aksyon",
    status: "Status",
    name: "Ngalan",
    email: "Email",
    contactNumber: "Numero sa Contact",
    address: "Address",
    username: "Username",
    password: "Password",
    welcome: "Maayong Pag-abot",
    welcomeBack: "Maayong Pagbalik",
    viewAll: "Tan-awon ang Tanan",
    noReports: "Walay available nga mga report",
    noNotifications: "Walay available nga mga pahibalo",
    loading: "Nag-load...",
    confirm: "Kumpirmahon",
    yes: "Oo",
    no: "Dili",
    update: "I-update",
    refresh: "I-refresh",
    filter: "I-filter",
    all: "Tanan",
    pendingReports: "Mga Report nga Naghulat",
    ongoingReports: "Mga Report nga Gipadayon",
    resolvedReports: "Mga Report nga Nasulbad",
    recentActivity: "Bag-ong mga Kalihokan",
    reportWaste: "Pag-report og Problema sa Basura",
    submitReport: "I-submit ang Report",
    uploadPhoto: "Pag-upload og Litrato",
    choosePhoto: "Pagpili og Litrato",
    reportDescription: "Deskripsyon sa Report",
    enterDescription: "Isulat ang deskripsyon sa imong report",
    selectLocation: "Pagpili og Lokasyon",
    currentLocation: "Karon nga Lokasyon",
    offlineDrafts: "Mga Offline nga Draft",
    saveDraft: "I-save isip Draft",
    totalUsers: "Kinatibuk-ang Users",
    activeUsers: "Aktibong Users",
    totalStaff: "Kinatibuk-ang Staff",
    manageAccounts: "Pagdumala sa mga Account",
    manageReports: "Pagdumala sa mga Report",
    viewDetails: "Tan-awon ang Detalye",
    markAsResolved: "Markahan nga Nasulbad",
    assignStaff: "Magtudlo og Staff",
    rejectReport: "Isalikway ang Report",
    saveCase: "I-save ang Case",
    confirmRejection: "Sigurado ka ba nga gusto nimong isalikway kini nga report?",
    confirmAction: "Sigurado ka ba nga gusto nimong ipadayon?",
    noData: "Walay available nga datos",
    perPage: "Matag Panid",
    showing: "Gipakita ang",
    of: "sa",
    entries: "ka entry",
  },
};

function getStoredValue<T extends string>(
  key: string,
  allowedValues: readonly T[],
  fallback: T
): T {
  try {
    const storedValue = localStorage.getItem(key);

    if (
      storedValue &&
      allowedValues.includes(storedValue as T)
    ) {
      return storedValue as T;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

const PreferencesContext =
  createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>(() =>
    getStoredValue("cerms-theme", ["light", "dark"], "light")
  );

  const [language, setLanguage] = useState<Language>(() =>
    getStoredValue("cerms-language", ["en", "fil", "ceb"], "en")
  );

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
    document.documentElement.lang = language;

    try {
      localStorage.setItem("cerms-language", language);
    } catch {
      return;
    }
  }, [language]);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) =>
      currentTheme === "light" ? "dark" : "light"
    );
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
      "usePreferences must be used within a PreferencesProvider"
    );
  }

  return context;
}