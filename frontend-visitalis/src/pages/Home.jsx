import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Home() {
  const [usuarioActual, setUsuarioActual] = useState(() =>
    JSON.parse(localStorage.getItem("usuario") || "null")
  );

  // Sincroniza puntos y cosméticos equipados al regresar a Inicio
  useEffect(() => {
    if (!usuarioActual) return;

    fetch(`${API_URL}/api/usuarios`)
      .then((res) => res.json())
      .then((lista) => {
        const actualizado = lista.find(
          (u) => u.id_usuario === usuarioActual.id_usuario
        );
        if (actualizado) {
          const combinado = { ...usuarioActual, ...actualizado };
          setUsuarioActual(combinado);
          localStorage.setItem("usuario", JSON.stringify(combinado));
        }
      })
      .catch((err) => console.error("Error sincronizando perfil:", err));
  }, []);

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

        {/* Perfil activo o Botones de Autenticación */}
        {usuarioActual ? (
          <Link
            to="/perfil"
            title="Ver mi perfil y cosméticos"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
              color: "#1e293b",
              backgroundColor: "#f1f5f9",
              padding: "6px 14px",
              borderRadius: "999px",
              fontWeight: "bold",
              fontSize: "14px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                backgroundColor: "#1769e0",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                border:
                  usuarioActual.marco_activo &&
                    usuarioActual.marco_activo !== "none"
                    ? usuarioActual.marco_activo
                    : "2px solid #cbd5e1",
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

            <span
              style={{
                backgroundColor: "#dbeafe",
                color: "#1769e0",
                padding: "2px 10px",
                borderRadius: "999px",
                fontSize: "12px",
              }}
            >
              {usuarioActual.puntos || 0} pts
            </span>
          </Link>
        ) : (
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
        )}
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