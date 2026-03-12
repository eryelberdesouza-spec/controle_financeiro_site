CREATE TABLE `anexos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`modulo` varchar(50) NOT NULL,
	`registroId` int NOT NULL,
	`nomeOriginal` varchar(255) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`url` text NOT NULL,
	`mimeType` varchar(100),
	`tamanho` int,
	`descricao` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	CONSTRAINT `anexos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `anexos` ADD CONSTRAINT `anexos_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;