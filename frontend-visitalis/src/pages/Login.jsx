import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../assets/login.css";

export default function Login() {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mensaje, setMensaje] = useState("");

  const navigate = useNavigate();

  const manejarSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");

    if (!correo || !contrasena) {
      setMensaje("Todos los campos son obligatorios");
      return;
    }

    try {
      const respuesta = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, contrasena }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setMensaje(datos.error || "Error al iniciar sesión");
        return;
      }

      // Guardamos la sesión del usuario para usarla en todo el sistema
      localStorage.setItem("usuario", JSON.stringify(datos.usuario));
      navigate("/");
    } catch (error) {
      console.error("Error de conexión:", error);
      setMensaje("No se pudo conectar con el servidor");
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login">
        <div className="logo">Visitalis</div>
        <h1>Iniciar sesión</h1>

        <form onSubmit={manejarSubmit}>
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
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
            />
          </div>

          {mensaje && (
            <p style={{ color: "red", fontSize: "14px", marginBottom: "10px" }}>
              {mensaje}
            </p>
          )}

          <button type="submit">Iniciar sesión</button>
        </form>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <Link to="/" style={{ color: "#1769e0", textDecoration: "none" }}>
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}