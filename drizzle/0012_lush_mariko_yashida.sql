CREATE TABLE `contratos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numero` varchar(50) NOT NULL,
	`objeto` text NOT NULL,
	`tipo` enum('prestacao_servico','fornecimento','locacao','misto') NOT NULL DEFAULT 'prestacao_servico',
	`status` enum('negociacao','ativo','suspenso','encerrado','cancelado') NOT NULL DEFAULT 'negociacao',
	`clienteId` int,
	`valorTotal` decimal(15,2) NOT NULL,
	`dataInicio` date,
	`dataFim` date,
	`descricao` text,
	`observacoes` text,
	`recebimentoId` int,
	`pagamentoId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `contratos_id` PRIMARY KEY(`id`),
	CONSTRAINT `contratos_numero_unique` UNIQUE(`numero`)
);
--> statement-breakpoint
CREATE TABLE `materiais` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(30) NOT NULL,
	`nome` varchar(200) NOT NULL,
	`descricao` text,
	`unidade` varchar(30),
	`valorUnitario` decimal(15,2),
	`estoque` decimal(15,3) DEFAULT '0',
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `materiais_id` PRIMARY KEY(`id`),
	CONSTRAINT `materiais_codigo_unique` UNIQUE(`codigo`)
);
--> statement-breakpoint
CREATE TABLE `ordens_servico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numero` varchar(50) NOT NULL,
	`contratoId` int,
	`clienteId` int,
	`titulo` varchar(200) NOT NULL,
	`descricao` text,
	`status` enum('aberta','em_execucao','concluida','cancelada','pausada') NOT NULL DEFAULT 'aberta',
	`prioridade` enum('baixa','media','alta','urgente') NOT NULL DEFAULT 'media',
	`responsavel` varchar(150),
	`dataAbertura` date,
	`dataPrevisao` date,
	`dataConclusao` date,
	`valorEstimado` decimal(15,2),
	`valorRealizado` decimal(15,2),
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `ordens_servico_id` PRIMARY KEY(`id`),
	CONSTRAINT `ordens_servico_numero_unique` UNIQUE(`numero`)
);
--> statement-breakpoint
CREATE TABLE `os_itens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`osId` int NOT NULL,
	`tipo` enum('servico','material') NOT NULL,
	`tipoServicoId` int,
	`materialId` int,
	`descricao` varchar(300),
	`quantidade` decimal(15,3) NOT NULL,
	`valorUnitario` decimal(15,2) NOT NULL,
	`valorTotal` decimal(15,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `os_itens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tipos_servico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(30) NOT NULL,
	`nome` varchar(200) NOT NULL,
	`descricao` text,
	`unidade` varchar(30),
	`valorUnitario` decimal(15,2),
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `tipos_servico_id` PRIMARY KEY(`id`),
	CONSTRAINT `tipos_servico_codigo_unique` UNIQUE(`codigo`)
);
--> statement-breakpoint
ALTER TABLE `contratos` ADD CONSTRAINT `contratos_clienteId_clientes_id_fk` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contratos` ADD CONSTRAINT `contratos_recebimentoId_recebimentos_id_fk` FOREIGN KEY (`recebimentoId`) REFERENCES `recebimentos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contratos` ADD CONSTRAINT `contratos_pagamentoId_pagamentos_id_fk` FOREIGN KEY (`pagamentoId`) REFERENCES `pagamentos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contratos` ADD CONSTRAINT `contratos_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `materiais` ADD CONSTRAINT `materiais_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD CONSTRAINT `ordens_servico_contratoId_contratos_id_fk` FOREIGN KEY (`contratoId`) REFERENCES `contratos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD CONSTRAINT `ordens_servico_clienteId_clientes_id_fk` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ordens_servico` ADD CONSTRAINT `ordens_servico_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `os_itens` ADD CONSTRAINT `os_itens_osId_ordens_servico_id_fk` FOREIGN KEY (`osId`) REFERENCES `ordens_servico`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `os_itens` ADD CONSTRAINT `os_itens_tipoServicoId_tipos_servico_id_fk` FOREIGN KEY (`tipoServicoId`) REFERENCES `tipos_servico`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `os_itens` ADD CONSTRAINT `os_itens_materialId_materiais_id_fk` FOREIGN KEY (`materialId`) REFERENCES `materiais`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tipos_servico` ADD CONSTRAINT `tipos_servico_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;