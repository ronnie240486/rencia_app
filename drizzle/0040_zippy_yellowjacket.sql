ALTER TABLE `devices` ADD `maxConcurrentConnections` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `dns_entries` ADD `grupo` varchar(128) DEFAULT 'Padrão' NOT NULL;