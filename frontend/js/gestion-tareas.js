document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/api';
    // --- ELEMENTOS DEL DOM ---
    const panelTitleElement = document.getElementById('panel-title');
    const tareasLista = document.getElementById('tareas-lista');
    const filtroNumeroOrden = document.getElementById('filtro-numero-orden');
    const filtroEstado = document.getElementById('filtro-estado');
    const filtroFechaInicio = document.getElementById('filtro-fecha-inicio');
    const filtroFechaFin = document.getElementById('filtro-fecha-fin');
    const btnFiltrar = document.getElementById('btn-filtrar');

    // --- ELEMENTOS DEL MODAL ---
    const taskDetailModal = document.getElementById('task-detail-modal');
    const modalContent = taskDetailModal.querySelector('.modal-content');
    const modalCloseBtn = taskDetailModal.querySelector('.modal-close-btn');
    const modalBody = document.getElementById('modal-body');
    const modalEstadoSelect = document.getElementById('modal-estado-select');
    const modalGuardarEstado = document.getElementById('modal-guardar-estado');

    // --- LÓGICA PRINCIPAL ---
    const getAreaFromTitle = () => {
        const title = panelTitleElement.textContent.toLowerCase();
        if (title.includes('bordado')) return 'Bordado';
        if (title.includes('parche')) return 'Parche';
        if (title.includes('textil')) return 'Textil';
        return ''; // Para la vista general
    };

    const areaActual = getAreaFromTitle();

    const fetchTareas = async () => {
        let query = `area=${areaActual}`;
        if (filtroNumeroOrden.value) query += `&numero_orden=${encodeURIComponent(filtroNumeroOrden.value.trim())}`;
        if (filtroEstado.value) query += `&estado=${encodeURIComponent(filtroEstado.value)}`;
        if (filtroFechaInicio.value) query += `&fecha_inicio=${filtroFechaInicio.value}`;
        if (filtroFechaFin.value) query += `&fecha_fin=${filtroFechaFin.value}`;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/tareas?${query}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error(`Error del servidor: ${response.statusText}`);
            const tareas = await response.json();
            renderTareas(tareas);
        } catch (error) {
            console.error('Error al obtener las tareas:', error);
            tareasLista.innerHTML = `<tr><td colspan="5" class="text-danger text-center">No se pudieron cargar las tareas.</td></tr>`;
        }
    };

    const renderTareas = (tareas) => {
        tareasLista.innerHTML = '';
        if (tareas.length === 0) {
            tareasLista.innerHTML = `<tr><td colspan="5" class="text-center">No hay tareas que coincidan con los filtros.</td></tr>`;
            return;
        }

        tareas.forEach(tarea => {
            const fecha = new Date(tarea.fecha_creacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
            const total = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(tarea.total);
            
            const row = tareasLista.insertRow();
            row.innerHTML = `
                <td>${tarea.numero_orden}</td>
                <td>${fecha}</td>
                <td>${tarea.cliente_nombre}</td>
                <td>${total}</td>
                <td>
                    <button class="btn-accion btn-ver-detalles" data-task-id="${tarea.id}">Ver Detalles</button>
                </td>
            `;
        });
    };

    // --- LÓGICA DEL MODAL ---
    async function openTaskModal(taskId) {
        const modal = document.getElementById('task-detail-modal');
        const modalBody = document.getElementById('modal-body');
        const modalTitle = document.getElementById('modal-title');

        try {
            const response = await fetch(`${API_URL}/tareas/${taskId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error('No se pudo cargar la información de la tarea.');
            
            const tarea = await response.json();

            const fechaCreacion = new Date(tarea.fecha_creacion).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const cloudinaryBaseUrl = 'https://res.cloudinary.com/dj6prfjm9/image/upload/';
            let imagenSrc = 'https://via.placeholder.com/300x300.png?text=Sin+Imagen';
            if (tarea.imagen_url) {
                const filename = tarea.imagen_url.substring(tarea.imagen_url.lastIndexOf('/') + 1);
                imagenSrc = `${cloudinaryBaseUrl}${filename}`;
            }

            modalBody.innerHTML = `
                <div class="task-modal-layout">
                    <div class="task-modal-image-container">
                        <img src="${imagenSrc}" alt="Imagen del producto" class="task-modal-image">
                    </div>
                    <div class="task-modal-details-container">
                        <p><strong>Nº Orden:</strong> ${tarea.numero_orden}</p>
                        <p><strong>Cliente:</strong> ${tarea.cliente_nombre}</p>
                        <p><strong>Producto:</strong> ${tarea.producto_nombre} (Ref: ${tarea.producto_referencia})</p>
                        <p><strong>Cantidad:</strong> ${tarea.cantidad}</p>
                        <p><strong>Área Asignada:</strong> <span class="badge-area">${tarea.area}</span></p>
                        <p><strong>Fecha de Creación:</strong> ${fechaCreacion}</p>
                    </div>
                </div>
                <div class="task-modal-description">
                    <p><strong>Descripción de la Tarea:</strong></p>
                    <p>${tarea.descripcion || 'No hay descripción para esta tarea.'}</p>
                </div>
            `;

            modalTitle.textContent = `Detalles de Tarea para Orden #${tarea.numero_orden}`;
            document.getElementById('modal-estado-select').value = tarea.estado;
            document.getElementById('modal-guardar-estado').dataset.taskId = taskId;

            modal.style.display = 'flex';

        } catch (error) {
            console.error('Error al abrir el modal:', error);
            alert(error.message);
        }
    };

    const closeTaskModal = () => {
        taskDetailModal.style.display = 'none';
    };

    const updateTaskStatus = async () => {
        const taskId = modalGuardarEstado.dataset.taskId;
        const nuevoEstado = modalEstadoSelect.value;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/tareas/${taskId}/estado`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ estado: nuevoEstado })
            });

            if (!response.ok) throw new Error('Error al actualizar el estado.');

            closeTaskModal();
            fetchTareas(); // Recargar la tabla para mostrar el cambio

        } catch (error) {
            console.error('Error al actualizar estado:', error);
            alert(error.message);
        }
    };

    // --- EVENT LISTENERS ---
    btnFiltrar.addEventListener('click', fetchTareas);
    modalCloseBtn.addEventListener('click', closeTaskModal);
    modalGuardarEstado.addEventListener('click', updateTaskStatus);

    // Cerrar modal al hacer clic fuera del contenido
    taskDetailModal.addEventListener('click', (e) => {
        if (e.target === taskDetailModal) {
            closeTaskModal();
        }
    });

    // Event delegation para los botones "Ver Detalles"
    tareasLista.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-ver-detalles')) {
            const taskId = e.target.dataset.taskId;
            openTaskModal(taskId);
        }
    });

    // --- CARGA INICIAL ---
    fetchTareas();
});
