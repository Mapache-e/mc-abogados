const API_URL = 'http://localhost:3000/api';

let practicantes = [];
let practicantesFiltrados = [];

const searchInput = document.getElementById('searchInput');
const globalSearch = document.getElementById('globalSearch');
const matterFilter = document.getElementById('matterFilter');
const statusFilter = document.getElementById('statusFilter');

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
    if (!nombre) return 'PR';

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

const actualizarResumen = () => {
    const total = practicantes.length;

    const activos = practicantes.filter(item => item.activo).length;

    const expedientes = practicantes.reduce((total, item) => {
        return total + Number(item.expedientes?.activos || 0);
    }, 0);

    const tareas = practicantes.reduce((total, item) => {
        return total + Number(item.tareas?.pendientes || 0);
    }, 0);

    document.getElementById('totalCount').textContent = total;
    document.getElementById('activeCount').textContent = activos;
    document.getElementById('caseCount').textContent = expedientes;
    document.getElementById('taskCount').textContent = tareas;
};

const cargarMaterias = () => {
    const materias = practicantes
        .map(item => item.materia?.nombre)
        .filter(Boolean);

    const unicas = [...new Set(materias)]
        .sort((a, b) => a.localeCompare(b, 'es'));

    matterFilter.innerHTML = '<option value="">Todas las materias</option>';

    unicas.forEach(materia => {
        const option = document.createElement('option');
        option.value = materia;
        option.textContent = materia;
        matterFilter.appendChild(option);
    });
};

const crearAvatar = practicante => {
    if (practicante.fotoUrl) {
        return `
            <div class="practicante-avatar">
                <img src="${practicante.fotoUrl}" alt="${practicante.nombre}" onerror="this.style.display='none'; this.parentElement.textContent='${obtenerIniciales(practicante.nombre)}';">
            </div>
        `;
    }

    return `
        <div class="practicante-avatar">
            ${obtenerIniciales(practicante.nombre)}
        </div>
    `;
};

const crearTarjeta = practicante => {
    return `
        <article class="practicante-card">
            <div class="card-top">
                ${crearAvatar(practicante)}

                <div class="practicante-main">
                    <h3>${valorSeguro(practicante.nombre, 'Practicante')}</h3>
                    <p>${valorSeguro(practicante.materia?.nombre, 'Sin materia asignada')}</p>

                    <span class="status-badge ${practicante.activo ? 'active' : 'inactive'}">
                        ${practicante.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </div>
            </div>

            <div class="contact-info">
                <div class="contact-row">
                    <span>Correo</span>
                    <strong>${valorSeguro(practicante.correo)}</strong>
                </div>

                <div class="contact-row">
                    <span>Teléfono</span>
                    <strong>${valorSeguro(practicante.telefono)}</strong>
                </div>
            </div>

            <div class="workload-grid">
                <div class="workload-item">
                    <strong>${Number(practicante.expedientes?.activos || 0)}</strong>
                    <span>Expedientes activos</span>
                </div>

                <div class="workload-item">
                    <strong>${Number(practicante.tareas?.pendientes || 0)}</strong>
                    <span>Pendientes</span>
                </div>

                <div class="workload-item">
                    <strong>${Number(practicante.tareas?.enCurso || 0)}</strong>
                    <span>En curso</span>
                </div>
            </div>

            <div class="card-footer">
                <a href="./practicante-detalle.html?id=${practicante.id}" class="detail-button">
                    Ver perfil
                </a>
            </div>
        </article>
    `;
};

const renderizarPracticantes = () => {
    const grid = document.getElementById('practicantesGrid');
    const loading = document.getElementById('loadingState');
    const error = document.getElementById('errorState');
    const empty = document.getElementById('emptyState');

    loading.classList.add('hidden');
    error.classList.add('hidden');

    if (practicantesFiltrados.length === 0) {
        grid.innerHTML = '';
        grid.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    grid.classList.remove('hidden');

    grid.innerHTML = practicantesFiltrados
        .map(crearTarjeta)
        .join('');
};

const aplicarFiltros = () => {
    const busqueda = limpiarTexto(searchInput.value);
    const materia = limpiarTexto(matterFilter.value);
    const estado = statusFilter.value;

    practicantesFiltrados = practicantes.filter(item => {
        const texto = limpiarTexto([
            item.nombre,
            item.correo,
            item.telefono,
            item.numeroDocumento,
            item.materia?.nombre
        ].join(' '));

        const coincideBusqueda =
            !busqueda ||
            texto.includes(busqueda);

        const coincideMateria =
            !materia ||
            limpiarTexto(item.materia?.nombre) === materia;

        const coincideEstado =
            !estado ||
            (estado === 'activo' && item.activo) ||
            (estado === 'inactivo' && !item.activo);

        return coincideBusqueda && coincideMateria && coincideEstado;
    });

    renderizarPracticantes();
};

const limpiarFiltros = () => {
    searchInput.value = '';
    matterFilter.value = '';
    statusFilter.value = '';

    practicantesFiltrados = [...practicantes];

    renderizarPracticantes();
};

const mostrarError = mensaje => {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('practicantesGrid').classList.add('hidden');
    document.getElementById('emptyState').classList.add('hidden');

    document.getElementById('errorState').classList.remove('hidden');
    document.getElementById('errorMessage').textContent = mensaje;
};

const cargarPracticantes = async () => {
    const sesion = obtenerSesion();

    if (!sesion) return;

    try {
        const respuesta = await fetch(`${API_URL}/practicantes`, {
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
                datos.mensaje ||
                'No se pudieron obtener los practicantes.'
            );
        }

        practicantes = Array.isArray(datos.practicantes)
            ? datos.practicantes
            : [];

        practicantesFiltrados = [...practicantes];

        actualizarResumen();
        cargarMaterias();

        const parametros = new URLSearchParams(window.location.search);
        const busquedaInicial = parametros.get('q');

        if (busquedaInicial) {
            searchInput.value = busquedaInicial;
            aplicarFiltros();
            return;
        }

        renderizarPracticantes();
    } catch (error) {
        console.error('Error al cargar practicantes:', error);

        mostrarError(
            error.message ||
            'No se pudo cargar la información de los practicantes.'
        );
    }
};

const configurarEventos = () => {
    const sidebar = document.getElementById('sidebar');
    const mobileMenu = document.getElementById('mobileMenu');

    searchInput.addEventListener('input', aplicarFiltros);
    matterFilter.addEventListener('change', aplicarFiltros);
    statusFilter.addEventListener('change', aplicarFiltros);

    document.getElementById('clearFilters').addEventListener(
        'click',
        limpiarFiltros
    );

    globalSearch.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;

        searchInput.value = globalSearch.value.trim();
        aplicarFiltros();
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
    cargarPracticantes();
};

iniciarPagina();