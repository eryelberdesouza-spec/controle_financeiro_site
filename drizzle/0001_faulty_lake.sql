CREATE TABLE `pagamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nomeCompleto` varchar(255) NOT NULL,
	`cpf` varchar(18),
	`banco` varchar(100),
	`chavePix` varchar(255),
	`tipoPix` enum('CPF','CNPJ','Email','Telefone','Chave Aleatória') DEFAULT 'CPF',
	`tipoServico` varchar(100),
	`centroCusto` varchar(100),
	`valor` decimal(15,2) NOT NULL,
	`dataPagamento` timestamp NOT NULL,
	`status` enum('Pendente','Processando','Pago','Cancelado') NOT NULL DEFAULT 'Pendente',
	`descricao` text,
	`observacao` text,
	`autorizadoPor` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `pagamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recebimentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeroContrato` varchar(100),
	`nomeRazaoSocial` varchar(255) NOT NULL,
	`descricao` text,
	`tipoRecebimento` enum('Pix','Boleto','Transferência','Cartão','Dinheiro','Outro') NOT NULL DEFAULT 'Pix',
	`valorTotal` decimal(15,2) NOT NULL,
	`valorEquipamento` decimal(15,2) DEFAULT '0',
	`valorServico` decimal(15,2) DEFAULT '0',
	`quantidadeParcelas` int NOT NULL DEFAULT 1,
	`parcelaAtual` int DEFAULT 1,
	`dataVencimento` timestamp NOT NULL,
	`dataRecebimento` timestamp,
	`status` enum('Pendente','Recebido','Atrasado','Cancelado') NOT NULL DEFAULT 'Pendente',
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `recebimentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pagamentos` ADD CONSTRAINT `pagamentos_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recebimentos` ADD CONSTRAINT `recebimentos_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;