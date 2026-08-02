import { Leaf } from "lucide-react";
interface LogoProps {
  size?: "sm" | "md" | "lg";
}

export default function Logo({ size = "md" }: LogoProps) {
  const sizes = {
    sm: {
      circle: "w-12 h-12",
      icon: "text-xl",
      title: "text-xl",
      subtitle: "text-xs",
    },
    md: {
      circle: "w-20 h-20",
      icon: "text-4xl",
      title: "text-3xl",
      subtitle: "text-sm",
    },
    lg: {
      circle: "w-24 h-24",
      icon: "text-5xl",
      title: "text-4xl",
      subtitle: "text-base",
    },
  };

  const current = sizes[size];

  return (
    <div className="flex flex-col items-center">
      <div
        className={`${current.circle} rounded-full bg-green-700 flex items-center justify-center shadow-lg`}
      >
        <Leaf className={`${current.icon} text-white`} />
      </div>

      <h1 className={`mt-4 font-bold text-green-800 ${current.title}`}>
        CERMS
      </h1>

      <p
        className={`text-gray-500 text-center mt-2 max-w-xs ${current.subtitle}`}
      >
        Community Environmental Reporting and Monitoring System
      </p>
    </div>
  );
}