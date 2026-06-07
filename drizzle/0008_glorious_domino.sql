CREATE TABLE `carousel_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`autoplay` boolean NOT NULL DEFAULT true,
	`autoplayInterval` int NOT NULL DEFAULT 5000,
	`impactPhrase` text DEFAULT ('O melhor IPTV sempre'),
	`contactPhrase` text DEFAULT ('Contate seu revenda'),
	`legalNotice` text DEFAULT ('OuroPro is a media player application. The app does not provide or include any media or content.'),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `carousel_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `carousel_slides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`descricao` text,
	`tipo` enum('image','video') NOT NULL DEFAULT 'image',
	`urlMedia` text NOT NULL,
	`ordem` int NOT NULL DEFAULT 0,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `carousel_slides_id` PRIMARY KEY(`id`)
);
