CREATE TABLE `reseller_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resellerId` int NOT NULL,
	`permissions` text NOT NULL,
	`updatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reseller_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `reseller_permissions_resellerId_unique` UNIQUE(`resellerId`)
);
