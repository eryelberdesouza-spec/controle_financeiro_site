CREATE TABLE `projetos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numero` varchar(50) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`clienteId` int,
	`contratoPrincipalId` int,
	`tipoProjeto` enum('INSTALACAO','MANUTENCAO','SERVICO_PONTUAL','OBRA','RECORRENTE','CONSULTORIA','PARCERIA','OUTROS') NOT NULL DEFAULT 'SERVICO_PONTUAL',
	`statusOperacional` enum('PLANEJAMENTO','AGUARDANDO_CONTRATO','AGUARDANDO_MOBILIZACAO','EM_EXECUCAO','PAUSADO','CONCLUIDO_TECNICAMENTE','ENCERRADO_FINANCEIRAMENTE','CANCELADO') NOT NULL DEFAULT 'PLANEJAMENTO',
	`responsavelUserId` int,
	`dataInicioPrevista` date,
	`dataFimPrevista` date,
	`dataInicioReal` date,
	`dataFimReal` date,
	`centroCustoId` int,
	`valorContratado` decimal(15,2) DEFAULT '0',
	`localExecucao` varchar(255),
	`descricao` text,
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `projetos_id` PRIMARY KEY(`id`),
	CONSTRAINT `projetos_numero_unique` UNIQUE(`numero`)
);
--> statement-breakpoint
ALTER TABLE `ordens_servico` MODIFY COLUMN `status` enum('planejada','agendada','em_deslocamento','autorizada','em_execucao','pausada','concluida','aguardando_validacao','cancelada') NOT NULL DEFAULT 'planejada';--> statement-breakpoint
ALTER TABLE `centros_custo` ADD `classificacao` enum('ESTRATEGICO','OPERACIONAL','PROJETO','ADMINISTRATIVO','INVESTIMENTO') DEFAULT 'OPERACIONAL';--> statement-breakpoint
ALTER TABLE `centros_custo` ADD `projetoId` int;--> statement-breakpoint
ALTER TABLE `contratos` ADD `projetoId` int;--> statement-breakpoint
ALTER TABLE `materiais` ADD `projetoId` int;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `projetoId` int;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `equipe` text;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `dataInicioReal` date;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `dataFimReal` date;--> statement-breakpoint
ALTER TABLE `pagamentos` ADD `projetoId` int;--> statement-breakpoint
ALTER TABLE `recebimentos` ADD `projetoId` int;--> statement-breakpoint
ALTER TABLE `projetos` ADD CONSTRAINT `projetos_clienteId_clientes_id_fk` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projetos` ADD CONSTRAINT `projetos_responsavelUserId_users_id_fk` FOREIGN KEY (`responsavelUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projetos` ADD CONSTRAINT `projetos_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contratos` ADD CONSTRAINT `contratos_projetoId_projetos_id_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `materiais` ADD CONSTRAINT `materiais_projetoId_projetos_id_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD CONSTRAINT `ordens_servico_projetoId_projetos_id_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pagamentos` ADD CONSTRAINT `pagamentos_projetoId_projetos_id_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recebimentos` ADD CONSTRAINT `recebimentos_projetoId_projetos_id_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`) ON DELETE no action ON UPDATE no action;