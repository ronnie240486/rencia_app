CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int,
	`action` varchar(64) NOT NULL,
	`summary` varchar(500) NOT NULL,
	`beforeData` text,
	`afterData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `list_health_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`deviceId` int NOT NULL,
	`deviceUrlId` int,
	`urlSnapshot` text NOT NULL,
	`status` enum('success','error','pending') NOT NULL DEFAULT 'pending',
	`statusCode` int,
	`responseTimeMs` int,
	`message` varchar(500),
	`checkedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `list_health_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`deviceId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`status` enum('pending','paid','overdue') NOT NULL DEFAULT 'pending',
	`dueDate` date,
	`paidAt` timestamp,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
