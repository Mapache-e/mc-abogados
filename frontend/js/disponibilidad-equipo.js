const API_URL = 'http://localhost:3000/api';

let disponibilidad = [];
let disponibilidadFiltrada = [];
let personas = [];

const obtenerSesion = () => {
    const token =
        localStorage.getItem('mc_token') ||
        sessionStorage.getItem('mc_token');

    const usuarioGuardado =
        localStorage.getItem('mc_usuario') ||
        sessionStorage.getItem('mc_usuario');

    if (!token || !usuarioGuardado) {
        window.location.href = '../../index.html';
        return null;
    }

    return {
        token,
        usuario: JSON.parse(usuarioGuardado)
    };
};

const cerrarSesion = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '../../index.html';
};

const obtenerIniciales = nombre => {
    if (!nombre) return 'MC';

    const partes = nombre.trim().split(/\s+/);

    return partes.length > 1
        ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
        : partes[0].substring(0, 2).toUpperCase();
};

const limpiarTexto = valor => {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
};

const formatearFecha = fecha => {
    if (!fecha) return '—';

    return new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(
        new Date(`${String(fecha).substring(0,10)}T00:00:00`)
    );
};

const formatearHora = hora => {
    return hora
        ? String(hora).substring(0,5)
        : '—';
};

const mostrarUsuario = usuario => {
    const nombre =
        usuario.nombre ||
        usuario.nombreCompleto ||
        'Usuario';

    document.getElementById('userName').textContent = nombre;
    document.getElementById('userRole').textContent =
        usuario.rol || 'USUARIO';

    document.getElementById('userAvatar').textContent =
        obtenerIniciales(nombre);
};

const actualizarResumen = () => {
    document.getElementById('totalBlocks').textContent =
        disponibilidad.length;

    document.getElementById('availableBlocks').textContent =
        disponibilidad.filter(item => item.disponible).length;

    document.getElementById('busyBlocks').textContent =
        disponibilidad.filter(item => !item.disponible).length;

    document.getElementById('teamCount').textContent =
        personas.filter(item => item.activo).length;
};

const cargarPersonasSelect = () => {
    const select =
        document.getElementById('personSelect');

    select.innerHTML =
        '<option value="">Seleccionar...</option>';

    personas
        .filter(item => item.activo)
        .forEach(persona => {
            const option =
                document.createElement('option');

            option.value = persona.id;
            option.textContent =
                `${persona.nombre} · ${persona.rol}`;

            select.appendChild(option);
        });
};

const crearTarjeta = item => {
    return `
        <article class="availability-card">
            <div class="card-header">
                <div class="person-avatar">
                    ${obtenerIniciales(item.persona?.nombre)}
                </div>

                <div class="person-info">
                    <strong>${item.persona?.nombre || 'Sin nombre'}</strong>
                    <p>${item.persona?.rol || '—'} · ${item.persona?.materia || 'Sin materia'}</p>
                </div>

                <span class="status-badge ${item.disponible ? 'available' : 'busy'}">
                    ${item.disponible ? 'Disponible' : 'Ocupado'}
                </span>
            </div>

            <div class="card-body">
                <div class="schedule-row">
                    <span>Fecha</span>
                    <strong>${formatearFecha(item.fecha)}</strong>
                </div>

                <div class="schedule-row">
                    <span>Horario</span>
                    <strong>
                        ${formatearHora(item.horaInicio)}
                        -
                        ${formatearHora(item.horaFin)}
                    </strong>
                </div>

                <div class="reason">
                    ${item.motivo || 'Sin observaciones.'}
                </div>
            </div>

            <div class="card-actions">
                <button type="button" onclick="editarBloque(${item.id})">
                    Editar
                </button>

                <button type="button" class="delete-button" onclick="eliminarBloque(${item.id})">
                    Eliminar
                </button>
            </div>
        </article>
    `;
};

const renderizar = () => {
    const grid =
        document.getElementById('availabilityGrid');

    const empty =
        document.getElementById('emptyState');

    document.getElementById('loadingState')
        .classList.add('hidden');

    if (disponibilidadFiltrada.length === 0) {
        grid.innerHTML = '';
        grid.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    grid.classList.remove('hidden');

    grid.innerHTML =
        disponibilidadFiltrada
            .map(crearTarjeta)
            .join('');
};

const aplicarFiltros = () => {
    const busqueda =
        limpiarTexto(
            document.getElementById('searchInput').value
        );

    const rol =
        document.getElementById('roleFilter').value;

    const estado =
        document.getElementById('availabilityFilter').value;

    const fecha =
        document.getElementById('dateFilter').value;

    disponibilidadFiltrada =
        disponibilidad.filter(item => {
            const coincideBusqueda =
                !busqueda ||
                limpiarTexto(
                    `${item.persona?.nombre} ${item.persona?.materia}`
                ).includes(busqueda);

            const coincideRol =
                !rol ||
                item.persona?.rol === rol;

            const coincideEstado =
                !estado ||
                (
                    estado === 'disponible' &&
                    item.disponible
                ) ||
                (
                    estado === 'ocupado' &&
                    !item.disponible
                );

            const coincideFecha =
                !fecha ||
                String(item.fecha).substring(0,10) === fecha;

            return (
                coincideBusqueda &&
                coincideRol &&
                coincideEstado &&
                coincideFecha
            );
        });

    renderizar();
};

const limpiarFiltros = () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('roleFilter').value = '';
    document.getElementById('availabilityFilter').value = '';
    document.getElementById('dateFilter').value = '';

    disponibilidadFiltrada =
        [...disponibilidad];

    renderizar();
};

