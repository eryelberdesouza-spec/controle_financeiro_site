ALTER TABLE `contratos` MODIFY COLUMN `status` enum('proposta','em_negociacao','ativo','suspenso','encerrado') NOT NULL DEFAULT 'proposta';--> statement-breakpoint
ALTER TABLE `ordens_servico` MODIFY COLUMN `status` enum('planejada','autorizada','em_execucao','concluida','cancelada') NOT NULL DEFAULT 'planejada';--> statement-breakpoint
ALTER TABLE `contratos` ADD `valorPrevisto` decimal(15,2);