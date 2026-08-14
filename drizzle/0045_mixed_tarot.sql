CREATE TABLE `device_list_notification_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`alertId` int NOT NULL,
	`acknowledgedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `device_list_notification_receipts_id` PRIMARY KEY(`id`)
);
