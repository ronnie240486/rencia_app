CREATE TABLE `app_intro_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`logoUrl` text,
	`soundUrl` text,
	`duracao` int NOT NULL DEFAULT 3000,
	`habilitado` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_intro_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_suggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`tipo` enum('filme','serie','novela','desenho') NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`descricao` text,
	`urlCapa` text,
	`urlTrailer` text,
	`genero` varchar(128),
	`ano` int,
	`classificacao` varchar(32),
	`duracao` int,
	`ativo` boolean NOT NULL DEFAULT true,
	`ordem` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_suggestions_id` PRIMARY KEY(`id`)
);
