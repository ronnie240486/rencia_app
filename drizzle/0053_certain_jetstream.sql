CREATE TABLE `device_app_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`appId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `device_app_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `device_app_links_device_app_unique` UNIQUE(`deviceId`,`appId`)
);
--> statement-breakpoint
ALTER TABLE `devices` ADD `lastActiveAppId` varchar(64);