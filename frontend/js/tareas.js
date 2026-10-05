const API_URL = 'http://localhost:3000/api';

let tareas = [];
let tareasFiltradas = [];
let responsables = [];

const searchInput = document.getElementById('searchInput');
const globalSearch = document.getElementById('globalSearch');
const priorityFilter = document.getElementById('priorityFilter');
const responsibleFilter = document.getElementById('responsibleFilter');
const statusFilter = document.getElementById('statusFilter');
const clearFilters = document.getElementById('clearFilters');

const obtenerSesion = () => {
    const token = localStorage.getItem('mc_token') || sessionStorage.getItem('mc_token');
    const usuarioGuardado = localStorage.getItem('mc_usuario') || sessionStorage.getItem('mc_usuario');

    if (!token || !usuarioGuardado) {
        window.location.href = '../../index.html';
        return null;
    }

    try {
        return {
            token,
            usuario: JSON.parse(usuarioGuardado)
        };
    } catch (error) {
        cerrarSesion();
        return null;
    }
};

const cerrarSesion = () => {
    localStorage.removeItem('mc_token');
    localStorage.removeItem('mc_usuario');
    sessionStorage.removeItem('mc_token');
    sessionStorage.removeItem('mc_usuario');
    window.location.href = '../../index.html';
};

const obtenerIniciales = nombre => {
    if (!nombre) return 'MC';

    const partes = nombre.trim().split(/\s+/);

    if (partes.length === 1) {
        return partes[0].substring(0, 2).toUpperCase();
    }

    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
};

const limpiarTexto = valor => {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
};

const valorSeguro = (valor, alternativo = '—') => {
    if (valor === null || valor === undefined || valor === '') {
        return alternativo;
    }

    return valor;
};

const mostrarUsuario = usuario => {
    const nombre = usuario.nombre || usuario.nombreCompleto || 'Usuario';

    document.getElementById('userName').textContent = nombre;
    document.getElementById('userRole').textContent = usuario.rol || 'USUARIO';
    document.getElementById('userAvatar').textContent = obtenerIniciales(nombre);
};

const obtenerFecha = fecha => {
    if (!fecha) return null;

    return new Date(`${String(fecha).substring(0, 10)}T00:00:00`);
};

