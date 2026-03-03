CREATE TABLE `pagamento_parcelas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pagamentoId` int NOT NULL,
	`numeroParcela` int NOT NULL,
	`valor` decimal(15,2) NOT NULL,
	`dataVencimento` timestamp NOT NULL,
	`dataPagamento` timestamp,
	`status` enum('Pendente','Pago','Atrasado','Cancelado') NOT NULL DEFAULT 'Pendente',
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pagamento_parcelas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recebimento_parcelas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recebimentoId` int NOT NULL,
	`numeroParcela` int NOT NULL,
	`valor` decimal(15,2) NOT NULL,
	`dataVencimento` timestamp NOT NULL,
	`dataRecebimento` timestamp,
	`status` enum('Pendente','Recebido','Atrasado','Cancelado') NOT NULL DEFAULT 'Pendente',
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recebimento_parcelas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pagamento_parcelas` ADD CONSTRAINT `pagamento_parcelas_pagamentoId_pagamentos_id_fk` FOREIGN KEY (`pagamentoId`) REFERENCES `pagamentos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recebimento_parcelas` ADD CONSTRAINT `recebimento_parcelas_recebimentoId_recebimentos_id_fk` FOREIGN KEY (`recebimentoId`) REFERENCES `recebimentos`(`id`) ON DELETE no action ON UPDATE no action;