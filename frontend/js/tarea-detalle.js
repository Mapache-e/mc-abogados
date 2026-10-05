const API_URL = 'http://localhost:3000/api';

let tareaActual = null;

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

const obtenerClaseEstado = estado => {
    if (estado === 'Pendiente') return 'status-pending';
    if (estado === 'En curso') return 'status-progress';
    if (estado === 'Completada') return 'status-completed';
    if (estado === 'Bloqueada') return 'status-blocked';
    if (estado === 'Cancelada') return 'status-cancelled';

    return 'status-pending';
};

const mostrarInformacion = tarea => {
    document.getElementById('breadcrumbTask').textContent =
        valorSeguro(tarea.codigo, 'Detalle de tarea');

    document.getElementById('taskTitle').textContent =
        valorSeguro(tarea.titulo, 'Tarea');

    document.getElementById('taskCode').textContent =
        valorSeguro(tarea.codigo);

    document.getElementById('taskPriority').textContent =
        valorSeguro(tarea.prioridad);

    const status = document.getElementById('taskStatus');

    status.textContent = valorSeguro(tarea.estado);
    status.className = `status-badge ${obtenerClaseEstado(tarea.estado)}`;

    document.getElementById('statusSelect').value =
        tarea.estado || 'Pendiente';

    document.getElementById('summaryAssigned').textContent =
        formatearFecha(tarea.fechaAsignacion);

    document.getElementById('summaryDeadline').textContent =
        formatearFecha(tarea.fechaLimite);

    document.getElementById('summaryPriority').textContent =
        valorSeguro(tarea.prioridad);

    document.getElementById('summaryReview').textContent =
        tarea.requiereRevisionAbogado ? 'Sí' : 'No';

    document.getElementById('infoStatus').textContent =
        valorSeguro(tarea.estado);

    document.getElementById('infoPriority').textContent =
        valorSeguro(tarea.prioridad);

    document.getElementById('infoAssigned').textContent =
        formatearFecha(tarea.fechaAsignacion);

    document.getElementById('infoDeadline').textContent =
        formatearFecha(tarea.fechaLimite);

    document.getElementById('infoClosed').textContent =
        formatearFecha(tarea.fechaCierre);

    document.getElementById('infoSecondControl').textContent =
        valorSeguro(tarea.segundoControl);

    document.getElementById('infoObservations').textContent =
        valorSeguro(
            tarea.observaciones,
            'Sin observaciones registradas.'
        );

    mostrarEvidencia(tarea.evidencia);
    mostrarRevision(tarea.requiereRevisionAbogado);
};

