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
  // Faltava aqui — a coluna existe no schema.ts (migração 0061) desde antes,
  // mas nunca tinha sido incluída nesta lista. Sem ela, o Railway nunca criava
  // a coluna em produção, e tudo que depende do perfil de servidor do cliente
  // (nomeServidor) — como o "Ranking de servidores" do Dashboard — ficava
  // sempre vazio ou dando erro de coluna inexistente, mesmo com o código certo.
  "ALTER TABLE `devices` ADD COLUMN `nomeServidor` varchar(255) NULL",
  // device_macs (0062) e sua coluna appId (0063) também nunca tinham sido
  // adicionadas aqui — necessárias pra função de MAC adicional no mesmo cliente.
  `CREATE TABLE IF NOT EXISTS \`device_macs\` (
    \`id\` int AUTO_INCREMENT PRIMARY KEY,
    \`deviceId\` int NOT NULL,
    \`mac\` varchar(64) NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY \`device_macs_mac_unique\` (\`mac\`)
  )`,
  "ALTER TABLE `device_macs` ADD COLUMN `appId` varchar(64) NULL",
  "CREATE INDEX `device_macs_device_idx` ON `device_macs` (`deviceId`)",
  `CREATE TABLE IF NOT EXISTS \`device_app_links\` (
    \`id\` int AUTO_INCREMENT PRIMARY KEY,
    \`deviceId\` int NOT NULL,
    \`appId\` varchar(64) NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY \`device_app_links_device_app_unique\` (\`deviceId\`, \`appId\`)
  )`,
  // Renovação automática via Mercado Pago (botão "Renovar Agora" da tela de
  // bloqueio) — registra cada pagamento aprovado pra nunca renovar o mesmo
  // cliente duas vezes, mesmo se o Mercado Pago reenviar a notificação.
  `CREATE TABLE IF NOT EXISTS \`mercado_pago_payments\` (
    \`id\` int AUTO_INCREMENT PRIMARY KEY,
    \`mpPaymentId\` varchar(64) NOT NULL,
    \`mac\` varchar(32) NOT NULL,
    \`deviceId\` int NULL,
    \`amount\` decimal(10,2) NULL,
    \`status\` varchar(32) NOT NULL,
    \`daysAdded\` int NULL,
    \`rawPayload\` text NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY \`mercado_pago_payments_mpPaymentId_unique\` (\`mpPaymentId\`)
  )`,
];

try {
  for (const statement of additions) {
    try {
      await connection.execute(statement);
      console.log("[Railway migration] Estrutura adicionada.");
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && (error.code === "ER_DUP_FIELDNAME" || error.code === "ER_DUP_KEYNAME")) {
        console.log("[Railway migration] Campo/índice já existente; mantido.");
        continue;
      }
      throw error;
    }
  }
} finally {
  await connection.end();
}
