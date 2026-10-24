import { Link } from "react-router-dom";

export default function Home() {
  return (
    <>
      {/* ENCABEZADO */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "15px 20px",
        }}
      >
        <div className="logo">Visitalis</div>

        {/* Botones de Autenticación */}
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <Link
            to="/login"
            style={{
              textDecoration: "none",
              color: "#555",
              fontWeight: "bold",
            }}
          >
            Iniciar sesión
          </Link>
          <Link
            to="/registro"
            style={{
              textDecoration: "none",
              backgroundColor: "#1769e0",
              color: "white",
              padding: "8px 18px",
              borderRadius: "20px",
              fontWeight: "bold",
            }}
          >
            Registrarse
          </Link>
        </div>
      </header>

      {/* IMAGEN PRINCIPAL */}
      <section className="hero">
        <div className="busqueda">
          <input
            type="text"
            placeholder="Buscar destinos, lugares, actividades..."
          />
        </div>
      </section>

      {/* LUGARES DE INTERÉS */}
      <section className="lugares">
        <h2>Lugares de interés</h2>
        <div className="categorias">
          {/* LOCALES */}
          <Link to="/sitios" className="categoria">
            <div className="icono">
              <img
                src="https://plus.unsplash.com/premium_photo-1697605026167-14bc81c13957?q=80&w=1170&auto=format&fit=crop"
                alt="local"
              />
            </div>
            <h3>Locales</h3>
          </Link>

          {/* NACIONALES */}
          <Link to="/sitios" className="categoria">
            <div className="icono">
              <img
                src="https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?q=80&w=1170&auto=format&fit=crop"
                alt="Nacionales"
              />
            </div>
            <h3>Nacionales</h3>
          </Link>

          {/* NATURALES */}
          <Link to="/sitios" className="categoria">
            <div className="icono">
              <img
                src="https://images.unsplash.com/photo-1757368117014-c2b054211c8d?q=80&w=1170&auto=format&fit=crop"
                alt="natural"
              />
            </div>
            <h3>Naturales</h3>
          </Link>
        </div>
      </section>

      {/* BOTONES FLOTANTES */}
      <div className="contenedor-botones-flotantes">
        <Link to="/tareas" className="btn-flotante">
          Asignar tareas
        </Link>
        <Link to="/recompensas" className="btn-flotante">
          Recompensas
        </Link>
      </div>
    </>
  );
}
