CREATE TABLE `user_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`modulo` varchar(60) NOT NULL,
	`podeVer` boolean NOT NULL DEFAULT false,
	`podeCriar` boolean NOT NULL DEFAULT false,
	`podeEditar` boolean NOT NULL DEFAULT false,
	`podeExcluir` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','operador','operacional') NOT NULL DEFAULT 'operador';--> statement-breakpoint
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;