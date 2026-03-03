CREATE TABLE `convites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`nome` varchar(255),
	`role` enum('admin','operador','user') NOT NULL DEFAULT 'operador',
	`token` varchar(128) NOT NULL,
	`status` enum('pendente','aceito','expirado') NOT NULL DEFAULT 'pendente',
	`expiresAt` timestamp NOT NULL,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`usedAt` timestamp,
	CONSTRAINT `convites_id` PRIMARY KEY(`id`),
	CONSTRAINT `convites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `ativo` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `convites` ADD CONSTRAINT `convites_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;