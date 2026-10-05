const API_URL = 'http://localhost:3000/api';

let abogadoActual = null;

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

const formatearFecha = fecha => {
    if (!fecha) return '—';

    const fechaObjeto = new Date(`${String(fecha).substring(0, 10)}T00:00:00`);

    if (Number.isNaN(fechaObjeto.getTime())) {
        return fecha;
    }

    return new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(fechaObjeto);
};

const obtenerDiaMes = fecha => {
    if (!fecha) {
        return {
            dia: '--',
            mes: '---'
        };
    }

    const fechaObjeto = new Date(`${String(fecha).substring(0, 10)}T00:00:00`);

    if (Number.isNaN(fechaObjeto.getTime())) {
        return {
            dia: '--',
            mes: '---'
        };
    }

    return {
        dia: String(fechaObjeto.getDate()).padStart(2, '0'),
        mes: new Intl.DateTimeFormat('es-PE', {
            month: 'short'
        }).format(fechaObjeto).replace('.', '')
    };
};

const formatearHora = hora => {
    if (!hora) return '—';

    return String(hora).substring(0, 5);
};

const obtenerClaseEstadoExpediente = estado => {
    const normalizado = String(estado || '').toLowerCase();

    if (normalizado === 'activo') return 'status-active-case';
    if (normalizado === 'en revisión') return 'status-review';
    if (normalizado === 'en espera') return 'status-waiting';
    if (normalizado === 'suspendido') return 'status-suspended';
    if (normalizado === 'cerrado') return 'status-closed';
    if (normalizado === 'archivado') return 'status-archived';

    return 'status-waiting';
};

const mostrarFoto = abogado => {
    const initials = document.getElementById('lawyerInitials');
    const image = document.getElementById('lawyerImage');

    initials.textContent = obtenerIniciales(abogado.nombre);

    if (!abogado.fotoUrl) {
        image.classList.add('hidden');
        initials.classList.remove('hidden');
        return;
    }

    image.src = abogado.fotoUrl;

    image.onload = () => {
        initials.classList.add('hidden');
        image.classList.remove('hidden');
    };

    image.onerror = () => {
        image.classList.add('hidden');
        initials.classList.remove('hidden');
    };
};

const mostrarPerfil = abogado => {
    const especialidad =
        abogado.especialidad ||
        abogado.materia?.nombre ||
        'Especialidad no registrada';

    const materia =
        abogado.materia?.nombre ||
        'Área legal no registrada';

    document.getElementById('breadcrumbLawyer').textContent =
        valorSeguro(abogado.nombre, 'Perfil profesional');

    document.getElementById('lawyerName').textContent =
        valorSeguro(abogado.nombre, 'Abogado');

    document.getElementById('lawyerSpecialty').textContent =
        especialidad;

    document.getElementById('lawyerMatter').textContent =
        materia;

    document.getElementById('lawyerRegistrationShort').textContent =
        `Colegiatura: ${valorSeguro(abogado.numeroColegiatura)}`;

    const status = document.getElementById('lawyerStatus');

    if (abogado.activo === false) {
        status.textContent = 'Inactivo';
        status.className = 'status-badge inactive';
    } else {
        status.textContent = 'Activo';
        status.className = 'status-badge active';
    }

    document.getElementById('infoEmail').textContent =
        valorSeguro(abogado.correo);

    document.getElementById('infoPhone').textContent =
        valorSeguro(abogado.telefono);

    document.getElementById('infoDocument').textContent =
        valorSeguro(abogado.numeroDocumento);

    document.getElementById('infoSpecialty').textContent =
        especialidad;

    document.getElementById('infoRegistration').textContent =
        valorSeguro(abogado.numeroColegiatura);

    document.getElementById('infoAssociation').textContent =
        valorSeguro(abogado.colegioAbogados);

    document.getElementById('infoAddress').textContent =
        valorSeguro(abogado.direccion);

    document.getElementById('lawyerBiography').textContent =
        valorSeguro(
            abogado.biografia,
            'Sin biografía profesional registrada.'
        );

    mostrarFoto(abogado);
};

const actualizarResumen = abogado => {
    const expedientes = Array.isArray(abogado.expedientes)
        ? abogado.expedientes
        : [];

    const audiencias = Array.isArray(abogado.audiencias)
        ? abogado.audiencias
        : [];

    const disponibilidad = Array.isArray(abogado.disponibilidad)
        ? abogado.disponibilidad
        : [];

    const expedientesActivos = expedientes.filter(expediente => {
        return !['Cerrado', 'Archivado'].includes(expediente.estado);
    }).length;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const audienciasProximas = audiencias.filter(audiencia => {
        if (!audiencia.fecha) return false;

        const fecha = new Date(
            `${String(audiencia.fecha).substring(0, 10)}T00:00:00`
        );

        return fecha >= hoy;
    }).length;

    const disponibles = disponibilidad.filter(item => {
        return item.disponible !== false;
    }).length;

    document.getElementById('totalCases').textContent =
        expedientes.length;

    document.getElementById('activeCases').textContent =
        expedientesActivos;

    document.getElementById('upcomingHearings').textContent =
        audienciasProximas;

    document.getElementById('availableSlots').textContent =
        disponibles;
};

const crearDisponibilidad = item => {
    const disponible = item.disponible !== false;

    return `
        <div class="availability-item">
            <div class="availability-date">
                <strong>${formatearFecha(item.fecha)}</strong>
                <span>${disponible ? 'Agenda abierta' : 'No disponible'}</span>
            </div>

            <div class="availability-time">
                <strong>
                    ${formatearHora(item.horaInicio)}
                    -
                    ${formatearHora(item.horaFin)}
                </strong>

                <span>
                    ${valorSeguro(
                        item.motivo,
                        disponible
                            ? 'Disponible para atención'
                            : 'Bloque no disponible'
                    )}
                </span>
            </div>

            <span class="availability-state ${disponible ? 'available' : 'busy'}">
                ${disponible ? 'Disponible' : 'Ocupado'}
            </span>
        </div>
    `;
};

