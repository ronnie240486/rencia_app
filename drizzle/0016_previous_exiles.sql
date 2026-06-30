CREATE TABLE `interactive_banners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`descricao` text,
	`tipo` enum('image','video') NOT NULL DEFAULT 'image',
	`urlMedia` text NOT NULL,
	`duracao` int NOT NULL DEFAULT 5,
	`ordem` int NOT NULL DEFAULT 0,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `interactive_banners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interactive_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`backgroundUrl` text,
	`appName` varchar(128) NOT NULL DEFAULT 'InteractivePro',
	`appLogo` text,
	`autoplayInterval` int NOT NULL DEFAULT 5000,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `interactive_config_id` PRIMARY KEY(`id`)
);
