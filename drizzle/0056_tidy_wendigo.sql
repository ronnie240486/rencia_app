CREATE TABLE `iptv_server_whatsapp_business_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`status` enum('not_configured','ready','active','error') NOT NULL DEFAULT 'not_configured',
	`enabled` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `iptv_server_whatsapp_business_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `iptv_server_whatsapp_business_settings_ownerId_unique` UNIQUE(`ownerId`)
);
