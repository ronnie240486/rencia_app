CREATE TABLE `panel_button_colors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buttonName` varchar(128) NOT NULL,
	`color` varchar(7) NOT NULL DEFAULT '#000000',
	`textColor` varchar(7) NOT NULL DEFAULT '#FFFFFF',
	`hoverColor` varchar(7) NOT NULL DEFAULT '#333333',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `panel_button_colors_id` PRIMARY KEY(`id`),
	CONSTRAINT `panel_button_colors_buttonName_unique` UNIQUE(`buttonName`)
);
