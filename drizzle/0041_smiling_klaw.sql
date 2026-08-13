CREATE TABLE `server_maintenance_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`host` varchar(500) NOT NULL,
	`reason` varchar(500),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `server_maintenance_blocks_id` PRIMARY KEY(`id`)
);
