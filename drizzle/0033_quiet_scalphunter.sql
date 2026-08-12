CREATE TABLE `auto_backup_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`runTime` varchar(5) NOT NULL DEFAULT '03:00',
	`scheduleCronTaskUid` varchar(65),
	`lastRunAt` timestamp,
	`lastStatus` enum('success','error','never') NOT NULL DEFAULT 'never',
	`lastError` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `auto_backup_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `backup_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`storageKey` text NOT NULL,
	`storageUrl` text NOT NULL,
	`fileSize` int NOT NULL,
	`type` enum('automatic','manual') NOT NULL DEFAULT 'automatic',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backup_snapshots_id` PRIMARY KEY(`id`)
);
