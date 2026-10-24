import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../assets/login.css";

export default function Login() {
  // Estados para guardar lo que el usuario escribe
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mensaje, setMensaje] = useState("");

  // Hook para redireccionar a otra página por código
  const navigate = useNavigate();

  // Reemplazo de tu antiguo addEventListener('submit')
  const manejarSubmit = (e) => {
    e.preventDefault();
    setMensaje("");

    // Para el Avance 2, aquí haremos el fetch() a Node.js.
    // Por ahora, simulamos el inicio de sesión:
    if (correo && contrasena) {
      console.log("Datos listos para enviar:", { correo, contrasena });
      navigate("/"); // Redirige al Home simulando éxito
    } else {
      setMensaje("Todos los campos son obligatorios");
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login">
        <div className="logo">Visitalis</div>
        <h1>Iniciar sesión</h1>

        <form onSubmit={manejarSubmit}>
          <div className="campo">
            {/* Nota: 'for' en HTML es 'htmlFor' en React */}
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

          <p style={{ color: "red", fontSize: "14px", marginBottom: "10px" }}>
            {mensaje}
          </p>

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
