import { useState, useEffect } from "react";

/**
 * Hook para detectar se o usuário está em um dispositivo mobile.
 * Usa matchMedia para detecção responsiva (breakpoint < 768px).
 */
export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

/** Alias para compatibilidade com shadcn/ui sidebar */
export const useIsMobile = useMobile;
