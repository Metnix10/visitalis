const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Le damos permiso a tu frontend de React (puerto 5173) para comunicarse con este backend
app.use(cors());
app.use(express.json());

// Configuración del servidor de WebSockets (Chat)
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
    },
});

// Detectar cuando alguien se conecta al servidor
io.on('connection', (socket) => {
  console.log('Nuevo usuario conectado. ID:', socket.id);

  // Escuchar los mensajes que lleguen desde React
  socket.on('mensaje_chat', (texto) => {
    console.log('📩 Mensaje recibido en el servidor:', texto);
    
    // Armamos un objeto con el texto y la identidad del remitente
    const mensajeEstructurado = {
      texto: texto,
      idRemitente: socket.id
    };
    
    // Retransmitir el mensaje estructurado a TODOS
    io.emit('mensaje_chat', mensajeEstructurado); 
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
