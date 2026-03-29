CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entidade` varchar(100) NOT NULL,
	`entidadeId` int,
	`acao` enum('criacao','edicao','exclusao') NOT NULL,
	`usuarioId` int,
	`usuarioNome` varchar(200),
	`valorAnterior` text,
	`valorNovo` text,
	`camposAlterados` text,
	`descricao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `tempoTotalMinutos` int;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `custoMaoObra` decimal(15,2);--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `tipoOs` varchar(100);--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;