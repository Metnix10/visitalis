USE visitalis;

-- Catálogo inicial de Puntos de Interés (15 lugares en CDMX)
INSERT INTO puntos_interes (nombre, categoria, descripcion, direccion, url_mapa) VALUES
('Zócalo (Plaza de la Constitución)', 'Sitio Turístico', 'Plaza principal del Centro Histórico de la Ciudad de México, rodeada por la Catedral Metropolitana y Palacio Nacional.', 'Plaza de la Constitución S/N, Centro Histórico, Cuauhtémoc, 06010 CDMX', 'https://maps.google.com/?q=Zocalo+Plaza+de+la+Constitucion+CDMX'),
('Bosque de Chapultepec', 'Sitio Turístico', 'El parque urbano más grande de Latinoamérica, con lagos, áreas verdes, monumentos y espacios culturales.', 'Bosque de Chapultepec I Secc, Miguel Hidalgo, 11100 CDMX', 'https://maps.google.com/?q=Bosque+de+Chapultepec+CDMX'),
('Palacio de Bellas Artes', 'Sitio Turístico', 'Máximo recinto cultural del país, famoso por su arquitectura Art Nouveau/Art Déco y sus murales históricos.', 'Av. Juárez S/N, Centro Histórico, Cuauhtémoc, 06050 CDMX', 'https://maps.google.com/?q=Palacio+de+Bellas+Artes+CDMX'),
('Ángel de la Independencia', 'Sitio Turístico', 'Monumento emblemático ubicado sobre Paseo de la Reforma, símbolo histórico de la capital mexicana.', 'Av. Paseo de la Reforma y Florencia, Juárez, Cuauhtémoc, 06600 CDMX', 'https://maps.google.com/?q=Angel+de+la+Independencia+CDMX'),
('Trajineras de Xochimilco (Embarcadero Nuevo Nativitas)', 'Sitio Turístico', 'Red de canales prehispánicos y chinampas Patrimonio de la Humanidad para paseos en trajinera tradicional.', 'Calle del Mercado 133, San Jerónimo, Xochimilco, 16420 CDMX', 'https://maps.google.com/?q=Embarcadero+Nuevo+Nativitas+Xochimilco+CDMX'),
('Museo Nacional de Antropología', 'Museo', 'El museo más importante de México, con salas dedicadas a las culturas prehispánicas y la Piedra del Sol.', 'Av. Paseo de la Reforma y Calzada Gandhi S/N, Chapultepec Polanco, Miguel Hidalgo, 11560 CDMX', 'https://maps.google.com/?q=Museo+Nacional+de+Antropologia+CDMX'),
('Museo Frida Kahlo (La Casa Azul)', 'Museo', 'Casa museo donde vivió y creó gran parte de su obra la pintora Frida Kahlo en el corazón de Coyoacán.', 'Londres 247, Del Carmen, Coyoacán, 04100 CDMX', 'https://maps.google.com/?q=Museo+Frida+Kahlo+Casa+Azul+CDMX'),
('Museo Soumaya (Plaza Carso)', 'Museo', 'Recinto cultural de arquitectura vanguardista que alberga una extensa colección de arte europeo y mexicano.', 'Blvd. Miguel de Cervantes Saavedra 303, Granada, Miguel Hidalgo, 11529 CDMX', 'https://maps.google.com/?q=Museo+Soumaya+Plaza+Carso+CDMX'),
('Castillo de Chapultepec', 'Museo', 'Único castillo real en América, ubicado en la cima del Cerro del Chapulín con salas de historia y vistas panorámicas.', 'Bosque de Chapultepec I Secc, Miguel Hidalgo, 11580 CDMX', 'https://maps.google.com/?q=Castillo+de+Chapultepec+CDMX'),
('Restaurante El Cardenal', 'Restaurante', 'Restaurante tradicional mexicano reconocido por sus desayunos típicos, panadería artesanal y cocina tradicional.', 'Calle de la Palma 23, Centro Histórico, Cuauhtémoc, 06000 CDMX', 'https://maps.google.com/?q=Restaurante+El+Cardenal+Palma+CDMX'),
('La Casa de Toño (Zona Rosa)', 'Restaurante', 'Restaurante popular de antojitos mexicanos, famoso por su pozole tradicional, quesadillas y servicio rápido.', 'Londres 144, Juárez, Cuauhtémoc, 06600 CDMX', 'https://maps.google.com/?q=La+Casa+de+Tono+Zona+Rosa+CDMX'),
('Gran Hotel Ciudad de México', 'Hospedaje', 'Hotel histórico frente al Zócalo famoso por su vitral estilo Tiffany y terraza con vista a la Plaza de la Constitución.', 'Av. 16 de Septiembre 82, Centro Histórico, Cuauhtémoc, 06000 CDMX', 'https://maps.google.com/?q=Gran+Hotel+Ciudad+de+Mexico'),
('Hotel Geneve CDMX', 'Hospedaje', 'Hotel clásico de estilo europeo en la Zona Rosa con museo de antigüedades y conectividad céntrica.', 'Londres 130, Juárez, Cuauhtémoc, 06600 CDMX', 'https://maps.google.com/?q=Hotel+Geneve+CDMX'),
('Terminal TAPO y Metro San Lázaro', 'Transporte', 'Nodo principal de transporte terrestre e interconexión de líneas 1 y B del Sistema de Transporte Colectivo Metro.', 'Calz. Ignacio Zaragoza 200, 7 de Julio, Venustiano Carranza, 15390 CDMX', 'https://maps.google.com/?q=TAPO+Metro+San+Lazaro+CDMX'),
('Hospital General de México Dr. Eduardo Liceaga', 'Emergencia', 'Centro hospitalario público de referencia nacional con atención de urgencias médicas las 24 horas.', 'Dr. Balmis 148, Doctores, Cuauhtémoc, 06720 CDMX', 'https://maps.google.com/?q=Hospital+General+de+Mexico+CDMX');

-- Catálogo inicial de la Tienda de Cosméticos
INSERT INTO tienda_cosmeticos (nombre, descripcion, tipo, valor_visual, precio_puntos) VALUES
('Marco Dorado', 'Borde dorado brillante para tu avatar.', 'marco', '3px solid #f59e0b', 25),
('Marco Esmeralda', 'Borde verde inspirado en Chapultepec.', 'marco', '3px solid #10b981', 50),
('Marco Neón', 'Borde púrpura llamativo en chat y ranking.', 'marco', '3px solid #8b5cf6', 75),
('Explorador CDMX', 'Insignia de viajero capitalino.', 'insignia', '🧭 Explorador', 25),
('Amante de Museos', 'Para quienes recorren la ruta cultural.', 'insignia', '🏛️ Cultural', 50),
('Leyenda Viajera', 'Distintivo élite visible para todos.', 'insignia', '👑 Leyenda', 100);