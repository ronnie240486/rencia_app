CREATE TABLE `dns_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`titulo` varchar(128) NOT NULL,
	`host` varchar(512) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dns_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `devices` ADD `currentContent` text;--> statement-breakpoint
ALTER TABLE `devices` ADD `telefone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `bannerUrl` text;