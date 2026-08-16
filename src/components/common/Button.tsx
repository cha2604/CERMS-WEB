import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
}

export default function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const styles = {
    primary: "bg-green-700 hover:bg-green-800 text-white",
    secondary: "bg-white border border-green-700 text-green-700 hover:bg-green-50",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  };

  return (
    <button
      {...props}
      className={`
        w-full
        py-3
        rounded-xl
        font-semibold
        transition-all
        duration-300
        shadow-md
        ${styles[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}