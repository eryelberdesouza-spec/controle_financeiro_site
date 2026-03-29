CREATE TABLE `projeto_orcamento` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projetoId` int NOT NULL,
	`categoria` enum('Material','Mao_de_Obra','Equipamentos','Terceiros','Outros') NOT NULL,
	`valorPrevisto` decimal(15,2) NOT NULL DEFAULT '0',
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `projeto_orcamento_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pagamentos` ADD `categoriaCusto` enum('Material','Mao_de_Obra','Equipamentos','Terceiros','Outros');--> statement-breakpoint
ALTER TABLE `projetos` ADD `exigeOrcamento` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `projeto_orcamento` ADD CONSTRAINT `projeto_orcamento_projetoId_projetos_id_fk` FOREIGN KEY (`projetoId`) REFERENCES `projetos`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projeto_orcamento` ADD CONSTRAINT `projeto_orcamento_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;