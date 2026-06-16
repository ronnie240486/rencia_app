CREATE TABLE `background_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`carouselSlideId` int NOT NULL,
	`duration` int NOT NULL DEFAULT 5,
	`order` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `background_images_id` PRIMARY KEY(`id`)
);
