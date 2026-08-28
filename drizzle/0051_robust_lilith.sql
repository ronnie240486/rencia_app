CREATE TABLE `store_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`resellerId` int,
	`recipientType` enum('revenda','cliente') NOT NULL,
	`label` varchar(255) NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`allowedApps` text NOT NULL,
	`expiresAt` timestamp,
	`revokedAt` timestamp,
	`lastAccessedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `store_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `store_invites_tokenHash_unique` UNIQUE(`tokenHash`)
);
