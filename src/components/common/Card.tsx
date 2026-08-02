interface CardProps {
  children: React.ReactNode;
}

export default function Card({
  children,
}: CardProps) {
  return (
    <div
      className="
        bg-white
        rounded-3xl
        shadow-xl
        p-8
        w-full
        max-w-md
      "
    >
      {children}
    </div>
  );
}