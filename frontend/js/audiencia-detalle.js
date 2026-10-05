const API_URL = 'http://localhost:3000/api';

let audienciaActual = null;

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
    const fechaObjeto = obtenerFecha(fecha);

    if (!fechaObjeto || Number.isNaN(fechaObjeto.getTime())) {
        return '—';
    }

    return new Intl.DateTimeFormat('es-PE', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }).format(fechaObjeto);
};

const formatearHora = hora => {
    if (!hora) return '—';

    return String(hora).substring(0, 5);
};

const obtenerClaseEstado = estado => {
    const valor = String(estado || '').toLowerCase();

    if (valor === 'programada') return 'status-programmed';
    if (valor === 'realizada') return 'status-completed';
    if (valor === 'reprogramada') return 'status-rescheduled';
    if (valor === 'cancelada') return 'status-cancelled';

    return 'status-programmed';
};

const mostrarInformacionPrincipal = audiencia => {
    document.getElementById('breadcrumbCode').textContent =
        valorSeguro(audiencia.codigo, 'Detalle de audiencia');

    document.getElementById('audienceTitle').textContent =
        valorSeguro(audiencia.titulo, 'Audiencia');

    document.getElementById('audienceCode').textContent =
        valorSeguro(audiencia.codigo);

    document.getElementById('audienceType').textContent =
        valorSeguro(audiencia.tipo);

    document.getElementById('audienceModality').textContent =
        valorSeguro(audiencia.modalidad);

    const estado = document.getElementById('audienceStatus');

    estado.textContent = valorSeguro(audiencia.estado, 'Programada');
    estado.className = `status-badge ${obtenerClaseEstado(audiencia.estado)}`;

    const horario =
        `${formatearHora(audiencia.horaInicio)} - ${formatearHora(audiencia.horaFin)}`;

    document.getElementById('summaryDate').textContent =
        formatearFecha(audiencia.fecha);

    document.getElementById('summaryTime').textContent =
        horario;

    document.getElementById('summaryModality').textContent =
        valorSeguro(audiencia.modalidad);

    document.getElementById('summaryParticipants').textContent =
        Array.isArray(audiencia.participantes)
            ? audiencia.participantes.length
            : 0;

    document.getElementById('infoType').textContent =
        valorSeguro(audiencia.tipo);

    document.getElementById('infoModality').textContent =
        valorSeguro(audiencia.modalidad);

    document.getElementById('infoDate').textContent =
        formatearFecha(audiencia.fecha);

    document.getElementById('infoTime').textContent =
        horario;

    document.getElementById('infoCourt').textContent =
        valorSeguro(audiencia.juzgadoSala);

    document.getElementById('infoLocation').textContent =
        valorSeguro(audiencia.ubicacion);

    mostrarEnlaceVirtual(audiencia.enlaceVirtual);
};

