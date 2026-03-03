ALTER TABLE `recebimentos` MODIFY COLUMN `tipoRecebimento` enum('Pix','Boleto','Transferência','Cartão de Crédito','Cartão de Débito','Dinheiro','Outro') NOT NULL DEFAULT 'Pix';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','operador') NOT NULL DEFAULT 'operador';--> statement-breakpoint
ALTER TABLE `pagamentos` ADD `numeroControle` varchar(50);--> statement-breakpoint
ALTER TABLE `recebimentos` ADD `numeroControle` varchar(50);--> statement-breakpoint
ALTER TABLE `recebimentos` ADD `juros` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `recebimentos` ADD `desconto` decimal(15,2) DEFAULT '0';