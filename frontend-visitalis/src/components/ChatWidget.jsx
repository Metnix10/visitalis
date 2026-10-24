import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import '../assets/chat.css';

//const socket = io('http://10.100.224.164:3000');
const socket = io('http://10.111.126.195:3000');



export default function ChatWidget() {
    const [tabActiva, setTabActiva] = useState('individual');
    const [mensajeTexto, setMensajeTexto] = useState('');
    const [minimizado, setMinimizado] = useState(false);

    const [mensajes, setMensajes] = useState([]);

    useEffect(() => {
        socket.on('connect', () => {
            console.log('Conectado al servidor de WebSockets');
        });

        socket.on('mensaje_chat', (mensajeNuevo) => {
            setMensajes((mensajesAnteriores) => [...mensajesAnteriores, mensajeNuevo]);
        });

        return () => {
            socket.off('connect');
            socket.off('mensaje_chat');
        };
    }, []);

    const enviarMensaje = (e) => {
        e.preventDefault();
        if (mensajeTexto.trim() !== '') {
            const nuevoMensaje = {
                idRemitente: 1,      // Finge que eres el usuario con ID 1 en tu DB
                idDestinatario: 2,   // Finge que hablas con el usuario ID 2
                texto: mensajeTexto
            };

            socket.emit('mensaje_chat', nuevoMensaje);
            setMensajeTexto('');
        }
    };

    return (
        <div className="chat">
            <div
                className="chat-persona"
                onClick={() => setMinimizado(!minimizado)}
                style={{ cursor: 'pointer', backgroundColor: minimizado ? '#1769e0' : 'white', color: minimizado ? 'white' : '#222' }}
            >
                <div className="avatar" style={{ border: minimizado ? '2px solid white' : 'none' }}></div>
                <div className="persona-info">
                    <strong style={{ color: minimizado ? 'white' : 'inherit' }}>
                        {tabActiva === 'individual' ? 'Laura' : 'Grupo Viaje'}
                    </strong>
                    <span className="estado" style={{ color: minimizado ? '#e0e0e0' : '#777' }}>
                        <span className="punto" style={{ backgroundColor: minimizado ? 'white' : '#2ecc71' }}></span>
                        {minimizado ? 'Chat minimizado' : 'En línea'}
                    </span>
                </div>
                <div style={{ fontSize: '18px', paddingRight: '5px' }}>
                    {minimizado ? '▲' : '▼'}
                </div>
            </div>

            {!minimizado && (
                <>
                    <div className="mensajes">
                        {mensajes.map((msg, index) => {
                            // Validamos que soporte tanto texto simple como objetos
                            const esObjeto = typeof msg === 'object';
                            const textoReal = esObjeto ? msg.texto : msg;
                            const remitente = esObjeto ? msg.idRemitente : null;

                            const esMio = remitente === 1;

                            return (
                                <div key={index} className={`mensaje ${esMio ? 'enviado' : 'recibido'}`}>
                                    {textoReal}
                                </div>
                            );
                        })}
                    </div>

                    <div className="chat-tabs">
                        <button
                            className={`chat-tab ${tabActiva === 'individual' ? 'activo' : ''}`}
                            onClick={() => setTabActiva('individual')}
                        >
                            Individual
                        </button>
                        <button
                            className={`chat-tab ${tabActiva === 'grupal' ? 'activo' : ''}`}
                            onClick={() => setTabActiva('grupal')}
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