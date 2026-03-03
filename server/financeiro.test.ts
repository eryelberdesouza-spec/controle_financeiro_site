import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createCtx(role: "admin" | "operador" | "user" = "admin"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("auth.logout", () => {
  it("retorna sucesso e limpa cookie", async () => {
    const cleared: string[] = [];
    const ctx: TrpcContext = {
      ...createCtx(),
      res: { clearCookie: (name: string) => cleared.push(name) } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(cleared.length).toBe(1);
  });
});

describe("pagamentos - controle de acesso", () => {
  it("operador pode listar pagamentos", async () => {
    const caller = appRouter.createCaller(createCtx("operador"));
    await expect(caller.pagamentos.list()).resolves.toBeDefined();
  });

  it("operador NÃO pode deletar pagamento", async () => {
    const caller = appRouter.createCaller(createCtx("operador"));
    await expect(caller.pagamentos.delete({ id: 1 })).rejects.toThrow("Acesso restrito");
  });

  it("user sem permissão NÃO pode listar pagamentos", async () => {
    const caller = appRouter.createCaller(createCtx("user"));
    await expect(caller.pagamentos.list()).rejects.toThrow("Acesso não autorizado");
  });

  it("admin pode deletar pagamento (sem erro para ID inexistente no MySQL)", async () => {
    const caller = appRouter.createCaller(createCtx("admin"));
    // MySQL DELETE com ID inexistente retorna affectedRows=0 sem erro
    await expect(caller.pagamentos.delete({ id: 99999 })).resolves.toBeDefined();
  });
});

describe("recebimentos - controle de acesso", () => {
  it("operador pode listar recebimentos", async () => {
    const caller = appRouter.createCaller(createCtx("operador"));
    await expect(caller.recebimentos.list()).resolves.toBeDefined();
  });

  it("operador NÃO pode deletar recebimento", async () => {
    const caller = appRouter.createCaller(createCtx("operador"));
    await expect(caller.recebimentos.delete({ id: 1 })).rejects.toThrow("Acesso restrito");
  });

  it("user NÃO pode listar recebimentos", async () => {
    const caller = appRouter.createCaller(createCtx("user"));
    await expect(caller.recebimentos.list()).rejects.toThrow("Acesso não autorizado");
  });
});

describe("usuarios - controle de acesso", () => {
  it("admin pode listar usuários", async () => {
    const caller = appRouter.createCaller(createCtx("admin"));
    await expect(caller.usuarios.list()).resolves.toBeDefined();
  });

  it("operador NÃO pode listar usuários", async () => {
    const caller = appRouter.createCaller(createCtx("operador"));
    await expect(caller.usuarios.list()).rejects.toThrow("Acesso restrito");
  });

  it("user NÃO pode listar usuários", async () => {
    const caller = appRouter.createCaller(createCtx("user"));
    await expect(caller.usuarios.list()).rejects.toThrow("Acesso restrito");
  });
});

describe("dashboard - controle de acesso", () => {
  it("operador pode ver stats do dashboard", async () => {
    const caller = appRouter.createCaller(createCtx("operador"));
    await expect(caller.dashboard.stats()).resolves.toBeDefined();
  });

  it("user NÃO pode ver stats do dashboard", async () => {
    const caller = appRouter.createCaller(createCtx("user"));
    await expect(caller.dashboard.stats()).rejects.toThrow("Acesso não autorizado");
  });
});
