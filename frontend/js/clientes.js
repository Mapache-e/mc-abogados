const API_URL = 'http://localhost:3000/api';

let clientes = [];
let clientesFiltrados = [];

const searchInput = document.getElementById('searchInput');
const globalSearch = document.getElementById('globalSearch');
const documentFilter = document.getElementById('documentFilter');
const caseFilter = document.getElementById('caseFilter');
const clearFilters = document.getElementById('clearFilters');
const clientsTableBody = document.getElementById('clientsTableBody');
const clientCounter = document.getElementById('clientCounter');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const tableWrapper = document.getElementById('tableWrapper');
const totalClients = document.getElementById('totalClients');
const clientsWithCases = document.getElementById('clientsWithCases');
const clientsWithoutCases = document.getElementById('clientsWithoutCases');
const logoutButton = document.getElementById('logoutButton');
const mobileMenu = document.getElementById('mobileMenu');
const sidebar = document.getElementById('sidebar');

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

    if (userName) {
        userName.textContent = usuario.nombre || usuario.nombreCompleto || 'Usuario';
    }

    if (userRole) {
        userRole.textContent = usuario.rol || 'USUARIO';
    }

    if (userAvatar) {
        userAvatar.textContent = obtenerIniciales(
            usuario.nombre || usuario.nombreCompleto || 'MC'
        );
    }
};

const limpiarTexto = (valor) => {
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

const actualizarResumen = () => {
    const conExpedientes = clientes.filter(
        cliente => Number(cliente.expedientesActivos || 0) > 0
    ).length;

    totalClients.textContent = clientes.length;
    clientsWithCases.textContent = conExpedientes;
    clientsWithoutCases.textContent = clientes.length - conExpedientes;
};

const aplicarFiltros = () => {
    const busqueda = limpiarTexto(searchInput.value);
    const tipoDocumento = documentFilter.value;
    const filtroExpedientes = caseFilter.value;

    clientesFiltrados = clientes.filter(cliente => {
        const textoCliente = limpiarTexto([
            cliente.codigo,
            cliente.nombre,
            cliente.tipoDocumento,
            cliente.numeroDocumento,
            cliente.contactoPrincipal,
            cliente.representanteLegal,
            cliente.telefono,
            cliente.correo,
            cliente.direccion
        ].join(' '));

        const coincideBusqueda =
            !busqueda ||
            textoCliente.includes(busqueda);

        const coincideDocumento =
            !tipoDocumento ||
            limpiarTexto(cliente.tipoDocumento) === limpiarTexto(tipoDocumento);

        const activos = Number(cliente.expedientesActivos || 0);

        let coincideExpedientes = true;

        if (filtroExpedientes === 'active') {
            coincideExpedientes = activos > 0;
        }

        if (filtroExpedientes === 'inactive') {
            coincideExpedientes = activos === 0;
        }

        return coincideBusqueda && coincideDocumento && coincideExpedientes;
    });

    renderizarClientes();
};

const crearFilaCliente = (cliente) => {
    const expedientesActivos = Number(cliente.expedientesActivos || 0);
    const documento = valorSeguro(cliente.numeroDocumento);
    const tipoDocumento = valorSeguro(cliente.tipoDocumento, 'Documento');
    const telefono = valorSeguro(cliente.telefono);
    const correo = valorSeguro(cliente.correo);
    const contacto = valorSeguro(
        cliente.contactoPrincipal || cliente.representanteLegal,
        'Sin contacto registrado'
    );

    return `
        <tr>
            <td>
                <div class="client-identity">
                    <div class="client-avatar">${obtenerIniciales(cliente.nombre)}</div>
                    <div>
                        <span class="client-name">${valorSeguro(cliente.nombre)}</span>
                        <span class="client-code">${valorSeguro(cliente.codigo)}</span>
                    </div>
                </div>
            </td>

            <td>
                <span class="document-number">${documento}</span>
                <span class="document-type">${tipoDocumento}</span>
            </td>

            <td>
                <span class="contact-main">${telefono}</span>
                <span class="contact-secondary">${contacto}</span>
            </td>

            <td>${correo}</td>

            <td>
                <span class="case-count ${expedientesActivos === 0 ? 'zero' : ''}">
                    ${expedientesActivos}
                </span>
            </td>

            <td>
                <div class="actions-container">
                    <a href="./cliente-detalle.html?id=${cliente.id}" class="action-button">
                        Ver ficha
                    </a>
                </div>
            </td>
        </tr>
    `;
};

const renderizarClientes = () => {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');

    clientCounter.textContent =
        `${clientesFiltrados.length} ${clientesFiltrados.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}`;

    if (clientesFiltrados.length === 0) {
        clientsTableBody.innerHTML = '';
        tableWrapper.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    tableWrapper.classList.remove('hidden');

    clientsTableBody.innerHTML = clientesFiltrados
        .map(crearFilaCliente)
        .join('');
};

const mostrarError = (mensaje) => {
    loadingState.classList.add('hidden');
    tableWrapper.classList.add('hidden');
    emptyState.classList.add('hidden');
    errorState.classList.remove('hidden');
    errorMessage.textContent = mensaje;
};

const cargarClientes = async () => {
    const sesion = obtenerSesion();

    if (!sesion) return;

    try {
        loadingState.classList.remove('hidden');

        const respuesta = await fetch(`${API_URL}/clientes`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${sesion.token}`
            }
        });

        if (respuesta.status === 401 || respuesta.status === 403) {
            cerrarSesion();
            return;
        }

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje || 'No se pudieron obtener los clientes.'
            );
        }

        clientes = Array.isArray(datos.clientes) ? datos.clientes : [];
        clientesFiltrados = [...clientes];

        actualizarResumen();
        renderizarClientes();
    } catch (error) {
        console.error('Error al cargar clientes:', error);
        mostrarError(
            error.message || 'No se pudieron cargar los clientes.'
        );
    }
};

const limpiarFiltrosClientes = () => {
    searchInput.value = '';
    documentFilter.value = '';
    caseFilter.value = '';

    clientesFiltrados = [...clientes];

    renderizarClientes();
};

const configurarEventos = () => {
    searchInput.addEventListener('input', aplicarFiltros);
    documentFilter.addEventListener('change', aplicarFiltros);
    caseFilter.addEventListener('change', aplicarFiltros);

    clearFilters.addEventListener('click', limpiarFiltrosClientes);

    globalSearch.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;

        const termino = globalSearch.value.trim();

        searchInput.value = termino;
        aplicarFiltros();

        searchInput.focus();
    });

    logoutButton.addEventListener('click', cerrarSesion);

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

const sesion = obtenerSesion();

if (sesion) {
    mostrarUsuario(sesion.usuario);
    configurarEventos();
    cargarClientes();
}