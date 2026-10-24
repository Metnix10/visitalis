import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../assets/registro.css";

export default function Registro() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mensaje, setMensaje] = useState("");

  const navigate = useNavigate();

  const manejarSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");

    if (nombre && correo && contrasena.length >= 6) {
      try {
        // Hacemos la petición a tu nueva API en Node.js
        const respuesta = await fetch('http://10.111.126.195:3000/api/registro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, correo, contrasena })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
          // Si MySQL guardó el dato correctamente, lo mandamos a iniciar sesión
          navigate("/login");
        } else {
          // Si hay error (ej. el correo ya existe), mostramos el mensaje del backend
          setMensaje(datos.error || "Ocurrió un error al registrar.");
        }
      } catch (error) {
        setMensaje("Error conectando con el servidor de base de datos.");
      }
    } else {
      setMensaje(
        "Llena todos los campos. La contraseña debe tener al menos 6 caracteres.",
      );
    }
  };

  return (
    <div className="registro-wrapper">
      <div className="registro">
        <div className="logo">Visitalis</div>
        <h1>Crear cuenta</h1>

        <form onSubmit={manejarSubmit}>
          <div className="campo">
            <label htmlFor="nombre">Nombre</label>
            <input
              type="text"
              id="nombre"
              placeholder="Ingresa tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>

          <div className="campo">
            <label htmlFor="correo">Correo</label>
            <input
              type="email"
              id="correo"
              placeholder="Ingresa tu correo"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />
          </div>

          <div className="campo">
            <label htmlFor="contrasena">Contraseña</label>
            <input
              type="password"
              id="contrasena"
              placeholder="Ingresa tu contraseña"
              minLength="6"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
            />
          </div>

          <p style={{ color: "red", fontSize: "14px", marginBottom: "10px" }}>
            {mensaje}
          </p>

          <button type="submit">Crear cuenta</button>
        </form>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <span style={{ fontSize: "14px", color: "#555" }}>
            ¿Ya tienes cuenta?{" "}
          </span>
          <Link
            to="/login"
            style={{ color: "#1769e0", textDecoration: "none" }}
          >
            Inicia sesión aquí
          </Link>
        </div>
      </div>
    </div>
  );
}