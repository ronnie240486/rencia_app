CREATE TABLE `iptv_server_alert_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`scheduleCronTaskUid` varchar(65),
	`lastRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `iptv_server_alert_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `iptv_server_alert_settings_ownerId_unique` UNIQUE(`ownerId`)
);
