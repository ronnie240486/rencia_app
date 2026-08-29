import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL é obrigatória para atualizar o banco no Railway.");
}

const connection = await mysql.createConnection(databaseUrl);
const additions = [
  "ALTER TABLE `devices` ADD COLUMN `accessMode` enum('MAC','LOGIN_PASSWORD') NOT NULL DEFAULT 'MAC'",
  "ALTER TABLE `devices` ADD COLUMN `appVersion` varchar(64) NULL",
  "ALTER TABLE `devices` ADD COLUMN `lastActiveAppId` varchar(64) NULL",
  "ALTER TABLE `devices` ADD COLUMN `forceShowChannel` boolean NOT NULL DEFAULT false",
  "ALTER TABLE `devices` ADD COLUMN `activeDeviceUrlId` int NULL",
  "ALTER TABLE `devices` ADD COLUMN `listFailoverEnabled` boolean NOT NULL DEFAULT true",
  "ALTER TABLE `devices` ADD COLUMN `maxConcurrentConnections` int NOT NULL DEFAULT 1",
  `CREATE TABLE IF NOT EXISTS \`device_app_links\` (
    \`id\` int AUTO_INCREMENT PRIMARY KEY,
    \`deviceId\` int NOT NULL,
    \`appId\` varchar(64) NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY \`device_app_links_device_app_unique\` (\`deviceId\`, \`appId\`)
  )`,
];

try {
  for (const statement of additions) {
    try {
      await connection.execute(statement);
      console.log("[Railway migration] Estrutura adicionada.");
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ER_DUP_FIELDNAME") {
        console.log("[Railway migration] Campo já existente; mantido.");
        continue;
      }
      throw error;
    }
  }
} finally {
  await connection.end();
}
