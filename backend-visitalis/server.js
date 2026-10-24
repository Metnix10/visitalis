const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const db = require('./db');

const app = express();
const server = http.createServer(app);

// Le damos permiso a tu frontend de React (puerto 5173) para comunicarse con este backend
app.use(cors());
app.use(express.json());

// Configuración del servidor de WebSockets (Chat)
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

// Detectar cuando alguien se conecta al servidor
io.on('connection', (socket) => {
    console.log('Nuevo usuario conectado. ID:', socket.id);

    // Escuchar los mensajes que lleguen desde React
    // Dentro de tu io.on('connection', (socket) => { ... })
    socket.on('mensaje_chat', async (datosMensaje) => {
        try {
            // 1. Guardar en la base de datos
            const [resultado] = await db.execute(
                'INSERT INTO mensajes (id_remitente, id_destinatario, contenido) VALUES (?, ?, ?)',
                [datosMensaje.idRemitente, datosMensaje.idDestinatario, datosMensaje.texto]
            );

            // 2. Reenviar a todos (puedes incluir el ID que MySQL le asignó)
            datosMensaje.idMensaje = resultado.insertId;
            io.emit('mensaje_chat', datosMensaje);

        } catch (error) {
            console.error('Error guardando el mensaje en MySQL:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado. ID:', socket.id);
    });
});

// Encender el servidor
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});

// Ruta para registrar un nuevo usuario
app.post('/api/registro', async (req, res) => {
    console.log('Alguien intenta registrarse:', req.body);
    // Extraemos los datos que enviará el frontend
    const { nombre, correo, contrasena } = req.body;

    try {
        // Ejecutamos la consulta SQL para insertar los datos
        const [resultado] = await db.execute(
            'INSERT INTO usuarios (nombre, correo, contrasena) VALUES (?, ?, ?)',
            [nombre, correo, contrasena]
        );

        // Si sale bien, respondemos con éxito y el nuevo ID
        res.status(201).json({
            mensaje: 'Usuario registrado con éxito',
            idUsuario: resultado.insertId
        });

    } catch (error) {
        console.error('Error en registro:', error);
        // Si el correo ya existe, MySQL lanzará un error (gracias al UNIQUE que pusiste)
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'Este correo ya está registrado' });
        } else {
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
});
