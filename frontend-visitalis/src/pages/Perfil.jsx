import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "../api";

export default function Perfil() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(() =>
    JSON.parse(localStorage.getItem("usuario") || "null")
  );

  useEffect(() => {
    if (!usuario) {
      navigate("/login");
      return;
    }

    // Sincroniza puntos y cosméticos actualizados desde MySQL
    fetch(`http://${window.location.hostname}:3000/api/usuarios`)
      .then((res) => res.json())
      .then((lista) => {
        const actualizado = lista.find((u) => u.id_usuario === usuario.id_usuario);
        if (actualizado) {
          const combinado = { ...usuario, ...actualizado };
          setUsuario(combinado);
          localStorage.setItem("usuario", JSON.stringify(combinado));
        }
      })
      .catch((err) => console.error("Error sincronizando perfil:", err));
  }, []);

  const cerrarSesion = () => {
    localStorage.removeItem("usuario");
    window.location.href = "/";
  };

  if (!usuario) return null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f1f5f9", padding: "30px 20px" }}>
      <div
        style={{
          maxWidth: "540px",
          margin: "0 auto",
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "30px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <Link
          to="/"
          style={{ textDecoration: "none", color: "#1769e0", fontWeight: "bold" }}
        >
          ← Volver al inicio
        </Link>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <div
            style={{
              width: "84px",
              height: "84px",
              borderRadius: "50%",
              backgroundColor: "#1769e0",
              color: "white",
              fontSize: "34px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
              border:
                usuario.marco_activo && usuario.marco_activo !== "none"
                  ? usuario.marco_activo
                  : "4px solid #e2e8f0",
            }}
          >
            {usuario.nombre?.charAt(0).toUpperCase()}
          </div>

          <h1 style={{ margin: "0 0 6px", fontSize: "24px", color: "#0f172a" }}>
            {usuario.nombre}
          </h1>

          {usuario.insignia_activa && (
            <span
              style={{
                display: "inline-block",
                backgroundColor: "#fef3c7",
                color: "#b45309",
                padding: "4px 12px",
                borderRadius: "999px",
                fontSize: "13px",
                fontWeight: "600",
                marginBottom: "8px",
              }}
            >
              {usuario.insignia_activa}
            </span>
          )}

          <p style={{ color: "#64748b", margin: "4px 0 20px" }}>{usuario.correo}</p>
        </div>

        <div
          style={{
            backgroundColor: "#f8fafc",
            borderRadius: "12px",
            padding: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div>
            <span style={{ fontSize: "13px", color: "#64748b", display: "block" }}>
              Puntos disponibles
            </span>
            <strong style={{ fontSize: "22px", color: "#1769e0" }}>
              {usuario.puntos || 0} pts
            </strong>
          </div>

          <Link
            to="/recompensas"
            style={{
              backgroundColor: "#1769e0",
              color: "white",
              textDecoration: "none",
              padding: "10px 16px",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "14px",
            }}
          >
            Ir a tienda y misiones
          </Link>
        </div>

        <button
          type="button"
          onClick={cerrarSesion}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "15px",
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}