ALTER TABLE `pagamentos` ADD `contratoId` int;--> statement-breakpoint
ALTER TABLE `recebimentos` ADD `contratoId` int;--> statement-breakpoint
ALTER TABLE `pagamentos` ADD CONSTRAINT `pagamentos_contratoId_contratos_id_fk` FOREIGN KEY (`contratoId`) REFERENCES `contratos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recebimentos` ADD CONSTRAINT `recebimentos_contratoId_contratos_id_fk` FOREIGN KEY (`contratoId`) REFERENCES `contratos`(`id`) ON DELETE no action ON UPDATE no action;