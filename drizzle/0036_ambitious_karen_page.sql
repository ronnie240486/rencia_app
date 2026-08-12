CREATE TABLE `reseller_billings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`resellerId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`status` enum('pending','paid','overdue') NOT NULL DEFAULT 'pending',
	`dueDate` date NOT NULL,
	`paidAt` timestamp,
	`recurrenceMonths` int NOT NULL DEFAULT 1,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reseller_billings_id` PRIMARY KEY(`id`)
);
