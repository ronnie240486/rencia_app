CREATE TABLE `player_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`username` varchar(128) NOT NULL,
	`password` varchar(128) NOT NULL,
	`descricao` varchar(255),
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `player_credentials_id` PRIMARY KEY(`id`)
);
