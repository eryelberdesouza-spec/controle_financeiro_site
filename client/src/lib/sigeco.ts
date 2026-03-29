/**
 * Constantes de identidade visual do SIGECO
 * Sistema Integrado de Gestão de Engenharia, Contratos e Operações
 */

export const SIGECO = {
  name: "SIGECO",
  fullName: "Sistema Integrado de Gestão de Engenharia, Contratos e Operações",
  shortDescription: "Atom Tech — Energia Solar e Tecnologia",
  /** Logo horizontal (fundo branco) — para documentos e cabeçalhos */
  logoHorizontal:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663389577190/eCW2qMCc4P3oBzxQMhj7Zi/logo-atomtech-horizontal_7749c840.png",
  /** Logo vertical (fundo branco) — para sidebar e telas de login */
  logoVertical:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663389577190/eCW2qMCc4P3oBzxQMhj7Zi/logo-atomtech-vertical_6eb48425.png",
  /** Cores primárias da identidade */
  colors: {
    green: "#22c55e",    // verde Atom Tech
    yellow: "#f59e0b",   // amarelo/dourado solar
    black: "#111827",
    white: "#ffffff",
  },
} as const;

/** Retorna a data atual formatada para rodapé de documentos */
export function documentDate(): string {
  return new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
