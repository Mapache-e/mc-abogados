const logoutButton = document.getElementById('logoutButton');
const mobileMenu = document.getElementById('mobileMenu');
const sidebar = document.querySelector('.sidebar');

const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const userAvatar = document.getElementById('userAvatar');

const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const matterFilter = document.getElementById('matterFilter');
const responsibleFilter = document.getElementById('responsibleFilter');
const clearFilters = document.getElementById('clearFilters');

const casesTableBody = document.getElementById('casesTableBody');
const caseCounter = document.getElementById('caseCounter');
const newCaseButton = document.getElementById('newCaseButton');

let expedientes = [];

document.addEventListener('DOMContentLoaded', async () => {
    const sesion = verificarSesion();

    if (!sesion) {
        return;
    }

    await cargarExpedientes(sesion.token);
});

function obtenerSesion() {
    const token =
        localStorage.getItem('mc_token') ||
        sessionStorage.getItem('mc_token');

    const usuarioGuardado =
        localStorage.getItem('mc_usuario') ||
        sessionStorage.getItem('mc_usuario');

    if (!token || !usuarioGuardado) {
        return null;
    }

    try {
        return {
            token,
            usuario: JSON.parse(usuarioGuardado)
        };
    } catch {
        return null;
    }
}

function verificarSesion() {
    const sesion = obtenerSesion();

    if (!sesion) {
        window.location.href = '../../index.html';
        return null;
    }

    if (sesion.usuario.rol !== 'Administrador') {
        redirigirSegunRol(sesion.usuario.rol);
        return null;
    }

    mostrarUsuario(sesion.usuario);

    return sesion;
}

function mostrarUsuario(usuario) {
    const nombre = usuario.nombre || 'Usuario';

    userName.textContent = nombre;
    userRole.textContent = usuario.rol;
    userAvatar.textContent = obtenerIniciales(nombre);
}

function obtenerIniciales(nombre) {
    const partes = nombre
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (partes.length === 0) {
        return 'U';
    }

    if (partes.length === 1) {
        return partes[0].substring(0, 2).toUpperCase();
    }

    return (
        partes[0][0] +
        partes[partes.length - 1][0]
    ).toUpperCase();
}

async function cargarExpedientes(token) {
    try {
        const respuesta = await fetch('/api/expedientes', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (respuesta.status === 401 || respuesta.status === 403) {
            cerrarSesion();
            return;
        }

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                'No se pudieron obtener los expedientes'
            );
        }

        expedientes = datos.expedientes || [];

        cargarFiltros(expedientes);
        aplicarFiltros();

    } catch (error) {
        console.error('Error al cargar expedientes:', error);
        mostrarError();
    }
}

function cargarFiltros(datos) {
    cargarOpcionesUnicas(
        statusFilter,
        datos.map(item => item.estado)
    );

    cargarOpcionesUnicas(
        matterFilter,
        datos.map(item => item.materia?.nombre)
    );

    cargarOpcionesUnicas(
        responsibleFilter,
        datos.map(item => item.responsable?.nombre)
    );
}

function cargarOpcionesUnicas(select, valores) {
    const unicos = [
        ...new Set(
            valores.filter(valor => valor && valor.trim())
        )
    ].sort((a, b) => a.localeCompare(b, 'es'));

    unicos.forEach(valor => {
        const option = document.createElement('option');
        option.value = valor;
        option.textContent = valor;
        select.appendChild(option);
    });
}

function aplicarFiltros() {
    const busqueda = normalizarTexto(searchInput.value);
    const estado = statusFilter.value;
    const materia = matterFilter.value;
    const responsable = responsibleFilter.value;

    const filtrados = expedientes.filter(expediente => {
        const contenidoBusqueda = normalizarTexto([
            expediente.codigo,
            expediente.numeroExpediente,
            expediente.titulo,
            expediente.cliente?.nombre,
            expediente.carpetaFiscal,
            expediente.denunciaPolicial,
            expediente.organo
        ].filter(Boolean).join(' '));

        const coincideBusqueda =
            !busqueda ||
            contenidoBusqueda.includes(busqueda);

        const coincideEstado =
            !estado ||
            expediente.estado === estado;

        const coincideMateria =
            !materia ||
            expediente.materia?.nombre === materia;

        const coincideResponsable =
            !responsable ||
            expediente.responsable?.nombre === responsable;

        return (
            coincideBusqueda &&
            coincideEstado &&
            coincideMateria &&
            coincideResponsable
        );
    });

    renderizarExpedientes(filtrados);
}

