# Visitalis - Guía Turística Interactiva
### Programación Orientada a la Internet (Grupo 052)

Visitalis es un sitio web interactivo para la comunidad de Puntos de Interés, orientado a la exploración, calificación y gestión de ubicaciones en Ciudad de México. La plataforma combina administración de contenido multimedia con funciones sociales, comunicación en tiempo real y dinámicas de gamificación entre usuarios.

## Integrantes
- **Azael Rodríguez Rubio** - Mat: 2024371
- **Milton Andrés Lara Torres** - Mat: 1957943
- **Ismael Cruz Vázquez** - Mat: 1860120

---

## Documentación - Primer Avance

### 1. Ciudad Elegida e Investigación de Datos
- **Ciudad elegida:** Ciudad de México (CDMX).
- **Justificación:** Es uno de los destinos turísticos con mayor diversidad cultural, histórica, gastronómica y de entretenimiento del país, permitiendo una estructura rica en categorías y zonas.
- **Fuentes de datos:**
  - Catálogo público de la Secretaría de Turismo de la CDMX.
  - API pública de Google Places / Unsplash API para datos geográficos y multimedia.

#### Catálogo de Lugares Registrados (15 Sitios)
1. Museo Nacional de Antropología
2. Museo Soumaya
3. Biblioteca Vasconcelos
4. Templo Mayor
5. Acuario Inbursa
6. Mercado Balderas
7. Zoo de Chapultepec
8. Arena México
9. Palacio Nacional
10. Auditorio Nacional
11. Parque Nacional Cumbres del Ajusco
12. Bosque de Aragón
13. Monumento a la Revolución
14. Ángel de la Independencia
15. Bosque de Chapultepec

---

### 2. Reglas de Negocio y Estructura de Lugares de Interés
- **Organización por Zona:** El sistema manejará un mínimo de 5 sitios de interés por zona turística.
- **Clasificación del Tipo de Sitio:**
  - *Locales*
  - *Nacionales*
  - *Naturales*
- **Filtrado Avanzado:** Cada zona podrá filtrarse dinámicamente por categorías según las preferencias de búsqueda del usuario.
- **Información del Sitio:** Cada zona/punto turístico incluirá su respectiva descripción, nombre, ubicación y dirección.

---

### 3. Comunicación y Chat en Tiempo Real
- **Modalidades de Chat:**
  - Chat individual (1 a 1).
  - Chat grupal.
- **Videollamadas:** Integración de un botón dentro de la interfaz para iniciar videollamadas.
- **Interacción basada en Mapa:** Al buscar una zona en el mapa, la plataforma mostrará a los usuarios interesados en esa misma ubicación para iniciar un chat 1 a 1 de forma directa.
- **Creación de Grupos:** Botón directo para iniciar chats grupales y agregar a múltiples participantes de un itinerario.

---

### 4. Asignación y Control de Tareas
- **Creación de Tareas:** Creación y asignación de actividades específicas para los integrantes de un viaje/grupo.
- **Seguimiento:** Opción para marcar tareas como terminadas una vez completadas.
- **Visualización Geográfica:** Integración de un mapa interactivo para consultar la ubicación exacta de las tareas asignadas.

---

### 5. Sistema de Recompensas y Gamificación
- **Acumulación de Puntos:** Los usuarios obtienen puntos al realizar check-in o visitar determinados sitios turísticos.
- **Mapa de Puntos de Interés:** Mapa dedicado para visualizar los puntos otorgados por visitar las zonas.
- **Sistema de Ranking:** Tabla de clasificación (Leaderboard) con el historial y ranking de puntos acumulados.
- **Canje de Recompensas:** Módulo de intercambio donde los puntos acumulados se pueden canjear por recompensas dentro de la plataforma.

