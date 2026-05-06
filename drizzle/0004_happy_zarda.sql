CREATE TABLE `device_urls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`nome` varchar(128) NOT NULL DEFAULT 'Lista 1',
	`modoSelecao` enum('XTeamCode','M3U8') NOT NULL DEFAULT 'XTeamCode',
	`urlM3u8` text,
	`xtServer` text,
	`xtUsername` varchar(255),
	`xtPassword` varchar(255),
	`ordem` int NOT NULL DEFAULT 0,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `device_urls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `resellerId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `limiteRevendas` int DEFAULT 0;