CREATE TABLE `remote_device_commands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`deviceId` int NOT NULL,
	`command` enum('refresh_playlist','switch_playlist','update_dns','show_message','restart_player','sync_access') NOT NULL,
	`payload` text,
	`status` enum('queued','delivered','executed','failed','expired','cancelled') NOT NULL DEFAULT 'queued',
	`expiresAt` timestamp NOT NULL,
	`deliveredAt` timestamp,
	`executedAt` timestamp,
	`resultMessage` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `remote_device_commands_id` PRIMARY KEY(`id`)
);