function renderizarExpedientes(datos) {
    caseCounter.textContent =
        datos.length === 1
            ? '1 expediente encontrado'
            : `${datos.length} expedientes encontrados`;

    if (datos.length === 0) {
        casesTableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <span>▣</span>
                        <p>No se encontraron expedientes con los filtros seleccionados.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    casesTableBody.innerHTML = datos
        .map(expediente => crearFilaExpediente(expediente))
        .join('');
}

function crearFilaExpediente(expediente) {
    const codigo = escaparHTML(
        expediente.codigo || 'Sin código'
    );

    const numero = escaparHTML(
        expediente.numeroExpediente ||
        'Sin número de expediente'
    );

    const cliente = escaparHTML(
        expediente.cliente?.nombre ||
        'Cliente no asignado'
    );

    const titulo = escaparHTML(
        expediente.titulo ||
        expediente.proximoHito ||
        'Asunto sin título'
    );

    const materia = escaparHTML(
        expediente.materia?.nombre ||
        'Sin clasificar'
    );

    const responsable = escaparHTML(
        expediente.responsable?.nombre ||
        'Sin asignar'
    );

    const proximoHito = escaparHTML(
        expediente.proximoHito ||
        'Sin próximo hito'
    );

    const estado = escaparHTML(
        expediente.estado ||
        'Sin estado'
    );

    return `
        <tr>
            <td>
                <span class="case-code">${codigo}</span>
                <span class="case-number">${numero}</span>
            </td>

            <td>
                <span class="client-name">${cliente}</span>
                <span class="case-title">${titulo}</span>
            </td>

            <td>
                <span class="matter-badge">${materia}</span>
            </td>

            <td>
                <span class="responsible-name">${responsable}</span>
            </td>

            <td>
                <span class="milestone-name">${proximoHito}</span>
                <span class="milestone-date">
                    ${formatearFecha(expediente.fechaHito)}
                </span>
            </td>

            <td>
                <span class="status-badge ${obtenerClaseEstado(expediente.estado)}">
                    ${estado}
                </span>
            </td>

            <td>
                <button
                    type="button"
                    class="case-action"
                    data-id="${expediente.id}"
                    aria-label="Ver expediente ${codigo}"
                    title="Ver expediente"
                >
                    →
                </button>
            </td>
        </tr>
    `;
}

function obtenerClaseEstado(estado) {
    const valor = normalizarTexto(estado);

    const clases = {
        'activo': 'status-active',
        'en revision': 'status-review',
        'en espera': 'status-waiting',
        'cerrado': 'status-closed',
        'suspendido': 'status-suspended',
        'archivado': 'status-archived'
    };

    return clases[valor] || 'status-waiting';
}

function formatearFecha(fecha) {
    if (!fecha) {
        return 'Fecha pendiente';
    }

    const fechaNormalizada =
        typeof fecha === 'string'
            ? fecha.substring(0, 10)
            : fecha;

    const objetoFecha = new Date(
        `${fechaNormalizada}T00:00:00`
    );

    if (Number.isNaN(objetoFecha.getTime())) {
        return 'Fecha pendiente';
    }

    return objetoFecha.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function normalizarTexto(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function escaparHTML(valor) {
    return String(valor)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function cerrarSesion() {
    localStorage.removeItem('mc_token');
    localStorage.removeItem('mc_usuario');

    sessionStorage.removeItem('mc_token');
    sessionStorage.removeItem('mc_usuario');

    window.location.href = '../../index.html';
}

function redirigirSegunRol(rol) {
    if (rol === 'Abogado') {
        window.location.href = '../abogado/dashboard.html';
        return;
    }

    if (rol === 'Practicante') {
        window.location.href = '../practicante/dashboard.html';
        return;
    }

    window.location.href = '../../index.html';
}

searchInput.addEventListener('input', aplicarFiltros);
statusFilter.addEventListener('change', aplicarFiltros);
matterFilter.addEventListener('change', aplicarFiltros);
responsibleFilter.addEventListener('change', aplicarFiltros);

clearFilters.addEventListener('click', () => {
    searchInput.value = '';
    statusFilter.value = '';
    matterFilter.value = '';
    responsibleFilter.value = '';

    aplicarFiltros();
});

logoutButton.addEventListener('click', cerrarSesion);

mobileMenu.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

casesTableBody.addEventListener('click', event => {
    const boton = event.target.closest('.case-action');

    if (!boton) {
        return;
    }

    const idExpediente = boton.dataset.id;

    window.location.href =
        `./expediente-detalle.html?id=${encodeURIComponent(idExpediente)}`;
});

newCaseButton.addEventListener('click', () => {
    window.location.href = './expediente-nuevo.html';
});

function mostrarError() {
    caseCounter.textContent =
        'No fue posible cargar los expedientes';

    casesTableBody.innerHTML = `
        <tr>
            <td colspan="7">
                <div class="error-state">
                    <span>!</span>
                    <p>Ocurrió un error al cargar los expedientes.</p>
                </div>
            </td>
        </tr>
    `;
}