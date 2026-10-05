const API_URL = 'http://localhost:3000/api';

let audiencias = [];
let audienciasFiltradas = [];
let disponibilidad = [];
let fechaCalendario = new Date();

const searchInput = document.getElementById('searchInput');
const globalSearch = document.getElementById('globalSearch');
const statusFilter = document.getElementById('statusFilter');
const modalityFilter = document.getElementById('modalityFilter');
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

const mostrarUsuario = usuario => {
    const nombre = usuario.nombre || usuario.nombreCompleto || 'Usuario';

    document.getElementById('userName').textContent = nombre;
    document.getElementById('userRole').textContent = usuario.rol || 'USUARIO';
    document.getElementById('userAvatar').textContent = obtenerIniciales(nombre);
};

const limpiarTexto = valor => {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
};

const formatearHora = hora => {
    if (!hora) return '—';
    return String(hora).substring(0, 5);
};

const obtenerFechaLocal = fecha => {
    if (!fecha) return null;

    return new Date(`${String(fecha).substring(0, 10)}T00:00:00`);
};

const mismaFecha = (fechaA, fechaB) => {
    return (
        fechaA.getFullYear() === fechaB.getFullYear() &&
        fechaA.getMonth() === fechaB.getMonth() &&
        fechaA.getDate() === fechaB.getDate()
    );
};

const obtenerClaseEstado = estado => {
    const valor = limpiarTexto(estado);

    if (valor === 'programada') return 'status-programmed';
    if (valor === 'realizada') return 'status-completed';
    if (valor === 'reprogramada') return 'status-rescheduled';
    if (valor === 'cancelada') return 'status-cancelled';

    return 'status-programmed';
};

const actualizarResumen = () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const dentroDeSieteDias = new Date(hoy);
    dentroDeSieteDias.setDate(hoy.getDate() + 7);

    const programadas = audiencias.filter(audiencia => {
        return limpiarTexto(audiencia.estado) === 'programada';
    }).length;

    const hoyCantidad = audiencias.filter(audiencia => {
        const fecha = obtenerFechaLocal(audiencia.fecha);
        return fecha && mismaFecha(fecha, hoy);
    }).length;

    const semanaCantidad = audiencias.filter(audiencia => {
        const fecha = obtenerFechaLocal(audiencia.fecha);

        return fecha &&
            fecha >= hoy &&
            fecha <= dentroDeSieteDias;
    }).length;

    const disponibles = disponibilidad.filter(item => {
        return item.disponible !== false;
    }).length;

    document.getElementById('scheduledHearings').textContent = programadas;
    document.getElementById('todayHearings').textContent = hoyCantidad;
    document.getElementById('weekHearings').textContent = semanaCantidad;
    document.getElementById('availableSlots').textContent = disponibles;
};

const obtenerAudienciasFecha = fecha => {
    return audienciasFiltradas.filter(audiencia => {
        const fechaAudiencia = obtenerFechaLocal(audiencia.fecha);

        return fechaAudiencia && mismaFecha(fechaAudiencia, fecha);
    });
};

const crearEventoCalendario = audiencia => {
    const modalidad = limpiarTexto(audiencia.modalidad);
    const estado = limpiarTexto(audiencia.estado);

    let clase = 'calendar-event';

    if (modalidad === 'virtual') {
        clase += ' virtual';
    }

    if (estado === 'cancelada') {
        clase += ' cancelled';
    }

    return `
        <a href="./audiencia-detalle.html?id=${audiencia.id}" class="${clase}">
            ${formatearHora(audiencia.horaInicio)} ${audiencia.titulo || 'Audiencia'}
        </a>
    `;
};

const renderizarCalendario = () => {
    const calendarGrid = document.getElementById('calendarGrid');
    const calendarTitle = document.getElementById('calendarTitle');

    const anio = fechaCalendario.getFullYear();
    const mes = fechaCalendario.getMonth();

    calendarTitle.textContent = new Intl.DateTimeFormat('es-PE', {
        month: 'long',
        year: 'numeric'
    }).format(new Date(anio, mes, 1));

    const primerDiaMes = new Date(anio, mes, 1);
    const ultimoDiaMes = new Date(anio, mes + 1, 0);

    let diaSemanaInicio = primerDiaMes.getDay();

    if (diaSemanaInicio === 0) {
        diaSemanaInicio = 7;
    }

    const fechaInicio = new Date(anio, mes, 1 - (diaSemanaInicio - 1));

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let html = '';

    for (let i = 0; i < 42; i++) {
        const fecha = new Date(fechaInicio);
        fecha.setDate(fechaInicio.getDate() + i);

        const esMesActual = fecha.getMonth() === mes;
        const esHoy = mismaFecha(fecha, hoy);

        const audienciasDia = obtenerAudienciasFecha(fecha);

        const clases = [
            'calendar-day',
            !esMesActual ? 'outside' : '',
            esHoy ? 'today' : ''
        ].filter(Boolean).join(' ');

        const eventosVisibles = audienciasDia.slice(0, 2);
        const restantes = audienciasDia.length - eventosVisibles.length;

        html += `
            <div class="${clases}">
                <span class="day-number">${fecha.getDate()}</span>

                <div class="day-events">
                    ${eventosVisibles.map(crearEventoCalendario).join('')}

                    ${restantes > 0
                        ? `<span class="more-events">+${restantes} más</span>`
                        : ''
                    }
                </div>
            </div>
        `;
    }

    calendarGrid.innerHTML = html;
};

