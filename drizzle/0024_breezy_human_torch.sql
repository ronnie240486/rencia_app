ALTER TABLE `users` MODIFY COLUMN `loginMethod` varchar(64) DEFAULT 'email_password';--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `senhaRevenda` text;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);