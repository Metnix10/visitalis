import { Link } from "react-router-dom";
import "../assets/recompensas.css";

export default function Recompensas() {
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
          <div className="puntos-usuario" style={{ color: "white" }}>
            Mis Puntos: <strong>1,250</strong>
          </div>
        </nav>
      </header>

      <main className="contenedor-recompensas">
        <section className="modulo-mapa">
          <h2>Mapa de Exploración</h2>
          <p>
            Visita estos puntos turísticos para desbloquear recompensas
            exclusivas.
          </p>
          <div className="mapa-placeholder">
            <span style={{ color: "#94a3b8", fontWeight: "bold" }}>
              Mapa Interactivo (Próximamente)
            </span>
          </div>
        </section>

        <div className="grid-recompensas">
          <section className="modulo-misiones">
            <h3>Misiones Disponibles</h3>
            <ul className="lista-misiones">
              <li className="mision-item">
                <div className="mision-info">
                  <h4>Fotógrafo Regio</h4>
                  <p>Haz check-in en 3 museos diferentes.</p>
                </div>
                <span className="recompensa-badge">Playera</span>
              </li>
              <li className="mision-item">
                <div className="mision-info">
                  <h4>Rey de la Montaña</h4>
                  <p>Visita el mirador principal.</p>
                </div>
                <span className="recompensa-badge">Café Gratis</span>
              </li>
            </ul>
          </section>

          <section className="modulo-ranking">
            <h3>Ranking de Viajeros</h3>
            <ul className="lista-ranking">
              <li className="ranking-item top-1">
                <span className="posicion">1</span>
                <span className="nombre">Carlos M.</span>
                <span className="puntos">5,400 pts</span>
              </li>
              <li className="ranking-item top-2">
                <span className="posicion">2</span>
                <span className="nombre">Laura G.</span>
                <span className="puntos">4,850 pts</span>
              </li>
              <li className="ranking-item top-3">
                <span className="posicion">3</span>
                <span className="nombre">Kael</span>
                <span className="puntos">4,200 pts</span>
              </li>
              <li className="ranking-item">
                <span className="posicion">4</span>
                <span className="nombre">Tú</span>
                <span className="puntos">1,250 pts</span>
              </li>
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
