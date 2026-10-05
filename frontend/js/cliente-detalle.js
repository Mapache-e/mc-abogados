const API_URL = 'http://localhost:3000/api';

let clienteActual = null;

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

const obtenerIniciales = (nombre) => {
    if (!nombre) return 'MC';

    const partes = nombre.trim().split(/\s+/);

    if (partes.length === 1) {
        return partes[0].substring(0, 2).toUpperCase();
    }

    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
};

const mostrarUsuario = (usuario) => {
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const userAvatar = document.getElementById('userAvatar');

    const nombre = usuario.nombre || usuario.nombreCompleto || 'Usuario';

    userName.textContent = nombre;
    userRole.textContent = usuario.rol || 'USUARIO';
    userAvatar.textContent = obtenerIniciales(nombre);
};

const valorSeguro = (valor, alternativo = '—') => {
    if (valor === null || valor === undefined || valor === '') {
        return alternativo;
    }

    return valor;
};

const formatearFecha = (fecha) => {
    if (!fecha) return '—';

    const fechaObjeto = new Date(`${fecha}T00:00:00`);

    if (Number.isNaN(fechaObjeto.getTime())) {
        return fecha;
    }

    return new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(fechaObjeto);
};

const obtenerClaseEstado = (estado) => {
    const estadoNormalizado = String(estado || '').toLowerCase();

    if (estadoNormalizado === 'activo') return 'status-active';
    if (estadoNormalizado === 'en revisión') return 'status-review';
    if (estadoNormalizado === 'en espera') return 'status-waiting';
    if (estadoNormalizado === 'suspendido') return 'status-suspended';
    if (estadoNormalizado === 'cerrado') return 'status-closed';
    if (estadoNormalizado === 'archivado') return 'status-archived';

    return 'status-waiting';
};

const mostrarInformacionCliente = (cliente) => {
    document.getElementById('breadcrumbClient').textContent =
        valorSeguro(cliente.nombre, 'Cliente');

    document.getElementById('clientName').textContent =
        valorSeguro(cliente.nombre, 'Cliente');

    document.getElementById('clientAvatar').textContent =
        obtenerIniciales(cliente.nombre);

    document.getElementById('clientCode').textContent =
        valorSeguro(cliente.codigo);

    const documentoCompleto = [
        cliente.tipoDocumento,
        cliente.numeroDocumento
    ].filter(Boolean).join(' ');

    document.getElementById('clientDocument').textContent =
        documentoCompleto || 'Documento no registrado';

    document.getElementById('infoDocumentType').textContent =
        valorSeguro(cliente.tipoDocumento);

    document.getElementById('infoDocumentNumber').textContent =
        valorSeguro(cliente.numeroDocumento);

    document.getElementById('infoPhone').textContent =
        valorSeguro(cliente.telefono);

    document.getElementById('infoEmail').textContent =
        valorSeguro(cliente.correo);

    document.getElementById('infoContact').textContent =
        valorSeguro(cliente.contactoPrincipal);

    document.getElementById('infoRepresentative').textContent =
        valorSeguro(cliente.representanteLegal);

    document.getElementById('infoAddress').textContent =
        valorSeguro(cliente.direccion);

    document.getElementById('clientObservations').textContent =
        valorSeguro(
            cliente.observaciones,
            'Sin observaciones registradas.'
        );

    document.getElementById('editClientButton').href =
        `./cliente-nuevo.html?id=${cliente.id}`;
};

const actualizarResumen = (expedientes) => {
    const total = expedientes.length;

    const activos = expedientes.filter(expediente => {
        return !['Cerrado', 'Archivado'].includes(expediente.estado);
    }).length;

    const cerrados = expedientes.filter(expediente => {
        return ['Cerrado', 'Archivado'].includes(expediente.estado);
    }).length;

    document.getElementById('totalCases').textContent = total;
    document.getElementById('activeCases').textContent = activos;
    document.getElementById('closedCases').textContent = cerrados;
};

