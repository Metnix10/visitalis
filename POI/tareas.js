const formulario = document.getElementById('formulario-tareas');
const inputTarea = document.getElementById('input-tarea');
const inputIntegrante = document.getElementById('input-integrante');
const listaTareas = document.getElementById('lista-tareas');

let tareas = [];

formulario.addEventListener('submit', function(e) {
    e.preventDefault(); 

    const nuevaTarea = {
        id: Date.now(),
        descripcion: inputTarea.value,
        responsable: inputIntegrante.value,
        terminada: false
    };

    tareas.push(nuevaTarea);

    inputTarea.value = '';
    inputIntegrante.value = '';

    renderizarTareas();
});

function renderizarTareas() {
    listaTareas.innerHTML = '';

    tareas.forEach(tarea => {
        const li = document.createElement('li');
        li.className = 'tarea-item';
        if (tarea.terminada) {
            li.classList.add('terminada');
        }

        li.innerHTML = `
            <div class="texto-tarea">
                <strong>${tarea.responsable}:</strong> ${tarea.descripcion}
            </div>
            <button class="btn-completar" onclick="cambiarEstado(${tarea.id})">
                ${tarea.terminada ? 'Terminada ✔' : 'Marcar lista'}
            </button>
        `;

        listaTareas.appendChild(li);
    });
}

function cambiarEstado(id) {
    const tareaEncontrada = tareas.find(tarea => tarea.id === id);
    
    if (tareaEncontrada) {
        tareaEncontrada.terminada = !tareaEncontrada.terminada;
        renderizarTareas();
    }
}