const renderizarProximasAudiencias = () => {
    const lista = document.getElementById('upcomingList');
    const empty = document.getElementById('upcomingEmpty');
    const counter = document.getElementById('upcomingCounter');

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const proximas = audienciasFiltradas
        .filter(audiencia => {
            const fecha = obtenerFechaLocal(audiencia.fecha);

            return fecha && fecha >= hoy;
        })
        .sort((a, b) => {
            return obtenerFechaLocal(a.fecha) - obtenerFechaLocal(b.fecha);
        })
        .slice(0, 5);

    counter.textContent = proximas.length;

    if (proximas.length === 0) {
        lista.innerHTML = '';
        lista.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    lista.classList.remove('hidden');

    lista.innerHTML = proximas.map(audiencia => {
        const fecha = obtenerFechaLocal(audiencia.fecha);

        const dia = String(fecha.getDate()).padStart(2, '0');

        const mes = new Intl.DateTimeFormat('es-PE', {
            month: 'short'
        }).format(fecha).replace('.', '');

        return `
            <article class="upcoming-item">
                <div class="upcoming-date">
                    <strong>${dia}</strong>
                    <span>${mes}</span>
                </div>

                <div class="upcoming-info">
                    <h4>${audiencia.titulo || 'Audiencia'}</h4>
                    <p>
                        ${formatearHora(audiencia.horaInicio)}
                        ·
                        ${audiencia.cliente?.nombre || 'Cliente no registrado'}
                    </p>

                    <a href="./audiencia-detalle.html?id=${audiencia.id}">
                        Ver detalle
                    </a>
                </div>
            </article>
        `;
    }).join('');
};

const renderizarDisponibilidad = () => {
    const lista = document.getElementById('availabilityList');
    const empty = document.getElementById('availabilityEmpty');

    const registros = disponibilidad.slice(0, 6);

    if (registros.length === 0) {
        lista.innerHTML = '';
        lista.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    lista.classList.remove('hidden');

    lista.innerHTML = registros.map(item => {
        const disponible = item.disponible !== false;

        const avatar = item.fotoUrl
            ? `
                <div class="availability-avatar">
                    <img src="${item.fotoUrl}" alt="${item.persona}" onerror="this.style.display='none'; this.parentElement.textContent='${obtenerIniciales(item.persona)}';">
                </div>
            `
            : `
                <div class="availability-avatar">
                    ${obtenerIniciales(item.persona)}
                </div>
            `;

        return `
            <div class="availability-item">
                ${avatar}

                <div class="availability-info">
                    <strong>${item.persona || 'Profesional'}</strong>
                    <span>
                        ${formatearHora(item.horaInicio)}
                        -
                        ${formatearHora(item.horaFin)}
                    </span>
                </div>

                <span class="availability-state ${disponible ? 'available' : 'busy'}">
                    ${disponible ? 'Disponible' : 'Ocupado'}
                </span>
            </div>
        `;
    }).join('');
};

const crearFilaAudiencia = audiencia => {
    const fecha = obtenerFechaLocal(audiencia.fecha);

    const fechaTexto = fecha
        ? new Intl.DateTimeFormat('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(fecha)
        : '—';

    return `
        <tr>
            <td>
                <div class="date-cell">
                    <strong>${fechaTexto}</strong>
                    <span>
                        ${formatearHora(audiencia.horaInicio)}
                        -
                        ${formatearHora(audiencia.horaFin)}
                    </span>
                </div>
            </td>

            <td>
                <span class="hearing-title">
                    ${audiencia.titulo || 'Audiencia'}
                </span>

                <span class="hearing-subtitle">
                    ${audiencia.tipo || 'Tipo no registrado'}
                </span>
            </td>

            <td>
                <span class="entity-name">
                    ${audiencia.expediente?.codigo || '—'}
                </span>

                <span class="entity-secondary">
                    ${audiencia.expediente?.numero || 'Sin número'}
                </span>
            </td>

            <td>
                <span class="entity-name">
                    ${audiencia.cliente?.nombre || '—'}
                </span>
            </td>

            <td>
                <span class="entity-name">
                    ${audiencia.responsable?.nombre || '—'}
                </span>
            </td>

            <td>
                <span class="modality-badge">
                    ${audiencia.modalidad || '—'}
                </span>
            </td>

            <td>
                <span class="status-badge ${obtenerClaseEstado(audiencia.estado)}">
                    ${audiencia.estado || '—'}
                </span>
            </td>

            <td>
                <a href="./audiencia-detalle.html?id=${audiencia.id}" class="view-button">
                    Ver detalle
                </a>
            </td>
        </tr>
    `;
};

const renderizarTabla = () => {
    const tbody = document.getElementById('hearingsTableBody');
    const tableContainer = document.getElementById('tableContainer');
    const emptyState = document.getElementById('emptyState');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');

    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');

    document.getElementById('hearingCounter').textContent =
        `${audienciasFiltradas.length} ${audienciasFiltradas.length === 1 ? 'audiencia encontrada' : 'audiencias encontradas'}`;

    if (audienciasFiltradas.length === 0) {
        tbody.innerHTML = '';
        tableContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    tableContainer.classList.remove('hidden');

    tbody.innerHTML = audienciasFiltradas
        .map(crearFilaAudiencia)
        .join('');
};

const renderizarTodo = () => {
    actualizarResumen();
    renderizarCalendario();
    renderizarProximasAudiencias();
    renderizarDisponibilidad();
    renderizarTabla();
};

const aplicarFiltros = () => {
    const busqueda = limpiarTexto(searchInput.value);
    const estado = limpiarTexto(statusFilter.value);
    const modalidad = limpiarTexto(modalityFilter.value);

    audienciasFiltradas = audiencias.filter(audiencia => {
        const texto = limpiarTexto([
            audiencia.codigo,
            audiencia.titulo,
            audiencia.tipo,
            audiencia.modalidad,
            audiencia.ubicacion,
            audiencia.juzgadoSala,
            audiencia.estado,
            audiencia.expediente?.codigo,
            audiencia.expediente?.numero,
            audiencia.expediente?.titulo,
            audiencia.cliente?.nombre,
            audiencia.responsable?.nombre
        ].join(' '));

        const coincideBusqueda =
            !busqueda ||
            texto.includes(busqueda);

        const coincideEstado =
            !estado ||
            limpiarTexto(audiencia.estado) === estado;

        const coincideModalidad =
            !modalidad ||
            limpiarTexto(audiencia.modalidad) === modalidad;

        return coincideBusqueda && coincideEstado && coincideModalidad;
    });

    renderizarTodo();
};

const limpiarFiltros = () => {
    searchInput.value = '';
    statusFilter.value = '';
    modalityFilter.value = '';

    audienciasFiltradas = [...audiencias];

    renderizarTodo();
};

const mostrarError = mensaje => {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('tableContainer').classList.add('hidden');
    document.getElementById('emptyState').classList.add('hidden');

    document.getElementById('errorState').classList.remove('hidden');
    document.getElementById('errorMessage').textContent = mensaje;
};

const cargarAgenda = async () => {
    const sesion = obtenerSesion();

    if (!sesion) return;

    try {
        const [respuestaAudiencias, respuestaDisponibilidad] =
            await Promise.all([
                fetch(`${API_URL}/agenda/audiencias`, {
                    headers: {
                        Authorization: `Bearer ${sesion.token}`
                    }
                }),
                fetch(`${API_URL}/agenda/disponibilidad`, {
                    headers: {
                        Authorization: `Bearer ${sesion.token}`
                    }
                })
            ]);

        if (
            respuestaAudiencias.status === 401 ||
            respuestaAudiencias.status === 403 ||
            respuestaDisponibilidad.status === 401 ||
            respuestaDisponibilidad.status === 403
        ) {
            cerrarSesion();
            return;
        }

        const datosAudiencias = await respuestaAudiencias.json();
        const datosDisponibilidad = await respuestaDisponibilidad.json();

        if (!respuestaAudiencias.ok) {
            throw new Error(
                datosAudiencias.mensaje ||
                'No se pudieron obtener las audiencias.'
            );
        }

        if (!respuestaDisponibilidad.ok) {
            throw new Error(
                datosDisponibilidad.mensaje ||
                'No se pudo obtener la disponibilidad.'
            );
        }

        audiencias = Array.isArray(datosAudiencias.audiencias)
            ? datosAudiencias.audiencias
            : [];

        disponibilidad = Array.isArray(datosDisponibilidad.disponibilidad)
            ? datosDisponibilidad.disponibilidad
            : [];

        audienciasFiltradas = [...audiencias];

        renderizarTodo();
    } catch (error) {
        console.error('Error al cargar agenda:', error);

        mostrarError(
            error.message || 'No se pudo cargar la agenda.'
        );
    }
};

const configurarEventos = () => {
    const sidebar = document.getElementById('sidebar');
    const mobileMenu = document.getElementById('mobileMenu');

    searchInput.addEventListener('input', aplicarFiltros);
    statusFilter.addEventListener('change', aplicarFiltros);
    modalityFilter.addEventListener('change', aplicarFiltros);
    clearFilters.addEventListener('click', limpiarFiltros);

    document.getElementById('previousMonth').addEventListener('click', () => {
        fechaCalendario.setMonth(fechaCalendario.getMonth() - 1);
        renderizarCalendario();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        fechaCalendario.setMonth(fechaCalendario.getMonth() + 1);
        renderizarCalendario();
    });

    document.getElementById('todayButton').addEventListener('click', () => {
        fechaCalendario = new Date();
        renderizarCalendario();
    });

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
    cargarAgenda();
};

iniciarPagina();