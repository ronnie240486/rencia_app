CREATE TABLE `message_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`category` enum('renewal','collection','welcome','maintenance','custom') NOT NULL DEFAULT 'custom',
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `message_templates_id` PRIMARY KEY(`id`)
);
