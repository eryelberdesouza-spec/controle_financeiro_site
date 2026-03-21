CREATE TABLE `os_status_historico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`osId` int NOT NULL,
	`statusAnterior` varchar(50),
	`statusNovo` varchar(50) NOT NULL,
	`usuarioId` int,
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `os_status_historico_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ordens_servico` MODIFY COLUMN `prioridade` enum('baixa','normal','alta','critica') NOT NULL DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `tipoServico` varchar(100);--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `categoriaServico` varchar(100);--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `responsavelUsuarioId` int;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `equipeIds` text;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `dataAgendamento` date;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `dataInicioPrevista` date;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `dataFimPrevista` date;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `localExecucao` varchar(500);--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `checklistJson` text;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `evidenciasUrls` text;--> statement-breakpoint
ALTER TABLE `os_status_historico` ADD CONSTRAINT `os_status_historico_osId_ordens_servico_id_fk` FOREIGN KEY (`osId`) REFERENCES `ordens_servico`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `os_status_historico` ADD CONSTRAINT `os_status_historico_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD CONSTRAINT `ordens_servico_responsavelUsuarioId_users_id_fk` FOREIGN KEY (`responsavelUsuarioId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;