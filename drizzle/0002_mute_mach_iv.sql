CREATE TABLE `apps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(128) NOT NULL,
	`iconeUrl` text,
	`totalClientes` int NOT NULL DEFAULT 0,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `apps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`mac` varchar(64) NOT NULL,
	`nomeServer` varchar(255) NOT NULL,
	`tipo` enum('Usuario','Revenda','UltraMaster','Master') NOT NULL DEFAULT 'Usuario',
	`modoSelecao` enum('XTeamCode','M3U8') NOT NULL DEFAULT 'XTeamCode',
	`app` varchar(128),
	`urlM3u8` text,
	`urlEpg` text,
	`valor` decimal(10,2),
	`status` enum('Liberado','Bloqueado','Expirado') NOT NULL DEFAULT 'Liberado',
	`dataCadastro` timestamp NOT NULL DEFAULT (now()),
	`dataExpiracao` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `devices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `plano` varchar(64) DEFAULT 'Revenda';--> statement-breakpoint
ALTER TABLE `users` ADD `planValidade` date;--> statement-breakpoint
ALTER TABLE `users` ADD `limiteDevices` int DEFAULT 999;