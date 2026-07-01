DROP TABLE `app_intro_config`;--> statement-breakpoint
DROP TABLE `content_suggestions`;--> statement-breakpoint
DROP TABLE `interactive_banners`;--> statement-breakpoint
DROP TABLE `interactive_config`;--> statement-breakpoint
ALTER TABLE `devices` DROP INDEX `devices_mac_unique`;--> statement-breakpoint
ALTER TABLE `devices` MODIFY COLUMN `tipo` enum('Usuario','Revenda','UltraMaster','Master') NOT NULL DEFAULT 'Usuario';--> statement-breakpoint
ALTER TABLE `devices` DROP COLUMN `appType`;