create database visitalis;
use visitalis;

CREATE TABLE usuarios (
    id_usuario       INT unsigned AUTO_INCREMENT PRIMARY KEY, -- id del usuario
    nombre           VARCHAR(100) NOT NULL, -- nombre del usuario
    correo           VARCHAR(150) NOT NULL, -- correo del usuario
    contrasena       VARCHAR(255) NOT NULL, 
    CONSTRAINT uq_usuarios_correo UNIQUE (correo)
);

CREATE TABLE mensajes (
    id_mensaje      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_remitente    INT UNSIGNED NOT NULL,
    id_destinatario INT UNSIGNED NOT NULL,
    contenido       TEXT NOT NULL,
    tipo            ENUM('texto','imagen','video','archivo') NOT NULL DEFAULT 'texto',
    ruta_archivo    VARCHAR(255) NULL,
    leido           TINYINT(1) NOT NULL DEFAULT 0,
    fecha_envio     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_lectura   DATETIME NULL,

    INDEX idx_conversacion (id_remitente, id_destinatario, fecha_envio), -- cargar el historial entre dos usuarios ordenado por fecha. Por ejemplo:
    INDEX idx_destinatario_leido (id_destinatario, leido), -- acelera consultas como “cuántos mensajes sin leer tiene este usuario”

    CONSTRAINT fk_mensajes_remitente
        FOREIGN KEY (id_remitente) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_mensajes_destinatario
        FOREIGN KEY (id_destinatario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

drop table usuarios;