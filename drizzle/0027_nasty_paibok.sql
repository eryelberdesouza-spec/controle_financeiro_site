ALTER TABLE `contratos` ADD `inconsistente` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `contratos` ADD `motivoInconsistencia` varchar(500);--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `inconsistente` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `motivoInconsistencia` varchar(500);--> statement-breakpoint
ALTER TABLE `pagamentos` ADD `inconsistente` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `pagamentos` ADD `motivoInconsistencia` varchar(500);--> statement-breakpoint
ALTER TABLE `recebimentos` ADD `inconsistente` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `recebimentos` ADD `motivoInconsistencia` varchar(500);