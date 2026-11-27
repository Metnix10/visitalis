DROP DATABASE IF EXISTS visitalis;
CREATE DATABASE visitalis CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE visitalis;

-- 1. Usuarios (estado en línea, puntaje y cosméticos equipados)
CREATE TABLE usuarios (
    id_usuario INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    en_linea TINYINT(1) NOT NULL DEFAULT 0,
    puntos INT NOT NULL DEFAULT 0,
    marco_activo VARCHAR(100) NULL DEFAULT 'none',
    insignia_activa VARCHAR(100) NULL DEFAULT NULL,
    CONSTRAINT uq_usuarios_correo UNIQUE (correo)
);

-- 2. Grupos de viaje (mínimo 3 integrantes validado en backend)
CREATE TABLE grupos (
    id_grupo INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre_grupo VARCHAR(100) NOT NULL,
    id_creador INT UNSIGNED NOT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_grupos_creador FOREIGN KEY (id_creador) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- 3. Miembros de cada grupo
CREATE TABLE grupo_miembros (
    id_grupo INT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,
    PRIMARY KEY (id_grupo, id_usuario),
    CONSTRAINT fk_gm_grupo FOREIGN KEY (id_grupo) REFERENCES grupos(id_grupo) ON DELETE CASCADE,
    CONSTRAINT fk_gm_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- 4. Mensajes (privado, grupal, archivos, ubicación y cifrado)
CREATE TABLE mensajes (
    id_mensaje INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_remitente INT UNSIGNED NOT NULL,
    id_destinatario INT UNSIGNED NULL,
    id_grupo INT UNSIGNED NULL,
    contenido TEXT NOT NULL,
    tipo ENUM('texto','imagen','video','audio','archivo','ubicacion') NOT NULL DEFAULT 'texto',
    ruta_archivo VARCHAR(255) NULL,
    es_cifrado TINYINT(1) NOT NULL DEFAULT 0,
    leido TINYINT(1) NOT NULL DEFAULT 0,
    fecha_envio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_mensajes_privado (id_remitente, id_destinatario, fecha_envio),
    INDEX idx_mensajes_grupo (id_grupo, fecha_envio),
    INDEX idx_mensajes_no_leidos (id_destinatario, leido),
    CONSTRAINT fk_mensajes_remitente FOREIGN KEY (id_remitente) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_mensajes_destinatario FOREIGN KEY (id_destinatario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_mensajes_grupo FOREIGN KEY (id_grupo) REFERENCES grupos(id_grupo) ON DELETE CASCADE
);

-- 5. Catálogo de Puntos de Interés (CDMX)
CREATE TABLE puntos_interes (
    id_sitio INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    categoria ENUM('Sitio Turístico','Museo','Restaurante','Hospedaje','Transporte','Emergencia') NOT NULL,
    descripcion TEXT NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    url_mapa VARCHAR(255) NOT NULL
);

-- 6. Tareas / Itinerario del grupo
CREATE TABLE tareas (
    id_tarea INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_grupo INT UNSIGNED NULL,
    id_sitio INT UNSIGNED NULL,
    id_usuario_asignado INT UNSIGNED NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    completada TINYINT(1) NOT NULL DEFAULT 0,
    fecha_completada DATETIME NULL,
    CONSTRAINT fk_tareas_grupo FOREIGN KEY (id_grupo) REFERENCES grupos(id_grupo) ON DELETE SET NULL,
    CONSTRAINT fk_tareas_sitio FOREIGN KEY (id_sitio) REFERENCES puntos_interes(id_sitio) ON DELETE SET NULL,
    CONSTRAINT fk_tareas_usuario FOREIGN KEY (id_usuario_asignado) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- 7. Historial de Recompensas (público)
CREATE TABLE historial_recompensas (
    id_recompensa INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT UNSIGNED NOT NULL,
    motivo VARCHAR(150) NOT NULL,
    puntos_ganados INT NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recompensas_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- 8. Catálogo de la Tienda de Cosméticos
CREATE TABLE tienda_cosmeticos (
    id_cosmetico INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    tipo ENUM('marco', 'insignia') NOT NULL,
    valor_visual VARCHAR(100) NOT NULL,
    precio_puntos INT NOT NULL DEFAULT 25
);

-- 9. Inventario de cosméticos comprados por usuario
CREATE TABLE usuario_cosmeticos (
    id_usuario INT UNSIGNED NOT NULL,
    id_cosmetico INT UNSIGNED NOT NULL,
    fecha_compra DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario, id_cosmetico),
    CONSTRAINT fk_uc_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_uc_cosmetico FOREIGN KEY (id_cosmetico) REFERENCES tienda_cosmeticos(id_cosmetico) ON DELETE CASCADE
);