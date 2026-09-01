CREATE TABLE `device_macs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`mac` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `device_macs_id` PRIMARY KEY(`id`),
	CONSTRAINT `device_macs_mac_unique` UNIQUE(`mac`)
);
--> statement-breakpoint
CREATE INDEX `device_macs_device_idx` ON `device_macs` (`deviceId`);