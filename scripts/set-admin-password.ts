import "dotenv/config";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";

const ADMIN_EMAIL = "eryelberdesouza@gmail.com";
const NOVA_SENHA = process.argv[2] ?? "Atom@2026";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("❌ DATABASE_URL não configurada"); process.exit(1); }

  const db = drizzle(url);
  const result = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).limit(1);

  if (result.length === 0) {
    const hash = await bcrypt.hash(NOVA_SENHA, 12);
    await db.insert(users).values({
      openId: `local_${Date.now()}`,
      email: ADMIN_EMAIL,
      name: "Eryelber Souza",
      role: "admin",
      loginMethod: "email",
      passwordHash: hash,
      lastSignedIn: new Date(),
    });
    console.log(`✅ Admin criado: ${ADMIN_EMAIL}`);
  } else {
    const hash = await bcrypt.hash(NOVA_SENHA, 12);
    await db.update(users).set({ passwordHash: hash, role: "admin", loginMethod: "email" }).where(eq(users.id, result[0].id));
    console.log(`✅ Senha atualizada: ${ADMIN_EMAIL}`);
  }

  console.log(`🔑 Senha: ${NOVA_SENHA}`);
  process.exit(0);
}

main().catch((err) => { console.error("❌ Erro:", err); process.exit(1); });
