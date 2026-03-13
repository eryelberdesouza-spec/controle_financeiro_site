ALTER TABLE `materiais` ADD `precoCusto` decimal(15,2);--> statement-breakpoint
ALTER TABLE `materiais` ADD `precoVenda` decimal(15,2);--> statement-breakpoint
ALTER TABLE `materiais` ADD `finalidade` enum('uso','fornecimento','ambos') DEFAULT 'ambos' NOT NULL;--> statement-breakpoint
ALTER TABLE `materiais` ADD `dataInsercao` date;