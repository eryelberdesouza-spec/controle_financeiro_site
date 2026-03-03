ALTER TABLE `pagamentos` ADD `parcelado` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `pagamentos` ADD `quantidadeParcelas` int DEFAULT 1 NOT NULL;