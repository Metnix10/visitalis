const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const nodemailer = require("nodemailer");
const { Server } = require("socket.io");
const db = require("./db");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Carpeta pública para archivos subidos en el chat
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const nombreLimpio = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, `${Date.now()}-${nombreLimpio}`);
    },
});
const upload = multer({ storage });

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT"],
    },
});

// Control de usuarios conectados en tiempo real (socket.id -> idUsuario)
const socketsUsuarios = new Map();

io.on("connection", (socket) => {
    console.log("Socket conectado:", socket.id);

    // 1. Registrar usuario conectado y marcarlo En Línea en tiempo real
    socket.on("registrar_usuario", async (idUsuario) => {
        if (!idUsuario) return;
        const uid = Number(idUsuario);
        socketsUsuarios.set(socket.id, uid);
        socket.join(`user_${uid}`);

        try {
            await db.execute("UPDATE usuarios SET en_linea = 1 WHERE id_usuario = ?", [uid]);
            io.emit("estado_usuarios");
        } catch (err) {
            console.error("Error actualizando estado en línea:", err);
        }
    });

    // Cambiar estado de conexión manualmente en tiempo real (1=En línea, 2=Ausente, 3=Ocupado)
    socket.on("cambiar_estado", async ({ idUsuario, estado }) => {
        if (!idUsuario) return;
        const uid = Number(idUsuario);
        const nuevoEstado = [0, 1, 2, 3].includes(Number(estado)) ? Number(estado) : 1;
        try {
            await db.execute("UPDATE usuarios SET en_linea = ? WHERE id_usuario = ?", [nuevoEstado, uid]);
            io.emit("estado_usuarios");
        } catch (err) {
            console.error("Error cambiando estado de conexión:", err);
        }
    });

    // 2. Mensajes de chat (Privado y Grupal, texto, archivo, ubicación, cifrado)
    socket.on("mensaje_chat", async (datosMensaje) => {
        try {
            const [resultado] = await db.execute(
                `INSERT INTO mensajes 
                (id_remitente, id_destinatario, id_grupo, contenido, tipo, ruta_archivo, es_cifrado, leido) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
                [
                    datosMensaje.idRemitente,
                    datosMensaje.idDestinatario || null,
                    datosMensaje.idGrupo || null,
                    datosMensaje.texto,
                    datosMensaje.tipo || "texto",
                    datosMensaje.rutaArchivo || null,
                    datosMensaje.esCifrado ? 1 : 0,
                ]
            );

            const [userRows] = await db.execute(
                "SELECT nombre FROM usuarios WHERE id_usuario = ?",
                [datosMensaje.idRemitente]
            );

            const mensajeCompleto = {
                ...datosMensaje,
                idMensaje: resultado.insertId,
                nombreRemitente: userRows[0]?.nombre || "Usuario",
                fechaEnvio: new Date().toISOString(),
            };

            io.emit("mensaje_chat", mensajeCompleto);
        } catch (error) {
            console.error("Error guardando mensaje en MySQL:", error);
        }
    });

    // 3. Señalización para Videollamadas 1 a 1 (WebRTC)
    socket.on("webrtc_llamar", (data) => {
        io.to(`user_${data.idDestino}`).emit("webrtc_llamada_entrante", data);
    });

    socket.on("webrtc_aceptar", (data) => {
        io.to(`user_${data.idDestino}`).emit("webrtc_llamada_aceptada", data);
    });

    socket.on("webrtc_rechazar", (data) => {
        io.to(`user_${data.idDestino}`).emit("webrtc_llamada_rechazada", data);
    });

    socket.on("webrtc_oferta", (data) => {
        io.to(`user_${data.idDestino}`).emit("webrtc_oferta", data);
    });

    socket.on("webrtc_respuesta", (data) => {
        io.to(`user_${data.idDestino}`).emit("webrtc_respuesta", data);
    });

    socket.on("webrtc_ice", (data) => {
        io.to(`user_${data.idDestino}`).emit("webrtc_ice", data);
    });

    socket.on("webrtc_colgar", (data) => {
        io.to(`user_${data.idDestino}`).emit("webrtc_colgar", data);
    });

    // 4. Desconexión en tiempo real
    socket.on("disconnect", async () => {
        const uid = socketsUsuarios.get(socket.id);
        socketsUsuarios.delete(socket.id);

        if (uid) {
            const sigueConectado = Array.from(socketsUsuarios.values()).includes(uid);
            if (!sigueConectado) {
                try {
                    await db.execute("UPDATE usuarios SET en_linea = 0 WHERE id_usuario = ?", [uid]);
                    io.emit("estado_usuarios");
                } catch (err) {
                    console.error("Error al marcar desconectado:", err);
                }
            }
        }
    });
});

// --- AUTENTICACIÓN Y USUARIOS ---
app.post("/api/registro", async (req, res) => {
    const { nombre, correo, contrasena } = req.body;
    try {
        const [resultado] = await db.execute(
            "INSERT INTO usuarios (nombre, correo, contrasena) VALUES (?, ?, ?)",
            [nombre, correo, contrasena]
        );
        res.status(201).json({ mensaje: "Usuario registrado con éxito", idUsuario: resultado.insertId });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            res.status(400).json({ error: "Este correo ya está registrado" });
        } else {
            res.status(500).json({ error: "Error interno del servidor" });
        }
    }
});

app.post("/api/login", async (req, res) => {
    const { correo, contrasena } = req.body;
    try {
        const [rows] = await db.execute(
            "SELECT id_usuario, nombre, correo, puntos, marco_activo, insignia_activa FROM usuarios WHERE correo = ? AND contrasena = ?",
            [correo, contrasena]
        );
        if (rows.length === 0) {
            return res.status(401).json({ error: "Correo o contraseña incorrectos" });
        }
        await db.execute("UPDATE usuarios SET en_linea = 1 WHERE id_usuario = ?", [rows[0].id_usuario]);
        io.emit("estado_usuarios");
        res.json({ mensaje: "Inicio de sesión exitoso", usuario: rows[0] });
    } catch (error) {
        res.status(500).json({ error: "Error en el servidor al iniciar sesión" });
    }
});

app.get("/api/usuarios", async (req, res) => {
    try {
        const [rows] = await db.execute(
            "SELECT id_usuario, nombre, correo, en_linea, puntos, marco_activo, insignia_activa FROM usuarios"
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener usuarios" });
    }
});

// --- GRUPOS (MÍNIMO 3 INTEGRANTES) ---
app.get("/api/grupos/:idUsuario", async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT g.* FROM grupos g
             JOIN grupo_miembros gm ON g.id_grupo = gm.id_grupo
             WHERE gm.id_usuario = ?
             ORDER BY g.fecha_creacion DESC`,
            [req.params.idUsuario]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener grupos" });
    }
});

app.post("/api/grupos", async (req, res) => {
    const { nombre_grupo, id_creador, miembros } = req.body;
    const setMiembros = new Set([Number(id_creador), ...(miembros || []).map(Number)]);

    if (!nombre_grupo || setMiembros.size < 3) {
        return res.status(400).json({
            error: "El grupo requiere un nombre y mínimo 3 integrantes (incluyéndote).",
        });
    }

    try {
        const [resGrupo] = await db.execute(
            "INSERT INTO grupos (nombre_grupo, id_creador) VALUES (?, ?)",
            [nombre_grupo, id_creador]
        );
        const idGrupo = resGrupo.insertId;

        for (const uid of setMiembros) {
            await db.execute("INSERT INTO grupo_miembros (id_grupo, id_usuario) VALUES (?, ?)", [
                idGrupo,
                uid,
            ]);
        }

        io.emit("grupos_actualizados");
        res.status(201).json({ mensaje: "Grupo creado", idGrupo });
    } catch (error) {
        console.error("Error creando grupo:", error);
        res.status(500).json({ error: "Error al crear grupo" });
    }
});

// --- HISTORIAL DE MENSAJES Y ALERTAS OFFLINE ---
app.get("/api/mensajes/privado/:u1/:u2", async (req, res) => {
    const { u1, u2 } = req.params;
    try {
        await db.execute(
            "UPDATE mensajes SET leido = 1 WHERE id_remitente = ? AND id_destinatario = ? AND id_grupo IS NULL AND leido = 0",
            [u2, u1]
        );

        const [rows] = await db.execute(
            `SELECT m.id_mensaje AS idMensaje, m.id_remitente AS idRemitente, 
                    m.id_destinatario AS idDestinatario, m.contenido AS texto, 
                    m.tipo, m.ruta_archivo AS rutaArchivo, m.es_cifrado AS esCifrado,
                    u.nombre AS nombreRemitente
             FROM mensajes m
             JOIN usuarios u ON m.id_remitente = u.id_usuario
             WHERE m.id_grupo IS NULL 
               AND ((m.id_remitente = ? AND m.id_destinatario = ?) OR (m.id_remitente = ? AND m.id_destinatario = ?))
             ORDER BY m.fecha_envio ASC`,
            [u1, u2, u2, u1]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error cargando historial privado" });
    }
});

app.get("/api/mensajes/grupo/:idGrupo", async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT m.id_mensaje AS idMensaje, m.id_remitente AS idRemitente, 
                    m.id_grupo AS idGrupo, m.contenido AS texto, 
                    m.tipo, m.ruta_archivo AS rutaArchivo, m.es_cifrado AS esCifrado,
                    u.nombre AS nombreRemitente
             FROM mensajes m
             JOIN usuarios u ON m.id_remitente = u.id_usuario
             WHERE m.id_grupo = ?
             ORDER BY m.fecha_envio ASC`,
            [req.params.idGrupo]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error cargando historial grupal" });
    }
});

app.get("/api/mensajes/no-leidos/:idUsuario", async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT id_remitente, COUNT(*) AS total 
             FROM mensajes 
             WHERE id_destinatario = ? AND id_grupo IS NULL AND leido = 0 
             GROUP BY id_remitente`,
            [req.params.idUsuario]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo alertas" });
    }
});

// --- SUBIDA DE ARCHIVOS ---
app.post("/api/upload", upload.single("archivo"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No se recibió archivo" });

    let tipo = "archivo";
    if (req.file.mimetype.startsWith("image/")) tipo = "imagen";
    else if (req.file.mimetype.startsWith("audio/")) tipo = "audio";
    else if (req.file.mimetype.startsWith("video/")) tipo = "video";

    res.json({
        rutaArchivo: `/uploads/${req.file.filename}`,
        nombreOriginal: req.file.originalname,
        tipo,
    });
});

// --- ENVÍO DE CORREO ELECTRÓNICO ---
app.post("/api/correo", async (req, res) => {
    const { idDestinatario, asunto, mensaje, nombreRemitente } = req.body;
    try {
        const [users] = await db.execute("SELECT nombre, correo FROM usuarios WHERE id_usuario = ?", [
            idDestinatario,
        ]);
        if (users.length === 0) return res.status(404).json({ error: "Usuario destino no encontrado" });

        const destino = users[0];

        const testAccount = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });

        const info = await transporter.sendMail({
            from: `"Visitalis CDMX" <${testAccount.user}>`,
            to: destino.correo,
            subject: `[Visitalis] ${asunto || "Mensaje de viaje"}`,
            text: `Hola ${destino.nombre},\n\n${nombreRemitente} te envió un mensaje desde Visitalis:\n\n${mensaje}`,
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);
        res.json({
            mensaje: `Correo enviado a ${destino.correo}`,
            previewUrl,
        });
    } catch (error) {
        console.error("Error enviando correo:", error);
        res.status(500).json({ error: "No se pudo enviar el correo" });
    }
});

// --- CATÁLOGO, TAREAS Y RECOMPENSAS ---
app.get("/api/sitios", async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT * FROM puntos_interes");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener sitios turísticos" });
    }
});

