CREATE TABLE `ultra_player_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`appName` varchar(128) NOT NULL DEFAULT 'Ultra Player',
	`bannerUrl` text,
	`backgroundUrl` text,
	`logoUrl` text,
	`iconsJson` text,
	`welcomeMessage` text,
	`maintenanceMessage` text,
	`serverApiUrl` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ultra_player_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `ultra_player_config_ownerId_unique` UNIQUE(`ownerId`)
);
