const API_URL = 'http://localhost:3000/api';

let abogados = [];
let abogadosFiltrados = [];

const searchInput = document.getElementById('searchInput');
const globalSearch = document.getElementById('globalSearch');
const specialtyFilter = document.getElementById('specialtyFilter');
const statusFilter = document.getElementById('statusFilter');
const clearFilters = document.getElementById('clearFilters');
const lawyersGrid = document.getElementById('lawyersGrid');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const emptyState = document.getElementById('emptyState');
const lawyerCounter = document.getElementById('lawyerCounter');

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
    if (!nombre) return 'AB';

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

const calcularCarga = expedientesActivos => {
    const cantidad = Number(expedientesActivos || 0);

    if (cantidad <= 0) {
        return {
            texto: 'Sin carga',
            porcentaje: 0
        };
    }

    if (cantidad <= 3) {
        return {
            texto: 'Carga baja',
            porcentaje: 30
        };
    }

    if (cantidad <= 6) {
        return {
            texto: 'Carga media',
            porcentaje: 60
        };
    }

    if (cantidad <= 9) {
        return {
            texto: 'Carga alta',
            porcentaje: 82
        };
    }

    return {
        texto: 'Carga elevada',
        porcentaje: 100
    };
};

const crearImagenAbogado = abogado => {
    if (abogado.fotoUrl) {
        return `
            <div class="lawyer-photo">
                <img src="${abogado.fotoUrl}" alt="${valorSeguro(abogado.nombre, 'Abogado')}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <span style="display:none;">${obtenerIniciales(abogado.nombre)}</span>
            </div>
        `;
    }

    return `
        <div class="lawyer-photo">
            <span>${obtenerIniciales(abogado.nombre)}</span>
        </div>
    `;
};

const crearTarjetaAbogado = abogado => {
    const expedientesActivos = Number(abogado.expedientesActivos || 0);
    const carga = calcularCarga(expedientesActivos);
    const estaActivo = abogado.activo !== false;

    const especialidad =
        abogado.especialidad ||
        abogado.materia ||
        'Especialidad no registrada';

    return `
        <article class="lawyer-card">
            <div class="card-top">
                <span class="status-indicator ${estaActivo ? 'active' : 'inactive'}"></span>

                ${crearImagenAbogado(abogado)}

                <div class="lawyer-main">
                    <h4>${valorSeguro(abogado.nombre, 'Abogado')}</h4>
                    <span class="lawyer-specialty">${especialidad}</span>
                    <span class="lawyer-matter">${valorSeguro(abogado.materia, 'Área legal no registrada')}</span>
                </div>
            </div>

            <div class="card-body">
                <div class="lawyer-information">
                    <div class="information-item">
                        <span>Colegiatura</span>
                        <strong>${valorSeguro(abogado.numeroColegiatura)}</strong>
                    </div>

                    <div class="information-item">
                        <span>Expedientes activos</span>
                        <strong>${expedientesActivos}</strong>
                    </div>
                </div>

                <div class="workload-container">
                    <div class="workload-header">
                        <span>Carga de trabajo</span>
                        <strong>${carga.texto}</strong>
                    </div>

                    <div class="workload-bar">
                        <div class="workload-progress" style="width:${carga.porcentaje}%"></div>
                    </div>
                </div>

                <div class="lawyer-contact">
                    <div class="contact-row">
                        <svg viewBox="0 0 24 24">
                            <path d="M4 4h16v16H4z"></path>
                            <path d="M4 6l8 6 8-6"></path>
                        </svg>
                        <span>${valorSeguro(abogado.correo, 'Correo no registrado')}</span>
                    </div>

                    <div class="contact-row">
                        <svg viewBox="0 0 24 24">
                            <path d="M7 3h3l2 5-2 2a15 15 0 0 0 4 4l2-2 5 2v3c0 2-2 4-4 4C9 21 3 15 3 7c0-2 2-4 4-4z"></path>
                        </svg>
                        <span>${valorSeguro(abogado.telefono, 'Teléfono no registrado')}</span>
                    </div>
                </div>
            </div>

            <div class="card-footer">
                <span class="lawyer-state ${estaActivo ? 'active' : 'inactive'}">
                    ${estaActivo ? 'Activo' : 'Inactivo'}
                </span>

                <a href="./abogado-detalle.html?id=${abogado.id}" class="profile-button">
                    Ver perfil
                </a>
            </div>
        </article>
    `;
};

