import { describe, it, expect } from "vitest";

/**
 * Teste de validação da integração ZapSign.
 * Verifica se a variável ZAPSIGN_API_TOKEN está configurada e se a API
 * responde corretamente (autenticação válida).
 */
describe("ZapSign Integration", () => {
  it("deve ter a variável ZAPSIGN_API_TOKEN configurada", () => {
    const token = process.env.ZAPSIGN_API_TOKEN;
    expect(token, "ZAPSIGN_API_TOKEN não está configurada").toBeTruthy();
    expect(token!.length, "ZAPSIGN_API_TOKEN parece inválida (muito curta)").toBeGreaterThan(10);
  });

  it("deve conseguir autenticar na API do ZapSign", async () => {
    const token = process.env.ZAPSIGN_API_TOKEN;
    if (!token) {
      console.warn("ZAPSIGN_API_TOKEN não configurada — pulando teste de conectividade");
      return;
    }

    // Testa conectividade com a API ZapSign listando documentos (endpoint leve)
    const response = await fetch("https://api.zapsign.com.br/api/v1/docs/?page=1&page_size=1", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    // 200 = autenticado com sucesso, 401 = token inválido
    expect(
      response.status,
      `ZapSign retornou status ${response.status} — verifique se o token está correto`
    ).not.toBe(401);

    // 200 = autenticado com sucesso e com documentos
    // 404 = autenticado mas sem documentos
    // 403 = token inválido (falha)
    expect(
      response.status !== 401 && response.status !== 403,
      `ZapSign retornou status ${response.status} — token inválido`
    ).toBe(true);
  });
});
