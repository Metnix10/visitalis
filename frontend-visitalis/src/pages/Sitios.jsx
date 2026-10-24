import { Link } from "react-router-dom";
import "../assets/sitios.css";

export default function Sitios() {
  return (
    <>
      {/* ENCABEZADO */}
      <header>
        <div className="logo">
          <Link to="/" style={{ textDecoration: "none", color: "#1769e0" }}>
            Visitalis
          </Link>
        </div>
        <div className="perfil"></div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="contenedor-sitios">
        <h1>Sitios turísticos</h1>
        <p className="subtitulo">
          Descubre lugares para visitar en Ciudad de México.
        </p>

        {/* FILTROS */}
        <section className="filtros">
          <div className="filtro">
            <label htmlFor="categoria">Categoría</label>
            <select id="categoria">
              <option value="todas">Todas las categorías</option>
              <option value="arte">Arte y cultura</option>
              <option value="naturaleza">Naturaleza</option>
              <option value="gastronomia">Gastronomía</option>
              <option value="historia">Historia</option>
            </select>
          </div>

          <div className="filtro">
            <label htmlFor="zona">Zona</label>
            <select id="zona">
              <option value="todas">Toda la CDMX</option>
              <option value="centro">Centro Histórico</option>
              <option value="chapultepec">Chapultepec</option>
              <option value="coyoacan">Coyoacán</option>
              <option value="xochimilco">Xochimilco</option>
            </select>
          </div>

          <button className="btn-filtrar">Aplicar filtros</button>
        </section>

        {/* LISTA DE SITIOS */}
        <section className="lista-sitios">
          <article className="sitio">
            <div className="imagen-sitio">
              <img
                src="https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=1000&q=80"
                alt="Palacio de Bellas Artes"
              />
            </div>
            <div className="info-sitio">
              <span className="badge-categoria">Arte y cultura</span>
              <h2>Palacio de Bellas Artes</h2>
              <p className="ubicacion">Ciudad de México · Centro Histórico</p>
              <p className="descripcion">
                Uno de los recintos culturales más representativos de la ciudad.
                Cuenta con museos, murales, arquitectura histórica y espacios
                dedicados a las artes escénicas.
              </p>
              <div className="acciones-sitio">
                <button className="ver-mas">Ver sitio</button>
                <button className="ver-mas iniciar-chat">
                  Iniciar chat con guías
                </button>
              </div>
            </div>
          </article>

          <article className="sitio">
            <div className="imagen-sitio">
              <img
                src="https://plus.unsplash.com/premium_photo-1733266882179-4947a583353d?q=80&w=1169&auto=format&fit=crop"
                alt="Bosque de Chapultepec"
              />
            </div>
            <div className="info-sitio">
              <span className="badge-categoria naturaleza">Naturaleza</span>
              <h2>Bosque de Chapultepec</h2>
              <p className="ubicacion">Ciudad de México · Miguel Hidalgo</p>
              <p className="descripcion">
                Amplio espacio verde que combina áreas naturales, museos,
                espacios culturales, lagos y diferentes actividades para los
                visitantes.
              </p>
              <div className="acciones-sitio">
                <button className="ver-mas">Ver sitio</button>
                <button className="ver-mas iniciar-chat">
                  Iniciar chat con guías
                </button>
              </div>
            </div>
          </article>
        </section>
      </main>
    </>
  );
}
