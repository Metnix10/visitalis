import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import "../assets/chat.css";

// Dirección del backend. Uso window.location.hostname en lugar de escribir "localhost"
// para que también funcione si abro el proyecto desde otra computadora de la red (IP).
const API_URL = `http://${window.location.hostname}:3000`;
// Creo la conexión de Socket.IO UNA sola vez, fuera del componente. Si la pusiera dentro,
// se abriría una conexión nueva cada vez que React vuelve a renderizar.
const socket = io(API_URL);

// ---- CIFRADO DE MENSAJES ----
// Cifrado simétrico sencillo (XOR con una llave): con la misma llave se cifra y se descifra.
// Lo hice así para cumplir el requisito de poder activar/desactivar el cifrado en el chat.
// OJO: es un cifrado didáctico, no es seguro de verdad porque la llave está en el código.
const LLAVE_CIFRADO = "VISITALIS_CDMX_2026";
// Recibe el texto normal y devuelve el texto cifrado en base64.
function cifrarTexto(texto) {
  // Paso el texto a bytes para poder operar con cada uno.
  const bytes = new TextEncoder().encode(texto);
  // A cada byte le aplico XOR con un carácter de la llave. Uso el módulo (%) para
  // repetir la llave cuando el mensaje es más largo que ella.
  const xor = bytes.map((b, i) => b ^ LLAVE_CIFRADO.charCodeAt(i % LLAVE_CIFRADO.length));
  // Lo convierto a base64 para que se pueda guardar en la base de datos como texto normal.
  return btoa(String.fromCharCode(...xor));
}
// Hace el proceso inverso: de base64 a bytes, XOR con la misma llave y de bytes a texto.
function descifrarTexto(cifrado) {
  try {
    // Primero regreso de base64 a los bytes originales.
    const bin = atob(cifrado);
    const bytes = new Uint8Array([...bin].map((c) => c.charCodeAt(0)));
    // El mismo XOR de antes: aplicarlo dos veces con la misma llave devuelve el byte original.
    const xor = bytes.map((b, i) => b ^ LLAVE_CIFRADO.charCodeAt(i % LLAVE_CIFRADO.length));
    return new TextDecoder().decode(xor);
  } catch {
    // Si el texto no estaba cifrado (o está dañado) mejor lo regreso tal cual para que no truene.
    return cifrado;
  }
}

