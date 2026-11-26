import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../assets/recompensas.css";

export default function Recompensas() {
  const [usuarioActual, setUsuarioActual] = useState(() =>
    JSON.parse(localStorage.getItem("usuario") || "null")
  );
  const [ranking, setRanking] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [misPuntos, setMisPuntos] = useState(usuarioActual?.puntos || 0);

  // Estados de la tienda de cosméticos
  const [catalogo, setCatalogo] = useState([]);
  const [idsComprados, setIdsComprados] = useState([]);
  const [mensajeTienda, setMensajeTienda] = useState("");
  const [procesandoId, setProcesandoId] = useState(null);

  const API_URL = `http://${window.location.hostname}:3000`;

  const cargarDatos = () => {
    fetch(`${API_URL}/api/recompensas`)
      .then((res) => res.json())
      .then((data) => {
        setRanking(data.ranking || []);
        setHistorial(data.historial || []);

        if (usuarioActual && data.ranking) {
          const miRegistro = data.ranking.find(
            (u) => u.id_usuario === usuarioActual.id_usuario
          );
          if (miRegistro) {
            setMisPuntos(miRegistro.puntos);
            const actualizado = { ...usuarioActual, ...miRegistro };
            setUsuarioActual(actualizado);
            localStorage.setItem("usuario", JSON.stringify(actualizado));
          }
        }
      })
      .catch((err) => console.error("Error cargando recompensas:", err));

    if (usuarioActual?.id_usuario) {
      fetch(`${API_URL}/api/tienda/${usuarioActual.id_usuario}`)
        .then((res) => res.json())
        .then((data) => {
          setCatalogo(data.catalogo || []);
          setIdsComprados(data.idsComprados || []);
        })
        .catch((err) => console.error("Error cargando tienda:", err));
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleComprar = async (item) => {
    if (!usuarioActual) return;
    setProcesandoId(item.id_cosmetico);
    setMensajeTienda("");

    try {
      const res = await fetch(`${API_URL}/api/tienda/comprar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idUsuario: usuarioActual.id_usuario,
          idCosmetico: item.id_cosmetico,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMensajeTienda(`⚠️ ${data.error || "No se pudo completar el canje"}`);
      } else {
        setMisPuntos(data.puntosRestantes);
        setIdsComprados((prev) => [...prev, item.id_cosmetico]);

        const actualizado = { ...usuarioActual, puntos: data.puntosRestantes };
        setUsuarioActual(actualizado);
        localStorage.setItem("usuario", JSON.stringify(actualizado));

        setMensajeTienda(`✅ ${data.mensaje}`);
        cargarDatos();
      }
    } catch (error) {
      setMensajeTienda("⚠️ Error de conexión con el servidor");
    } finally {
      setProcesandoId(null);
    }
  };

  const handleEquipar = async (item) => {
    if (!usuarioActual) return;
    setProcesandoId(item.id_cosmetico);
    setMensajeTienda("");

    try {
      const res = await fetch(`${API_URL}/api/tienda/equipar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idUsuario: usuarioActual.id_usuario,
          tipo: item.tipo,
          valorVisual: item.valor_visual,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMensajeTienda(`⚠️ ${data.error || "No se pudo equipar"}`);
      } else {
        const actualizado = {
          ...usuarioActual,
          ...(item.tipo === "marco"
            ? { marco_activo: item.valor_visual }
            : { insignia_activa: item.valor_visual }),
        };
        setUsuarioActual(actualizado);
        localStorage.setItem("usuario", JSON.stringify(actualizado));
        window.dispatchEvent(new Event("usuario_actualizado"));

        setMensajeTienda(`✨ Equipaste "${item.nombre}" en tu perfil`);
        cargarDatos();
      }
    } catch (error) {
      setMensajeTienda("⚠️ Error de conexión al equipar");
    } finally {
      setProcesandoId(null);
    }
  };

  const handleCompletarMision = async (tituloMision, puntos) => {
    if (!usuarioActual) return;
    setMensajeTienda("");

    try {
      const res = await fetch(`${API_URL}/api/misiones/completar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idUsuario: usuarioActual.id_usuario,
          tituloMision,
          puntos,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setMisPuntos(data.puntosActuales);
        const actualizado = { ...usuarioActual, puntos: data.puntosActuales };
        setUsuarioActual(actualizado);
        localStorage.setItem("usuario", JSON.stringify(actualizado));
        setMensajeTienda(`🎉 ${data.mensaje}`);
        cargarDatos();
      } else {
        setMensajeTienda(`⚠️ ${data.error || "No se pudo registrar la misión"}`);
      }
    } catch (error) {
      setMensajeTienda("⚠️ Error al completar la misión");
    }
  };

  return (
    <>
      <header style={{ padding: "20px", backgroundColor: "#d6d6d6" }}>
        <nav
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            maxWidth: "1000px",
            margin: "0 auto",
          }}
        >
          <Link
            to="/"
            style={{
              textDecoration: "none",
              color: "#1769e0",
              fontWeight: "bold",
            }}
          >
            ← Volver al Inicio
          </Link>

          <div
            className="puntos-usuario"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#ffffff",
              fontWeight: "bold",
            }}
          >
            {usuarioActual && (
              <>
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    backgroundColor: "#0f172a",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    border:
                      usuarioActual.marco_activo &&
                      usuarioActual.marco_activo !== "none"
                        ? usuarioActual.marco_activo
                        : "2px solid #ffffff",
                  }}
                >
                  {usuarioActual.nombre?.charAt(0).toUpperCase()}
                </div>
                <span>{usuarioActual.nombre}</span>
                {usuarioActual.insignia_activa && (
                  <span
                    style={{
                      backgroundColor: "#fef3c7",
                      color: "#b45309",
                      padding: "2px 8px",
                      borderRadius: "999px",
                      fontSize: "12px",
                    }}
                  >
                    {usuarioActual.insignia_activa}
                  </span>
                )}
                <span>·</span>
              </>
            )}
            <span>
              Mis Puntos: <strong>{misPuntos} pts</strong>
            </span>
          </div>
        </nav>
      </header>

      <main className="contenedor-recompensas">
        <section className="modulo-mapa">
          <h2>Mapa de Exploración · Ciudad de México</h2>
          <p>
            Completa visitas de tu itinerario en la CDMX para sumar puntos y subir en el tablero público.
          </p>
          <div className="mapa-placeholder" style={{ padding: 0, overflow: "hidden" }}>
            <iframe
              title="Mapa CDMX"
              src="https://www.openstreetmap.org/export/embed.html?bbox=-99.2100%2C19.3800%2C-99.1100%2C19.4550&layer=mapnik"
              style={{ width: "100%", height: "250px", border: 0 }}
            />
          </div>
        </section>

        {/* TIENDA DE COSMÉTICOS */}
        <section className="modulo-mapa" style={{ marginTop: "24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>Tienda de Cosméticos</h2>
              <p style={{ margin: "4px 0 0", color: "#555" }}>
                Canjea tus puntos ganados en misiones por marcos e insignias para personalizar tu perfil.
              </p>
            </div>
            <span
              style={{
                backgroundColor: "#dbeafe",
                color: "#1769e0",
                padding: "6px 14px",
                borderRadius: "999px",
                fontWeight: "bold",
                fontSize: "14px",
              }}
            >
              Saldo: {misPuntos} pts
            </span>
          </div>

          {mensajeTienda && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                backgroundColor: "#f8fafc",
                border: "1px solid #cbd5e1",
                marginBottom: "16px",
                fontWeight: "600",
                color: "#0f172a",
              }}
            >
              {mensajeTienda}
            </div>
          )}

          {!usuarioActual ? (
            <p style={{ color: "#64748b" }}>
              <Link to="/login" style={{ color: "#1769e0", fontWeight: "bold" }}>
                Inicia sesión
              </Link>{" "}
              para canjear y equipar cosméticos en tu perfil.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "16px",
                marginTop: "12px",
              }}
            >
              {catalogo.map((item) => {
                const comprado = idsComprados.includes(item.id_cosmetico);
                const equipado =
                  item.tipo === "marco"
                    ? usuarioActual.marco_activo === item.valor_visual
                    : usuarioActual.insignia_activa === item.valor_visual;
                const alcanzaSaldo = misPuntos >= item.precio_puntos;

                return (
                  <div
                    key={item.id_cosmetico}
                    style={{
                      border: equipado ? "2px solid #1769e0" : "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "16px",
                      backgroundColor: "#ffffff",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "10px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            textTransform: "uppercase",
                            fontWeight: "bold",
                            color: "#64748b",
                            backgroundColor: "#f1f5f9",
                            padding: "3px 8px",
                            borderRadius: "6px",
                          }}
                        >
                          {item.tipo === "marco" ? "Marco de avatar" : "Insignia"}
                        </span>
                        <span
                          style={{
                            fontWeight: "bold",
                            color: "#1769e0",
                            fontSize: "14px",
                          }}
                        >
                          {item.precio_puntos} pts
                        </span>
                      </div>

                      {/* Vista previa del cosmético */}
                      <div
                        style={{
                          height: "64px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "#f8fafc",
                          borderRadius: "8px",
                          marginBottom: "10px",
                        }}
                      >
                        {item.tipo === "marco" ? (
                          <div
                            style={{
                              width: "44px",
                              height: "44px",
                              borderRadius: "50%",
                              backgroundColor: "#1769e0",
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: "bold",
                              border: item.valor_visual,
                            }}
                          >
                            {usuarioActual.nombre?.charAt(0).toUpperCase()}
                          </div>
                        ) : (
                          <span
                            style={{
                              backgroundColor: "#fef3c7",
                              color: "#b45309",
                              padding: "5px 12px",
                              borderRadius: "999px",
                              fontWeight: "bold",
                              fontSize: "13px",
                            }}
                          >
                            {item.valor_visual}
                          </span>
                        )}
                      </div>

                      <h4 style={{ margin: "0 0 4px", color: "#0f172a" }}>
                        {item.nombre}
                      </h4>
                      <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                        {item.descripcion}
                      </p>
                    </div>

                    {!comprado ? (
                      <button
                        type="button"
                        disabled={!alcanzaSaldo || procesandoId === item.id_cosmetico}
                        onClick={() => handleComprar(item)}
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "8px",
                          border: "none",
                          fontWeight: "bold",
                          cursor: alcanzaSaldo ? "pointer" : "not-allowed",
                          backgroundColor: alcanzaSaldo ? "#1769e0" : "#cbd5e1",
                          color: alcanzaSaldo ? "white" : "#475569",
                        }}
                      >
                        {alcanzaSaldo
                          ? `Canjear (${item.precio_puntos} pts)`
                          : `Faltan ${item.precio_puntos - misPuntos} pts`}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={equipado || procesandoId === item.id_cosmetico}
                        onClick={() => handleEquipar(item)}
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "8px",
                          border: "none",
                          fontWeight: "bold",
                          cursor: equipado ? "default" : "pointer",
                          backgroundColor: equipado ? "#10b981" : "#0f172a",
                          color: "white",
                        }}
                      >
                        {equipado ? "Equipado ✔" : "Equipar"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="grid-recompensas">
          <section className="modulo-misiones">
            <h3>Misiones Disponibles (CDMX)</h3>
            <ul className="lista-misiones">
              <li className="mision-item">
                <div className="mision-info">
                  <h4>Explorador Capitalino</h4>
                  <p>Visita cualquier punto del catálogo o simula tu llegada al Zócalo.</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCompletarMision("Explorador Capitalino (Zócalo)", 25)
                  }
                  className="recompensa-badge"
                  style={{ border: "none", cursor: "pointer", fontWeight: "bold" }}
                >
                  Check-in (+25 pts)
                </button>
              </li>

              <li className="mision-item">
                <div className="mision-info">
                  <h4>Ruta Cultural CDMX</h4>
                  <p>Completa el recorrido de museos (Antropología, Frida Kahlo y Soumaya).</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCompletarMision("Ruta Cultural CDMX", 50)}
                  className="recompensa-badge"
                  style={{ border: "none", cursor: "pointer", fontWeight: "bold" }}
                >
                  Simular (+50 pts)
                </button>
              </li>

              <li className="mision-item">
                <div className="mision-info">
                  <h4>Itinerario en Equipo</h4>
                  <p>Asigna y completa visitas personalizadas desde el gestor de tareas.</p>
                </div>
                <Link
                  to="/tareas"
                  className="recompensa-badge"
                  style={{ textDecoration: "none" }}
                >
                  Ir a Tareas
                </Link>
              </li>
            </ul>

            <h3 style={{ marginTop: "20px" }}>Actividad Reciente (Pública)</h3>
            <ul className="lista-misiones">
              {historial.length === 0 ? (
                <li className="mision-item">
                  <p style={{ color: "#777" }}>Aún no hay recompensas registradas.</p>
                </li>
              ) : (
                historial.slice(0, 5).map((item) => (
                  <li className="mision-item" key={item.id_recompensa}>
                    <div className="mision-info">
                      <h4>{item.nombre}</h4>
                      <p>{item.motivo}</p>
                    </div>
                    <span className="recompensa-badge">+{item.puntos_ganados} pts</span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="modulo-ranking">
            <h3>Ranking de Viajeros</h3>
            <ul className="lista-ranking">
              {ranking.length === 0 ? (
                <li className="ranking-item">
                  <span>No hay usuarios registrados aún.</span>
                </li>
              ) : (
                ranking.map((viajero, index) => {
                  const claseTop =
                    index === 0
                      ? "top-1"
                      : index === 1
                      ? "top-2"
                      : index === 2
                      ? "top-3"
                      : "";
                  const esYo =
                    usuarioActual && viajero.id_usuario === usuarioActual.id_usuario;

                  return (
                    <li
                      key={viajero.id_usuario}
                      className={`ranking-item ${claseTop}`}
                    >
                      <span className="posicion">{index + 1}</span>
                      <span
                        className="nombre"
                        style={{ display: "flex", alignItems: "center", gap: "8px" }}
                      >
                        <span
                          style={{
                            width: "26px",
                            height: "26px",
                            borderRadius: "50%",
                            backgroundColor: "#1769e0",
                            color: "white",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            fontWeight: "bold",
                            border:
                              viajero.marco_activo &&
                              viajero.marco_activo !== "none"
                                ? viajero.marco_activo
                                : "1px solid #cbd5e1",
                          }}
                        >
                          {viajero.nombre?.charAt(0).toUpperCase()}
                        </span>
                        <span>
                          {viajero.nombre} {esYo ? "(Tú)" : ""}
                        </span>
                        {viajero.insignia_activa && (
                          <span
                            style={{
                              fontSize: "11px",
                              backgroundColor: "#fef3c7",
                              color: "#b45309",
                              padding: "1px 6px",
                              borderRadius: "999px",
                            }}
                          >
                            {viajero.insignia_activa}
                          </span>
                        )}
                      </span>
                      <span className="puntos">{viajero.puntos} pts</span>
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}