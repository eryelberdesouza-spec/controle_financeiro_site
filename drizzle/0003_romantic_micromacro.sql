CREATE TABLE `empresa_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nomeEmpresa` varchar(255) NOT NULL DEFAULT 'Minha Empresa',
	`cnpj` varchar(20),
	`telefone` varchar(20),
	`email` varchar(320),
	`endereco` text,
	`logoUrl` text,
	`corPrimaria` varchar(7) DEFAULT '#2563eb',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `empresa_config_id` PRIMARY KEY(`id`)
);
