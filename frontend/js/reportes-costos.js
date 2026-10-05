const API_URL = 'http://localhost:3000/api';

let datosReporte = null;
let movimientos = [];
let movimientosFiltrados = [];

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

const limpiarTexto = valor => {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
};

const formatearMoneda = valor => {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2
    }).format(Number(valor || 0));
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

const mostrarResumen = resumen => {
    document.getElementById('totalAgreed').textContent =
        formatearMoneda(resumen.totalAcordado);

    document.getElementById('totalCollected').textContent =
        formatearMoneda(resumen.totalCobrado);

    document.getElementById('totalPending').textContent =
        formatearMoneda(resumen.totalPendiente);

    document.getElementById('totalCosts').textContent =
        formatearMoneda(resumen.totalCostos);

    document.getElementById('grossMargin').textContent =
        formatearMoneda(resumen.margenBruto);
};

const renderizarGraficoMensual = registros => {
    const chart = document.getElementById('monthlyChart');

    if (!Array.isArray(registros) || registros.length === 0) {
        chart.innerHTML = `
            <div class="empty-state">
                <span>◇</span>
                <p>No existen datos mensuales disponibles.</p>
            </div>
        `;
        return;
    }

    const maximo = Math.max(
        ...registros.flatMap(item => [
            Number(item.cobrado || 0),
            Number(item.costos || 0),
            Number(item.margen || 0)
        ]),
        1
    );

    chart.innerHTML = registros.map(item => {
        const fecha = obtenerFecha(item.mes);

        const mes = fecha
            ? new Intl.DateTimeFormat('es-PE', {
                month: 'short'
            }).format(fecha).replace('.', '')
            : '—';

        const cobrado = Number(item.cobrado || 0);
        const costos = Number(item.costos || 0);
        const margen = Number(item.margen || 0);

        const alturaCobrado = Math.max((cobrado / maximo) * 100, 1);
        const alturaCostos = Math.max((costos / maximo) * 100, 1);
        const alturaMargen = Math.max((Math.max(margen, 0) / maximo) * 100, 1);

        return `
            <div class="month-column">
                <div class="month-bars">
                    <div
                        class="month-bar collected"
                        style="height:${alturaCobrado}%"
                        title="Cobrado: ${formatearMoneda(cobrado)}"
                    ></div>

                    <div
                        class="month-bar costs"
                        style="height:${alturaCostos}%"
                        title="Costos: ${formatearMoneda(costos)}"
                    ></div>

                    <div
                        class="month-bar margin"
                        style="height:${alturaMargen}%"
                        title="Margen: ${formatearMoneda(margen)}"
                    ></div>
                </div>

                <span class="month-label">${mes}</span>
            </div>
        `;
    }).join('');
};

