ALTER TABLE `devices` MODIFY COLUMN `tipo` enum('Usuario','Revenda','Master') NOT NULL DEFAULT 'Usuario';--> statement-breakpoint
ALTER TABLE `devices` ADD `appType` enum('OuroPro','InteractivePro') DEFAULT 'OuroPro' NOT NULL;--> statement-breakpoint
ALTER TABLE `devices` ADD CONSTRAINT `devices_mac_unique` UNIQUE(`mac`);