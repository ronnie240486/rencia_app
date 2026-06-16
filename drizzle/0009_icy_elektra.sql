CREATE TABLE `notices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`autorId` int NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`conteudo` text NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`telefone` varchar(32),
	`email` varchar(320),
	`sugestao` text NOT NULL,
	`status` enum('novo','lido','respondido') NOT NULL DEFAULT 'novo',
	`resposta` text,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`respondidoEm` timestamp,
	CONSTRAINT `suggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `lastLoginDate` date DEFAULT CURDATE() NOT NULL;