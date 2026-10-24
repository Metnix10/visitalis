// 1. Agregamos useLocation a la importación
import { Routes, Route, useLocation } from "react-router-dom"; 
import Home from "./pages/Home";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Sitios from "./pages/Sitios";
import Tareas from "./pages/Tareas";
import Recompensas from "./pages/Recompensas";

import ChatWidget from "./components/ChatWidget"; 

function App() {
  // 2. Obtenemos la ruta actual del navegador
  const location = useLocation();
  
  // 3. Verificamos si estamos en login o registro
  const ocultarChat = location.pathname === '/login' || location.pathname === '/registro';

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/sitios" element={<Sitios />} />
        <Route path="/tareas" element={<Tareas />} />
        <Route path="/recompensas" element={<Recompensas />} />
      </Routes>
      
      {/* 4. El chat solo se dibuja si 'ocultarChat' es falso */}
      {!ocultarChat && <ChatWidget />}
    </>
  );
}

export default App;