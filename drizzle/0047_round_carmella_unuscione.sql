CREATE TABLE `app_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`deviceId` int NOT NULL,
	`appId` varchar(64) NOT NULL,
	`username` varchar(128) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`firstAuthenticatedAt` timestamp,
	`lastAuthenticatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_credentials_deviceId_unique` UNIQUE(`deviceId`),
	CONSTRAINT `app_credentials_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `devices` ADD `accessMode` enum('MAC','LOGIN_PASSWORD') DEFAULT 'MAC' NOT NULL;