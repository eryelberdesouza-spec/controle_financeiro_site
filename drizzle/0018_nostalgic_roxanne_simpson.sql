ALTER TABLE `centros_custo` MODIFY COLUMN `tipo` enum('operacional','administrativo','contrato','projeto','investimento','outro') NOT NULL DEFAULT 'operacional';--> statement-breakpoint
ALTER TABLE `centros_custo` ADD `responsavel` varchar(150);--> statement-breakpoint
ALTER TABLE `centros_custo` ADD `observacoes` text;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD `centroCustoId` int;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD CONSTRAINT `ordens_servico_centroCustoId_centros_custo_id_fk` FOREIGN KEY (`centroCustoId`) REFERENCES `centros_custo`(`id`) ON DELETE no action ON UPDATE no action;
