import { useState } from "react";
import { Link } from "react-router-dom";
import "../assets/tareas.css";

export default function Tareas() {
  // Estado para guardar la lista de tareas
  const [tareas, setTareas] = useState([]);

  // Estados para los inputs del formulario
  const [descripcion, setDescripcion] = useState("");
  const [integrante, setIntegrante] = useState("");

  const agregarTarea = (e) => {
    e.preventDefault();

    // Creamos el objeto de la nueva tarea
    const nuevaTarea = {
      id: Date.now(),
      descripcion: descripcion,
      responsable: integrante,
      terminada: false,
    };

    // Agregamos la nueva tarea copiando las anteriores (...tareas)
    setTareas([...tareas, nuevaTarea]);

    // Limpiamos los inputs
    setDescripcion("");
    setIntegrante("");
  };

  const cambiarEstado = (id) => {
    // Buscamos la tarea por su ID y le invertimos el estado "terminada"
    const nuevasTareas = tareas.map((tarea) => {
      if (tarea.id === id) {
        return { ...tarea, terminada: !tarea.terminada };
      }
      return tarea;
    });
    setTareas(nuevasTareas);
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
            <h2>Gestión de Tareas del Grupo</h2>
            <p style={{ color: "#777" }}>
              Asigna y controla las actividades de los integrantes del viaje.
            </p>
          </header>

          {/* FORMULARIO */}
          <form className="formulario-tareas" onSubmit={agregarTarea}>
            <input
              type="text"
              placeholder="Escribe una tarea..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              required
            />

            <select
              value={integrante}
              onChange={(e) => setIntegrante(e.target.value)}
              required
            >
              <option value="" disabled>
                Asignar a...
              </option>
              <option value="Carlos">Carlos</option>
              <option value="María">María</option>
              <option value="Kael">Kael</option>
            </select>

            <button type="submit" className="btn-accion">
              Crear Tarea
            </button>
          </form>

          {/* LISTA DE TAREAS */}
          <ul className="lista-tareas">
            {tareas.map((tarea) => (
              // Usamos un template string ` ` para inyectar la clase "terminada" dinámicamente
              <li
                key={tarea.id}
                className={`tarea-item ${tarea.terminada ? "terminada" : ""}`}
              >
                <div className="texto-tarea">
                  <strong>{tarea.responsable}:</strong> {tarea.descripcion}
                </div>
                <button
                  className="btn-completar"
                  onClick={() => cambiarEstado(tarea.id)}
                >
                  {tarea.terminada ? "Terminada ✔" : "Marcar lista"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}