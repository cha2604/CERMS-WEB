export type AuthMethod = "email" | "phone";

interface AuthMethodTabsProps {
  active: AuthMethod;
  onChange: (method: AuthMethod) => void;
}

export default function AuthMethodTabs({
  active,
  onChange,
}: AuthMethodTabsProps) {
  return (
    <div className="flex rounded-xl bg-green-50 p-1">
      <button
        type="button"
        onClick={() => onChange("email")}
        className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
          active === "email"
            ? "bg-white text-green-800 shadow-sm"
            : "text-green-700/60 hover:text-green-700"
        }`}
      >
        Email
      </button>
      <button
        type="button"
        onClick={() => onChange("phone")}
        className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
          active === "phone"
            ? "bg-white text-green-800 shadow-sm"
            : "text-green-700/60 hover:text-green-700"
        }`}
      >
        Phone (SMS)
      </button>
    </div>
  );
}