const renderizarServicios = servicios => {
    const lista = document.getElementById('servicesList');
    const empty = document.getElementById('servicesEmpty');

    if (!Array.isArray(servicios) || servicios.length === 0) {
        lista.innerHTML = '';
        lista.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    lista.classList.remove('hidden');

    const maximo = Math.max(
        ...servicios.map(item => Number(item.cobrado || 0)),
        1
    );

    lista.innerHTML = servicios.map(item => {
        const porcentaje = Math.max(
            (Number(item.cobrado || 0) / maximo) * 100,
            2
        );

        return `
            <div class="service-item">
                <div class="service-header">
                    <strong>${item.servicio || 'Sin especificar'}</strong>
                    <span>${formatearMoneda(item.cobrado)}</span>
                </div>

                <div class="progress-track">
                    <div class="progress-value" style="width:${porcentaje}%"></div>
                </div>

                <div class="service-details">
                    <span>${item.movimientos} movimientos</span>
                    <span>Pendiente: ${formatearMoneda(item.pendiente)}</span>
                </div>
            </div>
        `;
    }).join('');
};

const renderizarDistribucion = (registros, contenedorId, campoNombre) => {
    const contenedor = document.getElementById(contenedorId);

    if (!Array.isArray(registros) || registros.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <span>◇</span>
                <p>Sin información registrada.</p>
            </div>
        `;
        return;
    }

    const maximo = Math.max(
        ...registros.map(item => Number(item.cantidad || 0)),
        1
    );

    contenedor.innerHTML = registros.map(item => {
        const cantidad = Number(item.cantidad || 0);
        const porcentaje = Math.max((cantidad / maximo) * 100, 3);

        return `
            <div class="distribution-item">
                <div class="distribution-header">
                    <strong>${item[campoNombre] || 'Sin especificar'}</strong>
                    <span>${cantidad}</span>
                </div>

                <div class="progress-track">
                    <div class="progress-value" style="width:${porcentaje}%"></div>
                </div>
            </div>
        `;
    }).join('');
};

const renderizarPagosPendientes = registros => {
    const tbody = document.getElementById('pendingTableBody');
    const container = document.getElementById('pendingTableContainer');
    const empty = document.getElementById('pendingEmpty');
    const counter = document.getElementById('pendingCounter');

    const pagos = Array.isArray(registros)
        ? registros
        : [];

    counter.textContent =
        `${pagos.length} ${pagos.length === 1 ? 'pago pendiente' : 'pagos pendientes'}`;

    if (pagos.length === 0) {
        tbody.innerHTML = '';
        container.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    container.classList.remove('hidden');

    tbody.innerHTML = pagos.map(item => {
        return `
            <tr>
                <td>
                    <span class="entity-primary">
                        ${item.cliente?.nombre || 'Sin cliente'}
                    </span>
                </td>

                <td>
                    <span class="entity-primary">
                        ${item.expediente?.codigo || '—'}
                    </span>

                    <span class="entity-secondary">
                        ${item.expediente?.numero || 'Sin número'}
                    </span>
                </td>

                <td>${item.servicio || '—'}</td>

                <td>
                    <span class="money">
                        ${formatearMoneda(item.montoAcordado)}
                    </span>
                </td>

                <td>
                    <span class="money positive">
                        ${formatearMoneda(item.montoCobrado)}
                    </span>
                </td>

                <td>
                    <span class="money pending">
                        ${formatearMoneda(item.pendiente)}
                    </span>
                </td>

                <td>
                    <span class="payment-status">
                        ${item.estadoCobro || 'Pendiente'}
                    </span>
                </td>

                <td>
                    <a
                        href="./recibo-nuevo.html?movimiento=${item.id}"
                        class="table-action"
                    >
                        Registrar pago
                    </a>
                </td>
            </tr>
        `;
    }).join('');
};

const cargarEstadosCobro = () => {
    const filtro = document.getElementById('paymentStatusFilter');

    const estados = movimientos
        .map(item => item.estadoCobro)
        .filter(Boolean);

    const unicos = [...new Set(estados)]
        .sort((a, b) => a.localeCompare(b, 'es'));

    filtro.innerHTML = `
        <option value="">Todos los estados</option>
    `;

    unicos.forEach(estado => {
        const option = document.createElement('option');

        option.value = estado;
        option.textContent = estado;

        filtro.appendChild(option);
    });
};

const renderizarMovimientos = () => {
    const tbody = document.getElementById('movementsTableBody');
    const container = document.getElementById('movementsTableContainer');
    const empty = document.getElementById('movementsEmpty');
    const counter = document.getElementById('movementCounter');

    counter.textContent =
        `${movimientosFiltrados.length} ${movimientosFiltrados.length === 1 ? 'movimiento encontrado' : 'movimientos encontrados'}`;

    if (movimientosFiltrados.length === 0) {
        tbody.innerHTML = '';
        container.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    container.classList.remove('hidden');

    tbody.innerHTML = movimientosFiltrados.map(item => {
        return `
            <tr>
                <td>${formatearFecha(item.fecha)}</td>

                <td>
                    <span class="entity-primary">
                        ${item.cliente?.nombre || 'Sin cliente'}
                    </span>
                </td>

                <td>${item.servicio || '—'}</td>

                <td>
                    ${
                        item.expediente?.id
                            ? `
                                <a
                                    href="./expediente-detalle.html?id=${item.expediente.id}"
                                    class="table-action"
                                >
                                    ${item.expediente.codigo || 'Expediente'}
                                </a>
                            `
                            : '—'
                    }
                </td>

                <td>
                    <span class="money">
                        ${formatearMoneda(item.montoAcordado)}
                    </span>
                </td>

                <td>
                    <span class="money positive">
                        ${formatearMoneda(item.montoCobrado)}
                    </span>
                </td>

                <td>
                    <span class="money">
                        ${formatearMoneda(item.costoDirecto)}
                    </span>
                </td>

                <td>
                    <span class="money ${Number(item.margenBruto) >= 0 ? 'positive' : 'pending'}">
                        ${formatearMoneda(item.margenBruto)}
                    </span>
                </td>

                <td>
                    <span class="payment-status">
                        ${item.estadoCobro || '—'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
};

const aplicarFiltrosMovimientos = () => {
    const busqueda = limpiarTexto(
        document.getElementById('movementSearch').value
    );

    const estado = document.getElementById('paymentStatusFilter').value;

    movimientosFiltrados = movimientos.filter(item => {
        const texto = limpiarTexto([
            item.servicio,
            item.canal,
            item.estadoCobro,
            item.observaciones,
            item.cliente?.nombre,
            item.expediente?.codigo,
            item.expediente?.numero,
            item.expediente?.titulo
        ].join(' '));

        const coincideBusqueda =
            !busqueda ||
            texto.includes(busqueda);

        const coincideEstado =
            !estado ||
            item.estadoCobro === estado;

        return coincideBusqueda && coincideEstado;
    });

    renderizarMovimientos();
};

const limpiarFiltrosMovimientos = () => {
    document.getElementById('movementSearch').value = '';
    document.getElementById('paymentStatusFilter').value = '';

    movimientosFiltrados = [...movimientos];

    renderizarMovimientos();
};

const mostrarError = mensaje => {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('reportsBody').classList.add('hidden');

    document.getElementById('errorState').classList.remove('hidden');
    document.getElementById('errorMessage').textContent = mensaje;
};

const cargarReportes = async () => {
    const sesion = obtenerSesion();

    if (!sesion) return;

    try {
        const respuesta = await fetch(
            `${API_URL}/reportes/panel`,
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
                'No se pudieron cargar los reportes.'
            );
        }

        datosReporte = datos;

        movimientos = Array.isArray(datos.movimientos)
            ? datos.movimientos
            : [];

        movimientosFiltrados = [...movimientos];

        mostrarResumen(datos.resumen || {});
        renderizarGraficoMensual(datos.ingresosMensuales || []);
        renderizarServicios(datos.servicios || []);

        renderizarDistribucion(
            datos.expedientesPorEstado || [],
            'statusDistribution',
            'estado'
        );

        renderizarDistribucion(
            datos.expedientesPorMateria || [],
            'matterDistribution',
            'materia'
        );

        renderizarPagosPendientes(
            datos.pagosPendientes || []
        );

        cargarEstadosCobro();
        renderizarMovimientos();

        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('errorState').classList.add('hidden');
        document.getElementById('reportsBody').classList.remove('hidden');
    } catch (error) {
        console.error('Error al cargar reportes:', error);

        mostrarError(
            error.message ||
            'No se pudo cargar la información financiera.'
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

    document.getElementById('movementSearch').addEventListener(
        'input',
        aplicarFiltrosMovimientos
    );

    document.getElementById('paymentStatusFilter').addEventListener(
        'change',
        aplicarFiltrosMovimientos
    );

    document.getElementById('clearMovementFilters').addEventListener(
        'click',
        limpiarFiltrosMovimientos
    );

    globalSearch.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;

        document.getElementById('movementSearch').value =
            globalSearch.value.trim();

        aplicarFiltrosMovimientos();
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
    cargarReportes();
};

iniciarPagina();