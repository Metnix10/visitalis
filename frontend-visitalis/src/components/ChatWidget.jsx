import { useState, useEffect } from "react";
import io from "socket.io-client";
import "../assets/chat.css";

// Establecemos la conexión directa con tu backend
const socket = io("http://localhost:3000");

export default function ChatWidget() {
    const [tabActiva, setTabActiva] = useState("individual");
    const [mensajeTexto, setMensajeTexto] = useState("");

    // 1. Nuevo estado para controlar si está minimizado
    const [minimizado, setMinimizado] = useState(false);

    // Escuchamos el evento de conexión al cargar el componente
    useEffect(() => {
        socket.on("connect", () => {
            console.log("Conectado al servidor de WebSockets");
        });

        // Limpiamos la conexión si el componente se destruye
        return () => {
            socket.off("connect");
        };
    }, []);

    const enviarMensaje = (e) => {
        e.preventDefault();
        if (mensajeTexto.trim() !== "") {
            // 4. Enviamos el mensaje real al servidor Node.js
            socket.emit("mensaje_chat", mensajeTexto);
            console.log("Enviando mensaje al servidor:", mensajeTexto);
            setMensajeTexto("");
        }
    };

    return (
        <div className="chat">
            {/* 2. Le agregamos un onClick al encabezado para que funcione como botón */}
            <div
                className="chat-persona"
                onClick={() => setMinimizado(!minimizado)}
                style={{
                    cursor: "pointer",
                    backgroundColor: minimizado ? "#1769e0" : "white",
                    color: minimizado ? "white" : "#222",
                }}
            >
                <div
                    className="avatar"
                    style={{ border: minimizado ? "2px solid white" : "none" }}
                ></div>
                <div className="persona-info">
                    <strong style={{ color: minimizado ? "white" : "inherit" }}>
                        {tabActiva === "individual" ? "Laura" : "Grupo Viaje"}
                    </strong>
                    <span
                        className="estado"
                        style={{ color: minimizado ? "#e0e0e0" : "#777" }}
                    >
                        <span
                            className="punto"
                            style={{ backgroundColor: minimizado ? "white" : "#2ecc71" }}
                        ></span>
                        {minimizado ? "Chat minimizado" : "En línea"}
                    </span>
                </div>

                {/* 3. Ícono visual que cambia según el estado */}
                <div style={{ fontSize: "18px", paddingRight: "5px" }}>
                    {minimizado ? "▲" : "▼"}
                </div>
            </div>

            {/* 4. Condición de React: Esto solo se dibuja en pantalla si NO está minimizado */}
            {!minimizado && (
                <>
                    <div className="mensajes">
                        {mensajes.map((msg, index) => {
                            // Verificamos si el remitente soy yo mismo
                            const esMio = msg.idRemitente === socket.id;

                            return (
                                <div key={index} className={`mensaje ${esMio ? 'enviado' : 'recibido'}`}>
                                    {msg.texto}
                                </div>
                            );
                        })}
                    </div>

                    <div className="chat-tabs">
                        <button
                            className={`chat-tab ${tabActiva === "individual" ? "activo" : ""}`}
                            onClick={() => setTabActiva("individual")}
                        >
                            Individual
                        </button>
                        <button
                            className={`chat-tab ${tabActiva === "grupal" ? "activo" : ""}`}
                            onClick={() => setTabActiva("grupal")}
                        >
                            Grupal
                        </button>
                    </div>

                    <form className="escribir" onSubmit={enviarMensaje}>
                        <input
                            type="text"
                            placeholder="Escribe un mensaje..."
                            value={mensajeTexto}
                            onChange={(e) => setMensajeTexto(e.target.value)}
                        />
                        <button type="submit">›</button>
                    </form>
                </>
            )}
        </div>
    );
}
