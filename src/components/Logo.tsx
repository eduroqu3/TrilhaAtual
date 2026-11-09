import logoCompleto from "@/assets/logo-completo.png.asset.json";
import logoSimbolo from "@/assets/logo-simbolo.png.asset.json";
import logoTexto from "@/assets/logo-texto.png.asset.json";

export function Logo({ variant = "completo", className = "h-9" }: { variant?: "completo" | "simbolo" | "texto"; className?: string }) {
  const src = variant === "completo" ? logoCompleto.url : variant === "simbolo" ? logoSimbolo.url : logoTexto.url;
  return <img src={src} alt="Trilha" className={`w-auto ${className}`} />;
}

