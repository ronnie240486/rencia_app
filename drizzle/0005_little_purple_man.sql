ALTER TABLE `devices` ADD `lastSeen` timestamp;--> statement-breakpoint
ALTER TABLE `devices` ADD `connectedAt` timestamp;--> statement-breakpoint
ALTER TABLE `devices` ADD `currentContent` varchar(512);--> statement-breakpoint
ALTER TABLE `devices` ADD `deviceType` varchar(32);--> statement-breakpoint
ALTER TABLE `devices` ADD `telefone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `telefone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bannerColor` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bannerImage` text;