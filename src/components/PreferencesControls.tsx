import { FiMoon, FiSun } from "react-icons/fi";
import { usePreferences } from "../context/PreferencesContext";

export default function PreferencesControls() {
  const {
    theme,
    language,
    setLanguage,
    toggleTheme,
    t,
  } = usePreferences();

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor="cerms-language">
        {t("language")}
      </label>

      <select
        id="cerms-language"
        value={language}
        onChange={(event) =>
          setLanguage(event.target.value as "en" | "fil" | "ceb")
        }
        className="h-10 max-w-[125px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      >
        <option value="en">English</option>
        <option value="fil">Tagalog</option>
        <option value="ceb">Bisaya</option>
      </select>

      <button
        type="button"
        onClick={toggleTheme}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        title={theme === "light" ? t("darkMode") : t("lightMode")}
        aria-label={theme === "light" ? t("darkMode") : t("lightMode")}
      >
        {theme === "light" ? (
          <FiMoon size={18} />
        ) : (
          <FiSun size={18} />
        )}
      </button>
    </div>
  );
}