const actualizarResumen = () => {
    const activos = abogados.filter(abogado => abogado.activo !== false).length;

    const expedientes = abogados.reduce((total, abogado) => {
        return total + Number(abogado.expedientesActivos || 0);
    }, 0);

    document.getElementById('totalLawyers').textContent = abogados.length;
    document.getElementById('activeLawyers').textContent = activos;
    document.getElementById('assignedCases').textContent = expedientes;
};

const cargarEspecialidades = () => {
    const especialidades = abogados
        .map(abogado => abogado.especialidad || abogado.materia)
        .filter(Boolean);

    const especialidadesUnicas = [...new Set(especialidades)]
        .sort((a, b) => a.localeCompare(b, 'es'));

    especialidadesUnicas.forEach(especialidad => {
        const option = document.createElement('option');

        option.value = especialidad;
        option.textContent = especialidad;

        specialtyFilter.appendChild(option);
    });
};

const renderizarAbogados = () => {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');

    lawyerCounter.textContent =
        `${abogadosFiltrados.length} ${abogadosFiltrados.length === 1 ? 'abogado encontrado' : 'abogados encontrados'}`;

    if (abogadosFiltrados.length === 0) {
        lawyersGrid.innerHTML = '';
        lawyersGrid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    lawyersGrid.classList.remove('hidden');

    lawyersGrid.innerHTML = abogadosFiltrados
        .map(crearTarjetaAbogado)
        .join('');
};

const aplicarFiltros = () => {
    const busqueda = limpiarTexto(searchInput.value);
    const especialidadSeleccionada = limpiarTexto(specialtyFilter.value);
    const estadoSeleccionado = statusFilter.value;

    abogadosFiltrados = abogados.filter(abogado => {
        const texto = limpiarTexto([
            abogado.nombre,
            abogado.especialidad,
            abogado.materia,
            abogado.numeroColegiatura,
            abogado.colegioAbogados,
            abogado.correo,
            abogado.telefono
        ].join(' '));

        const coincideBusqueda =
            !busqueda ||
            texto.includes(busqueda);

        const especialidadAbogado = limpiarTexto(
            abogado.especialidad || abogado.materia
        );

        const coincideEspecialidad =
            !especialidadSeleccionada ||
            especialidadAbogado === especialidadSeleccionada;

        let coincideEstado = true;

        if (estadoSeleccionado === 'activo') {
            coincideEstado = abogado.activo !== false;
        }

        if (estadoSeleccionado === 'inactivo') {
            coincideEstado = abogado.activo === false;
        }

        return coincideBusqueda && coincideEspecialidad && coincideEstado;
    });

    renderizarAbogados();
};

const mostrarError = mensaje => {
    loadingState.classList.add('hidden');
    lawyersGrid.classList.add('hidden');
    emptyState.classList.add('hidden');

    errorState.classList.remove('hidden');
    errorMessage.textContent = mensaje;
};

const cargarAbogados = async () => {
    const sesion = obtenerSesion();

    if (!sesion) return;

    try {
        loadingState.classList.remove('hidden');

        const respuesta = await fetch(`${API_URL}/abogados`, {
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
                datos.mensaje || 'No se pudieron obtener los abogados.'
            );
        }

        abogados = Array.isArray(datos.abogados)
            ? datos.abogados
            : [];

        abogadosFiltrados = [...abogados];

        actualizarResumen();
        cargarEspecialidades();

        const parametros = new URLSearchParams(window.location.search);
        const busquedaInicial = parametros.get('q');

        if (busquedaInicial) {
            searchInput.value = busquedaInicial;
            aplicarFiltros();
            return;
        }

        renderizarAbogados();
    } catch (error) {
        console.error('Error al cargar abogados:', error);

        mostrarError(
            error.message || 'No se pudo cargar el equipo legal.'
        );
    }
};

const limpiarFiltros = () => {
    searchInput.value = '';
    specialtyFilter.value = '';
    statusFilter.value = '';

    abogadosFiltrados = [...abogados];

    renderizarAbogados();
};

const configurarEventos = () => {
    const sidebar = document.getElementById('sidebar');
    const mobileMenu = document.getElementById('mobileMenu');

    searchInput.addEventListener('input', aplicarFiltros);
    specialtyFilter.addEventListener('change', aplicarFiltros);
    statusFilter.addEventListener('change', aplicarFiltros);
    clearFilters.addEventListener('click', limpiarFiltros);

    globalSearch.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;

        const termino = globalSearch.value.trim();

        searchInput.value = termino;
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
    cargarAbogados();
};

iniciarPagina();