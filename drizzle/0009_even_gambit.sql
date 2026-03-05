ALTER TABLE `clientes` ADD `tipoPix` enum('CPF','CNPJ','Email','Telefone','Chave Aleatória');--> statement-breakpoint
ALTER TABLE `clientes` ADD `chavePix` varchar(255);--> statement-breakpoint
ALTER TABLE `clientes` ADD `banco` varchar(100);