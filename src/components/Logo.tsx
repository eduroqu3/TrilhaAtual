export function Logo({
  variant = "completo",
  className = "h-11 md:h-12",
}: {
  variant?: "completo" | "simbolo" | "texto";
  className?: string;
}) {
  const src =
    variant === "completo"
      ? "/logo-completo.png"
      : variant === "simbolo"
        ? "/logo-simbolo.png"
        : "/logo-texto.png";

  return (
    <img
      src={src}
      alt="Trilha"
      className={`w-auto object-contain transition-all ${className}`}
      loading="eager"
    />
  );
}
