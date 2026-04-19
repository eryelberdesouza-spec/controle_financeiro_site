import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { COOKIE_NAME } from "@shared/const";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getSessionCookieOptions, clearSessionCookie } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import * as db from "./db";

export const authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user ?? null),

  login: publicProcedure
    .input(z.object({
      email: z.string().email("Email inválido"),
      password: z.string().min(1, "Senha obrigatória"),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await db.getUserByEmail(input.email.toLowerCase().trim());
      const INVALID_MSG = "Email ou senha incorretos";

      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: INVALID_MSG });
      if (!user.ativo) throw new TRPCError({ code: "FORBIDDEN", message: "Conta desativada. Contate o administrador." });
      if (!user.passwordHash) throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha não configurada. Contate o administrador." });

      const senhaCorreta = await bcrypt.compare(input.password, user.passwordHash);
      if (!senhaCorreta) throw new TRPCError({ code: "UNAUTHORIZED", message: INVALID_MSG });

      const token = await sdk.createSessionToken(user.openId, {
        name: user.name ?? user.email ?? "",
      });

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

      return {
        success: true,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    clearSessionCookie(ctx.req as any, ctx.res as any);
    return { success: true } as const;
  }),

  changePassword: protectedProcedure
    .input(z.object({
      senhaAtual: z.string().min(1),
      novaSenha: z.string().min(8, "Mínimo 8 caracteres"),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await db.getUserByOpenId(ctx.user.openId);
      if (!user?.passwordHash) throw new TRPCError({ code: "BAD_REQUEST", message: "Senha atual não definida" });

      const ok = await bcrypt.compare(input.senhaAtual, user.passwordHash);
      if (!ok) throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha atual incorreta" });

      const hash = await bcrypt.hash(input.novaSenha, 12);
      await db.setUserPassword(user.id, hash);
      return { success: true };
    }),

  adminSetPassword: protectedProcedure
    .input(z.object({
      userId: z.number(),
      novaSenha: z.string().min(8, "Mínimo 8 caracteres"),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      const hash = await bcrypt.hash(input.novaSenha, 12);
      await db.setUserPassword(input.userId, hash);
      return { success: true };
    }),
});