const cargarDatos = async () => {
    const sesion = obtenerSesion();

    if (!sesion) return;

    try {
        const [
            respuestaDisponibilidad,
            respuestaEquipo
        ] = await Promise.all([
            fetch(
                `${API_URL}/disponibilidad`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${sesion.token}`
                    }
                }
            ),

            fetch(
                `${API_URL}/disponibilidad/equipo`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${sesion.token}`
                    }
                }
            )
        ]);

        const datosDisponibilidad =
            await respuestaDisponibilidad.json();

        const datosEquipo =
            await respuestaEquipo.json();

        if (!respuestaDisponibilidad.ok) {
            throw new Error(
                datosDisponibilidad.mensaje
            );
        }

        if (!respuestaEquipo.ok) {
            throw new Error(
                datosEquipo.mensaje
            );
        }

        disponibilidad =
            datosDisponibilidad.disponibilidad || [];

        disponibilidadFiltrada =
            [...disponibilidad];

        personas =
            datosEquipo.personas || [];

        actualizarResumen();
        cargarPersonasSelect();
        renderizar();
    } catch (error) {
        console.error(error);

        document.getElementById('loadingState')
            .textContent =
            error.message ||
            'No se pudo cargar la disponibilidad.';
    }
};

const abrirModal = item => {
    document.getElementById('availabilityModal')
        .classList.remove('hidden');

    if (!item) {
        document.getElementById('modalTitle')
            .textContent =
            'Nuevo bloque';

        document.getElementById('availabilityId').value = '';
        document.getElementById('availabilityForm').reset();

        document.getElementById('statusInput').value =
            'true';

        return;
    }

    document.getElementById('modalTitle')
        .textContent =
        'Editar bloque';

    document.getElementById('availabilityId').value =
        item.id;

    document.getElementById('personSelect').value =
        item.persona?.id || '';

    document.getElementById('dateInput').value =
        String(item.fecha).substring(0,10);

    document.getElementById('startTimeInput').value =
        formatearHora(item.horaInicio);

    document.getElementById('endTimeInput').value =
        formatearHora(item.horaFin);

    document.getElementById('statusInput').value =
        String(item.disponible);

    document.getElementById('reasonInput').value =
        item.motivo || '';
};

const cerrarModal = () => {
    document.getElementById('availabilityModal')
        .classList.add('hidden');
};

window.editarBloque = id => {
    const item =
        disponibilidad.find(
            registro =>
                Number(registro.id) === Number(id)
        );

    if (item) {
        abrirModal(item);
    }
};

window.eliminarBloque = async id => {
    if (
        !confirm(
            '¿Deseas eliminar este bloque de disponibilidad?'
        )
    ) {
        return;
    }

    const sesion =
        obtenerSesion();

    try {
        const respuesta =
            await fetch(
                `${API_URL}/disponibilidad/${id}`,
                {
                    method: 'DELETE',

                    headers: {
                        Authorization:
                            `Bearer ${sesion.token}`
                    }
                }
            );

        const datos =
            await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje
            );
        }

        await cargarDatos();
    } catch (error) {
        alert(
            error.message ||
            'No se pudo eliminar el bloque.'
        );
    }
};

const guardarBloque = async event => {
    event.preventDefault();

    const sesion =
        obtenerSesion();

    if (!sesion) return;

    const id =
        document.getElementById('availabilityId').value;

    const datos = {
        personaId:
            Number(
                document.getElementById('personSelect').value
            ),

        fecha:
            document.getElementById('dateInput').value,

        horaInicio:
            document.getElementById('startTimeInput').value,

        horaFin:
            document.getElementById('endTimeInput').value,

        disponible:
            document.getElementById('statusInput').value === 'true',

        motivo:
            document.getElementById('reasonInput').value.trim() || null
    };

    try {
        const respuesta =
            await fetch(
                id
                    ? `${API_URL}/disponibilidad/${id}`
                    : `${API_URL}/disponibilidad`,
                {
                    method:
                        id ? 'PUT' : 'POST',

                    headers: {
                        'Content-Type':
                            'application/json',

                        Authorization:
                            `Bearer ${sesion.token}`
                    },

                    body:
                        JSON.stringify(datos)
                }
            );

        const resultado =
            await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                resultado.mensaje
            );
        }

        cerrarModal();
        await cargarDatos();
    } catch (error) {
        alert(
            error.message ||
            'No se pudo guardar el bloque.'
        );
    }
};

const configurarEventos = () => {
    document.getElementById('newAvailabilityButton')
        .addEventListener(
            'click',
            () => abrirModal(null)
        );

    document.getElementById('closeModal')
        .addEventListener(
            'click',
            cerrarModal
        );

    document.getElementById('cancelModal')
        .addEventListener(
            'click',
            cerrarModal
        );

    document.getElementById('availabilityForm')
        .addEventListener(
            'submit',
            guardarBloque
        );

    document.getElementById('searchInput')
        .addEventListener(
            'input',
            aplicarFiltros
        );

    document.getElementById('roleFilter')
        .addEventListener(
            'change',
            aplicarFiltros
        );

    document.getElementById('availabilityFilter')
        .addEventListener(
            'change',
            aplicarFiltros
        );

    document.getElementById('dateFilter')
        .addEventListener(
            'change',
            aplicarFiltros
        );

    document.getElementById('clearFilters')
        .addEventListener(
            'click',
            limpiarFiltros
        );

    document.getElementById('logoutButton')
        .addEventListener(
            'click',
            cerrarSesion
        );

    document.getElementById('mobileMenu')
        .addEventListener(
            'click',
            () => {
                document.getElementById('sidebar')
                    .classList.toggle('open');
            }
        );
};

const iniciar = () => {
    const sesion =
        obtenerSesion();

    if (!sesion) return;

    mostrarUsuario(
        sesion.usuario
    );

    configurarEventos();
    cargarDatos();
};

iniciar();