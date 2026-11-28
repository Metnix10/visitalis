import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../assets/sitios.css";
import { API_URL } from "../api";

const IMAGENES_CATEGORIA = {
  "Sitio Turístico": "https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=1000&q=80",
  "Museo": "https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1000&q=80",
  "Restaurante": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1000&q=80",
  "Hospedaje": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80",
  "Transporte": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1000&q=80",
  "Emergencia": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80",
};

export default function Sitios() {
  const [sitios, setSitios] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [grupoDestino, setGrupoDestino] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [zona, setZona] = useState("todas");
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState("");

  const navigate = useNavigate();
  const usuarioActual = JSON.parse(localStorage.getItem("usuario") || "null");

  useEffect(() => {
    fetch(`${API_URL}/api/sitios`)
      .then((res) => res.json())
      .then((data) => {
        setSitios(data);
        setCargando(false);
      })
      .catch((err) => {
        console.error("Error cargando sitios:", err);
        setCargando(false);
      });

    if (usuarioActual?.id_usuario) {
      fetch(`${API_URL}/api/grupos/${usuarioActual.id_usuario}`)
        .then((res) => res.json())
        .then((data) => setGrupos(Array.isArray(data) ? data : []))
        .catch((err) => console.error("Error cargando grupos:", err));
    }
  }, []);

  const sitiosFiltrados = sitios.filter((sitio) => {
    const coincideCategoria =
      categoria === "todas" || sitio.categoria === categoria;
    const coincideZona =
      zona === "todas" ||
      sitio.direccion.toLowerCase().includes(zona.toLowerCase());
    return coincideCategoria && coincideZona;
  });

  const agregarAlItinerario = async (sitio) => {
    if (!usuarioActual) {
      alert("Debes iniciar sesión para agregar lugares a tu itinerario.");
      navigate("/login");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/tareas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_grupo: grupoDestino ? Number(grupoDestino) : null,
          id_sitio: sitio.id_sitio,
          id_usuario_asignado: usuarioActual.id_usuario,
          titulo: `Visitar ${sitio.nombre}`,
        }),
      });

      if (res.ok) {
        const nombreGrupo = grupos.find((g) => String(g.id_grupo) === grupoDestino)?.nombre_grupo;
        setAviso(
          nombreGrupo
            ? `"${sitio.nombre}" se agregó al itinerario del grupo "${nombreGrupo}".`
            : `"${sitio.nombre}" se agregó a tu itinerario personal.`
        );
        setTimeout(() => setAviso(""), 3500);
      }
    } catch (error) {
      console.error("Error al agregar al itinerario:", error);
    }
  };

  const compartirItinerario = async () => {
    if (!usuarioActual || !grupoDestino) return;

    try {
      const res = await fetch(`${API_URL}/api/itinerario/compartir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idGrupo: Number(grupoDestino),
          idRemitente: usuarioActual.id_usuario,
        }),
      });
      const data = await res.json();
      setAviso(res.ok ? `📤 ${data.mensaje}` : `⚠️ ${data.error}`);
      setTimeout(() => setAviso(""), 4000);
    } catch (error) {
      console.error("Error compartiendo itinerario:", error);
    }
  };

  return (
    <>
      <header>
        <div className="logo">
          <Link to="/" style={{ textDecoration: "none", color: "#1769e0" }}>
            Visitalis
          </Link>
        </div>
        <div style={{ fontWeight: "bold", color: "#1e293b" }}>
          {usuarioActual ? `Hola, ${usuarioActual.nombre}` : ""}
        </div>
      </header>

      <main className="contenedor-sitios">
        <h1>Sitios turísticos</h1>
        <p className="subtitulo">
          Descubre lugares para visitar en Ciudad de México ({sitiosFiltrados.length} resultados).
        </p>

        {aviso && (
          <div
            style={{
              backgroundColor: "#d1fae5",
              color: "#065f46",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontWeight: "500",
            }}
          >
            {aviso}{" "}
            <Link to="/tareas" style={{ color: "#047857", textDecoration: "underline" }}>
              Ver itinerario
            </Link>
          </div>
        )}

        {/* FILTROS Y SELECTOR DE GRUPO PARA ITINERARIO */}
        <section className="filtros">
          <div className="filtro">
            <label htmlFor="categoria">Categoría</label>
            <select
              id="categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              <option value="todas">Todas las categorías</option>
              <option value="Sitio Turístico">Sitio Turístico</option>
              <option value="Museo">Museo</option>
              <option value="Restaurante">Restaurante</option>
              <option value="Hospedaje">Hospedaje</option>
              <option value="Transporte">Transporte</option>
              <option value="Emergencia">Emergencia</option>
            </select>
          </div>

          <div className="filtro">
            <label htmlFor="zona">Zona / Alcaldía</label>
            <select
              id="zona"
              value={zona}
              onChange={(e) => setZona(e.target.value)}
            >
              <option value="todas">Toda la CDMX</option>
              <option value="Centro Histórico">Centro Histórico</option>
              <option value="Chapultepec">Chapultepec / Polanco</option>
              <option value="Juárez">Zona Rosa / Reforma</option>
              <option value="Coyoacán">Coyoacán</option>
              <option value="Xochimilco">Xochimilco</option>
            </select>
          </div>

          {usuarioActual && (
            <div className="filtro">
              <label htmlFor="grupo-itinerario">Itinerario destino</label>
              <select
                id="grupo-itinerario"
                value={grupoDestino}
                onChange={(e) => setGrupoDestino(e.target.value)}
              >
                <option value="">Personal (sin grupo)</option>
                {grupos.map((g) => (
                  <option key={g.id_grupo} value={g.id_grupo}>
                    👥 {g.nombre_grupo}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            className="btn-filtrar"
            type="button"
            onClick={() => {
              setCategoria("todas");
              setZona("todas");
            }}
          >
            Limpiar
          </button>

          {grupoDestino && (
            <button
              className="btn-filtrar"
              type="button"
              onClick={compartirItinerario}
              style={{ backgroundColor: "#10b981" }}
            >
              📤 Compartir al grupo
            </button>
          )}
        </section>

        {/* LISTA DE SITIOS */}
        <section className="lista-sitios">
          {cargando ? (
            <p>Cargando catálogo de Ciudad de México...</p>
          ) : sitiosFiltrados.length === 0 ? (
            <p>No hay lugares que coincidan con ese filtro.</p>
          ) : (
            sitiosFiltrados.map((sitio) => (
              <article className="sitio" key={sitio.id_sitio}>
                <div className="imagen-sitio">
                  <img
                    src={IMAGENES_CATEGORIA[sitio.categoria] || IMAGENES_CATEGORIA["Sitio Turístico"]}
                    alt={sitio.nombre}
                  />
                </div>
                <div className="info-sitio">
                  <span className="badge-categoria">{sitio.categoria}</span>
                  <h2>{sitio.nombre}</h2>
                  <p className="ubicacion">{sitio.direccion}</p>
                  <p className="descripcion">{sitio.descripcion}</p>
                  <div className="acciones-sitio">
                    <a
                      href={sitio.url_mapa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ver-mas"
                      style={{ textDecoration: "none", display: "inline-block", textAlign: "center" }}
                    >
                      Ver en mapa
                    </a>
                    <button
                      type="button"
                      className="ver-mas iniciar-chat"
                      onClick={() => agregarAlItinerario(sitio)}
                    >
                      + Agregar al itinerario
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </>
  );
}