app.get("/api/tareas", async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT t.*, u.nombre AS nombre_asignado, p.nombre AS nombre_sitio, g.nombre_grupo
            FROM tareas t
            LEFT JOIN usuarios u ON t.id_usuario_asignado = u.id_usuario
            LEFT JOIN puntos_interes p ON t.id_sitio = p.id_sitio
            LEFT JOIN grupos g ON t.id_grupo = g.id_grupo
            ORDER BY t.id_tarea DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener tareas" });
    }
});

app.post("/api/tareas", async (req, res) => {
    const { id_grupo, id_sitio, id_usuario_asignado, titulo } = req.body;
    try {
        const [resultado] = await db.execute(
            "INSERT INTO tareas (id_grupo, id_sitio, id_usuario_asignado, titulo) VALUES (?, ?, ?, ?)",
            [id_grupo || null, id_sitio || null, id_usuario_asignado, titulo]
        );
        res.status(201).json({ mensaje: "Tarea asignada", idTarea: resultado.insertId });
    } catch (error) {
        res.status(500).json({ error: "Error al crear la tarea" });
    }
});

app.put("/api/tareas/:id/completar", async (req, res) => {
    const { id } = req.params;
    try {
        const [tareas] = await db.execute("SELECT * FROM tareas WHERE id_tarea = ?", [id]);
        if (tareas.length === 0) return res.status(404).json({ error: "Tarea no encontrada" });
        if (tareas[0].completada) return res.status(400).json({ error: "La tarea ya fue completada" });

        await db.execute("UPDATE tareas SET completada = 1, fecha_completada = NOW() WHERE id_tarea = ?", [id]);
        await db.execute("UPDATE usuarios SET puntos = puntos + 25 WHERE id_usuario = ?", [tareas[0].id_usuario_asignado]);
        await db.execute(
            "INSERT INTO historial_recompensas (id_usuario, motivo, puntos_ganados) VALUES (?, ?, ?)",
            [tareas[0].id_usuario_asignado, `Visita completada: ${tareas[0].titulo}`, 25]
        );

        res.json({ mensaje: "Tarea completada y +25 puntos otorgados" });
    } catch (error) {
        res.status(500).json({ error: "Error al completar tarea" });
    }
});

