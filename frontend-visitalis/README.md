# Visitalis - Guía Turística Interactiva

### Programación Orientada a la Internet (Grupo 052)

Visitalis es una aplicación web interactiva para la comunidad de Puntos de Interés, orientada a la exploración, planificación de itinerarios y coordinación en tiempo real de visitas en la Ciudad de México (CDMX). Combina comunicación mediante WebSockets y WebRTC con gestión de tareas grupales y dinámicas de gamificación.

## Integrantes

- **Azael Rodríguez Rubio** - Mat: 2024371
- **Milton Andrés Lara Torres** - Mat: 1957943
- **Ismael Cruz Vázquez** - Mat: 1860120

---

## Arquitectura y Stack Tecnológico

- **Frontend:** React 19 + Vite + React Router + Socket.IO Client.
- **Backend:** Node.js + Express 5 + Socket.IO + Multer (archivos) + Nodemailer (correo electrónico).
- **Base de Datos:** MySQL / MariaDB (`schema.sql` y `seed.sql`).
- **Comunicación P2P:** WebRTC para videollamadas 1 a 1 en tiempo real.

---

## Funcionalidades Implementadas (Entrega Final)

### 1. Guía Turística de Ciudad de México (15 Puntos de Interés)

- **Categorías:** Sitio Turístico, Museo, Restaurante, Hospedaje, Transporte y Emergencia.
- **Catálogo registrado en base de datos:**
  1. Zócalo (Plaza de la Constitución)
  2. Bosque de Chapultepec
  3. Palacio de Bellas Artes
  4. Ángel de la Independencia
  5. Trajineras de Xochimilco (Embarcadero Nuevo Nativitas)
  6. Museo Nacional de Antropología
  7. Museo Frida Kahlo (La Casa Azul)
  8. Museo Soumaya (Plaza Carso)
  9. Castillo de Chapultepec
  10. Restaurante El Cardenal
  11. La Casa de Toño (Zona Rosa)
  12. Gran Hotel Ciudad de México
  13. Hotel Geneve CDMX
  14. Terminal TAPO y Metro San Lázaro
  15. Hospital General de México Dr. Eduardo Liceaga
- **Consulta y armado de itinerario:** Filtrado dinámico por categoría y zona/alcaldía, enlaces directos a Google Maps y envío de lugares al itinerario personal o grupal (con opción de compartir el itinerario completo al chat del grupo).

### 2. Comunicación y Chat en Tiempo Real

- **Chats privados (1 a 1) y grupales (mínimo 3 integrantes):** Persistencia de historial en MySQL y alertas de mensajes no leídos.
- **Estado de conexión en tiempo real:** Indicador visible (`En línea`, `Ausente`, `Ocupado`, `Desconectado`) actualizado al instante mediante WebSockets.
- **Multimedia y ubicación:** Envío de imágenes, audio, video y documentos, además de ubicación compartida mediante enlace de Google Maps.
- **Cifrado de mensajes:** Opción activable/desactivable desde la barra de envío para cifrar y descifrar mensajes.
- **Videollamadas 1 a 1:** Llamadas de audio y video en tiempo real dentro del chat privado mediante WebRTC.
- **Correo electrónico:** Envío de correos directos a la dirección registrada de cualquier usuario del sistema.

### 3. Gestión de Tareas e Itinerario en Grupo

- Creación y asignación de actividades o lugares a los integrantes de un grupo.
- Marcado de tareas como visitadas/completadas con otorgamiento automático de **+25 puntos** al usuario asignado.

### 4. Sistema de Recompensas, Ranking y Tienda

- **Obtención de puntos:** Al completar tareas del itinerario (+25 pts) o realizar check-in en misiones de la CDMX.
- **Ranking público y actividad reciente:** Tabla de clasificación visible para todos los usuarios con historial público de puntos ganados.
- **Tienda de cosméticos:** Canje de puntos por marcos de avatar e insignias equipables visibles en el perfil, chat y tablero de posiciones.