const mostrarEnlaceVirtual = enlace => {
    const principal = document.getElementById('virtualAccessButton');
    const detailLink = document.getElementById('infoVirtualLink');
    const empty = document.getElementById('infoVirtualEmpty');

    if (!enlace) {
        principal.classList.add('hidden');
        detailLink.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    principal.href = enlace;
    detailLink.href = enlace;

    principal.classList.remove('hidden');
    detailLink.classList.remove('hidden');
    empty.classList.add('hidden');
};

const mostrarExpediente = expediente => {
    if (!expediente) return;

    document.getElementById('caseCode').textContent =
        valorSeguro(expediente.codigo);

    document.getElementById('caseTitle').textContent =
        valorSeguro(expediente.titulo, 'Expediente legal');

    document.getElementById('caseNumber').textContent =
        valorSeguro(expediente.numero);

    document.getElementById('caseFiscalFolder').textContent =
        valorSeguro(expediente.carpetaFiscal);

    document.getElementById('casePoliceReport').textContent =
        valorSeguro(expediente.denunciaPolicial);

    if (expediente.id) {
        document.getElementById('caseDetailButton').href =
            `./expediente-detalle.html?id=${expediente.id}`;
    }
};

const mostrarResponsable = responsable => {
    if (!responsable) return;

    document.getElementById('lawyerName').textContent =
        valorSeguro(responsable.nombre);

    document.getElementById('lawyerEmail').textContent =
        valorSeguro(responsable.correo);

    document.getElementById('lawyerPhone').textContent =
        valorSeguro(responsable.telefono);

    document.getElementById('lawyerAvatar').textContent =
        obtenerIniciales(responsable.nombre);

    if (responsable.id) {
        document.getElementById('lawyerDetailButton').href =
            `./abogado-detalle.html?id=${responsable.id}`;
    }
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

const mostrarGrabacion = audiencia => {
    const button = document.getElementById('recordingButton');
    const text = document.getElementById('recordingText');

    if (!audiencia.grabacionUrl) {
        button.classList.add('hidden');
        text.textContent = 'No hay grabación registrada.';
    } else {
        button.href = audiencia.grabacionUrl;
        button.classList.remove('hidden');
        text.textContent = 'La grabación se encuentra disponible.';
    }

    document.getElementById('audienceNotes').textContent =
        valorSeguro(
            audiencia.notas,
            'Sin notas registradas.'
        );
};

const mostrarParticipantes = participantes => {
    const lista = document.getElementById('participantsList');
    const empty = document.getElementById('participantsEmpty');
    const counter = document.getElementById('participantsCounter');

    const registros = Array.isArray(participantes)
        ? participantes
        : [];

    counter.textContent = registros.length;

    if (registros.length === 0) {
        lista.innerHTML = '';
        lista.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    lista.classList.remove('hidden');

    lista.innerHTML = registros.map(participante => {
        return `
            <div class="participant-item">
                <div class="participant-avatar">
                    ${obtenerIniciales(participante.nombre)}
                </div>

                <div class="participant-info">
                    <strong>${valorSeguro(participante.nombre, 'Participante')}</strong>
                    <span>${valorSeguro(participante.tipo, 'Participante')}</span>
                </div>
            </div>
        `;
    }).join('');
};

const crearFilaDocumento = documento => {
    const fecha = documento.fecha
        ? new Intl.DateTimeFormat('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(obtenerFecha(documento.fecha))
        : '—';

    const accion = documento.enlace
        ? `
            <a href="${documento.enlace}" class="document-action" target="_blank" rel="noopener noreferrer">
                Abrir
            </a>
        `
        : '—';

    return `
        <tr>
            <td>
                <span class="document-name">
                    ${valorSeguro(documento.nombre, 'Documento')}
                </span>

                <span class="document-code">
                    ${valorSeguro(documento.codigo)}
                </span>
            </td>

            <td>${valorSeguro(documento.tipo)}</td>

            <td>${fecha}</td>

            <td>
                <span class="document-status">
                    ${valorSeguro(documento.estado)}
                </span>
            </td>

            <td>${accion}</td>
        </tr>
    `;
};

const mostrarDocumentos = documentos => {
    const registros = Array.isArray(documentos)
        ? documentos
        : [];

    const counter = document.getElementById('documentsCounter');
    const empty = document.getElementById('documentsEmpty');
    const container = document.getElementById('documentsTableContainer');
    const tbody = document.getElementById('documentsTableBody');

    counter.textContent =
        `${registros.length} ${registros.length === 1 ? 'documento' : 'documentos'}`;

    if (registros.length === 0) {
        tbody.innerHTML = '';
        container.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    container.classList.remove('hidden');

    tbody.innerHTML = registros
        .map(crearFilaDocumento)
        .join('');
};

const mostrarError = mensaje => {
    document.getElementById('detailBody').classList.add('hidden');
    document.getElementById('detailError').classList.remove('hidden');
    document.getElementById('detailErrorMessage').textContent = mensaje;
};

const cargarAudiencia = async () => {
    const sesion = obtenerSesion();

    if (!sesion) return;

    const parametros = new URLSearchParams(window.location.search);
    const idAudiencia = parametros.get('id');

    if (!idAudiencia) {
        mostrarError('No se indicó qué audiencia se desea consultar.');
        return;
    }

    try {
        const respuesta = await fetch(
            `${API_URL}/agenda/audiencias/${idAudiencia}`,
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
                'No se pudo obtener la audiencia.'
            );
        }

        audienciaActual = datos.audiencia;

        mostrarInformacionPrincipal(audienciaActual);
        mostrarExpediente(audienciaActual.expediente);
        mostrarResponsable(audienciaActual.responsable);
        mostrarCliente(audienciaActual.cliente);
        mostrarGrabacion(audienciaActual);
        mostrarParticipantes(audienciaActual.participantes);
        mostrarDocumentos(audienciaActual.documentos);

        document.getElementById('detailError').classList.add('hidden');
        document.getElementById('detailBody').classList.remove('hidden');
    } catch (error) {
        console.error('Error al cargar audiencia:', error);

        mostrarError(
            error.message ||
            'No se pudo cargar la información de la audiencia.'
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

    mobileMenu.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    globalSearch.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;

        const termino = globalSearch.value.trim();

        if (!termino) return;

        window.location.href =
            `./agenda-audiencias.html?q=${encodeURIComponent(termino)}`;
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
    cargarAudiencia();
};

iniciarPagina();