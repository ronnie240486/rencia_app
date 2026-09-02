CREATE TABLE `monthly_revenue_closures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`periodStart` date NOT NULL,
	`periodEnd` date NOT NULL,
	`revenue` decimal(12,2) NOT NULL DEFAULT '0.00',
	`deviceRevenue` decimal(12,2) NOT NULL DEFAULT '0.00',
	`serverRevenue` decimal(12,2) NOT NULL DEFAULT '0.00',
	`clientCount` int NOT NULL DEFAULT 0,
	`newClientCount` int NOT NULL DEFAULT 0,
	`activeClientCount` int NOT NULL DEFAULT 0,
	`expiredClientCount` int NOT NULL DEFAULT 0,
	`playlistCount` int NOT NULL DEFAULT 0,
	`paidServerCount` int NOT NULL DEFAULT 0,
	`summaryJson` text,
	`whatsappMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `monthly_revenue_closures_id` PRIMARY KEY(`id`),
	CONSTRAINT `monthly_revenue_owner_period_idx` UNIQUE(`ownerId`,`periodStart`)
);
--> statement-breakpoint
CREATE TABLE `monthly_revenue_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`scheduleCronTaskUid` varchar(65),
	`lastRunAt` timestamp,
	`lastStatus` enum('success','error','never') NOT NULL DEFAULT 'never',
	`lastError` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthly_revenue_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `monthly_revenue_settings_ownerId_unique` UNIQUE(`ownerId`)
);
--> statement-breakpoint
CREATE INDEX `monthly_revenue_owner_created_idx` ON `monthly_revenue_closures` (`ownerId`,`createdAt`);