CREATE TABLE `list_failover_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`deviceId` int NOT NULL,
	`fromDeviceUrlId` int,
	`toDeviceUrlId` int,
	`reason` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `list_failover_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `list_failover_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`intervalMinutes` int NOT NULL DEFAULT 10,
	`scheduleCronTaskUid` varchar(65),
	`lastRunAt` timestamp,
	`lastStatus` enum('success','error','never') NOT NULL DEFAULT 'never',
	`lastError` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `list_failover_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `list_failover_settings_ownerId_unique` UNIQUE(`ownerId`)
);
--> statement-breakpoint
ALTER TABLE `devices` ADD `activeDeviceUrlId` int;--> statement-breakpoint
ALTER TABLE `devices` ADD `listFailoverEnabled` boolean DEFAULT true NOT NULL;