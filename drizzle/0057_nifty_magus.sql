ALTER TABLE `iptv_servers` ADD `personName` varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `iptv_servers` ADD `playlist` varchar(1024) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `iptv_servers` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `iptv_servers` ADD `paymentStatus` enum('paid','unpaid') DEFAULT 'unpaid' NOT NULL;