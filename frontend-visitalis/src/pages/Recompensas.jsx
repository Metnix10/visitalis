import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../assets/recompensas.css";

export default function Recompensas() {
  const [ranking, setRanking] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [misPuntos, setMisPuntos] = useState(0);

  const usuarioActual = JSON.parse(sessionStorage.getItem("usuario") || "null");

  useEffect(() => {
    if (usuarioActual) {
      setMisPuntos(usuarioActual.puntos || 0);
    }

    fetch("http://localhost:3000/api/recompensas")
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
          }
        }
      })
      .catch((err) => console.error("Error cargando recompensas:", err));
  }, []);

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
          <div className="puntos-usuario" style={{ color: "#1e293b", fontWeight: "bold" }}>
            {usuarioActual ? `${usuarioActual.nombre} · ` : ""}
            Mis Puntos: <strong>{misPuntos} pts</strong>
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

        <div className="grid-recompensas">
          <section className="modulo-misiones">
            <h3>Reglas y Misiones (CDMX)</h3>
            <ul className="lista-misiones">
              <li className="mision-item">
                <div className="mision-info">
                  <h4>Explorador Capitalino</h4>
                  <p>Marca como visitado cualquier punto del catálogo (+25 pts por sitio).</p>
                </div>
                <span className="recompensa-badge">+25 pts</span>
              </li>
              <li className="mision-item">
                <div className="mision-info">
                  <h4>Ruta Cultural CDMX</h4>
                  <p>Visita 3 museos del catálogo (Antropología, Frida Kahlo, Soumaya).</p>
                </div>
                <span className="recompensa-badge">Insignia Oro</span>
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
                      <span className="nombre">
                        {viajero.nombre} {esYo ? "(Tú)" : ""}
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