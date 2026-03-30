CREATE TABLE `error_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nivel` enum('info','warn','error','critical') NOT NULL DEFAULT 'error',
	`origem` varchar(100) NOT NULL,
	`acao` varchar(200),
	`mensagem` text NOT NULL,
	`stack` text,
	`usuarioId` int,
	`usuarioNome` varchar(200),
	`contexto` text,
	`ip` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `error_log_id` PRIMARY KEY(`id`)
);