const mostrarDisponibilidad = disponibilidad => {
    const lista = document.getElementById('availabilityList');
    const empty = document.getElementById('availabilityEmpty');

    const registros = Array.isArray(disponibilidad)
        ? disponibilidad.slice(0, 5)
        : [];

    if (registros.length === 0) {
        lista.innerHTML = '';
        lista.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    lista.classList.remove('hidden');

    lista.innerHTML = registros
        .map(crearDisponibilidad)
        .join('');
};

const crearAudiencia = audiencia => {
    const fecha = obtenerDiaMes(audiencia.fecha);

    const informacionSecundaria = [
        audiencia.tipo,
        audiencia.cliente,
        audiencia.juzgadoSala
    ]
        .filter(Boolean)
        .join(' · ');

    return `
        <div class="hearing-item">
            <div class="hearing-date">
                <strong>${fecha.dia}</strong>
                <span>${fecha.mes}</span>
            </div>

            <div class="hearing-info">
                <h3>${valorSeguro(audiencia.titulo, 'Audiencia')}</h3>

                <p>
                    ${informacionSecundaria || 'Sin información adicional'}
                </p>
            </div>

            <span class="hearing-time">
                ${formatearHora(audiencia.horaInicio)}
            </span>
        </div>
    `;
};

const mostrarAudiencias = audiencias => {
    const lista = document.getElementById('hearingsList');
    const empty = document.getElementById('hearingsEmpty');
    const contador = document.getElementById('hearingsCounter');

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const proximas = (Array.isArray(audiencias) ? audiencias : [])
        .filter(audiencia => {
            if (!audiencia.fecha) return false;

            const fecha = new Date(
                `${String(audiencia.fecha).substring(0, 10)}T00:00:00`
            );

            return fecha >= hoy;
        })
        .sort((a, b) => {
            return new Date(a.fecha) - new Date(b.fecha);
        });

    contador.textContent =
        `${proximas.length} ${proximas.length === 1 ? 'audiencia' : 'audiencias'}`;

    if (proximas.length === 0) {
        lista.innerHTML = '';
        lista.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    lista.classList.remove('hidden');

    lista.innerHTML = proximas
        .slice(0, 4)
        .map(crearAudiencia)
        .join('');
};

const crearFilaExpediente = expediente => {
    const titulo =
        expediente.titulo ||
        expediente.proximoHito ||
        'Expediente legal';

    return `
        <tr>
            <td>
                <span class="case-code">
                    ${valorSeguro(expediente.codigo)}
                </span>
            </td>

            <td>
                <span class="case-title">
                    ${titulo}
                </span>

                <span class="case-number">
                    ${valorSeguro(
                        expediente.numeroExpediente,
                        'Sin número judicial'
                    )}
                </span>
            </td>

            <td>
                <span class="case-title">
                    ${valorSeguro(expediente.cliente?.nombre)}
                </span>
            </td>

            <td>
                ${valorSeguro(expediente.materia)}
            </td>

            <td>
                <span class="case-title">
                    ${valorSeguro(expediente.proximoHito)}
                </span>

                <span class="case-secondary">
                    ${formatearFecha(expediente.fechaHito)}
                </span>
            </td>

            <td>
                <span class="case-status ${obtenerClaseEstadoExpediente(expediente.estado)}">
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

const mostrarExpedientes = expedientes => {
    const registros = Array.isArray(expedientes)
        ? expedientes
        : [];

    const contador = document.getElementById('casesCounter');
    const empty = document.getElementById('casesEmpty');
    const container = document.getElementById('casesTableContainer');
    const tbody = document.getElementById('casesTableBody');

    contador.textContent =
        `${registros.length} ${registros.length === 1 ? 'expediente' : 'expedientes'}`;

    if (registros.length === 0) {
        tbody.innerHTML = '';
        container.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    container.classList.remove('hidden');

    tbody.innerHTML = registros
        .map(crearFilaExpediente)
        .join('');
};

const mostrarError = mensaje => {
    document.getElementById('detailBody').classList.add('hidden');
    document.getElementById('detailError').classList.remove('hidden');
    document.getElementById('detailErrorMessage').textContent = mensaje;
};

const cargarAbogado = async () => {
    const sesion = obtenerSesion();

    if (!sesion) return;

    const parametros = new URLSearchParams(window.location.search);
    const idAbogado = parametros.get('id');

    if (!idAbogado) {
        mostrarError('No se indicó qué abogado se desea consultar.');
        return;
    }

    try {
        const respuesta = await fetch(
            `${API_URL}/abogados/${idAbogado}`,
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
                datos.mensaje || 'No se pudo obtener el abogado.'
            );
        }

        abogadoActual = datos.abogado;

        mostrarPerfil(abogadoActual);
        actualizarResumen(abogadoActual);
        mostrarDisponibilidad(abogadoActual.disponibilidad);
        mostrarAudiencias(abogadoActual.audiencias);
        mostrarExpedientes(abogadoActual.expedientes);

        document.getElementById('detailError').classList.add('hidden');
        document.getElementById('detailBody').classList.remove('hidden');
    } catch (error) {
        console.error('Error al cargar abogado:', error);

        mostrarError(
            error.message || 'No se pudo cargar la información del abogado.'
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
            `./abogados.html?q=${encodeURIComponent(termino)}`;
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
    cargarAbogado();
};

iniciarPagina();