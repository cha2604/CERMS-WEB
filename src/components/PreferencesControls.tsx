
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
    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
      <div className="flex h-9 max-w-[90px] shrink-0 items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800 sm:h-10 sm:max-w-none sm:gap-2 sm:px-3">
        <FiGlobe className="hidden shrink-0 text-gray-500 dark:text-slate-300 sm:block" size={17} />

        <select
          value={language}
          onChange={(event) =>
            setLanguage(event.target.value as "en" | "fil" | "ceb")
          }
          aria-label={t("selectLanguage")}
          className="w-[74px] min-w-0 cursor-pointer appearance-none bg-transparent text-xs font-medium text-gray-700 outline-none dark:text-slate-200 sm:w-auto sm:text-sm"
        >
          <option value="en">English</option>
          <option value="fil">Tagalog</option>
          <option value="ceb">Bisaya</option>
        </select>

        <span className="hidden shrink-0 text-gray-500 dark:text-slate-300 sm:block">
          ▾
        </span>
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
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-yellow-300 dark:hover:bg-slate-700 sm:h-10 sm:w-10"
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
