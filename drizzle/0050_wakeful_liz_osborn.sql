CREATE TABLE `app_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`sessionKey` varchar(128) NOT NULL,
	`appId` varchar(64),
	`lastSeen` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_sessions_sessionKey_unique` UNIQUE(`sessionKey`)
);
