ALTER TABLE `audit_log` MODIFY COLUMN `acao` enum('criacao','edicao','exclusao','atualizar_status','converter_em_contrato','enviar_para_assinatura','webhook_zapsign') NOT NULL;--> statement-breakpoint
ALTER TABLE `contratos` ADD `propostaOrigemId` int;--> statement-breakpoint
ALTER TABLE `contratos` ADD `origemDescricao` varchar(255);--> statement-breakpoint
ALTER TABLE `propostas` ADD `convertidaEmContrato` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `propostas` ADD `zapsignDocId` varchar(100);--> statement-breakpoint
ALTER TABLE `propostas` ADD `zapsignSignerToken` varchar(255);--> statement-breakpoint
ALTER TABLE `propostas` ADD `zapsignStatus` enum('aguardando_assinatura','assinado','recusado');--> statement-breakpoint
ALTER TABLE `propostas` ADD `zapsignPdfUrl` text;--> statement-breakpoint
ALTER TABLE `propostas` ADD `zapsignEnviadoEm` timestamp;--> statement-breakpoint
ALTER TABLE `propostas` ADD `zapsignAssinadoEm` timestamp;