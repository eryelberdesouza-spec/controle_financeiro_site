import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";
import { anexos } from "../drizzle/schema";
import { storagePut } from "./storage";

// Tipos de módulo suportados
export type AnexoModulo = "pagamento" | "recebimento" | "contrato" | "os" | "cliente";

// Gera uma chave única para o arquivo no S3
function gerarFileKey(modulo: AnexoModulo, registroId: number, nomeOriginal: string): string {
  const timestamp = Date.now();
  const ext = nomeOriginal.split(".").pop() ?? "bin";
  const base = nomeOriginal.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.[^.]+$/, "");
  return `anexos/${modulo}/${registroId}/${base}_${timestamp}.${ext}`;
}

// Lista todos os anexos de um registro
export async function listAnexos(modulo: AnexoModulo, registroId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(anexos)
    .where(and(eq(anexos.modulo, modulo), eq(anexos.registroId, registroId)))
    .orderBy(desc(anexos.createdAt));
}

// Salva um anexo após upload para S3
export async function createAnexo(params: {
  modulo: AnexoModulo;
  registroId: number;
  nomeOriginal: string;
  fileBuffer: Buffer;
  mimeType: string;
  tamanho: number;
  descricao?: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const fileKey = gerarFileKey(params.modulo, params.registroId, params.nomeOriginal);
  const { url } = await storagePut(fileKey, params.fileBuffer, params.mimeType);

  const [result] = await db.insert(anexos).values({
    modulo: params.modulo,
    registroId: params.registroId,
    nomeOriginal: params.nomeOriginal,
    fileKey,
    url,
    mimeType: params.mimeType,
    tamanho: params.tamanho,
    descricao: params.descricao,
    createdBy: params.createdBy,
  });

  return { id: (result as any).insertId, fileKey, url };
}

// Remove um anexo (do banco; o arquivo no S3 fica como orphan — aceitável)
export async function deleteAnexo(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(anexos).where(eq(anexos.id, id));
  return { success: true };
}
