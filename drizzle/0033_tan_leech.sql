ALTER TABLE `clientes` ADD `statusRegistro` enum('ativo','arquivado','excluido') DEFAULT 'ativo' NOT NULL;--> statement-breakpoint
ALTER TABLE `clientes` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `contratos` ADD `flagFornecimentoMaterial` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `contratos` ADD `flagIncluiProjeto` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `contratos` ADD `flagIncluiHomologacao` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `contratos` ADD `statusRegistro` enum('ativo','arquivado','excluido') DEFAULT 'ativo' NOT NULL;--> statement-breakpoint
ALTER TABLE `contratos` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `empresa_config` ADD `masterPasswordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `projetos` ADD `statusRegistro` enum('ativo','arquivado','excluido') DEFAULT 'ativo' NOT NULL;--> statement-breakpoint
ALTER TABLE `projetos` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `propostas` ADD `statusRegistro` enum('ativo','arquivado','excluido') DEFAULT 'ativo' NOT NULL;--> statement-breakpoint
ALTER TABLE `propostas` ADD `deletedAt` timestamp;