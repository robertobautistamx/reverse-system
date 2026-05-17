CREATE TABLE `data_normalizada` (
  `id` int NOT NULL,
  `dist_norm` decimal(6,4) DEFAULT NULL COMMENT 'distancia_cm normalizada [0-1]',
  `vel_norm` decimal(6,4) DEFAULT NULL COMMENT 'velocidad_cms normalizada [0-1]',
  `luz_norm` decimal(6,4) DEFAULT NULL COMMENT 'luz normalizada [0-1]',
  `semaforo` varchar(10) DEFAULT NULL,
  `alarma` varchar(3) DEFAULT NULL,
  `led_activo` tinyint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `data_normalizada_ibfk_1` FOREIGN KEY (`id`) REFERENCES `data` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci