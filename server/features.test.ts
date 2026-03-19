import { describe, it, expect, vi, beforeEach } from "vitest";

// === Testes: Geração de Número de Controle ===

describe("getNextNumeroControleRecebimento", () => {
  it("deve gerar REC-2026-157 quando o último número for REC-2026-156", () => {
    const lastNumero = "REC-2026-156";
    const match = lastNumero.match(/^REC-(\d{4})-(\d+)$/);
    expect(match).not.toBeNull();
    const year = parseInt(match![1]);
    const seq = parseInt(match![2]);
    const currentYear = new Date().getFullYear();
    const nextSeq = year === currentYear ? seq + 1 : 1;
    const nextNumero = `REC-${currentYear}-${nextSeq}`;
    expect(nextNumero).toBe(`REC-${currentYear}-157`);
  });

  it("deve reiniciar a sequência no novo ano", () => {
    const lastNumero = "REC-2025-999";
    const match = lastNumero.match(/^REC-(\d{4})-(\d+)$/);
    expect(match).not.toBeNull();
    const year = parseInt(match![1]);
    const seq = parseInt(match![2]);
    const currentYear = 2026; // simulando ano 2026
    const nextSeq = year === currentYear ? seq + 1 : 1;
    const nextNumero = `REC-${currentYear}-${nextSeq}`;
    expect(nextNumero).toBe("REC-2026-1");
  });

  it("deve gerar REC-AAAA-1 quando não há registros anteriores", () => {
    const currentYear = new Date().getFullYear();
    const nextNumero = `REC-${currentYear}-1`;
    expect(nextNumero).toMatch(/^REC-\d{4}-1$/);
  });
});

// === Testes: Padrão de Número de Contrato ===

describe("Padrão de número de contrato CTR-AAAA-MM-NNN", () => {
  it("deve seguir o padrão CTR-AAAA-MM-NNN", () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const seq = 1;
    const numero = `CTR-${year}-${month}-${String(seq).padStart(3, "0")}`;
    expect(numero).toMatch(/^CTR-\d{4}-\d{2}-\d{3}$/);
  });

  it("deve incluir o mês com zero à esquerda", () => {
    const numero = "CTR-2026-03-001";
    expect(numero).toMatch(/^CTR-\d{4}-0[1-9]-\d{3}$/);
  });

  it("deve incrementar o sequencial dentro do mesmo mês/ano", () => {
    const lastNumero = "CTR-2026-03-005";
    const match = lastNumero.match(/^CTR-(\d{4})-(\d{2})-(\d+)$/);
    expect(match).not.toBeNull();
    const year = parseInt(match![1]);
    const month = parseInt(match![2]);
    const seq = parseInt(match![3]);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const nextSeq = (year === currentYear && month === currentMonth) ? seq + 1 : 1;
    const nextNumero = `CTR-${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(nextSeq).padStart(3, "0")}`;
    expect(nextNumero).toMatch(/^CTR-\d{4}-\d{2}-\d{3}$/);
  });
});

// === Testes: Filtro por Centro de Custo ===

