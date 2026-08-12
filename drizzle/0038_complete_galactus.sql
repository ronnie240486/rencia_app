CREATE TABLE `history_retention_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`retentionDays` int NOT NULL DEFAULT 3,
	`scheduleCronTaskUid` varchar(65),
	`lastRunAt` timestamp,
	`lastStatus` enum('success','error','never') NOT NULL DEFAULT 'never',
	`lastError` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `history_retention_settings_id` PRIMARY KEY(`id`)
);
