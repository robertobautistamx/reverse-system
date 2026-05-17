CREATE TABLE `data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `distancia_cm` decimal(6,2) NOT NULL COMMENT 'Distancia medida por HC-SR04 en cm',
  `velocidad_cms` decimal(8,2) NOT NULL COMMENT 'Velocidad de aproximación en cm/s',
  `luz` int NOT NULL COMMENT 'Valor analógico del sensor LDR (0-1023)',
  `semaforo` varchar(10) NOT NULL COMMENT 'VERDE | AMARILLO | ROJO',
  `alarma` varchar(3) NOT NULL COMMENT 'ON | OFF',
  `led_activo` tinyint NOT NULL COMMENT '0=VERDE 1=AMARILLO 2=ROJO -1=sin objeto',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4991 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci