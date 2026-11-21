import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../assets/tareas.css";

export default function Tareas() {
  const [tareas, setTareas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [sitios, setSitios] = useState([]);

  const [descripcion, setDescripcion] = useState("");
  const [idUsuarioAsignado, setIdUsuarioAsignado] = useState("");
  const [idSitio, setIdSitio] = useState("");
  const [aviso, setAviso] = useState("");

  const cargarDatos = async () => {
    try {
      const [resTareas, resUsuarios, resSitios] = await Promise.all([
        fetch("http://localhost:3000/api/tareas"),
        fetch("http://localhost:3000/api/usuarios"),
        fetch("http://localhost:3000/api/sitios"),
      ]);

      setTareas(await resTareas.json());
      setUsuarios(await resUsuarios.json());
      setSitios(await resSitios.json());
    } catch (error) {
      console.error("Error cargando datos de tareas:", error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const seleccionarSitio = (e) => {
    const sitioId = e.target.value;
    setIdSitio(sitioId);
    if (sitioId) {
      const encontrado = sitios.find((s) => String(s.id_sitio) === sitioId);
      if (encontrado && !descripcion) {
        setDescripcion(`Visitar ${encontrado.nombre}`);
      }
    }
  };

  const agregarTarea = async (e) => {
    e.preventDefault();
    if (!descripcion || !idUsuarioAsignado) return;

    try {
      const res = await fetch("http://localhost:3000/api/tareas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_sitio: idSitio || null,
          id_usuario_asignado: idUsuarioAsignado,
          titulo: descripcion,
        }),
      });

      if (res.ok) {
        setDescripcion("");
        setIdUsuarioAsignado("");
        setIdSitio("");
        cargarDatos();
      }
    } catch (error) {
      console.error("Error al crear tarea:", error);
    }
  };

  const completarTarea = async (tarea) => {
    if (tarea.completada) return;

    try {
      const res = await fetch(
        `http://localhost:3000/api/tareas/${tarea.id_tarea}/completar`,
        { method: "PUT" }
      );
      const data = await res.json();

      if (res.ok) {
        // Si la tarea era del usuario con sesión iniciada, actualizamos sus puntos locales
        const usuarioActual = JSON.parse(sessionStorage.getItem("usuario") || "null");
        if (usuarioActual && usuarioActual.id_usuario === tarea.id_usuario_asignado) {
          usuarioActual.puntos = (usuarioActual.puntos || 0) + 25;
          sessionStorage.setItem("usuario", JSON.stringify(usuarioActual));
        }

        setAviso(data.mensaje || "¡Tarea completada! +25 puntos otorgados.");
        setTimeout(() => setAviso(""), 3500);
        cargarDatos();
      }
    } catch (error) {
      console.error("Error al completar tarea:", error);
    }
  };

  return (
    <>
      <header style={{ padding: "20px", backgroundColor: "#d6d6d6" }}>
        <nav>
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
        </nav>
      </header>

      <main>
        <section className="modulo-tareas">
          <header style={{ marginBottom: "20px" }}>
            <h2>Gestión de Tareas e Itinerario</h2>
            <p style={{ color: "#777" }}>
              Asigna lugares o actividades a los integrantes y márcalas como visitadas para ganar puntos.
            </p>
          </header>

          {aviso && (
            <div
              style={{
                backgroundColor: "#d1fae5",
                color: "#065f46",
                padding: "10px 14px",
                borderRadius: "8px",
                marginBottom: "15px",
                fontWeight: "500",
              }}
            >
              {aviso}
            </div>
          )}

          {/* FORMULARIO */}
          <form className="formulario-tareas" onSubmit={agregarTarea}>
            <select value={idSitio} onChange={seleccionarSitio}>
              <option value="">Lugar de CDMX (opcional)...</option>
              {sitios.map((s) => (
                <option key={s.id_sitio} value={s.id_sitio}>
                  {s.nombre} ({s.categoria})
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Actividad o lugar a visitar..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              required
            />

            <select
              value={idUsuarioAsignado}
              onChange={(e) => setIdUsuarioAsignado(e.target.value)}
              required
            >
              <option value="" disabled>
                Asignar a...
              </option>
              {usuarios.map((u) => (
                <option key={u.id_usuario} value={u.id_usuario}>
                  {u.nombre}
                </option>
              ))}
            </select>

            <button type="submit" className="btn-accion">
              Crear Tarea
            </button>
          </form>

          {/* LISTA DE TAREAS */}
          <ul className="lista-tareas">
            {tareas.length === 0 ? (
              <p style={{ color: "#777", textAlign: "center", marginTop: "15px" }}>
                Aún no hay actividades asignadas en el itinerario.
              </p>
            ) : (
              tareas.map((tarea) => (
                <li
                  key={tarea.id_tarea}
                  className={`tarea-item ${tarea.completada ? "terminada" : ""}`}
                >
                  <div className="texto-tarea">
                    <strong>{tarea.nombre_asignado || "Viajero"}:</strong>{" "}
                    {tarea.titulo}
                    {tarea.nombre_sitio && (
                      <span style={{ fontSize: "12px", color: "#1769e0", marginLeft: "8px" }}>
                        📍 {tarea.nombre_sitio}
                      </span>
                    )}
                  </div>
                  <button
                    className="btn-completar"
                    onClick={() => completarTarea(tarea)}
                    disabled={Boolean(tarea.completada)}
                    style={{
                      opacity: tarea.completada ? 0.7 : 1,
                      cursor: tarea.completada ? "default" : "pointer",
                    }}
                  >
                    {tarea.completada ? "Visitada ✔ (+25 pts)" : "Marcar lista"}
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>
      </main>
    </>
  );
}