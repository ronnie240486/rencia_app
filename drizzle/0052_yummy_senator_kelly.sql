CREATE TABLE `google_drive_backup_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`folderId` varchar(160) NOT NULL,
	`folderName` varchar(255) NOT NULL,
	`encryptedRefreshToken` text NOT NULL,
	`status` enum('connected','error') NOT NULL DEFAULT 'connected',
	`lastSuccessAt` timestamp,
	`lastError` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `google_drive_backup_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `google_drive_backup_connections_ownerId_unique` UNIQUE(`ownerId`)
);
--> statement-breakpoint
ALTER TABLE `backup_snapshots` ADD `googleDriveFileId` varchar(160);--> statement-breakpoint
ALTER TABLE `backup_snapshots` ADD `googleDriveUrl` text;--> statement-breakpoint
ALTER TABLE `backup_snapshots` ADD `googleDriveStatus` enum('not_configured','success','error') DEFAULT 'not_configured' NOT NULL;--> statement-breakpoint
ALTER TABLE `backup_snapshots` ADD `googleDriveError` varchar(500);