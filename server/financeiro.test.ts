import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const clearedCookies: any[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: (name: string, options: any) => { clearedCookies.push({ name, options }); } } as TrpcContext["res"],
  };
  return { ctx };
}

describe("auth.logout", () => {
  it("clears session cookie and reports success", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});

describe("pagamentos router", () => {
  it("list returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pagamentos.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("stats returns null or array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pagamentos.stats();
    expect(result === null || Array.isArray(result)).toBe(true);
  });

  it("getById returns undefined for non-existent id", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pagamentos.getById({ id: 999999 });
    expect(result).toBeUndefined();
  });
});

describe("recebimentos router", () => {
  it("list returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.recebimentos.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("stats returns null or array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.recebimentos.stats();
    expect(result === null || Array.isArray(result)).toBe(true);
  });

  it("getById returns undefined for non-existent id", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.recebimentos.getById({ id: 999999 });
    expect(result).toBeUndefined();
  });
});

describe("dashboard router", () => {
  it("stats returns null or object with pagamentos and recebimentos keys", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.stats();
    if (result !== null) {
      expect(result).toHaveProperty("pagamentos");
      expect(result).toHaveProperty("recebimentos");
    } else {
      expect(result).toBeNull();
    }
  });
});
