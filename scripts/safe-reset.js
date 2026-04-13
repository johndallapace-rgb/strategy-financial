import "dotenv/config";
import { execSync } from "child_process";
import { parse } from "url";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ ERRO: DIRECT_URL ou DATABASE_URL não configurados.");
  process.exit(1);
}

try {
  const url = parse(connectionString);
  const dbName = url.pathname?.replace("/", "") || "";
  const host = url.hostname || "";

  console.log("\n==========================================");
  console.log("⚠️  VERIFICAÇÃO DE SEGURANÇA ANTES DO RESET");
  console.log("==========================================\n");
  
  if (dbName.includes("prod") || host.includes("prod") || host.includes("strateggyapp")) {
    console.error("🚫 BLOQUEADO: Você está tentando resetar o banco de PRODUÇÃO.");
    console.error(`Host: ${host} | Database: ${dbName}`);
    console.error("Operação abortada por segurança.");
    process.exit(1);
  }

  if (!dbName.includes("dev") && !host.includes("dev") && !host.includes("localhost")) {
    console.warn("⚠️  AVISO: Este banco não tem 'dev' ou 'localhost' no nome.");
    console.warn(`Host: ${host} | Database: ${dbName}`);
    console.warn("Execute este script apenas se tiver certeza de que é um banco de testes.");
    console.warn("Para continuar, defina a variável FORCE_RESET=1\n");
    if (process.env.FORCE_RESET !== "1") {
      process.exit(1);
    }
  }

  console.log("✅ Ambiente seguro detectado (DEV). Iniciando reset...");
  
  // Executa o comando de reset
  execSync("npx prisma migrate reset --force", { stdio: "inherit" });

  console.log("\n🎉 Banco de dados DEV resetado com sucesso!");
  console.log("==========================================\n");

} catch (e) {
  if (e.status !== undefined) {
    // Erro na execução do execSync
    process.exit(e.status);
  }
  console.error("❌ ERRO INTERNO NO SCRIPT DE SEGURANÇA:");
  console.error(e);
  process.exit(1);
}