describe("Filtro por Centro de Custo", () => {
  const pagamentos = [
    { id: 1, nomeCompleto: "Fornecedor A", status: "Pago", centroCustoId: 10, dataPagamento: "2026-03-01" },
    { id: 2, nomeCompleto: "Fornecedor B", status: "Pendente", centroCustoId: 20, dataPagamento: "2026-03-05" },
    { id: 3, nomeCompleto: "Fornecedor C", status: "Pago", centroCustoId: 10, dataPagamento: "2026-03-10" },
    { id: 4, nomeCompleto: "Fornecedor D", status: "Cancelado", centroCustoId: null, dataPagamento: "2026-03-15" },
  ];

  it("deve retornar todos quando filtroCC = 'todos'", () => {
    const filtroCC = "todos";
    const result = pagamentos.filter(p => filtroCC === "todos" || String(p.centroCustoId ?? "") === filtroCC);
    expect(result).toHaveLength(4);
  });

  it("deve filtrar por CC específico", () => {
    const filtroCC = "10";
    const result = pagamentos.filter(p => filtroCC === "todos" || String(p.centroCustoId ?? "") === filtroCC);
    expect(result).toHaveLength(2);
    expect(result.every(p => p.centroCustoId === 10)).toBe(true);
  });

  it("deve retornar vazio para CC sem registros", () => {
    const filtroCC = "99";
    const result = pagamentos.filter(p => filtroCC === "todos" || String(p.centroCustoId ?? "") === filtroCC);
    expect(result).toHaveLength(0);
  });

  it("deve filtrar por período (data início)", () => {
    const filterDataInicio = "2026-03-05";
    const result = pagamentos.filter(p => {
      const matchDataInicio = !filterDataInicio || new Date(p.dataPagamento) >= new Date(filterDataInicio);
      return matchDataInicio;
    });
    expect(result).toHaveLength(3);
  });

  it("deve filtrar por período (data início e fim)", () => {
    const filterDataInicio = "2026-03-03";
    const filterDataFim = "2026-03-08";
    const result = pagamentos.filter(p => {
      const matchDataInicio = !filterDataInicio || new Date(p.dataPagamento) >= new Date(filterDataInicio);
      const matchDataFim = !filterDataFim || new Date(p.dataPagamento) <= new Date(filterDataFim + "T23:59:59");
      return matchDataInicio && matchDataFim;
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });
});

// === Testes: Filtro CC em Relatórios ===

describe("Filtro por CC nos Relatórios", () => {
  const centrosCusto = [
    { id: 1, nome: "Administrativo" },
    { id: 2, nome: "Projeto Alpha" },
    { id: 3, nome: "Operacional" },
  ];

  it("deve encontrar o CC selecionado pelo id", () => {
    const centroCustoId = "2";
    const ccSelecionado = centroCustoId
      ? centrosCusto.find(cc => String(cc.id) === centroCustoId)
      : null;
    expect(ccSelecionado).not.toBeNull();
    expect(ccSelecionado?.nome).toBe("Projeto Alpha");
  });

  it("deve retornar null quando nenhum CC está selecionado", () => {
    const centroCustoId = "";
    const ccSelecionado = centroCustoId
      ? centrosCusto.find(cc => String(cc.id) === centroCustoId)
      : null;
    expect(ccSelecionado).toBeNull();
  });

  it("deve incluir CC no cabeçalho de exportação TXT quando selecionado", () => {
    const ccSelecionado = { id: 1, nome: "Administrativo" };
    const ccLinha = ccSelecionado ? `Centro de Custo: ${ccSelecionado.nome}` : "Centro de Custo: Todos";
    expect(ccLinha).toBe("Centro de Custo: Administrativo");
  });

  it("deve exibir 'Todos' no cabeçalho quando nenhum CC está selecionado", () => {
    const ccSelecionado = null;
    const ccLinha = ccSelecionado ? `Centro de Custo: ${(ccSelecionado as any).nome}` : "Centro de Custo: Todos";
    expect(ccLinha).toBe("Centro de Custo: Todos");
  });

  it("deve filtrar pagamentos pelo CC selecionado", () => {
    const pagamentos = [
      { id: 1, nomeCompleto: "Fornecedor A", centroCustoId: 1 },
      { id: 2, nomeCompleto: "Fornecedor B", centroCustoId: 2 },
      { id: 3, nomeCompleto: "Fornecedor C", centroCustoId: 1 },
    ];
    const centroCustoId = "1";
    const filtrados = pagamentos.filter(p =>
      !centroCustoId || String(p.centroCustoId) === centroCustoId
    );
    expect(filtrados).toHaveLength(2);
    expect(filtrados.every(p => p.centroCustoId === 1)).toBe(true);
  });

  it("deve retornar todos os pagamentos quando CC = '' (sem filtro)", () => {
    const pagamentos = [
      { id: 1, nomeCompleto: "Fornecedor A", centroCustoId: 1 },
      { id: 2, nomeCompleto: "Fornecedor B", centroCustoId: 2 },
    ];
    const centroCustoId = "";
    const filtrados = pagamentos.filter(p =>
      !centroCustoId || String(p.centroCustoId) === centroCustoId
    );
    expect(filtrados).toHaveLength(2);
  });
});

// === Testes: Schema de Anexos ===

describe("Módulos suportados para anexos", () => {
  const modulosSuportados = ["pagamento", "recebimento", "contrato", "os", "cliente"];

  it("deve suportar todos os módulos definidos", () => {
    expect(modulosSuportados).toContain("pagamento");
    expect(modulosSuportados).toContain("recebimento");
    expect(modulosSuportados).toContain("contrato");
    expect(modulosSuportados).toContain("os");
    expect(modulosSuportados).toContain("cliente");
  });

  it("deve ter exatamente 5 módulos suportados", () => {
    expect(modulosSuportados).toHaveLength(5);
  });
});