const formatearFecha = fecha => {
    const fechaObjeto = obtenerFecha(fecha);

    if (!fechaObjeto || Number.isNaN(fechaObjeto.getTime())) {
        return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(fechaObjeto);
};

const estaVencida = tarea => {
    if (!tarea.fechaLimite) return false;

    if (['Completada', 'Cancelada'].includes(tarea.estado)) {
        return false;
    }

    const limite = obtenerFecha(tarea.fechaLimite);
    const hoy = new Date();

    hoy.setHours(0, 0, 0, 0);

    return limite && limite < hoy;
};

const normalizarPrioridad = prioridad => {
    const valor = limpiarTexto(prioridad);

    if (
        valor.includes('alto') ||
        valor.includes('alta') ||
        valor.includes('urgente') ||
        valor.includes('crit')
    ) {
        return 'high';
    }

    if (
        valor.includes('medio') ||
        valor.includes('media')
    ) {
        return 'medium';
    }

    if (
        valor.includes('bajo') ||
        valor.includes('baja')
    ) {
        return 'low';
    }

    return 'default';
};

const clasePrioridadCard = prioridad => {
    const clase = normalizarPrioridad(prioridad);

    if (clase === 'high') return 'priority-high';
    if (clase === 'medium') return 'priority-medium';
    if (clase === 'low') return 'priority-low';

    return '';
};

const crearAvatarResponsable = responsable => {
    if (responsable?.fotoUrl) {
        return `
            <div class="assignee-avatar">
                <img
                    src="${responsable.fotoUrl}"
                    alt="${valorSeguro(responsable.nombre, 'Responsable')}"
                    onerror="this.style.display='none'; this.parentElement.textContent='${obtenerIniciales(responsable.nombre)}';"
                >
            </div>
        `;
    }

    return `
        <div class="assignee-avatar">
            ${obtenerIniciales(responsable?.nombre)}
        </div>
    `;
};

const crearTarjetaTarea = tarea => {
    const vencida = estaVencida(tarea);
    const prioridadClase = normalizarPrioridad(tarea.prioridad);

    const opcionesEstado = [
        'Pendiente',
        'En curso',
        'Completada',
        'Bloqueada',
        'Cancelada'
    ];

    return `
        <article class="task-card ${clasePrioridadCard(tarea.prioridad)}">
            <div class="task-priority-line"></div>

            <div class="task-content">
                <div class="task-top">
                    <span class="task-code">
                        ${valorSeguro(tarea.codigo)}
                    </span>

                    <span class="priority-badge ${prioridadClase}">
                        ${valorSeguro(tarea.prioridad, 'Sin prioridad')}
                    </span>
                </div>

                <h4 class="task-title">
                    ${valorSeguro(tarea.titulo, 'Tarea')}
                </h4>

                <span class="task-case">
                    ${valorSeguro(tarea.expediente?.codigo, 'Sin expediente')}
                    ${tarea.expediente?.numero ? ` · ${tarea.expediente.numero}` : ''}
                </span>

                <span class="task-client">
                    ${valorSeguro(tarea.cliente?.nombre, 'Sin cliente asociado')}
                </span>

                <div class="task-metadata">
                    <div class="metadata-row">
                        <span class="metadata-label">Fecha límite</span>

                        <span class="metadata-value ${vencida ? 'overdue' : ''}">
                            ${formatearFecha(tarea.fechaLimite)}
                        </span>
                    </div>

                    <div class="metadata-row">
                        <span class="metadata-label">Responsable</span>

                        <div class="assignee">
                            ${crearAvatarResponsable(tarea.responsable)}

                            <span>
                                ${valorSeguro(
                                    tarea.responsable?.nombre,
                                    'Sin asignar'
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="task-controls">
                <a
                    href="./tarea-detalle.html?id=${tarea.id}"
                    class="task-detail-button"
                >
                    Ver detalle
                </a>

                <select
                    class="status-select"
                    data-task-id="${tarea.id}"
                    aria-label="Cambiar estado de la tarea"
                >
                    ${opcionesEstado.map(estado => `
                        <option
                            value="${estado}"
                            ${estado === tarea.estado ? 'selected' : ''}
                        >
                            ${estado}
                        </option>
                    `).join('')}
                </select>
            </div>
        </article>
    `;
};

const renderizarColumna = (
    tareasColumna,
    contenedorId,
    contadorId,
    emptyId
) => {
    const contenedor = document.getElementById(contenedorId);
    const contador = document.getElementById(contadorId);
    const empty = document.getElementById(emptyId);

    contador.textContent = tareasColumna.length;

    if (tareasColumna.length === 0) {
        contenedor.innerHTML = '';
        contenedor.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    contenedor.classList.remove('hidden');

    contenedor.innerHTML = tareasColumna
        .map(crearTarjetaTarea)
        .join('');
};

const renderizarSecundarias = secundarias => {
    const card = document.getElementById('secondaryTasksCard');
    const lista = document.getElementById('secondaryTasks');
    const counter = document.getElementById('secondaryCounter');

    if (secundarias.length === 0) {
        card.classList.add('hidden');
        lista.innerHTML = '';
        return;
    }

    card.classList.remove('hidden');

    counter.textContent =
        `${secundarias.length} ${secundarias.length === 1 ? 'tarea' : 'tareas'}`;

    lista.innerHTML = secundarias.map(tarea => {
        const bloqueada = tarea.estado === 'Bloqueada';

        return `
            <article class="secondary-task">
                <div class="secondary-task-info">
                    <strong>
                        ${valorSeguro(tarea.titulo, 'Tarea')}
                    </strong>

                    <span>
                        ${valorSeguro(tarea.codigo)}
                        ·
                        ${valorSeguro(tarea.responsable?.nombre, 'Sin responsable')}
                    </span>
                </div>

                <span class="secondary-status ${bloqueada ? 'blocked' : 'cancelled'}">
                    ${tarea.estado}
                </span>

                <a
                    href="./tarea-detalle.html?id=${tarea.id}"
                    class="task-detail-button"
                >
                    Ver
                </a>
            </article>
        `;
    }).join('');
};

const actualizarResumen = () => {
    document.getElementById('pendingCount').textContent =
        tareas.filter(tarea => tarea.estado === 'Pendiente').length;

    document.getElementById('progressCount').textContent =
        tareas.filter(tarea => tarea.estado === 'En curso').length;

    document.getElementById('completedCount').textContent =
        tareas.filter(tarea => tarea.estado === 'Completada').length;

    document.getElementById('overdueCount').textContent =
        tareas.filter(estaVencida).length;
};

const renderizarKanban = () => {
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const kanbanBoard = document.getElementById('kanbanBoard');

    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    kanbanBoard.classList.remove('hidden');

    const pendientes = tareasFiltradas.filter(
        tarea => tarea.estado === 'Pendiente'
    );

    const enCurso = tareasFiltradas.filter(
        tarea => tarea.estado === 'En curso'
    );

    const completadas = tareasFiltradas.filter(
        tarea => tarea.estado === 'Completada'
    );

    const secundarias = tareasFiltradas.filter(
        tarea => ['Bloqueada', 'Cancelada'].includes(tarea.estado)
    );

    renderizarColumna(
        pendientes,
        'pendingTasks',
        'pendingCounter',
        'pendingEmpty'
    );

    renderizarColumna(
        enCurso,
        'progressTasks',
        'progressCounter',
        'progressEmpty'
    );

    renderizarColumna(
        completadas,
        'completedTasks',
        'completedCounter',
        'completedEmpty'
    );

    renderizarSecundarias(secundarias);

    configurarSelectoresEstado();
};

const cargarPrioridades = () => {
    const prioridades = tareas
        .map(tarea => tarea.prioridad)
        .filter(Boolean);

    const unicas = [...new Set(prioridades)]
        .sort((a, b) => a.localeCompare(b, 'es'));

    priorityFilter.innerHTML = `
        <option value="">Todas las prioridades</option>
    `;

    unicas.forEach(prioridad => {
        const option = document.createElement('option');

        option.value = prioridad;
        option.textContent = prioridad;

        priorityFilter.appendChild(option);
    });
};

const cargarResponsables = () => {
    responsibleFilter.innerHTML = `
        <option value="">Todos los responsables</option>
    `;

    responsables.forEach(responsable => {
        const option = document.createElement('option');

        option.value = responsable.id;
        option.textContent = responsable.nombre;

        responsibleFilter.appendChild(option);
    });
};

const aplicarFiltros = () => {
    const busqueda = limpiarTexto(searchInput.value);
    const prioridad = limpiarTexto(priorityFilter.value);
    const responsableId = responsibleFilter.value;
    const estado = statusFilter.value;

    tareasFiltradas = tareas.filter(tarea => {
        const texto = limpiarTexto([
            tarea.codigo,
            tarea.titulo,
            tarea.prioridad,
            tarea.estado,
            tarea.expediente?.codigo,
            tarea.expediente?.numero,
            tarea.expediente?.titulo,
            tarea.cliente?.nombre,
            tarea.responsable?.nombre
        ].join(' '));

        const coincideBusqueda =
            !busqueda ||
            texto.includes(busqueda);

        const coincidePrioridad =
            !prioridad ||
            limpiarTexto(tarea.prioridad) === prioridad;

        const coincideResponsable =
            !responsableId ||
            String(tarea.responsable?.id || '') === responsableId;

        const coincideEstado =
            !estado ||
            tarea.estado === estado;

        return (
            coincideBusqueda &&
            coincidePrioridad &&
            coincideResponsable &&
            coincideEstado
        );
    });

    renderizarKanban();
};

const limpiarFiltros = () => {
    searchInput.value = '';
    priorityFilter.value = '';
    responsibleFilter.value = '';
    statusFilter.value = '';

    tareasFiltradas = [...tareas];

    renderizarKanban();
};

const cambiarEstadoTarea = async (idTarea, nuevoEstado, select) => {
    const sesion = obtenerSesion();

    if (!sesion) return;

    const tarea = tareas.find(
        item => Number(item.id) === Number(idTarea)
    );

    if (!tarea) return;

    const estadoAnterior = tarea.estado;

    try {
        select.disabled = true;

        const respuesta = await fetch(
            `${API_URL}/tareas/${idTarea}/estado`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sesion.token}`
                },
                body: JSON.stringify({
                    estado: nuevoEstado
                })
            }
        );

        if (respuesta.status === 401 || respuesta.status === 403) {
            cerrarSesion();
            return;
        }

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                'No se pudo actualizar la tarea.'
            );
        }

        tarea.estado = nuevoEstado;
        tarea.fechaCierre = datos.tarea?.fechaCierre || null;

        actualizarResumen();
        aplicarFiltros();
    } catch (error) {
        console.error('Error al cambiar estado:', error);

        tarea.estado = estadoAnterior;
        select.value = estadoAnterior;

        alert(
            error.message ||
            'No se pudo actualizar el estado de la tarea.'
        );
    } finally {
        select.disabled = false;
    }
};

const configurarSelectoresEstado = () => {
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', () => {
            cambiarEstadoTarea(
                select.dataset.taskId,
                select.value,
                select
            );
        });
    });
};

const mostrarError = mensaje => {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('kanbanBoard').classList.add('hidden');
    document.getElementById('secondaryTasksCard').classList.add('hidden');

    document.getElementById('errorState').classList.remove('hidden');
    document.getElementById('errorMessage').textContent = mensaje;
};

const cargarDatos = async () => {
    const sesion = obtenerSesion();

    if (!sesion) return;

    try {
        const [
            respuestaTareas,
            respuestaCatalogos
        ] = await Promise.all([
            fetch(`${API_URL}/tareas`, {
                headers: {
                    Authorization: `Bearer ${sesion.token}`
                }
            }),

            fetch(`${API_URL}/tareas/catalogos`, {
                headers: {
                    Authorization: `Bearer ${sesion.token}`
                }
            })
        ]);

        if (
            respuestaTareas.status === 401 ||
            respuestaTareas.status === 403 ||
            respuestaCatalogos.status === 401 ||
            respuestaCatalogos.status === 403
        ) {
            cerrarSesion();
            return;
        }

        const datosTareas = await respuestaTareas.json();
        const datosCatalogos = await respuestaCatalogos.json();

        if (!respuestaTareas.ok) {
            throw new Error(
                datosTareas.mensaje ||
                'No se pudieron obtener las tareas.'
            );
        }

        if (!respuestaCatalogos.ok) {
            throw new Error(
                datosCatalogos.mensaje ||
                'No se pudieron obtener los catálogos.'
            );
        }

        tareas = Array.isArray(datosTareas.tareas)
            ? datosTareas.tareas
            : [];

        responsables = Array.isArray(datosCatalogos.responsables)
            ? datosCatalogos.responsables
            : [];

        tareasFiltradas = [...tareas];

        actualizarResumen();
        cargarPrioridades();
        cargarResponsables();

        const parametros = new URLSearchParams(window.location.search);
        const busquedaInicial = parametros.get('q');

        if (busquedaInicial) {
            searchInput.value = busquedaInicial;
            aplicarFiltros();
            return;
        }

        renderizarKanban();
    } catch (error) {
        console.error('Error al cargar tareas:', error);

        mostrarError(
            error.message ||
            'No se pudo cargar la información de tareas.'
        );
    }
};

const configurarEventos = () => {
    const sidebar = document.getElementById('sidebar');
    const mobileMenu = document.getElementById('mobileMenu');

    searchInput.addEventListener('input', aplicarFiltros);
    priorityFilter.addEventListener('change', aplicarFiltros);
    responsibleFilter.addEventListener('change', aplicarFiltros);
    statusFilter.addEventListener('change', aplicarFiltros);
    clearFilters.addEventListener('click', limpiarFiltros);

    globalSearch.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;

        searchInput.value = globalSearch.value.trim();
        aplicarFiltros();
        searchInput.focus();
    });

    document.getElementById('logoutButton').addEventListener(
        'click',
        cerrarSesion
    );

    mobileMenu.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    document.addEventListener('click', event => {
        if (window.innerWidth > 850) return;

        if (
            sidebar.classList.contains('open') &&
            !sidebar.contains(event.target) &&
            event.target !== mobileMenu
        ) {
            sidebar.classList.remove('open');
        }
    });
};

const iniciarPagina = () => {
    const sesion = obtenerSesion();

    if (!sesion) return;

    mostrarUsuario(sesion.usuario);
    configurarEventos();
    cargarDatos();
};

iniciarPagina();