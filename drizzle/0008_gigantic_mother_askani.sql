CREATE TABLE `centros_custo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(150) NOT NULL,
	`descricao` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `centros_custo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clientes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`tipo` enum('Cliente','Prestador de Serviço','Fornecedor','Hotel','Parceiro','Outro') NOT NULL DEFAULT 'Cliente',
	`cpfCnpj` varchar(20),
	`email` varchar(320),
	`telefone` varchar(30),
	`endereco` text,
	`cidade` varchar(100),
	`estado` varchar(2),
	`observacao` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `clientes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pagamentos` ADD `clienteId` int;--> statement-breakpoint
ALTER TABLE `pagamentos` ADD `centroCustoId` int;--> statement-breakpoint
ALTER TABLE `recebimentos` ADD `clienteId` int;--> statement-breakpoint
ALTER TABLE `recebimentos` ADD `centroCustoId` int;--> statement-breakpoint
ALTER TABLE `centros_custo` ADD CONSTRAINT `centros_custo_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clientes` ADD CONSTRAINT `clientes_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pagamentos` ADD CONSTRAINT `pagamentos_clienteId_clientes_id_fk` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pagamentos` ADD CONSTRAINT `pagamentos_centroCustoId_centros_custo_id_fk` FOREIGN KEY (`centroCustoId`) REFERENCES `centros_custo`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recebimentos` ADD CONSTRAINT `recebimentos_clienteId_clientes_id_fk` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recebimentos` ADD CONSTRAINT `recebimentos_centroCustoId_centros_custo_id_fk` FOREIGN KEY (`centroCustoId`) REFERENCES `centros_custo`(`id`) ON DELETE no action ON UPDATE no action;