const mostrarEvidencia = evidencia => {
    const link = document.getElementById('evidenceLink');
    const empty = document.getElementById('evidenceEmpty');

    if (!evidencia) {
        link.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    link.href = evidencia;
    link.classList.remove('hidden');
    empty.classList.add('hidden');
};

const mostrarRevision = requerida => {
    const title = document.getElementById('reviewTitle');
    const text = document.getElementById('reviewText');

    if (requerida) {
        title.textContent = 'Revisión requerida';
        text.textContent = 'Esta tarea requiere revisión de un abogado antes de considerarse finalizada.';
        return;
    }

    title.textContent = 'Revisión no requerida';
    text.textContent = 'Esta tarea no requiere revisión adicional de un abogado.';
};

const mostrarExpediente = expediente => {
    if (!expediente) return;

    document.getElementById('caseCode').textContent =
        valorSeguro(expediente.codigo);

    document.getElementById('caseTitle').textContent =
        valorSeguro(expediente.titulo, 'Expediente legal');

    document.getElementById('caseNumber').textContent =
        valorSeguro(expediente.numero);

    document.getElementById('caseStatus').textContent =
        valorSeguro(expediente.estado);

    document.getElementById('caseMilestone').textContent =
        valorSeguro(expediente.proximoHito);

    document.getElementById('caseMilestoneDate').textContent =
        formatearFecha(expediente.fechaHito);

    if (expediente.id) {
        document.getElementById('caseDetailButton').href =
            `./expediente-detalle.html?id=${expediente.id}`;
    }
};

const mostrarResponsable = responsable => {
    if (!responsable) return;

    document.getElementById('responsibleName').textContent =
        valorSeguro(responsable.nombre);

    document.getElementById('responsibleEmail').textContent =
        valorSeguro(responsable.correo);

    document.getElementById('responsiblePhone').textContent =
        valorSeguro(responsable.telefono);

    document.getElementById('responsibleAvatar').textContent =
        obtenerIniciales(responsable.nombre);
};

const mostrarCliente = cliente => {
    if (!cliente) return;

    document.getElementById('clientName').textContent =
        valorSeguro(cliente.nombre);

    document.getElementById('clientEmail').textContent =
        valorSeguro(cliente.correo);

    document.getElementById('clientPhone').textContent =
        valorSeguro(cliente.telefono);

    document.getElementById('clientAvatar').textContent =
        obtenerIniciales(cliente.nombre);

    if (cliente.id) {
        document.getElementById('clientDetailButton').href =
            `./cliente-detalle.html?id=${cliente.id}`;
    }
};

const cambiarEstado = async nuevoEstado => {
    const sesion = obtenerSesion();

    if (!sesion || !tareaActual) return;

    const select = document.getElementById('statusSelect');
    const estadoAnterior = tareaActual.estado;

    try {
        select.disabled = true;

        const respuesta = await fetch(
            `${API_URL}/tareas/${tareaActual.id}/estado`,
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

        tareaActual.estado = nuevoEstado;
        tareaActual.fechaCierre = datos.tarea?.fechaCierre || null;

        mostrarInformacion(tareaActual);
    } catch (error) {
        console.error('Error al cambiar estado:', error);

        select.value = estadoAnterior;

        alert(
            error.message ||
            'No se pudo actualizar el estado de la tarea.'
        );
    } finally {
        select.disabled = false;
    }
};

const mostrarError = mensaje => {
    document.getElementById('detailBody').classList.add('hidden');
    document.getElementById('detailError').classList.remove('hidden');
    document.getElementById('detailErrorMessage').textContent = mensaje;
};

const cargarTarea = async () => {
    const sesion = obtenerSesion();

    if (!sesion) return;

    const parametros = new URLSearchParams(window.location.search);
    const idTarea = parametros.get('id');

    if (!idTarea) {
        mostrarError('No se indicó qué tarea se desea consultar.');
        return;
    }

    try {
        const respuesta = await fetch(
            `${API_URL}/tareas/${idTarea}`,
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
                'No se pudo obtener la tarea.'
            );
        }

        tareaActual = datos.tarea;

        mostrarInformacion(tareaActual);
        mostrarExpediente(tareaActual.expediente);
        mostrarResponsable(tareaActual.responsable);
        mostrarCliente(tareaActual.cliente);

        document.getElementById('detailError').classList.add('hidden');
        document.getElementById('detailBody').classList.remove('hidden');
    } catch (error) {
        console.error('Error al cargar tarea:', error);

        mostrarError(
            error.message ||
            'No se pudo cargar la información de la tarea.'
        );
    }
};

const configurarEventos = () => {
    const sidebar = document.getElementById('sidebar');
    const mobileMenu = document.getElementById('mobileMenu');
    const globalSearch = document.getElementById('globalSearch');
    const statusSelect = document.getElementById('statusSelect');

    document.getElementById('logoutButton').addEventListener(
        'click',
        cerrarSesion
    );

    statusSelect.addEventListener('change', () => {
        cambiarEstado(statusSelect.value);
    });

    mobileMenu.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    globalSearch.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;

        const termino = globalSearch.value.trim();

        if (!termino) return;

        window.location.href =
            `./tareas.html?q=${encodeURIComponent(termino)}`;
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
    cargarTarea();
};

iniciarPagina();