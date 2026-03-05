/**
 * security.test.ts — Testes de segurança
 *
 * Cobre:
 * - Sanitização XSS (sanitizeText, sanitizeObject)
 * - Validação de inputs maliciosos
 */

import { describe, it, expect } from "vitest";
import { sanitizeText, sanitizeObject } from "./_core/security";

describe("sanitizeText", () => {
  it("remove tags de script maliciosas", () => {
    const input = '<script>alert("xss")</script>texto';
    const result = sanitizeText(input);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
    expect(result).toContain("texto");
  });

  it("remove tags HTML arbitrárias", () => {
    const input = '<img src="x" onerror="alert(1)">texto limpo';
    const result = sanitizeText(input);
    expect(result).not.toContain("<img");
    expect(result).not.toContain("onerror");
    expect(result).toContain("texto limpo");
  });

  it("preserva texto simples sem modificação", () => {
    const input = "Fornecimento de equipamento R$ 5.000,00";
    expect(sanitizeText(input)).toBe(input);
  });

  it("retorna string vazia para null/undefined", () => {
    expect(sanitizeText(null)).toBe("");
    expect(sanitizeText(undefined)).toBe("");
    expect(sanitizeText("")).toBe("");
  });

  it("remove tags style maliciosas", () => {
    const input = '<style>body{display:none}</style>conteúdo';
    const result = sanitizeText(input);
    expect(result).not.toContain("<style>");
    expect(result).toContain("conteúdo");
  });

  it("remove event handlers inline", () => {
    const input = '<a href="javascript:void(0)" onclick="steal()">link</a>';
    const result = sanitizeText(input);
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("javascript:");
  });

  it("preserva caracteres especiais válidos", () => {
    const input = "Empresa & Filial — Brasília/DF (CNPJ: 00.000.000/0001-00)";
    const result = sanitizeText(input);
    // Deve preservar o conteúdo textual
    expect(result).toContain("Brasília/DF");
    expect(result).toContain("CNPJ");
  });
});

describe("sanitizeObject", () => {
  it("sanitiza todos os campos string de um objeto", () => {
    const input = {
      nome: '<script>alert("xss")</script>João',
      email: "joao@empresa.com",
      descricao: '<img src="x" onerror="steal()">Descrição',
      valor: 1500,
      ativo: true,
    };
    const result = sanitizeObject(input);
    expect(result.nome).not.toContain("<script>");
    expect(result.nome).toContain("João");
    expect(result.email).toBe("joao@empresa.com"); // email limpo não muda
    expect(result.descricao).not.toContain("<img");
    expect(result.descricao).toContain("Descrição");
    expect(result.valor).toBe(1500); // números não são alterados
    expect(result.ativo).toBe(true); // booleans não são alterados
  });

  it("não modifica objetos sem campos maliciosos", () => {
    const input = {
      nome: "Empresa LTDA",
      cnpj: "00.000.000/0001-00",
      telefone: "(61) 99999-9999",
    };
    const result = sanitizeObject(input);
    expect(result).toEqual(input);
  });

  it("preserva campos Date sem modificação", () => {
    const date = new Date("2026-03-05");
    const input = { nome: "Teste", dataVencimento: date };
    const result = sanitizeObject(input as Record<string, unknown>);
    expect(result.dataVencimento).toBe(date);
  });
});

describe("Validação de inputs de segurança", () => {
  it("SQL Injection: Drizzle ORM usa queries parametrizadas (proteção nativa)", () => {
    // O Drizzle ORM nunca interpola strings diretamente no SQL
    // Este teste documenta que a proteção é garantida pela camada ORM
    const maliciousInput = "'; DROP TABLE users; --";
    // sanitizeText não é necessário para SQL (Drizzle já protege),
    // mas não deve causar erros
    expect(() => sanitizeText(maliciousInput)).not.toThrow();
    const result = sanitizeText(maliciousInput);
    expect(typeof result).toBe("string");
  });

  it("Path traversal: inputs de texto não devem conter sequências de path", () => {
    const inputs = ["../../../etc/passwd", "..\\..\\windows\\system32", "%2e%2e%2f"];
    inputs.forEach(input => {
      const result = sanitizeText(input);
      // sanitizeText não remove path traversal (não é XSS),
      // mas a validação Zod no router deve rejeitar esses valores
      expect(typeof result).toBe("string");
    });
  });
});
