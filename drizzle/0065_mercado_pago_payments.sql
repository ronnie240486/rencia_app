CREATE TABLE `mercado_pago_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mpPaymentId` varchar(64) NOT NULL,
	`mac` varchar(32) NOT NULL,
	`deviceId` int,
	`amount` decimal(10,2),
	`status` varchar(32) NOT NULL,
	`daysAdded` int,
	`rawPayload` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mercado_pago_payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `mercado_pago_payments_mpPaymentId_unique` UNIQUE(`mpPaymentId`)
);
