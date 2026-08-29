CREATE TABLE `iptv_server_alert_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serverId` int NOT NULL,
	`ownerId` int NOT NULL,
	`alertDate` date NOT NULL,
	`channel` enum('panel','whatsapp_ready','whatsapp_business') NOT NULL,
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `iptv_server_alert_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `iptv_server_alert_once_per_day` UNIQUE(`serverId`,`alertDate`,`channel`)
);
--> statement-breakpoint
CREATE TABLE `iptv_servers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`server` varchar(512) NOT NULL,
	`expiresAt` date NOT NULL,
	`reminderDays` int NOT NULL DEFAULT 3,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `iptv_servers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `iptv_server_alert_owner_created_idx` ON `iptv_server_alert_logs` (`ownerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `iptv_servers_owner_expiry_idx` ON `iptv_servers` (`ownerId`,`expiresAt`);