// ---- COMPONENTE PRINCIPAL ----
// Aquí viven todos los estados del chat, las conexiones en tiempo real y las funciones
// para enviar mensajes, crear grupos, mandar correos y hacer videollamadas.
export default function ChatWidget() {
  // Usuario que inició sesión. Lo guardo en sessionStorage desde el login (así cada pestaña
  // puede tener su propio usuario). Si no hay nadie, queda en null y el chat no se muestra.
  const usuarioActual = JSON.parse(sessionStorage.getItem("usuario") || "null");

  // Pestaña que está viendo el usuario: "individual" o "grupal".
  const [tabActiva, setTabActiva] = useState("individual");
  // true = el chat está colapsado y solo se ve la cabecera azul.
  const [minimizado, setMinimizado] = useState(false);

  // ---- ESTADOS: CONTACTOS Y GRUPOS ----
  // usuarios = los demás usuarios registrados (sin incluirme a mí)
  // grupos = los grupos de los que formo parte
  const [usuarios, setUsuarios] = useState([]);
  const [grupos, setGrupos] = useState([]);
  // Conversación abierta ahora mismo (privada o grupal). Guardo su tipo, id y nombre.
  const [chatSeleccionado, setChatSeleccionado] = useState(null); // { tipo: 'privado'|'grupal', id, nombre, en_linea }
  // Contador de mensajes sin leer por conversación. La llave junta tipo e id, ej. privado_2.
  const [noLeidos, setNoLeidos] = useState({}); // { 'privado_2': 3, 'grupal_1': 1 }

  // ---- ESTADOS: MENSAJES ----
  // mensajes = historial de la conversación abierta, mensajeTexto = lo que escribo en el input
  const [mensajes, setMensajes] = useState([]);
  const [mensajeTexto, setMensajeTexto] = useState("");
  // Si está en true, el siguiente mensaje que mande se cifra antes de enviarse.
  const [cifradoActivo, setCifradoActivo] = useState(false);
  // Guarda qué mensajes cifrados ya mostré en claro (por su posición en la lista).
  const [descifradosVisibles, setDescifradosVisibles] = useState({});

  // ---- ESTADOS: CREAR GRUPO ----
  // Regla del proyecto: un grupo necesita mínimo 3 integrantes contándome a mí.
  const [mostrarCrearGrupo, setMostrarCrearGrupo] = useState(false);
  const [nombreGrupo, setNombreGrupo] = useState("");
  const [miembrosSeleccionados, setMiembrosSeleccionados] = useState([]);

  // ---- ESTADOS: ENVIAR CORREO ELECTRÓNICO ----
  const [mostrarCorreo, setMostrarCorreo] = useState(false);
  const [asuntoCorreo, setAsuntoCorreo] = useState("");
  const [cuerpoCorreo, setCuerpoCorreo] = useState("");
  const [estadoCorreo, setEstadoCorreo] = useState("");

  // ---- ESTADOS Y REFERENCIAS: VIDEOLLAMADA WEBRTC 1 A 1 ----
  // Uso useRef para cosas que NO necesitan volver a dibujar el componente cuando cambian
  // (la conexión, los streams de cámara, etc.). El estado de la llamada sí es useState
  // porque la pantalla cambia según cada etapa.
  // Etapas de la llamada: inactiva (nada) -> llamando (yo llamé) / entrante (me llaman) -> conectada
  const [estadoLlamada, setEstadoLlamada] = useState("inactiva"); // inactiva | llamando | entrante | conectada
  // Datos de quien me está llamando (id y nombre) mientras decido si contesto.
  const [llamadaEntrante, setLlamadaEntrante] = useState(null);
  // Referencias a las etiquetas <video> de mi cámara y de la cámara del otro usuario.
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  // pcRef = la conexión RTCPeerConnection, que es la que manda el video de un navegador a otro.
  const pcRef = useRef(null);
  // Stream de mi propia cámara y micrófono (lo que me da getUserMedia).
  const localStreamRef = useRef(null);
  // Stream que me llega del otro usuario; lo guardo para poder mostrarlo cuando el <video> exista.
  const remoteStreamRef = useRef(null);
  // Cola de candidatos ICE (posibles rutas de red) que llegan antes de que la conexión esté lista.
  // Los guardo aquí y los aplico después.
  const candidatosPendientesRef = useRef([]);
  // Referencia al input de archivo oculto, para abrirlo desde el botón del clip.
  const fileInputRef = useRef(null);
  // Marca al final de la lista de mensajes, la uso para hacer scroll automático hacia abajo.
  const mensajesEndRef = useRef(null);

  // ---- CARGA DE CONTACTOS, GRUPOS Y MENSAJES SIN LEER ----
  // Pide al backend la lista de usuarios, mis grupos y cuántos mensajes tengo pendientes.
  // La llamo al abrir el chat y cada vez que el servidor avisa que algo cambió.
  const cargarListas = async () => {
    if (!usuarioActual) return;
    try {
      // Las tres peticiones van juntas con Promise.all para que no esperen una por una.
      const [resUsers, resGrupos, resNoLeidos] = await Promise.all([
        fetch(`${API_URL}/api/usuarios`),
        fetch(`${API_URL}/api/grupos/${usuarioActual.id_usuario}`),
        fetch(`${API_URL}/api/mensajes/no-leidos/${usuarioActual.id_usuario}`),
      ]);

      const listaUsers = await resUsers.json();
      // La lista de usuarios me incluye a mí, así que me quito para no chatear conmigo mismo.
      const otrosUsers = listaUsers.filter((u) => u.id_usuario !== usuarioActual.id_usuario);
      setUsuarios(otrosUsers);

      const listaGrupos = await resGrupos.json();
      setGrupos(listaGrupos);

      const pendientes = await resNoLeidos.json();
      // Convierto el arreglo que manda el backend en un objeto {privado_idRemitente: total}
      // para poder consultar rápido cuántos mensajes sin leer tengo de cada persona.
      const mapaPendientes = {};
      pendientes.forEach((p) => {
        mapaPendientes[`privado_${p.id_remitente}`] = p.total;
      });
      setNoLeidos((prev) => ({ ...prev, ...mapaPendientes }));

      // Si todavía no hay ninguna conversación abierta, abro la del primer contacto de la lista.
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

  // ---- HISTORIAL DE LA CONVERSACIÓN ----
  // Cada vez que cambio de chat pido al backend los mensajes guardados en MySQL.
  // Para un chat privado van los dos ids, y para uno grupal solo el id del grupo.
  useEffect(() => {
    if (!usuarioActual || !chatSeleccionado) return;

    // Armo la URL según el tipo de chat.
    const url =
      chatSeleccionado.tipo === "privado"
        ? `${API_URL}/api/mensajes/privado/${usuarioActual.id_usuario}/${chatSeleccionado.id}`
        : `${API_URL}/api/mensajes/grupo/${chatSeleccionado.id}`;

    // Al cargar el historial pongo en 0 las alertas de esa conversación, porque ya la estoy viendo.
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setMensajes(data);
        const clave = `${chatSeleccionado.tipo}_${chatSeleccionado.id}`;
        setNoLeidos((prev) => ({ ...prev, [clave]: 0 }));
      })
      .catch((err) => console.error("Error cargando historial:", err));
  // Este efecto se vuelve a ejecutar solo cuando cambia el tipo o el id del chat abierto.
  }, [chatSeleccionado?.tipo, chatSeleccionado?.id]);

  // ---- SCROLL AUTOMÁTICO ---- Cada vez que cambia la lista de mensajes, bajo hasta el último.
  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  // ---- EVENTOS EN TIEMPO REAL (SOCKET.IO) ----
  // Aquí me registro con el servidor y me pongo a escuchar todos los eventos: mensajes nuevos,
  // cambios de estado en línea, grupos y señalización de la videollamada.
  // Al terminar (return) quito todos los listeners para que no se dupliquen.
  useEffect(() => {
    if (!usuarioActual) return;

    // Le aviso al servidor quién soy para que me marque En línea y me meta a mi sala personal.
    socket.emit("registrar_usuario", usuarioActual.id_usuario);
    cargarListas();

    // Alguien se conectó o desconectó: recargo la lista para actualizar los puntos verdes.
    socket.on("estado_usuarios", () => {
      cargarListas();
    });

    // Se creó un grupo nuevo: recargo la lista de grupos.
    socket.on("grupos_actualizados", () => {
      cargarListas();
    });

    // Llegó un mensaje nuevo. Primero reviso si pertenece a la conversación que tengo abierta:
    // si es de grupo comparo el id del grupo, y si es privado reviso que sea entre esa persona y yo.
    socket.on("mensaje_chat", (msg) => {
      const esGrupo = Boolean(msg.idGrupo);
      // Uso Number() porque algunos ids pueden llegar como texto y otros como número.
      const perteneceAChatActual =
        (esGrupo && chatSeleccionado?.tipo === "grupal" && Number(chatSeleccionado.id) === Number(msg.idGrupo)) ||
        (!esGrupo &&
          chatSeleccionado?.tipo === "privado" &&
          ((Number(msg.idRemitente) === Number(chatSeleccionado.id) &&
            Number(msg.idDestinatario) === Number(usuarioActual.id_usuario)) ||
            (Number(msg.idRemitente) === Number(usuarioActual.id_usuario) &&
              Number(msg.idDestinatario) === Number(chatSeleccionado.id))));

      // Si el mensaje es de la conversación abierta y el chat está visible, lo agrego a la lista.
      // Si no, solo sumo 1 a las alertas (siempre que el mensaje no lo haya mandado yo).
      if (perteneceAChatActual && !minimizado) {
        setMensajes((prev) => [...prev, msg]);
      } else if (Number(msg.idRemitente) !== Number(usuarioActual.id_usuario)) {
        // Mensaje de otra conversación (o con el chat minimizado): sumo uno al contador de no leídos.
        const clave = esGrupo ? `grupal_${msg.idGrupo}` : `privado_${msg.idRemitente}`;
        setNoLeidos((prev) => ({ ...prev, [clave]: (prev[clave] || 0) + 1 }));
      }
    });

    // ---- SEÑALIZACIÓN DE LA VIDEOLLAMADA ----
    // Orden de la llamada: A llama -> B contesta -> A manda una oferta -> B manda una respuesta,
    // y mientras tanto los dos se mandan candidatos ICE. El servidor solo pasa los mensajes.
    // Me están llamando: guardo quién es, cambio el estado a "entrante" y abro el chat si estaba
    // minimizado para que se vea el botón de Contestar.
    socket.on("webrtc_llamada_entrante", (data) => {
      setLlamadaEntrante(data);
      setEstadoLlamada("entrante");
      setMinimizado(false);
    });

    // Del otro lado contestaron. Como yo fui quien llamó, ahora yo creo la conexión y mando la oferta.
    socket.on("webrtc_llamada_aceptada", async (data) => {
      setEstadoLlamada("conectada");
      const pc = crearPeerConnection(data.idOrigen);
      // La oferta describe qué video y audio voy a mandar y cómo.
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc_oferta", {
        idDestino: data.idOrigen,
        idOrigen: usuarioActual.id_usuario,
        offer,
      });
    });

    // La otra persona rechazó: cierro todo y se lo aviso al usuario.
    socket.on("webrtc_llamada_rechazada", () => {
      cerrarLlamadaLocal();
      alert("La llamada fue rechazada.");
    });

    // Me llegó la oferta de quien llamó. Creo mi conexión, guardo su oferta como descripción remota
    // y genero la respuesta.
    socket.on("webrtc_oferta", async (data) => {
      setEstadoLlamada("conectada");
      const pc = crearPeerConnection(data.idOrigen);
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      // Ya con la descripción remota lista, aplico los candidatos ICE que llegaron antes de tiempo.
      await vaciarCandidatosPendientes(pc);
      // La respuesta es mi versión de cómo voy a recibir y mandar el video.
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc_respuesta", {
        idDestino: data.idOrigen,
        idOrigen: usuarioActual.id_usuario,
        answer,
      });
    });

    // Me llegó la respuesta de quien contestó: la guardo como descripción remota y con eso queda negociada.
    socket.on("webrtc_respuesta", async (data) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        await vaciarCandidatosPendientes(pcRef.current);
      }
    });

    // Llegó un candidato ICE del otro usuario. Sirven para encontrar la mejor ruta de red entre los dos.
    socket.on("webrtc_ice", async (data) => {
      if (!data.candidate) return;
      const pc = pcRef.current;
      // Si todavía no tengo conexión o descripción remota, no puedo usarlo todavía,
      // así que lo dejo en la cola de pendientes para aplicarlo más tarde.
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

    // La otra persona colgó (o canceló antes de que contestara): cierro mi lado también.
    socket.on("webrtc_colgar", () => {
      cerrarLlamadaLocal();
    });

    // Limpieza: quito los listeners para no tener eventos repetidos cada vez que se vuelve a ejecutar el efecto.
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
  // Este efecto se vuelve a ejecutar cuando cambia el usuario, la conversación abierta o si minimizo/abro el chat,
  // porque los listeners de arriba usan esos valores.
  }, [usuarioActual?.id_usuario, chatSeleccionado?.tipo, chatSeleccionado?.id, minimizado]);

  // ---- FUNCIONES DE LA VIDEOLLAMADA (WEBRTC) ----
  // Toma todos los candidatos ICE que estaban esperando en la cola, la vacía y los agrega a la conexión.
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

  // Las etiquetas <video> solo existen cuando el panel de llamada está visible, o sea en las etapas
  // "llamando" y "conectada". Pero la cámara la obtengo ANTES de que ese panel exista.
  // Por eso uso estas funciones como "callback refs": React las ejecuta justo cuando el <video>
  // aparece en pantalla, y ahí le conecto el stream. Así no se pierde el video.
  const asignarVideoLocal = (el) => {
    localVideoRef.current = el;
    if (el && localStreamRef.current && el.srcObject !== localStreamRef.current) {
      el.srcObject = localStreamRef.current;
    }
  };

  // Igual que la anterior pero para el video de la otra persona.
  const asignarVideoRemoto = (el) => {
    remoteVideoRef.current = el;
    if (el && remoteStreamRef.current && el.srcObject !== remoteStreamRef.current) {
      el.srcObject = remoteStreamRef.current;
    }
  };

  // Crea la conexión directa con el otro usuario (idRemoto) y configura sus eventos.
  // La uso tanto quien llama como quien contesta.
  const crearPeerConnection = (idRemoto) => {
    // Si había una conexión vieja la cierro para no dejar dos al mismo tiempo.
    if (pcRef.current) pcRef.current.close();
    // Uso un servidor STUN gratuito de Google para descubrir mi dirección pública y poder conectarme.
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Agrego mis pistas (video y audio) a la conexión para que el otro usuario las reciba.
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Se dispara cuando empieza a llegar el video del otro usuario: lo guardo y lo muestro en su <video>.
    pc.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Cada vez que se encuentra una posible ruta de red se la mando al otro usuario por Socket.IO.
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc_ice", {
          idDestino: idRemoto,
          candidate: event.candidate,
        });
      }
    };

    // Si la conexión falla o se cierra, termino la llamada para que no quede la pantalla colgada.
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        if (pcRef.current === pc) cerrarLlamadaLocal();
      }
    };

    // Guardo la conexión en la referencia para usarla en los demás eventos.
    pcRef.current = pc;
    return pc;
  };

  // Se ejecuta al presionar el botón 📹. Pide la cámara y le avisa al otro usuario que lo estoy llamando.
  // Solo funciona en chats individuales (no en grupales).
  const iniciarVideollamada = async () => {
    if (!chatSeleccionado || chatSeleccionado.tipo !== "privado") return;
    // Si ya estoy en una llamada no dejo iniciar otra.
    if (estadoLlamada !== "inactiva") return;
    // El navegador solo da acceso a la cámara en localhost o con HTTPS; si no, mando este aviso.
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("La cámara solo funciona en localhost o con HTTPS.");
      return;
    }
    try {
      // Pido permiso al usuario para usar su cámara y micrófono.
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      // Pongo el estado en "llamando" y con eso aparece el panel de la videollamada.
      setEstadoLlamada("llamando");

      // Le mando la llamada al otro usuario con mi id y mi nombre (para que le salga quién lo llama).
      socket.emit("webrtc_llamar", {
        idDestino: chatSeleccionado.id,
        idOrigen: usuarioActual.id_usuario,
        nombreOrigen: usuarioActual.nombre,
      });
    } catch {
      alert("No se pudo acceder a la cámara o micrófono.");
    }
  };

  // Se ejecuta al presionar "Contestar": prendo mi cámara y le aviso a quien llamó que acepté.
  // Quien llamó es el que empieza a mandar la oferta, por eso aquí no la creo.
  const aceptarVideollamada = async () => {
    if (!llamadaEntrante) return;
    try {
      // Igual que al llamar: pido cámara y micrófono.
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

  // Termina la llamada SOLO de mi lado: apaga la cámara, cierra la conexión y regresa todo a su estado inicial.
  // La uso al colgar, al rechazar, o cuando el otro cuelga.
  const cerrarLlamadaLocal = () => {
    if (localStreamRef.current) {
      // Detengo cada pista para que se apague la luz de la cámara.
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

  // Botón "Rechazar": le aviso a quien llamó y cierro la llamada entrante.
  const rechazarVideollamada = () => {
    if (llamadaEntrante) {
      socket.emit("webrtc_rechazar", {
        idDestino: llamadaEntrante.idOrigen,
        idOrigen: usuarioActual.id_usuario,
      });
    }
    cerrarLlamadaLocal();
  };

  // Botón "Colgar": le aviso al otro usuario y cierro mi lado.
  // Si me estaban llamando uso el id de quien llamó; si yo llamé, el del chat abierto.
  const colgarVideollamada = () => {
    const destino = llamadaEntrante?.idOrigen || chatSeleccionado?.id;
    if (destino) {
      socket.emit("webrtc_colgar", { idDestino: destino });
    }
    cerrarLlamadaLocal();
  };

  // ---- ENVÍO DE MENSAJES, ARCHIVOS Y UBICACIÓN ----
  // Envía el mensaje de texto. Si el cifrado está activado, lo cifro antes de mandarlo.
  // No lo agrego yo a la lista: el servidor lo guarda en MySQL y me lo regresa por Socket.IO.
  const enviarMensaje = (e) => {
    // Evito que el formulario recargue la página.
    e.preventDefault();
    if (!mensajeTexto.trim() || !chatSeleccionado) return;

    const contenidoFinal = cifradoActivo ? cifrarTexto(mensajeTexto) : mensajeTexto;

    socket.emit("mensaje_chat", {
      idRemitente: usuarioActual.id_usuario,
      // Si el chat es privado va el id del destinatario; si es grupal va el id del grupo (y el otro en null).
      idDestinatario: chatSeleccionado.tipo === "privado" ? chatSeleccionado.id : null,
      idGrupo: chatSeleccionado.tipo === "grupal" ? chatSeleccionado.id : null,
      texto: contenidoFinal,
      tipo: "texto",
      esCifrado: cifradoActivo,
    });

    setMensajeTexto("");
  };

  // Sube un archivo/imagen/audio al servidor (FormData) y luego manda un mensaje con la ruta del archivo
  // para que el otro usuario lo pueda ver o descargar.
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
    // Limpio el input para poder subir el mismo archivo otra vez si quiero.
    e.target.value = "";
  };

  // Obtiene mi ubicación con el GPS/navegador y manda un enlace de Google Maps como mensaje de tipo "ubicacion".
  const enviarUbicacion = () => {
    if (!chatSeleccionado || !navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // Armo el enlace de Google Maps con mi latitud y longitud.
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

  // ---- CREAR GRUPO (>= 3 INTEGRANTES) ----
  // Valido en el frontend que haya al menos 2 compañeros seleccionados (conmigo son 3) y mando los datos al backend.
  // El backend vuelve a validar y guarda el grupo y sus miembros.
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

  // ---- ENVIAR CORREO ----
  // Manda un correo al contacto del chat privado. El backend usa nodemailer con una cuenta de prueba
  // (Ethereal) y regresa un enlace para ver cómo quedó el correo, que abro en otra pestaña.
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

  // Si no hay nadie con sesión iniciada no dibujo el chat. Lo puse después de los hooks
  // porque React no deja ejecutar hooks de forma condicional.
  if (!usuarioActual) return null;

  // Suma de todos los mensajes sin leer, para mostrar el globito rojo en la cabecera.
  const totalAlertas = Object.values(noLeidos).reduce((acc, n) => acc + n, 0);
  // Busco el objeto completo del contacto abierto para saber si está en línea (solo en chats privados).
  const usuarioActivoObj =
    chatSeleccionado?.tipo === "privado"
      ? usuarios.find((u) => u.id_usuario === chatSeleccionado.id)
      : null;

  // ---- INTERFAZ ----
  // Cabecera (siempre visible) + panel de videollamada + formularios + lista de mensajes + barra para escribir.
  return (
    <div className="chat" style={{ width: "360px" }}>
      {/* La cabecera siempre se ve. Al hacer clic en ella minimizo o abro el chat. */}
      {/* CABECERA */}
      <div
        className="chat-persona"
        onClick={() => setMinimizado(!minimizado)}
        style={{
          cursor: "pointer",
          backgroundColor: minimizado ? "#1769e0" : "white",
          color: minimizado ? "white" : "#222",
        }}
      >
        <div className="avatar" style={{ border: minimizado ? "2px solid white" : "none" }}></div>
        <div className="persona-info">
          <strong style={{ color: minimizado ? "white" : "inherit" }}>
            {chatSeleccionado ? chatSeleccionado.nombre : "Chats Visitalis"}
            {totalAlertas > 0 && (
              <span
                style={{
                  backgroundColor: "#ef4444",
                  color: "white",
                  borderRadius: "999px",
                  padding: "2px 7px",
                  fontSize: "11px",
                  marginLeft: "6px",
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
                backgroundColor:
                  chatSeleccionado?.tipo === "grupal" || usuarioActivoObj?.en_linea
                    ? "#2ecc71"
                    : "#94a3b8",
              }}
            ></span>
            {minimizado
              ? "Chat minimizado"
              : chatSeleccionado?.tipo === "grupal"
              ? "Grupo de viaje"
              : usuarioActivoObj?.en_linea
              ? "En línea"
              : "Desconectado"}
          </span>
        </div>

        {/* Estos botones solo salen en chats privados. stopPropagation evita que el clic también minimice el chat. */}
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
          {/* Este panel cambia según la etapa: "entrante" muestra Contestar/Rechazar, */}
          {/* y "llamando" o "conectada" muestra mi video (silenciado para no oír mi eco) y el del otro usuario. */}
          {/* PANEL VIDEOLLAMADA WEBRTC */}
          {estadoLlamada !== "inactiva" && (
            <div style={{ backgroundColor: "#0f172a", color: "white", padding: "10px", textAlign: "center" }}>
              {estadoLlamada === "entrante" && (
                <div>
                  <p style={{ fontSize: "13px", marginBottom: "8px" }}>
                    📞 Llamada entrante de <strong>{llamadaEntrante?.nombreOrigen}</strong>
                  </p>
                  <button onClick={aceptarVideollamada} style={{ background: "#22c55e", color: "white", border: "none", padding: "5px 10px", borderRadius: "5px", marginRight: "8px", cursor: "pointer" }}>
                    Contestar
                  </button>
                  <button onClick={rechazarVideollamada} style={{ background: "#ef4444", color: "white", border: "none", padding: "5px 10px", borderRadius: "5px", cursor: "pointer" }}>
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
                  <button onClick={colgarVideollamada} style={{ marginTop: "8px", background: "#ef4444", color: "white", border: "none", padding: "5px 12px", borderRadius: "5px", cursor: "pointer" }}>
                    Colgar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Formulario que aparece al presionar el botón ✉️ */}
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

          {/* Fila con botones para elegir con quién chatear. Según la pestaña muestro usuarios o grupos, */}
          {/* con un punto verde si están en línea y el número de mensajes sin leer entre paréntesis. */}
          {/* SELECTOR DE CONTACTOS O GRUPOS */}
          <div style={{ display: "flex", overflowX: "auto", gap: "6px", padding: "6px 8px", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
            {tabActiva === "individual" ? (
              usuarios.map((u) => {
                const alertas = noLeidos[`privado_${u.id_usuario}`] || 0;
                const activo = chatSeleccionado?.tipo === "privado" && chatSeleccionado.id === u.id_usuario;
                return (
                  <button
                    key={u.id_usuario}
                    type="button"
                    onClick={() =>
                      setChatSeleccionado({
                        tipo: "privado",
                        id: u.id_usuario,
                        nombre: u.nombre,
                        en_linea: u.en_linea,
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
                    <span style={{ color: u.en_linea ? "#22c55e" : "#94a3b8" }}>● </span>
                    {u.nombre} {alertas > 0 ? `(${alertas})` : ""}
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

          {/* Solo aparece en la pestaña Grupal al presionar "+ Nuevo grupo". Uso checkboxes para elegir a los integrantes. */}
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

          {/* Aquí se dibuja cada mensaje según su tipo: ubicación, imagen, audio, archivo, cifrado o texto normal. */}
          {/* LISTA DE MENSAJES */}
          <div className="mensajes">
            {mensajes.map((msg, index) => {
              // Reviso si el mensaje lo mandé yo para mostrarlo a la derecha (enviado) o a la izquierda (recibido).
              const esMio = Number(msg.idRemitente) === Number(usuarioActual.id_usuario);
              // Los mensajes cifrados se ven como texto raro hasta que presiono "Descifrar mensaje".
              const esCifrado = Boolean(msg.esCifrado);
              const mostrarClaro = descifradosVisibles[index];

              return (
                <div key={msg.idMensaje || index} className={`mensaje ${esMio ? "enviado" : "recibido"}`}>
                  {chatSeleccionado?.tipo === "grupal" && !esMio && (
                    <div style={{ fontSize: "10px", fontWeight: "bold", marginBottom: "2px", opacity: 0.8 }}>
                      {msg.nombreRemitente}
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

          {/* Cambian entre la lista de contactos y la lista de grupos. */}
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

          {/* Barra para escribir: adjuntar archivo (📎), enviar ubicación (📍), activar cifrado (🔒) y el input de texto. */}
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
              title="Adjuntar archivo, imagen o audio"
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