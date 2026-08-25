import { createConnection } from "mysql2/promise";
import { createHash } from "node:crypto";
import { mkdir, writeFile, appendFile, readFile } from "node:fs/promises";
import { join } from "node:path";

const outputDirectory = process.argv[2];
if (!outputDirectory) {
  throw new Error("Informe a pasta de saída do backup.");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL não está configurada.");
}

const url = new URL(databaseUrl);
const database = url.pathname.replace(/^\//, "");
if (!database) {
  throw new Error("O nome do banco não foi encontrado na DATABASE_URL.");
}

await mkdir(outputDirectory, { recursive: true });
const connection = await createConnection(databaseUrl);

try {
  const [tableRows] = await connection.query("SHOW TABLES");
  const tableKey = Object.keys(tableRows[0] ?? {})[0];
  const tableNames = tableRows.map((row) => String(row[tableKey])).sort();
  const tableCounts = {};

  for (const tableName of tableNames) {
    const [countRows] = await connection.query(`SELECT COUNT(*) AS total FROM \`${tableName.replaceAll("`", "``")}\``);
    tableCounts[tableName] = Number(countRows[0]?.total ?? 0);
  }

  const sqlPath = join(outputDirectory, "database-completo.sql");
  const quoteIdentifier = (value) => `\`${String(value).replaceAll("`", "``")}\``;
  const escapeValue = (value) => {
    if (value === null || value === undefined) return "NULL";
    if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace("T", " ")}'`;
    if (Buffer.isBuffer(value)) return `X'${value.toString("hex")}'`;
    if (typeof value === "number" || typeof value === "bigint") return String(value);
    if (typeof value === "boolean") return value ? "1" : "0";
    return `'${String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'").replaceAll("\u0000", "\\0").replaceAll("\n", "\\n").replaceAll("\r", "\\r")}'`;
  };

  await writeFile(sqlPath, "-- Backup completo gerado pelo Rencia App\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n", { mode: 0o600 });
  for (const tableName of tableNames) {
    const identifier = quoteIdentifier(tableName);
    const [createRows] = await connection.query(`SHOW CREATE TABLE ${identifier}`);
    const createStatement = Object.values(createRows[0] ?? {}).find((value) => typeof value === "string" && String(value).startsWith("CREATE TABLE"));
    if (!createStatement) throw new Error(`Não foi possível obter o schema da tabela ${tableName}.`);
    await appendFile(sqlPath, `DROP TABLE IF EXISTS ${identifier};\n${createStatement};\n\n`);

    const [rows] = await connection.query(`SELECT * FROM ${identifier}`);
    if (!rows.length) continue;
    const columns = Object.keys(rows[0]);
    const columnList = columns.map(quoteIdentifier).join(", ");
    const chunkSize = 100;
    for (let start = 0; start < rows.length; start += chunkSize) {
      const values = rows.slice(start, start + chunkSize).map((row) => `(${columns.map((column) => escapeValue(row[column])).join(", ")})`).join(",\n");
      await appendFile(sqlPath, `INSERT INTO ${identifier} (${columnList}) VALUES\n${values};\n`);
    }
    await appendFile(sqlPath, "\n");
  }
  await appendFile(sqlPath, "SET FOREIGN_KEY_CHECKS=1;\n");

  const sqlBytes = await readFile(sqlPath);
  const manifest = {
    format: "rencia-full-backup-v1",
    generatedAt: new Date().toISOString(),
    database,
    tableCount: tableNames.length,
    tables: tableCounts,
    databaseDump: {
      file: "database-completo.sql",
      bytes: sqlBytes.length,
      sha256: createHash("sha256").update(sqlBytes).digest("hex"),
    },
    security: "O arquivo contém dados confidenciais. Guarde-o em local seguro e não compartilhe publicamente.",
  };
  await writeFile(join(outputDirectory, "manifesto.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });

  const readme = `# Backup completo do Rencia App\n\nEste pacote contém um dump SQL consistente de todas as tabelas do banco no momento da geração.\n\n## Restauração em outro servidor MySQL/TiDB\n\n1. Crie um banco vazio em MySQL ou TiDB compatível.\n2. Importe o arquivo \`database-completo.sql\`: \`mysql -h HOST -u USUARIO -p NOME_DO_BANCO < database-completo.sql\`.\n3. Publique o código-fonte do painel em um ambiente Node.js compatível.\n4. Configure \`DATABASE_URL\`, \`JWT_SECRET\` e os demais segredos do novo ambiente. Esses segredos não são incluídos neste backup.\n5. Confira \`manifesto.json\` e compare o checksum SHA-256 antes de importar.\n\n## Observações\n\n- O dump inclui todas as tabelas existentes, incluindo usuários, dispositivos, MACs, listas, configurações, avisos, comandos, histórico e dados de aplicativos.\n- Arquivos de imagem e APK hospedados externamente permanecem referenciados pelas URLs gravadas no banco. Ao migrar para outra hospedagem, copie os arquivos dessas URLs para o armazenamento novo antes de desativar o ambiente atual.\n- Este arquivo pode conter dados pessoais e hashes de senha. Mantenha-o protegido.\n`;
  await writeFile(join(outputDirectory, "LEIA-ME-RESTAURACAO.md"), readme, { mode: 0o600 });

  console.log(JSON.stringify(manifest));
} finally {
  await connection.end();
}
