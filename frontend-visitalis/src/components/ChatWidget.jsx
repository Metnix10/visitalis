import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import "../assets/chat.css";

const API_URL = `http://${window.location.hostname}:3000`;
const socket = io(API_URL);

// Cifrado simétrico activable/desactivable
const LLAVE_CIFRADO = "VISITALIS_CDMX_2026";
function cifrarTexto(texto) {
  const bytes = new TextEncoder().encode(texto);
  const xor = bytes.map((b, i) => b ^ LLAVE_CIFRADO.charCodeAt(i % LLAVE_CIFRADO.length));
  return btoa(String.fromCharCode(...xor));
}
function descifrarTexto(cifrado) {
  try {
    const bin = atob(cifrado);
    const bytes = new Uint8Array([...bin].map((c) => c.charCodeAt(0)));
    const xor = bytes.map((b, i) => b ^ LLAVE_CIFRADO.charCodeAt(i % LLAVE_CIFRADO.length));
    return new TextDecoder().decode(xor);
  } catch {
    return cifrado;
  }
}

// Mapeo visual del estado de conexión (0=Desconectado, 1=En línea, 2=Ausente, 3=Ocupado)
function obtenerInfoEstado(codigo) {
  switch (Number(codigo)) {
    case 1:
      return { texto: "En línea", color: "#22c55e" };
    case 2:
      return { texto: "Ausente", color: "#f59e0b" };
    case 3:
      return { texto: "Ocupado", color: "#ef4444" };
    default:
      return { texto: "Desconectado", color: "#94a3b8" };
  }
}

