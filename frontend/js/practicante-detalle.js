const API_URL = 'http://localhost:3000/api';

let practicanteActual = null;

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

const valorSeguro = (valor, alternativo = '—') => {
    if (valor === null || valor === undefined || valor === '') {
        return alternativo;
    }

    return valor;
};

const obtenerIniciales = nombre => {
    if (!nombre) return 'PR';

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

const obtenerFecha = fecha => {
    if (!fecha) return null;

    return new Date(`${String(fecha).substring(0, 10)}T00:00:00`);
};

const formatearFecha = fecha => {
    const objeto = obtenerFecha(fecha);

    if (!objeto || Number.isNaN(objeto.getTime())) {
        return '—';
    }

    return new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(objeto);
};

const formatearHora = hora => {
    if (!hora) return '—';

    return String(hora).substring(0, 5);
};

const obtenerClaseTarea = estado => {
    if (estado === 'Pendiente') return 'pending';
    if (estado === 'En curso') return 'progress';
    if (estado === 'Completada') return 'completed';
    if (estado === 'Bloqueada') return 'blocked';
    if (estado === 'Cancelada') return 'cancelled';

    return 'pending';
};

const mostrarPerfil = practicante => {
    document.getElementById('breadcrumbName').textContent =
        valorSeguro(practicante.nombre, 'Detalle');

    document.getElementById('profileName').textContent =
        valorSeguro(practicante.nombre);

    document.getElementById('profileMatter').textContent =
        valorSeguro(practicante.materia?.nombre, 'Sin materia asignada');

    const avatar = document.getElementById('profileAvatar');

    if (practicante.fotoUrl) {
        avatar.innerHTML = `
            <img src="${practicante.fotoUrl}" alt="${practicante.nombre}" onerror="this.style.display='none'; this.parentElement.textContent='${obtenerIniciales(practicante.nombre)}';">
        `;
    } else {
        avatar.textContent = obtenerIniciales(practicante.nombre);
    }

    const estado = document.getElementById('profileStatus');

    estado.textContent = practicante.activo ? 'Activo' : 'Inactivo';
    estado.className = `status-badge ${practicante.activo ? 'status-active' : 'status-inactive'}`;

    document.getElementById('infoName').textContent =
        valorSeguro(practicante.nombre);

    document.getElementById('infoMatter').textContent =
        valorSeguro(practicante.materia?.nombre);

    document.getElementById('infoEmail').textContent =
        valorSeguro(practicante.correo);

    document.getElementById('infoPhone').textContent =
        valorSeguro(practicante.telefono);

    document.getElementById('infoDocument').textContent =
        valorSeguro(practicante.numeroDocumento);

    document.getElementById('infoAddress').textContent =
        valorSeguro(practicante.direccion);

    document.getElementById('infoStatus').textContent =
        practicante.activo ? 'Activo' : 'Inactivo';

    const expedientes = Array.isArray(practicante.expedientes)
        ? practicante.expedientes
        : [];

    const tareas = Array.isArray(practicante.tareas)
        ? practicante.tareas
        : [];

    const disponibilidad = Array.isArray(practicante.disponibilidad)
        ? practicante.disponibilidad
        : [];

    document.getElementById('summaryCases').textContent =
        expedientes.length;

    document.getElementById('summaryPending').textContent =
        tareas.filter(item => item.estado === 'Pendiente').length;

    document.getElementById('summaryProgress').textContent =
        tareas.filter(item => item.estado === 'En curso').length;

    document.getElementById('summaryAvailability').textContent =
        disponibilidad.filter(item => item.disponible !== false).length;
};

const renderizarExpedientes = expedientes => {
    const registros = Array.isArray(expedientes)
        ? expedientes
        : [];

    const tbody = document.getElementById('casesTableBody');
    const container = document.getElementById('casesTableContainer');
    const empty = document.getElementById('casesEmpty');

    document.getElementById('casesCounter').textContent =
        registros.length;

    if (registros.length === 0) {
        tbody.innerHTML = '';
        container.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    container.classList.remove('hidden');

    tbody.innerHTML = registros.map(item => {
        return `
            <tr>
                <td>
                    <span class="entity-primary">${valorSeguro(item.codigo)}</span>
                    <span class="entity-secondary">${valorSeguro(item.numero, 'Sin número')}</span>
                </td>

                <td>${valorSeguro(item.cliente?.nombre)}</td>

                <td>${valorSeguro(item.materia)}</td>

                <td>
                    <span class="table-status">
                        ${valorSeguro(item.estado)}
                    </span>
                </td>

                <td>
                    <span class="entity-primary">${valorSeguro(item.proximoHito)}</span>
                    <span class="entity-secondary">${formatearFecha(item.fechaHito)}</span>
                </td>

                <td>
                    <a href="./expediente-detalle.html?id=${item.id}" class="table-action">
                        Ver detalle
                    </a>
                </td>
            </tr>
        `;
    }).join('');
};

const renderizarDisponibilidad = disponibilidad => {
    const registros = Array.isArray(disponibilidad)
        ? disponibilidad
        : [];

    const lista = document.getElementById('availabilityList');
    const empty = document.getElementById('availabilityEmpty');

    document.getElementById('availabilityCounter').textContent =
        registros.length;

    if (registros.length === 0) {
        lista.innerHTML = '';
        lista.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    lista.classList.remove('hidden');

    lista.innerHTML = registros.slice(0, 8).map(item => {
        const disponible = item.disponible !== false;

        return `
            <article class="availability-item">
                <div class="availability-top">
                    <strong>${formatearFecha(item.fecha)}</strong>

                    <span class="availability-status ${disponible ? 'available' : 'busy'}">
                        ${disponible ? 'Disponible' : 'Ocupado'}
                    </span>
                </div>

                <p>
                    ${formatearHora(item.horaInicio)}
                    -
                    ${formatearHora(item.horaFin)}
                    ${item.motivo ? ` · ${item.motivo}` : ''}
                </p>
            </article>
        `;
    }).join('');
};

const renderizarTareas = tareas => {
    const registros = Array.isArray(tareas)
        ? tareas
        : [];

    const lista = document.getElementById('tasksList');
    const empty = document.getElementById('tasksEmpty');

    document.getElementById('tasksCounter').textContent =
        registros.length;

    if (registros.length === 0) {
        lista.innerHTML = '';
        lista.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    lista.classList.remove('hidden');

    lista.innerHTML = registros.slice(0, 8).map(item => {
        return `
            <article class="task-item">
                <div class="task-top">
                    <strong>${valorSeguro(item.titulo, 'Tarea')}</strong>

                    <span class="task-status ${obtenerClaseTarea(item.estado)}">
                        ${valorSeguro(item.estado)}
                    </span>
                </div>

                <p>
                    ${valorSeguro(item.codigo)}
                    ·
                    ${valorSeguro(item.expediente?.codigo, 'Sin expediente')}
                </p>

                <div class="task-footer">
                    <span>
                        Límite: ${formatearFecha(item.fechaLimite)}
                    </span>

                    <a href="./tarea-detalle.html?id=${item.id}">
                        Ver tarea
                    </a>
                </div>
            </article>
        `;
    }).join('');
};

const mostrarError = mensaje => {
    document.getElementById('detailBody').classList.add('hidden');
    document.getElementById('detailError').classList.remove('hidden');
    document.getElementById('detailErrorMessage').textContent = mensaje;
};

const cargarPracticante = async () => {
    const sesion = obtenerSesion();

    if (!sesion) return;

    const parametros = new URLSearchParams(window.location.search);
    const idPracticante = parametros.get('id');

    if (!idPracticante) {
        mostrarError('No se indicó qué practicante se desea consultar.');
        return;
    }

    try {
        const respuesta = await fetch(
            `${API_URL}/practicantes/${idPracticante}`,
            {
                headers: {
                    Authorization: `Bearer ${sesion.token}`
                }
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
                'No se pudo obtener el practicante.'
            );
        }

        practicanteActual = datos.practicante;

        mostrarPerfil(practicanteActual);
        renderizarExpedientes(practicanteActual.expedientes);
        renderizarDisponibilidad(practicanteActual.disponibilidad);
        renderizarTareas(practicanteActual.tareas);

        document.getElementById('detailError').classList.add('hidden');
        document.getElementById('detailBody').classList.remove('hidden');
    } catch (error) {
        console.error('Error al cargar practicante:', error);

        mostrarError(
            error.message ||
            'No se pudo cargar la información del practicante.'
        );
    }
};

const configurarEventos = () => {
    const sidebar = document.getElementById('sidebar');
    const mobileMenu = document.getElementById('mobileMenu');
    const globalSearch = document.getElementById('globalSearch');

    document.getElementById('logoutButton').addEventListener(
        'click',
        cerrarSesion
    );

    globalSearch.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;

        const termino = globalSearch.value.trim();

        if (!termino) return;

        window.location.href =
            `./practicantes.html?q=${encodeURIComponent(termino)}`;
    });

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
    cargarPracticante();
};

iniciarPagina();