const crearFilaExpediente = (expediente) => {
    const numeroExpediente = valorSeguro(
        expediente.numeroExpediente,
        'Sin número judicial'
    );

    const titulo = valorSeguro(
        expediente.titulo,
        expediente.proximoHito || 'Expediente legal'
    );

    return `
        <tr>
            <td>
                <span class="case-code">
                    ${valorSeguro(expediente.codigo)}
                </span>
            </td>

            <td>
                <span class="case-title">${titulo}</span>
                <span class="case-number">${numeroExpediente}</span>
            </td>

            <td>
                ${valorSeguro(expediente.materia)}
            </td>

            <td>
                ${valorSeguro(expediente.responsable)}
            </td>

            <td>
                <span class="case-title">
                    ${valorSeguro(expediente.proximoHito)}
                </span>
                <span class="case-number">
                    ${formatearFecha(expediente.fechaHito)}
                </span>
            </td>

            <td>
                <span class="status-badge ${obtenerClaseEstado(expediente.estado)}">
                    ${valorSeguro(expediente.estado)}
                </span>
            </td>

            <td>
                <a
                    href="./expediente-detalle.html?id=${expediente.id}"
                    class="case-action"
                >
                    Ver expediente
                </a>
            </td>
        </tr>
    `;
};

const mostrarExpedientes = (expedientes = []) => {
    const casesCounter = document.getElementById('casesCounter');
    const casesEmpty = document.getElementById('casesEmpty');
    const casesTableContainer = document.getElementById('casesTableContainer');
    const casesTableBody = document.getElementById('casesTableBody');

    casesCounter.textContent =
        `${expedientes.length} ${expedientes.length === 1 ? 'expediente' : 'expedientes'}`;

    actualizarResumen(expedientes);

    if (expedientes.length === 0) {
        casesTableBody.innerHTML = '';
        casesTableContainer.classList.add('hidden');
        casesEmpty.classList.remove('hidden');
        return;
    }

    casesEmpty.classList.add('hidden');
    casesTableContainer.classList.remove('hidden');

    casesTableBody.innerHTML = expedientes
        .map(crearFilaExpediente)
        .join('');
};

const mostrarError = (mensaje) => {
    document.getElementById('detailBody').classList.add('hidden');
    document.getElementById('detailError').classList.remove('hidden');
    document.getElementById('detailErrorMessage').textContent = mensaje;
};

const cargarCliente = async () => {
    const sesion = obtenerSesion();

    if (!sesion) return;

    const parametros = new URLSearchParams(window.location.search);
    const idCliente = parametros.get('id');

    if (!idCliente) {
        mostrarError('No se indicó qué cliente se desea consultar.');
        return;
    }

    try {
        const respuesta = await fetch(
            `${API_URL}/clientes/${idCliente}`,
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
                datos.mensaje || 'No se pudo obtener el cliente.'
            );
        }

        clienteActual = datos.cliente;

        mostrarInformacionCliente(clienteActual);
        mostrarExpedientes(clienteActual.expedientes || []);

        document.getElementById('detailError').classList.add('hidden');
        document.getElementById('detailBody').classList.remove('hidden');
    } catch (error) {
        console.error('Error al cargar cliente:', error);

        mostrarError(
            error.message || 'No se pudo cargar la información del cliente.'
        );
    }
};

const configurarEventos = () => {
    const logoutButton = document.getElementById('logoutButton');
    const mobileMenu = document.getElementById('mobileMenu');
    const sidebar = document.getElementById('sidebar');
    const globalSearch = document.getElementById('globalSearch');

    logoutButton.addEventListener('click', cerrarSesion);

    mobileMenu.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    globalSearch.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;

        const termino = globalSearch.value.trim();

        if (!termino) return;

        window.location.href =
            `./clientes.html?q=${encodeURIComponent(termino)}`;
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

const sesion = obtenerSesion();

if (sesion) {
    mostrarUsuario(sesion.usuario);
    configurarEventos();
    cargarCliente();
}