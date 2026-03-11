ALTER TABLE `contratos` MODIFY COLUMN `tipo` enum('prestacao_servico','fornecimento','locacao','om','misto') NOT NULL DEFAULT 'prestacao_servico';--> statement-breakpoint
ALTER TABLE `contratos` MODIFY COLUMN `status` enum('proposta','negociacao','ativo','suspenso','encerrado','cancelado') NOT NULL DEFAULT 'proposta';--> statement-breakpoint
ALTER TABLE `ordens_servico` MODIFY COLUMN `status` enum('planejada','autorizada','em_execucao','concluida','cancelada','pausada') NOT NULL DEFAULT 'planejada';--> statement-breakpoint
ALTER TABLE `centros_custo` ADD `contratoId` int;--> statement-breakpoint
ALTER TABLE `centros_custo` ADD `tipo` enum('operacional','administrativo','contrato','projeto','outro') DEFAULT 'operacional' NOT NULL;--> statement-breakpoint
ALTER TABLE `clientes` ADD `tipoPessoa` enum('PF','PJ') DEFAULT 'PJ' NOT NULL;--> statement-breakpoint
ALTER TABLE `clientes` ADD `segmento` varchar(100);--> statement-breakpoint
ALTER TABLE `clientes` ADD `inscricaoEstadual` varchar(30);--> statement-breakpoint
ALTER TABLE `clientes` ADD `inscricaoMunicipal` varchar(30);--> statement-breakpoint
ALTER TABLE `clientes` ADD `emailNfe` varchar(320);--> statement-breakpoint
ALTER TABLE `clientes` ADD `celular` varchar(30);--> statement-breakpoint
ALTER TABLE `clientes` ADD `nomeContato` varchar(150);--> statement-breakpoint
ALTER TABLE `clientes` ADD `cep` varchar(10);--> statement-breakpoint
ALTER TABLE `clientes` ADD `logradouro` varchar(255);--> statement-breakpoint
ALTER TABLE `clientes` ADD `numero` varchar(20);--> statement-breakpoint
ALTER TABLE `clientes` ADD `complemento` varchar(100);--> statement-breakpoint
ALTER TABLE `clientes` ADD `bairro` varchar(100);--> statement-breakpoint
ALTER TABLE `clientes` ADD `agencia` varchar(20);--> statement-breakpoint
ALTER TABLE `clientes` ADD `conta` varchar(30);--> statement-breakpoint
ALTER TABLE `clientes` ADD `tipoConta` enum('corrente','poupanca','pagamento');--> statement-breakpoint
ALTER TABLE `contratos` ADD `centroCustoId` int;--> statement-breakpoint
ALTER TABLE `contratos` ADD `margemPrevista` decimal(5,2);--> statement-breakpoint
ALTER TABLE `contratos` ADD `responsavelTecnico` varchar(150);