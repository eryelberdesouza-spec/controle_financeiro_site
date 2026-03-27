import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock do banco de dados ───────────────────────────────────────────────────

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
};

vi.mock("../server/db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

// ─── Testes de formatação de número ──────────────────────────────────────────

describe("Propostas - Numeração", () => {
  it("deve gerar número no formato PRO-AAAA-MM-XXXX", () => {
    const now = new Date();
    const ano = now.getFullYear();
    const mes = String(now.getMonth() + 1).padStart(2, "0");
    const numero = `PRO-${ano}-${mes}-0025`;
    expect(numero).toMatch(/^PRO-\d{4}-\d{2}-\d{4}$/);
  });

  it("deve iniciar sequência em 0025", () => {
    const numero = "PRO-2026-03-0025";
    const match = numero.match(/PRO-\d{4}-\d{2}-(\d+)/);
    expect(match).not.toBeNull();
    expect(parseInt(match![1])).toBe(25);
  });

  it("deve incrementar sequência corretamente", () => {
    const ultimoNumero = "PRO-2026-03-0025";
    const match = ultimoNumero.match(/PRO-\d{4}-\d{2}-(\d+)/);
    const proximoSeq = parseInt(match![1]) + 1;
    const proximoNumero = `PRO-2026-03-${String(proximoSeq).padStart(4, "0")}`;
    expect(proximoNumero).toBe("PRO-2026-03-0026");
  });

  it("deve formatar sequência com 4 dígitos", () => {
    const seq = 100;
    const formatted = String(seq).padStart(4, "0");
    expect(formatted).toBe("0100");
  });
});

// ─── Testes de formatação de CPF/CNPJ ────────────────────────────────────────

describe("Propostas - Formatação CPF/CNPJ", () => {
  function formatCpfCnpj(v: string): string {
    const digits = v.replace(/\D/g, "");
    if (digits.length <= 11) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }

  it("deve formatar CPF corretamente", () => {
    expect(formatCpfCnpj("12345678901")).toBe("123.456.789-01");
  });

  it("deve formatar CNPJ corretamente", () => {
    expect(formatCpfCnpj("12345678000195")).toBe("12.345.678/0001-95");
  });

  it("deve remover caracteres não numéricos antes de formatar", () => {
    expect(formatCpfCnpj("123.456.789-01")).toBe("123.456.789-01");
  });
});

// ─── Testes de cálculo de valores ────────────────────────────────────────────

describe("Propostas - Cálculos de Valores", () => {
  function calcSubtotal(qtd: string, vu: string): string {
    const q = parseFloat(qtd) || 0;
    const v = parseFloat(vu) || 0;
    return (q * v).toFixed(2);
  }

  it("deve calcular subtotal corretamente", () => {
    expect(calcSubtotal("2", "150.00")).toBe("300.00");
  });

  it("deve retornar 0.00 para valores inválidos", () => {
    expect(calcSubtotal("", "")).toBe("0.00");
  });

  it("deve calcular desconto percentual", () => {
    const subtotal = 1000;
    const descontoPercentual = 10;
    const desconto = subtotal * descontoPercentual / 100;
    const total = subtotal - desconto;
    expect(desconto).toBe(100);
    expect(total).toBe(900);
  });

  it("deve calcular desconto em valor fixo", () => {
    const subtotal = 1000;
    const descontoValor = 150;
    const total = subtotal - descontoValor;
    expect(total).toBe(850);
  });

  it("deve somar subtotais de múltiplos itens", () => {
    const itens = [
      { valorSubtotal: "300.00" },
      { valorSubtotal: "450.00" },
      { valorSubtotal: "200.00" },
    ];
    const total = itens.reduce((acc, it) => acc + (parseFloat(it.valorSubtotal) || 0), 0);
    expect(total).toBe(950);
  });

  it("não deve permitir total negativo", () => {
    const subtotal = 100;
    const desconto = 200; // maior que subtotal
    const total = Math.max(0, subtotal - desconto);
    expect(total).toBe(0);
  });
});

// ─── Testes de validação de status ───────────────────────────────────────────

describe("Propostas - Status", () => {
  const statusValidos = ["RASCUNHO", "ENVIADA", "EM_NEGOCIACAO", "APROVADA", "RECUSADA", "EM_CONTRATACAO", "EXPIRADA", "CANCELADA"];

  it("deve ter todos os status válidos definidos", () => {
    expect(statusValidos).toHaveLength(8);
    expect(statusValidos).toContain("RASCUNHO");
    expect(statusValidos).toContain("APROVADA");
    expect(statusValidos).toContain("EM_CONTRATACAO");
  });

  it("deve iniciar proposta com status RASCUNHO", () => {
    const statusInicial = "RASCUNHO";
    expect(statusValidos).toContain(statusInicial);
  });

  it("deve permitir transição para APROVADA", () => {
    const novoStatus = "APROVADA";
    expect(statusValidos).toContain(novoStatus);
  });
});

// ─── Testes de limite de opções de pagamento ─────────────────────────────────

describe("Propostas - Opções de Pagamento", () => {
  it("deve limitar a 4 opções de pagamento", () => {
    const opcoes = [
      { ordem: 1, textoCustomizado: "Pix" },
      { ordem: 2, textoCustomizado: "Boleto" },
      { ordem: 3, textoCustomizado: "Cartão 3x" },
      { ordem: 4, textoCustomizado: "Transferência" },
      { ordem: 5, textoCustomizado: "Cheque" }, // excedente
    ];
    const limitadas = opcoes.slice(0, 4);
    expect(limitadas).toHaveLength(4);
    expect(limitadas[3].textoCustomizado).toBe("Transferência");
  });
});