// Obtener integrantes de un grupo específico (para asignar tareas dentro del grupo)
app.get("/api/grupos/:idGrupo/miembros", async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT u.id_usuario, u.nombre, u.correo
             FROM grupo_miembros gm
             JOIN usuarios u ON gm.id_usuario = u.id_usuario
             WHERE gm.id_grupo = ?`,
            [req.params.idGrupo]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener miembros del grupo" });
    }
});

// Compartir el itinerario de un grupo directamente en su chat grupal
app.post("/api/itinerario/compartir", async (req, res) => {
    const { idGrupo, idRemitente } = req.body;
    if (!idGrupo || !idRemitente) {
        return res.status(400).json({ error: "Falta el grupo o el usuario remitente" });
    }

    try {
        const [[grupo]] = await db.execute(
            "SELECT nombre_grupo FROM grupos WHERE id_grupo = ?",
            [idGrupo]
        );
        const [tareasGrupo] = await db.execute(
            `SELECT t.titulo, t.completada, u.nombre AS asignado, p.nombre AS sitio
             FROM tareas t
             LEFT JOIN usuarios u ON t.id_usuario_asignado = u.id_usuario
             LEFT JOIN puntos_interes p ON t.id_sitio = p.id_sitio
             WHERE t.id_grupo = ?
             ORDER BY t.id_tarea ASC`,
            [idGrupo]
        );

        if (tareasGrupo.length === 0) {
            return res.status(400).json({ error: "Este grupo aún no tiene lugares o tareas en su itinerario." });
        }

        const listaTexto = tareasGrupo
            .map((t, i) => {
                const estado = t.completada ? "✅" : "⏳";
                const lugar = t.sitio ? ` (${t.sitio})` : "";
                return `${i + 1}. ${estado} ${t.titulo}${lugar} — ${t.asignado || "Sin asignar"}`;
            })
            .join("\n");

        const contenido = `🗺️ Itinerario del grupo "${grupo?.nombre_grupo || "Viaje"}":\n${listaTexto}`;

        const [resultado] = await db.execute(
            `INSERT INTO mensajes (id_remitente, id_destinatario, id_grupo, contenido, tipo, es_cifrado, leido)
             VALUES (?, NULL, ?, ?, 'texto', 0, 0)`,
            [idRemitente, idGrupo, contenido]
        );

        const [[remitente]] = await db.execute(
            "SELECT nombre FROM usuarios WHERE id_usuario = ?",
            [idRemitente]
        );

        io.emit("mensaje_chat", {
            idMensaje: resultado.insertId,
            idRemitente: Number(idRemitente),
            idDestinatario: null,
            idGrupo: Number(idGrupo),
            texto: contenido,
            tipo: "texto",
            esCifrado: false,
            nombreRemitente: remitente?.nombre || "Usuario",
            fechaEnvio: new Date().toISOString(),
        });

        res.json({ mensaje: "Itinerario compartido en el chat grupal" });
    } catch (error) {
        console.error("Error compartiendo itinerario:", error);
        res.status(500).json({ error: "No se pudo compartir el itinerario" });
    }
});

app.get("/api/recompensas", async (req, res) => {
    try {
        const [ranking] = await db.execute(
            "SELECT id_usuario, nombre, puntos, marco_activo, insignia_activa FROM usuarios ORDER BY puntos DESC"
        );
        const [historial] = await db.execute(`
            SELECT h.*, u.nombre 
            FROM historial_recompensas h
            JOIN usuarios u ON h.id_usuario = u.id_usuario
            ORDER BY h.fecha DESC LIMIT 20
        `);
        res.json({ ranking, historial });
    } catch (error) {
        res.status(500).json({ error: "Error al obtener recompensas" });
    }
});

// --- TIENDA DE COSMÉTICOS E INVENTARIO ---
app.get("/api/tienda/:idUsuario", async (req, res) => {
    try {
        const [catalogo] = await db.execute(
            "SELECT * FROM tienda_cosmeticos ORDER BY precio_puntos ASC"
        );
        const [comprados] = await db.execute(
            "SELECT id_cosmetico FROM usuario_cosmeticos WHERE id_usuario = ?",
            [req.params.idUsuario]
        );
        const idsComprados = comprados.map((c) => c.id_cosmetico);
        res.json({ catalogo, idsComprados });
    } catch (error) {
        res.status(500).json({ error: "Error cargando la tienda de cosméticos" });
    }
});

app.post("/api/tienda/comprar", async (req, res) => {
    const { idUsuario, idCosmetico } = req.body;
    try {
        const [[usuario]] = await db.execute(
            "SELECT puntos FROM usuarios WHERE id_usuario = ?",
            [idUsuario]
        );
        const [[item]] = await db.execute(
            "SELECT * FROM tienda_cosmeticos WHERE id_cosmetico = ?",
            [idCosmetico]
        );

        if (!usuario || !item) {
            return res.status(404).json({ error: "Usuario o cosmético no encontrado" });
        }
        if (usuario.puntos < item.precio_puntos) {
            return res.status(400).json({ error: "No tienes suficientes puntos para canjear este cosmético" });
        }

        await db.execute(
            "UPDATE usuarios SET puntos = puntos - ? WHERE id_usuario = ?",
            [item.precio_puntos, idUsuario]
        );
        await db.execute(
            "INSERT INTO usuario_cosmeticos (id_usuario, id_cosmetico) VALUES (?, ?)",
            [idUsuario, idCosmetico]
        );

        res.json({
            mensaje: `Canjeaste "${item.nombre}" con éxito`,
            puntosRestantes: usuario.puntos - item.precio_puntos,
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ error: "Ya tienes este cosmético en tu inventario" });
        }
        console.error("Error al comprar cosmético:", error);
        res.status(500).json({ error: "Error al procesar el canje" });
    }
});

app.put("/api/tienda/equipar", async (req, res) => {
    const { idUsuario, tipo, valorVisual } = req.body;
    try {
        const columna = tipo === "marco" ? "marco_activo" : "insignia_activa";
        await db.execute(
            `UPDATE usuarios SET ${columna} = ? WHERE id_usuario = ?`,
            [valorVisual, idUsuario]
        );
        res.json({ mensaje: "Cosmético equipado en tu perfil" });
    } catch (error) {
        console.error("Error al equipar cosmético:", error);
        res.status(500).json({ error: "Error al equipar el cosmético" });
    }
});

// Completar misión o simular check-in de demostración
app.post("/api/misiones/completar", async (req, res) => {
    const { idUsuario, tituloMision, puntos } = req.body;
    const puntosGanados = Number(puntos) || 25;

    try {
        await db.execute(
            "UPDATE usuarios SET puntos = puntos + ? WHERE id_usuario = ?",
            [puntosGanados, idUsuario]
        );
        await db.execute(
            "INSERT INTO historial_recompensas (id_usuario, motivo, puntos_ganados) VALUES (?, ?, ?)",
            [idUsuario, `Misión completada: ${tituloMision}`, puntosGanados]
        );

        const [[usuario]] = await db.execute(
            "SELECT puntos FROM usuarios WHERE id_usuario = ?",
            [idUsuario]
        );

        res.json({
            mensaje: `Misión "${tituloMision}" completada (+${puntosGanados} pts)`,
            puntosActuales: usuario.puntos,
        });
    } catch (error) {
        console.error("Error completando misión:", error);
        res.status(500).json({ error: "Error al registrar la misión" });
    }
});

const PORT = 3000;

const frontendDist = path.join(__dirname, "../frontend-visitalis/dist");
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.use((req, res) => {
        res.sendFile(path.join(frontendDist, "index.html"));
    });
}

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});