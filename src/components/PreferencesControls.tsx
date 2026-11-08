import {
  FiGlobe,
  FiMoon,
  FiSun,
} from "react-icons/fi";
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
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800">
        <FiGlobe className="text-gray-500 dark:text-slate-300" />

        <select
          value={language}
          onChange={(event) =>
            setLanguage(event.target.value as "en" | "fil" | "ceb")
          }
          aria-label={t("selectLanguage")}
          className="cursor-pointer bg-transparent text-sm font-medium text-gray-700 outline-none dark:text-slate-200"
        >
          <option value="en">English</option>
          <option value="fil">Tagalog</option>
          <option value="ceb">Bisaya</option>
        </select>
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        title={
          theme === "dark"
            ? "Switch to Light Mode"
            : "Switch to Dark Mode"
        }
        aria-label={
          theme === "dark"
            ? "Switch to Light Mode"
            : "Switch to Dark Mode"
        }
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-yellow-300 dark:hover:bg-slate-700"
      >
        {theme === "dark" ? (
          <FiSun size={18} />
        ) : (
          <FiMoon size={18} />
        )}
      </button>
    </div>
  );
}