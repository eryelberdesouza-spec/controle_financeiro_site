CREATE TABLE `formas_pagamento_padrao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(150) NOT NULL,
	`descricao` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `formas_pagamento_padrao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `info_importantes_padrao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titulo` varchar(200) NOT NULL,
	`conteudo` text NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `info_importantes_padrao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prazos_padrao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(150) NOT NULL,
	`descricao` text,
	`diasPrazo` int,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `prazos_padrao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `proposta_escopos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propostaId` int NOT NULL,
	`descricao` text NOT NULL,
	`ordem` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `proposta_escopos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `proposta_info_importantes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propostaId` int NOT NULL,
	`infoImportanteId` int,
	`titulo` varchar(200) NOT NULL,
	`conteudo` text NOT NULL,
	`exclusiva` boolean NOT NULL DEFAULT false,
	`ordem` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `proposta_info_importantes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `proposta_itens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propostaId` int NOT NULL,
	`tipo` enum('MATERIAL','SERVICO','OUTRO') NOT NULL DEFAULT 'SERVICO',
	`materialId` int,
	`tipoServicoId` int,
	`descricao` varchar(500) NOT NULL,
	`unidade` varchar(30) DEFAULT 'un',
	`quantidade` decimal(15,3) NOT NULL,
	`valorUnitario` decimal(15,2) NOT NULL,
	`valorSubtotal` decimal(15,2) NOT NULL,
	`ordem` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `proposta_itens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `proposta_pagamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propostaId` int NOT NULL,
	`formaPagamentoId` int,
	`textoCustomizado` text,
	`ordem` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `proposta_pagamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `propostas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numero` varchar(50) NOT NULL,
	`status` enum('RASCUNHO','ENVIADA','EM_NEGOCIACAO','APROVADA','RECUSADA','EM_CONTRATACAO','EXPIRADA','CANCELADA') NOT NULL DEFAULT 'RASCUNHO',
	`clienteId` int,
	`clienteNome` varchar(255),
	`clienteCpfCnpj` varchar(20),
	`clienteEndereco` text,
	`clienteCep` varchar(10),
	`clienteTelefone` varchar(30),
	`clienteEmail` varchar(320),
	`clienteResponsavel` varchar(150),
	`dataGeracao` date NOT NULL,
	`validadeDias` int NOT NULL DEFAULT 30,
	`dataValidade` date,
	`sobreNosTexto` text,
	`prazoPadraoId` int,
	`prazoPadraoTexto` text,
	`valorSubtotal` decimal(15,2) DEFAULT '0',
	`descontoPercentual` decimal(5,2) DEFAULT '0',
	`descontoValor` decimal(15,2) DEFAULT '0',
	`valorTotal` decimal(15,2) DEFAULT '0',
	`contratoId` int,
	`projetoId` int,
	`assinaturaNome` varchar(255),
	`assinaturaData` date,
	`dataAprovacao` date,
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `propostas_id` PRIMARY KEY(`id`),
	CONSTRAINT `propostas_numero_unique` UNIQUE(`numero`)
);
--> statement-breakpoint
ALTER TABLE `formas_pagamento_padrao` ADD CONSTRAINT `formas_pagamento_padrao_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `info_importantes_padrao` ADD CONSTRAINT `info_importantes_padrao_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prazos_padrao` ADD CONSTRAINT `prazos_padrao_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposta_escopos` ADD CONSTRAINT `proposta_escopos_propostaId_propostas_id_fk` FOREIGN KEY (`propostaId`) REFERENCES `propostas`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposta_info_importantes` ADD CONSTRAINT `proposta_info_importantes_propostaId_propostas_id_fk` FOREIGN KEY (`propostaId`) REFERENCES `propostas`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposta_info_importantes` ADD CONSTRAINT `proposta_info_importantes_infoImportanteId_info_importantes_padrao_id_fk` FOREIGN KEY (`infoImportanteId`) REFERENCES `info_importantes_padrao`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposta_itens` ADD CONSTRAINT `proposta_itens_propostaId_propostas_id_fk` FOREIGN KEY (`propostaId`) REFERENCES `propostas`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposta_itens` ADD CONSTRAINT `proposta_itens_materialId_materiais_id_fk` FOREIGN KEY (`materialId`) REFERENCES `materiais`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposta_itens` ADD CONSTRAINT `proposta_itens_tipoServicoId_tipos_servico_id_fk` FOREIGN KEY (`tipoServicoId`) REFERENCES `tipos_servico`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposta_pagamentos` ADD CONSTRAINT `proposta_pagamentos_propostaId_propostas_id_fk` FOREIGN KEY (`propostaId`) REFERENCES `propostas`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposta_pagamentos` ADD CONSTRAINT `proposta_pagamentos_formaPagamentoId_formas_pagamento_padrao_id_fk` FOREIGN KEY (`formaPagamentoId`) REFERENCES `formas_pagamento_padrao`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `propostas` ADD CONSTRAINT `propostas_clienteId_clientes_id_fk` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `propostas` ADD CONSTRAINT `propostas_prazoPadraoId_prazos_padrao_id_fk` FOREIGN KEY (`prazoPadraoId`) REFERENCES `prazos_padrao`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `propostas` ADD CONSTRAINT `propostas_contratoId_contratos_id_fk` FOREIGN KEY (`contratoId`) REFERENCES `contratos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `propostas` ADD CONSTRAINT `propostas_projetoId_projetos_id_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `propostas` ADD CONSTRAINT `propostas_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;