export default function ChatWidget() {
  const [usuarioActual, setUsuarioActual] = useState(() =>
    JSON.parse(localStorage.getItem("usuario") || "null")
  );

  const [tabActiva, setTabActiva] = useState("individual");
  const [minimizado, setMinimizado] = useState(false);
  const [miEstado, setMiEstado] = useState(1);

  // Listas de contactos y grupos
  const [usuarios, setUsuarios] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [chatSeleccionado, setChatSeleccionado] = useState(null);
  const [noLeidos, setNoLeidos] = useState({});

  // Mensajes y herramientas de envío
  const [mensajes, setMensajes] = useState([]);
  const [mensajeTexto, setMensajeTexto] = useState("");
  const [cifradoActivo, setCifradoActivo] = useState(false);
  const [descifradosVisibles, setDescifradosVisibles] = useState({});

  // Modal crear grupo (>= 3 integrantes)
  const [mostrarCrearGrupo, setMostrarCrearGrupo] = useState(false);
  const [nombreGrupo, setNombreGrupo] = useState("");
  const [miembrosSeleccionados, setMiembrosSeleccionados] = useState([]);

  // Modal correo electrónico
  const [mostrarCorreo, setMostrarCorreo] = useState(false);
  const [asuntoCorreo, setAsuntoCorreo] = useState("");
  const [cuerpoCorreo, setCuerpoCorreo] = useState("");
  const [estadoCorreo, setEstadoCorreo] = useState("");

  // Videollamada WebRTC 1 a 1
  const [estadoLlamada, setEstadoLlamada] = useState("inactiva");
  const [llamadaEntrante, setLlamadaEntrante] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const candidatosPendientesRef = useRef([]);
  const fileInputRef = useRef(null);
  const mensajesEndRef = useRef(null);

  // Sincroniza cambios de cosméticos en localStorage
  useEffect(() => {
    const sincronizarUsuarioLocal = () => {
      const guardado = JSON.parse(localStorage.getItem("usuario") || "null");
      if (guardado) setUsuarioActual(guardado);
    };

    window.addEventListener("storage", sincronizarUsuarioLocal);
    window.addEventListener("usuario_actualizado", sincronizarUsuarioLocal);
    return () => {
      window.removeEventListener("storage", sincronizarUsuarioLocal);
      window.removeEventListener("usuario_actualizado", sincronizarUsuarioLocal);
    };
  }, []);

  const cargarListas = async () => {
    const userLocal = JSON.parse(localStorage.getItem("usuario") || "null");
    if (!userLocal) return;

    try {
      const [resUsers, resGrupos, resNoLeidos] = await Promise.all([
        fetch(`${API_URL}/api/usuarios`),
        fetch(`${API_URL}/api/grupos/${userLocal.id_usuario}`),
        fetch(`${API_URL}/api/mensajes/no-leidos/${userLocal.id_usuario}`),
      ]);

      const listaUsers = await resUsers.json();

      const miPerfilActualizado = listaUsers.find(
        (u) => u.id_usuario === userLocal.id_usuario
      );
      if (miPerfilActualizado) {
        const combinado = { ...userLocal, ...miPerfilActualizado };
        setUsuarioActual(combinado);
        localStorage.setItem("usuario", JSON.stringify(combinado));
        if (miPerfilActualizado.en_linea) {
          setMiEstado(Number(miPerfilActualizado.en_linea));
        }
      }

      const otrosUsers = listaUsers.filter((u) => u.id_usuario !== userLocal.id_usuario);
      setUsuarios(otrosUsers);

      const listaGrupos = await resGrupos.json();
      setGrupos(listaGrupos);

      const pendientes = await resNoLeidos.json();
      const mapaPendientes = {};
      pendientes.forEach((p) => {
        mapaPendientes[`privado_${p.id_remitente}`] = p.total;
      });
      setNoLeidos((prev) => ({ ...prev, ...mapaPendientes }));

      if (!chatSeleccionado && otrosUsers.length > 0) {
        setChatSeleccionado({
          tipo: "privado",
          id: otrosUsers[0].id_usuario,
          nombre: otrosUsers[0].nombre,
          en_linea: otrosUsers[0].en_linea,
        });
      }
    } catch (err) {
      console.error("Error cargando contactos:", err);
    }
  };

  // Cargar historial al cambiar de conversación
  useEffect(() => {
    if (!usuarioActual || !chatSeleccionado) return;

    const url =
      chatSeleccionado.tipo === "privado"
        ? `${API_URL}/api/mensajes/privado/${usuarioActual.id_usuario}/${chatSeleccionado.id}`
        : `${API_URL}/api/mensajes/grupo/${chatSeleccionado.id}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setMensajes(data);
        const clave = `${chatSeleccionado.tipo}_${chatSeleccionado.id}`;
        setNoLeidos((prev) => ({ ...prev, [clave]: 0 }));
      })
      .catch((err) => console.error("Error cargando historial:", err));
  }, [chatSeleccionado?.tipo, chatSeleccionado?.id]);

  // Auto-scroll al fondo
  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  // Conexión Socket.IO y eventos en tiempo real
  useEffect(() => {
    if (!usuarioActual) return;

    socket.emit("registrar_usuario", usuarioActual.id_usuario);
    cargarListas();

    socket.on("estado_usuarios", () => {
      cargarListas();
    });

    socket.on("grupos_actualizados", () => {
      cargarListas();
    });

    socket.on("mensaje_chat", (msg) => {
      const esGrupo = Boolean(msg.idGrupo);
      const perteneceAChatActual =
        (esGrupo && chatSeleccionado?.tipo === "grupal" && Number(chatSeleccionado.id) === Number(msg.idGrupo)) ||
        (!esGrupo &&
          chatSeleccionado?.tipo === "privado" &&
          ((Number(msg.idRemitente) === Number(chatSeleccionado.id) &&
            Number(msg.idDestinatario) === Number(usuarioActual.id_usuario)) ||
            (Number(msg.idRemitente) === Number(usuarioActual.id_usuario) &&
              Number(msg.idDestinatario) === Number(chatSeleccionado.id))));

      if (perteneceAChatActual && !minimizado) {
        setMensajes((prev) => [...prev, msg]);
      } else if (Number(msg.idRemitente) !== Number(usuarioActual.id_usuario)) {
        const clave = esGrupo ? `grupal_${msg.idGrupo}` : `privado_${msg.idRemitente}`;
        setNoLeidos((prev) => ({ ...prev, [clave]: (prev[clave] || 0) + 1 }));
      }
    });

    // Señalización WebRTC Videollamada
    socket.on("webrtc_llamada_entrante", (data) => {
      setLlamadaEntrante(data);
      setEstadoLlamada("entrante");
      setMinimizado(false);
    });

    socket.on("webrtc_llamada_aceptada", async (data) => {
      setEstadoLlamada("conectada");
      const pc = crearPeerConnection(data.idOrigen);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc_oferta", {
        idDestino: data.idOrigen,
        idOrigen: usuarioActual.id_usuario,
        offer,
      });
    });

    socket.on("webrtc_llamada_rechazada", () => {
      cerrarLlamadaLocal();
      alert("La llamada fue rechazada.");
    });

    socket.on("webrtc_oferta", async (data) => {
      setEstadoLlamada("conectada");
      const pc = crearPeerConnection(data.idOrigen);
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      await vaciarCandidatosPendientes(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc_respuesta", {
        idDestino: data.idOrigen,
        idOrigen: usuarioActual.id_usuario,
        answer,
      });
    });

    socket.on("webrtc_respuesta", async (data) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        await vaciarCandidatosPendientes(pcRef.current);
      }
    });

    socket.on("webrtc_ice", async (data) => {
      if (!data.candidate) return;
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) {
        candidatosPendientesRef.current.push(data.candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.error("Error agregando candidato ICE:", err);
      }
    });

    socket.on("webrtc_colgar", () => {
      cerrarLlamadaLocal();
    });

    return () => {
      socket.off("estado_usuarios");
      socket.off("grupos_actualizados");
      socket.off("mensaje_chat");
      socket.off("webrtc_llamada_entrante");
      socket.off("webrtc_llamada_aceptada");
      socket.off("webrtc_llamada_rechazada");
      socket.off("webrtc_oferta");
      socket.off("webrtc_respuesta");
      socket.off("webrtc_ice");
      socket.off("webrtc_colgar");
    };
  }, [usuarioActual?.id_usuario, chatSeleccionado?.tipo, chatSeleccionado?.id, minimizado]);

  // --- CAMBIO DE ESTADO MANUAL ---
  const cambiarMiEstado = (nuevoEstado) => {
    const valor = Number(nuevoEstado);
    setMiEstado(valor);
    if (usuarioActual?.id_usuario) {
      socket.emit("cambiar_estado", {
        idUsuario: usuarioActual.id_usuario,
        estado: valor,
      });
    }
  };

  // --- FUNCIONES DE WEBRTC ---
  const vaciarCandidatosPendientes = async (pc) => {
    const pendientes = candidatosPendientesRef.current;
    candidatosPendientesRef.current = [];
    for (const c of pendientes) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (err) {
        console.error("Error agregando candidato ICE:", err);
      }
    }
  };

  // Callback refs: conectan los streams en cuanto se montan las etiquetas <video>
  const asignarVideoLocal = (el) => {
    localVideoRef.current = el;
    if (el && localStreamRef.current && el.srcObject !== localStreamRef.current) {
      el.srcObject = localStreamRef.current;
    }
  };

  const asignarVideoRemoto = (el) => {
    remoteVideoRef.current = el;
    if (el && remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
      el.srcObject = remoteStreamRef.current;
    }
  };

  const crearPeerConnection = (idRemoto) => {
    if (pcRef.current) pcRef.current.close();
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc_ice", {
          idDestino: idRemoto,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        if (pcRef.current === pc) cerrarLlamadaLocal();
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const iniciarVideollamada = async () => {
    if (!chatSeleccionado || chatSeleccionado.tipo !== "privado") return;
    if (estadoLlamada !== "inactiva") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("La cámara solo funciona en localhost o con HTTPS.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setEstadoLlamada("llamando");

      socket.emit("webrtc_llamar", {
        idDestino: chatSeleccionado.id,
        idOrigen: usuarioActual.id_usuario,
        nombreOrigen: usuarioActual.nombre,
      });
    } catch {
      alert("No se pudo acceder a la cámara o micrófono.");
    }
  };

  const aceptarVideollamada = async () => {
    if (!llamadaEntrante) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("La cámara solo funciona en localhost o con HTTPS.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;

      socket.emit("webrtc_aceptar", {
        idDestino: llamadaEntrante.idOrigen,
        idOrigen: usuarioActual.id_usuario,
      });
    } catch {
      alert("No se pudo acceder a la cámara o micrófono.");
    }
  };

  const cerrarLlamadaLocal = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    remoteStreamRef.current = null;
    candidatosPendientesRef.current = [];
    setEstadoLlamada("inactiva");
    setLlamadaEntrante(null);
  };

  const rechazarVideollamada = () => {
    if (llamadaEntrante) {
      socket.emit("webrtc_rechazar", {
        idDestino: llamadaEntrante.idOrigen,
        idOrigen: usuarioActual.id_usuario,
      });
    }
    cerrarLlamadaLocal();
  };

  const colgarVideollamada = () => {
    const destino = llamadaEntrante?.idOrigen || chatSeleccionado?.id;
    if (destino) {
      socket.emit("webrtc_colgar", { idDestino: destino });
    }
    cerrarLlamadaLocal();
  };

  // --- ENVÍO DE MENSAJES, ARCHIVOS Y UBICACIÓN ---
  const enviarMensaje = (e) => {
    e.preventDefault();
    if (!mensajeTexto.trim() || !chatSeleccionado) return;

    const contenidoFinal = cifradoActivo ? cifrarTexto(mensajeTexto) : mensajeTexto;

    socket.emit("mensaje_chat", {
      idRemitente: usuarioActual.id_usuario,
      idDestinatario: chatSeleccionado.tipo === "privado" ? chatSeleccionado.id : null,
      idGrupo: chatSeleccionado.tipo === "grupal" ? chatSeleccionado.id : null,
      texto: contenidoFinal,
      tipo: "texto",
      esCifrado: cifradoActivo,
    });

    setMensajeTexto("");
  };

  const subirArchivo = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !chatSeleccionado) return;

    const formData = new FormData();
    formData.append("archivo", file);

    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        socket.emit("mensaje_chat", {
          idRemitente: usuarioActual.id_usuario,
          idDestinatario: chatSeleccionado.tipo === "privado" ? chatSeleccionado.id : null,
          idGrupo: chatSeleccionado.tipo === "grupal" ? chatSeleccionado.id : null,
          texto: data.nombreOriginal,
          tipo: data.tipo,
          rutaArchivo: data.rutaArchivo,
          esCifrado: false,
        });
      }
    } catch (err) {
      console.error("Error subiendo archivo:", err);
    }
    e.target.value = "";
  };

  const enviarUbicacion = () => {
    if (!chatSeleccionado || !navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const urlMaps = `https://www.google.com/maps?q=${latitude},${longitude}`;
        socket.emit("mensaje_chat", {
          idRemitente: usuarioActual.id_usuario,
          idDestinatario: chatSeleccionado.tipo === "privado" ? chatSeleccionado.id : null,
          idGrupo: chatSeleccionado.tipo === "grupal" ? chatSeleccionado.id : null,
          texto: urlMaps,
          tipo: "ubicacion",
          esCifrado: false,
        });
      },
      () => alert("Permiso de ubicación denegado.")
    );
  };

  // --- CREAR GRUPO (>= 3 INTEGRANTES) ---
  const crearGrupo = async (e) => {
    e.preventDefault();
    if (miembrosSeleccionados.length < 2) {
      alert("Selecciona al menos 2 compañeros para formar un grupo de mínimo 3 integrantes.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/grupos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_grupo: nombreGrupo,
          id_creador: usuarioActual.id_usuario,
          miembros: miembrosSeleccionados,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMostrarCrearGrupo(false);
        setNombreGrupo("");
        setMiembrosSeleccionados([]);
        cargarListas();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error("Error creando grupo:", err);
    }
  };

  // --- ENVIAR CORREO ---
  const enviarCorreo = async (e) => {
    e.preventDefault();
    if (!chatSeleccionado || chatSeleccionado.tipo !== "privado") return;
    setEstadoCorreo("Enviando correo...");

    try {
      const res = await fetch(`${API_URL}/api/correo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idDestinatario: chatSeleccionado.id,
          asunto: asuntoCorreo,
          mensaje: cuerpoCorreo,
          nombreRemitente: usuarioActual.nombre,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEstadoCorreo(data.mensaje);
        if (data.previewUrl) window.open(data.previewUrl, "_blank");
        setTimeout(() => {
          setMostrarCorreo(false);
          setAsuntoCorreo("");
          setCuerpoCorreo("");
          setEstadoCorreo("");
        }, 2000);
      } else {
        setEstadoCorreo(data.error || "Error al enviar");
      }
    } catch {
      setEstadoCorreo("Error de red al enviar correo");
    }
  };

  if (!usuarioActual) return null;

  const totalAlertas = Object.values(noLeidos).reduce((acc, n) => acc + n, 0);
  const usuarioActivoObj =
    chatSeleccionado?.tipo === "privado"
      ? usuarios.find((u) => u.id_usuario === chatSeleccionado.id)
      : null;

  const estadoContacto = obtenerInfoEstado(usuarioActivoObj?.en_linea);
  const infoMiEstado = obtenerInfoEstado(miEstado);

  const perfilCabecera = minimizado
    ? usuarioActual
    : chatSeleccionado?.tipo === "privado"
      ? usuarioActivoObj || chatSeleccionado
      : null;

  const marcoCabecera =
    perfilCabecera?.marco_activo && perfilCabecera.marco_activo !== "none"
      ? perfilCabecera.marco_activo
      : minimizado
        ? "2px solid white"
        : "2px solid #cbd5e1";

  return (
    <div className="chat" style={{ width: "360px" }}>
      {/* CABECERA */}
      <div
        className="chat-persona"
        onClick={() => {
          const nuevoEstado = !minimizado;
          setMinimizado(nuevoEstado);
          if (!nuevoEstado) cargarListas();
        }}
        style={{
          cursor: "pointer",
          backgroundColor: minimizado ? "#1769e0" : "white",
          color: minimizado ? "white" : "#222",
        }}
      >
        <div
          className="avatar"
          style={{
            border: marcoCabecera,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            fontSize: "14px",
            color: "white",
            backgroundColor: minimizado ? "#0f172a" : "#1769e0",
            flexShrink: 0,
          }}
        >
          {perfilCabecera
            ? perfilCabecera.nombre?.charAt(0).toUpperCase()
            : chatSeleccionado?.tipo === "grupal"
              ? "👥"
              : "💬"}
        </div>

        <div className="persona-info">
          <strong
            style={{
              color: minimizado ? "white" : "inherit",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >
            <span>
              {minimizado
                ? usuarioActual.nombre
                : chatSeleccionado
                  ? chatSeleccionado.nombre
                  : "Chats Visitalis"}
            </span>

            {perfilCabecera?.insignia_activa && (
              <span
                style={{
                  backgroundColor: "#fef3c7",
                  color: "#b45309",
                  borderRadius: "999px",
                  padding: "1px 6px",
                  fontSize: "10px",
                  fontWeight: "bold",
                }}
              >
                {perfilCabecera.insignia_activa}
              </span>
            )}

            {totalAlertas > 0 && (
              <span
                style={{
                  backgroundColor: "#ef4444",
                  color: "white",
                  borderRadius: "999px",
                  padding: "2px 7px",
                  fontSize: "11px",
                }}
              >
                {totalAlertas}
              </span>
            )}
          </strong>
          <span className="estado" style={{ color: minimizado ? "#e0e0e0" : "#777" }}>
            <span
              className="punto"
              style={{
                backgroundColor: minimizado
                  ? infoMiEstado.color
                  : chatSeleccionado?.tipo === "grupal"
                    ? "#22c55e"
                    : estadoContacto.color,
              }}
            ></span>
            {minimizado
              ? `${infoMiEstado.texto} · Minimizado`
              : chatSeleccionado?.tipo === "grupal"
                ? "Grupo de viaje"
                : estadoContacto.texto}
          </span>
        </div>

        {/* Botones de videollamada y correo en chat privado */}
        {!minimizado && chatSeleccionado?.tipo === "privado" && (
          <div style={{ display: "flex", gap: "6px", marginRight: "8px" }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              title="Videollamada 1 a 1"
              onClick={iniciarVideollamada}
              style={{ border: "none", background: "#eff6ff", borderRadius: "6px", padding: "4px 6px", cursor: "pointer" }}
            >
              📹
            </button>
            <button
              type="button"
              title="Enviar correo electrónico"
              onClick={() => setMostrarCorreo(!mostrarCorreo)}
              style={{ border: "none", background: "#eff6ff", borderRadius: "6px", padding: "4px 6px", cursor: "pointer" }}
            >
              ✉️
            </button>
          </div>
        )}

        <div style={{ fontSize: "18px", paddingRight: "5px" }}>{minimizado ? "▲" : "▼"}</div>
      </div>

      {!minimizado && (
        <>
          {/* SELECTOR DE MI ESTADO DE CONEXIÓN EN TIEMPO REAL */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "5px 12px",
              backgroundColor: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              fontSize: "12px",
            }}
          >
            <span style={{ color: "#475569", fontWeight: "500" }}>Tu estado:</span>
            <select
              value={miEstado}
              onChange={(e) => cambiarMiEstado(e.target.value)}
              style={{
                fontSize: "12px",
                padding: "2px 8px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                backgroundColor: "white",
                cursor: "pointer",
              }}
            >
              <option value={1}>🟢 En línea</option>
              <option value={2}>🟡 Ausente</option>
              <option value={3}>🔴 Ocupado</option>
            </select>
          </div>

          {/* PANEL VIDEOLLAMADA WEBRTC */}
          {estadoLlamada !== "inactiva" && (
            <div style={{ backgroundColor: "#0f172a", color: "white", padding: "10px", textAlign: "center" }}>
              {estadoLlamada === "entrante" && (
                <div>
                  <p style={{ fontSize: "13px", marginBottom: "8px" }}>
                    📞 Llamada entrante de <strong>{llamadaEntrante?.nombreOrigen}</strong>
                  </p>
                  <button
                    onClick={aceptarVideollamada}
                    style={{ background: "#22c55e", color: "white", border: "none", padding: "5px 10px", borderRadius: "5px", marginRight: "8px", cursor: "pointer" }}
                  >
                    Contestar
                  </button>
                  <button
                    onClick={rechazarVideollamada}
                    style={{ background: "#ef4444", color: "white", border: "none", padding: "5px 10px", borderRadius: "5px", cursor: "pointer" }}
                  >
                    Rechazar
                  </button>
                </div>
              )}
              {(estadoLlamada === "llamando" || estadoLlamada === "conectada") && (
                <div>
                  <p style={{ fontSize: "12px", marginBottom: "6px" }}>
                    {estadoLlamada === "llamando" ? "Llamando..." : "En videollamada"}
                  </p>
                  <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                    <video ref={asignarVideoLocal} autoPlay muted playsInline style={{ width: "48%", borderRadius: "6px", background: "#1e293b" }} />
                    <video ref={asignarVideoRemoto} autoPlay playsInline style={{ width: "48%", borderRadius: "6px", background: "#1e293b" }} />
                  </div>
                  <button
                    onClick={colgarVideollamada}
                    style={{ marginTop: "8px", background: "#ef4444", color: "white", border: "none", padding: "5px 12px", borderRadius: "5px", cursor: "pointer" }}
                  >
                    Colgar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MODAL ENVIAR CORREO */}
          {mostrarCorreo && (
            <form onSubmit={enviarCorreo} style={{ padding: "10px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <strong style={{ fontSize: "12px", display: "block", marginBottom: "4px" }}>
                Correo a {chatSeleccionado?.nombre}
              </strong>
              <input
                type="text"
                placeholder="Asunto..."
                value={asuntoCorreo}
                onChange={(e) => setAsuntoCorreo(e.target.value)}
                required
                style={{ width: "100%", padding: "5px", marginBottom: "5px", fontSize: "12px" }}
              />
              <textarea
                placeholder="Escribe el mensaje del correo..."
                value={cuerpoCorreo}
                onChange={(e) => setCuerpoCorreo(e.target.value)}
                required
                rows={2}
                style={{ width: "100%", padding: "5px", marginBottom: "5px", fontSize: "12px" }}
              />
              {estadoCorreo && <p style={{ fontSize: "11px", color: "#1769e0" }}>{estadoCorreo}</p>}
              <button type="submit" style={{ background: "#1769e0", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}>
                Enviar correo
              </button>
            </form>
          )}

          {/* SELECTOR DE CONTACTOS O GRUPOS */}
          <div style={{ display: "flex", overflowX: "auto", gap: "6px", padding: "6px 8px", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
            {tabActiva === "individual" ? (
              usuarios.map((u) => {
                const alertas = noLeidos[`privado_${u.id_usuario}`] || 0;
                const activo = chatSeleccionado?.tipo === "privado" && chatSeleccionado.id === u.id_usuario;
                const infoU = obtenerInfoEstado(u.en_linea);
                return (
                  <button
                    key={u.id_usuario}
                    type="button"
                    title={`${u.nombre} (${infoU.texto})`}
                    onClick={() =>
                      setChatSeleccionado({
                        tipo: "privado",
                        id: u.id_usuario,
                        nombre: u.nombre,
                        en_linea: u.en_linea,
                      })
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "4px 8px",
                      borderRadius: "12px",
                      border: "none",
                      fontSize: "12px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      background: activo ? "#1769e0" : "white",
                      color: activo ? "white" : "#334155",
                    }}
                  >
                    <span
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        backgroundColor: activo ? "#0f172a" : "#1769e0",
                        color: "white",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10px",
                        fontWeight: "bold",
                        border:
                          u.marco_activo && u.marco_activo !== "none"
                            ? u.marco_activo
                            : "none",
                      }}
                    >
                      {u.nombre?.charAt(0).toUpperCase()}
                    </span>
                    <span style={{ color: infoU.color }}>●</span>
                    <span>
                      {u.nombre} {alertas > 0 ? `(${alertas})` : ""}
                    </span>
                    {u.insignia_activa && (
                      <span
                        style={{
                          fontSize: "10px",
                          backgroundColor: "#fef3c7",
                          color: "#b45309",
                          padding: "0 5px",
                          borderRadius: "999px",
                        }}
                      >
                        {u.insignia_activa}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setMostrarCrearGrupo(!mostrarCrearGrupo)}
                  style={{ padding: "4px 8px", borderRadius: "12px", border: "1px dashed #1769e0", fontSize: "12px", cursor: "pointer", background: "white", color: "#1769e0", whiteSpace: "nowrap" }}
                >
                  + Nuevo grupo
                </button>
                {grupos.map((g) => {
                  const alertas = noLeidos[`grupal_${g.id_grupo}`] || 0;
                  const activo = chatSeleccionado?.tipo === "grupal" && chatSeleccionado.id === g.id_grupo;
                  return (
                    <button
                      key={g.id_grupo}
                      type="button"
                      onClick={() =>
                        setChatSeleccionado({
                          tipo: "grupal",
                          id: g.id_grupo,
                          nombre: g.nombre_grupo,
                        })
                      }
                      style={{
                        padding: "4px 8px",
                        borderRadius: "12px",
                        border: "none",
                        fontSize: "12px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        background: activo ? "#1769e0" : "white",
                        color: activo ? "white" : "#334155",
                      }}
                    >
                      👥 {g.nombre_grupo} {alertas > 0 ? `(${alertas})` : ""}
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* FORMULARIO CREAR GRUPO (>= 3 INTEGRANTES) */}
          {mostrarCrearGrupo && tabActiva === "grupal" && (
            <form onSubmit={crearGrupo} style={{ padding: "10px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "12px" }}>
              <input
                type="text"
                placeholder="Nombre del grupo..."
                value={nombreGrupo}
                onChange={(e) => setNombreGrupo(e.target.value)}
                required
                style={{ width: "100%", padding: "5px", marginBottom: "6px" }}
              />
              <p style={{ margin: "0 0 4px", color: "#64748b" }}>Elige al menos 2 compañeros (mín. 3 contigo):</p>
              <div style={{ maxHeight: "70px", overflowY: "auto", marginBottom: "6px" }}>
                {usuarios.map((u) => (
                  <label key={u.id_usuario} style={{ display: "block" }}>
                    <input
                      type="checkbox"
                      checked={miembrosSeleccionados.includes(u.id_usuario)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMiembrosSeleccionados([...miembrosSeleccionados, u.id_usuario]);
                        } else {
                          setMiembrosSeleccionados(miembrosSeleccionados.filter((id) => id !== u.id_usuario));
                        }
                      }}
                    />{" "}
                    {u.nombre}
                  </label>
                ))}
              </div>
              <button type="submit" style={{ background: "#1769e0", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer" }}>
                Crear grupo
              </button>
            </form>
          )}

          {/* LISTA DE MENSAJES */}
          <div className="mensajes">
            {mensajes.map((msg, index) => {
              const esMio = Number(msg.idRemitente) === Number(usuarioActual.id_usuario);
              const esCifrado = Boolean(msg.esCifrado);
              const mostrarClaro = descifradosVisibles[index];
              const remitenteObj = esMio
                ? usuarioActual
                : usuarios.find((u) => Number(u.id_usuario) === Number(msg.idRemitente));

              return (
                <div key={msg.idMensaje || index} className={`mensaje ${esMio ? "enviado" : "recibido"}`}>
                  {chatSeleccionado?.tipo === "grupal" && !esMio && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "10px",
                        fontWeight: "bold",
                        marginBottom: "3px",
                      }}
                    >
                      <span
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "50%",
                          backgroundColor: "#1769e0",
                          color: "white",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "9px",
                          border:
                            remitenteObj?.marco_activo && remitenteObj.marco_activo !== "none"
                              ? remitenteObj.marco_activo
                              : "none",
                        }}
                      >
                        {msg.nombreRemitente?.charAt(0).toUpperCase()}
                      </span>
                      <span>{msg.nombreRemitente}</span>
                      {remitenteObj?.insignia_activa && (
                        <span
                          style={{
                            backgroundColor: "#fef3c7",
                            color: "#b45309",
                            padding: "0 4px",
                            borderRadius: "999px",
                            fontSize: "9px",
                          }}
                        >
                          {remitenteObj.insignia_activa}
                        </span>
                      )}
                    </div>
                  )}

                  {msg.tipo === "ubicacion" ? (
                    <a
                      href={msg.texto}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: esMio ? "#fff" : "#1769e0", fontWeight: "bold", textDecoration: "underline" }}
                    >
                      📍 Ver ubicación compartida en Google Maps
                    </a>
                  ) : msg.tipo === "imagen" ? (
                    <img
                      src={`${API_URL}${msg.rutaArchivo}`}
                      alt={msg.texto}
                      style={{ maxWidth: "100%", borderRadius: "6px" }}
                    />
                  ) : msg.tipo === "video" ? (
                    <video
                      controls
                      src={`${API_URL}${msg.rutaArchivo}`}
                      style={{ maxWidth: "100%", borderRadius: "6px" }}
                    />
                  ) : msg.tipo === "audio" ? (
                    <audio controls src={`${API_URL}${msg.rutaArchivo}`} style={{ maxWidth: "100%" }} />
                  ) : msg.tipo === "archivo" ? (
                    <a
                      href={`${API_URL}${msg.rutaArchivo}`}
                      download={msg.texto}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: esMio ? "#fff" : "#1769e0", textDecoration: "underline" }}
                    >
                      📎 Descargar {msg.texto}
                    </a>
                  ) : esCifrado ? (
                    <div>
                      <span style={{ fontSize: "11px", display: "block", opacity: 0.85 }}>
                        🔒 {mostrarClaro ? descifrarTexto(msg.texto) : msg.texto}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDescifradosVisibles((prev) => ({ ...prev, [index]: !prev[index] }))
                        }
                        style={{
                          marginTop: "4px",
                          fontSize: "10px",
                          border: "none",
                          borderRadius: "4px",
                          padding: "2px 6px",
                          cursor: "pointer",
                        }}
                      >
                        {mostrarClaro ? "Ocultar" : "Descifrar mensaje"}
                      </button>
                    </div>
                  ) : (
                    msg.texto
                  )}
                </div>
              );
            })}
            <div ref={mensajesEndRef} />
          </div>

          {/* PESTAÑAS INDIVIDUAL / GRUPAL */}
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

          {/* BARRA DE HERRAMIENTAS: ARCHIVO, UBICACIÓN, CIFRADO Y TEXTO */}
          <form className="escribir" onSubmit={enviarMensaje} style={{ gap: "4px" }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={subirArchivo}
              style={{ display: "none" }}
            />
            <button
              type="button"
              title="Adjuntar archivo, imagen, audio o video"
              onClick={() => fileInputRef.current?.click()}
              style={{ background: "transparent", color: "#475569", padding: "0 6px", fontSize: "15px" }}
            >
              📎
            </button>
            <button
              type="button"
              title="Enviar ubicación actual"
              onClick={enviarUbicacion}
              style={{ background: "transparent", color: "#475569", padding: "0 6px", fontSize: "15px" }}
            >
              📍
            </button>
            <button
              type="button"
              title={cifradoActivo ? "Cifrado ACTIVADO" : "Cifrado DESACTIVADO"}
              onClick={() => setCifradoActivo(!cifradoActivo)}
              style={{
                background: cifradoActivo ? "#dcfce7" : "transparent",
                color: cifradoActivo ? "#15803d" : "#475569",
                padding: "0 6px",
                fontSize: "14px",
                borderRadius: "6px",
              }}
            >
              {cifradoActivo ? "🔒" : "🔓"}
            </button>
            <input
              type="text"
              placeholder={cifradoActivo ? "Mensaje cifrado..." : "Escribe un mensaje..."}
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