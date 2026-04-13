import "dotenv/config";
import { parse } from "url";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ ERRO: DIRECT_URL ou DATABASE_URL não configurados.");
  process.exit(1);
}

try {
  const url = parse(connectionString);
  const host = url.hostname || "";
  const dbName = url.pathname?.replace("/", "") || "";

  console.log("\n==========================================");
  console.log("🔍 DIAGNÓSTICO DO BANCO DE DADOS");
  console.log("==========================================");
  
  if (dbName.includes("prod") || host.includes("prod") || host.includes("strateggyapp")) {
    console.log("🔴 AMBIENTE DETECTADO: PRODUÇÃO");
  } else if (dbName.includes("dev") || host.includes("dev") || host.includes("localhost")) {
    console.log("🟢 AMBIENTE DETECTADO: DESENVOLVIMENTO (DEV)");
  } else {
    console.log("🟡 AMBIENTE DETECTADO: DESCONHECIDO (Aviso)");
  }
  
  console.log(`\nHost: ${host}`);
  console.log(`Database: ${dbName}`);
  console.log("==========================================\n");

} catch (e) {
  console.error("❌ ERRO: Não foi possível fazer parse da connection string.");
  process.exit(1);
}
