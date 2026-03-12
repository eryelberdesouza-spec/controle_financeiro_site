ALTER TABLE `contratos` DROP FOREIGN KEY `contratos_recebimentoId_recebimentos_id_fk`;
--> statement-breakpoint
ALTER TABLE `contratos` DROP FOREIGN KEY `contratos_pagamentoId_pagamentos_id_fk`;
--> statement-breakpoint
ALTER TABLE `contratos` MODIFY COLUMN `tipo` enum('prestacao_servico','fornecimento','locacao','misto') NOT NULL DEFAULT 'prestacao_servico';--> statement-breakpoint
ALTER TABLE `contratos` DROP COLUMN `recebimentoId`;--> statement-breakpoint
ALTER TABLE `contratos` DROP COLUMN `pagamentoId`;