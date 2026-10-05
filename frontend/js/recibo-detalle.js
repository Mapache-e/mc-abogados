const API_URL = 'http://localhost:3000/api';

let reciboActual = null;

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
    if (
        valor === null ||
        valor === undefined ||
        valor === ''
    ) {
        return alternativo;
    }

    return valor;
};

const obtenerIniciales = nombre => {
    if (!nombre) return 'MC';

    const partes = nombre.trim().split(/\s+/);

    if (partes.length === 1) {
        return partes[0]
            .substring(0, 2)
            .toUpperCase();
    }

    return `${partes[0][0]}${partes[1][0]}`
        .toUpperCase();
};

const mostrarUsuario = usuario => {
    const nombre =
        usuario.nombre ||
        usuario.nombreCompleto ||
        'Usuario';

    document.getElementById('userName').textContent =
        nombre;

    document.getElementById('userRole').textContent =
        usuario.rol || 'USUARIO';

    document.getElementById('userAvatar').textContent =
        obtenerIniciales(nombre);
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

    return new Date(
        `${String(fecha).substring(0, 10)}T00:00:00`
    );
};

const formatearFecha = fecha => {
    const objeto = obtenerFecha(fecha);

    if (
        !objeto ||
        Number.isNaN(objeto.getTime())
    ) {
        return '—';
    }

    return new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }).format(objeto);
};

const mostrarCliente = cliente => {
    document.getElementById('clientName').textContent =
        valorSeguro(cliente?.nombre);

    document.getElementById('clientCode').textContent =
        valorSeguro(cliente?.codigo);

    const documento = [
        cliente?.tipoDocumento,
        cliente?.numeroDocumento
    ]
        .filter(Boolean)
        .join(' ');

    document.getElementById('clientDocument').textContent =
        valorSeguro(documento);

    document.getElementById('clientEmail').textContent =
        valorSeguro(cliente?.correo);

    document.getElementById('clientPhone').textContent =
        valorSeguro(cliente?.telefono);

    document.getElementById('clientAddress').textContent =
        valorSeguro(cliente?.direccion);

    if (cliente?.id) {
        document.getElementById('clientDetailButton').href =
            `./cliente-detalle.html?id=${cliente.id}`;
    }
};

const mostrarExpediente = expediente => {
    document.getElementById('caseCode').textContent =
        valorSeguro(expediente?.codigo);

    document.getElementById('caseNumber').textContent =
        valorSeguro(expediente?.numero);

    document.getElementById('caseTitle').textContent =
        valorSeguro(
            expediente?.titulo,
            'Expediente legal'
        );

    if (expediente?.id) {
        document.getElementById('caseDetailButton').href =
            `./expediente-detalle.html?id=${expediente.id}`;
    }
};

const mostrarMovimiento = movimiento => {
    document.getElementById('serviceName').textContent =
        valorSeguro(movimiento?.servicio);

    document.getElementById('agreedAmount').textContent =
        formatearMoneda(
            movimiento?.montoAcordado
        );

    document.getElementById('collectedAmount').textContent =
        formatearMoneda(
            movimiento?.montoCobrado
        );

    document.getElementById('remainingAmount').textContent =
        formatearMoneda(
            movimiento?.pendiente
        );

    document.getElementById('paymentStatus').textContent =
        valorSeguro(
            movimiento?.estadoCobro
        );
};

const mostrarRecibo = recibo => {
    document.title =
        `${recibo.numero || 'Recibo'} | M&C Abogados`;

    document.getElementById('breadcrumbReceipt').textContent =
        valorSeguro(recibo.numero, 'Recibo');

    document.getElementById('pageReceiptNumber').textContent =
        valorSeguro(recibo.numero, 'Recibo');

    document.getElementById('receiptNumber').textContent =
        valorSeguro(recibo.numero);

    document.getElementById('sideReceiptNumber').textContent =
        valorSeguro(recibo.numero);

    const monto =
        formatearMoneda(recibo.monto);

    document.getElementById('receiptAmountMain').textContent =
        monto;

    document.getElementById('receiptAmount').textContent =
        monto;

    document.getElementById('sideReceiptAmount').textContent =
        monto;

    const fecha =
        formatearFecha(recibo.fechaEmision);

    document.getElementById('receiptDateMain').textContent =
        fecha;

    document.getElementById('receiptDate').textContent =
        fecha;

    document.getElementById('sideReceiptDate').textContent =
        fecha;

    document.getElementById('receiptConcept').textContent =
        valorSeguro(recibo.concepto);

    document.getElementById('paymentMethod').textContent =
        valorSeguro(recibo.metodoPago);

    document.getElementById('sidePaymentMethod').textContent =
        valorSeguro(recibo.metodoPago);

    document.getElementById('receiptObservations').textContent =
        valorSeguro(
            recibo.observaciones,
            'Sin observaciones registradas.'
        );

    mostrarCliente(recibo.cliente);
    mostrarExpediente(recibo.expediente);
    mostrarMovimiento(recibo.movimiento);
};

const mostrarError = mensaje => {
    document.getElementById('detailBody')
        .classList.add('hidden');

    document.getElementById('detailError')
        .classList.remove('hidden');

    document.getElementById('detailErrorMessage').textContent =
        mensaje;
};

const cargarRecibo = async () => {
    const sesion = obtenerSesion();

    if (!sesion) return;

    const parametros =
        new URLSearchParams(window.location.search);

    const idRecibo =
        parametros.get('id');

    if (!idRecibo) {
        mostrarError(
            'No se indicó qué recibo se desea consultar.'
        );

        return;
    }

    try {
        const respuesta = await fetch(
            `${API_URL}/recibos/${idRecibo}`,
            {
                headers: {
                    Authorization: `Bearer ${sesion.token}`
                }
            }
        );

        if (
            respuesta.status === 401 ||
            respuesta.status === 403
        ) {
            cerrarSesion();
            return;
        }

        const datos =
            await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje ||
                'No se pudo obtener el recibo.'
            );
        }

        reciboActual =
            datos.recibo;

        mostrarRecibo(
            reciboActual
        );

        document.getElementById('detailError')
            .classList.add('hidden');

        document.getElementById('detailBody')
            .classList.remove('hidden');
    } catch (error) {
        console.error(
            'Error al cargar recibo:',
            error
        );

        mostrarError(
            error.message ||
            'No se pudo cargar el recibo.'
        );
    }
};

const configurarEventos = () => {
    document.getElementById('logoutButton').addEventListener(
        'click',
        cerrarSesion
    );

    document.getElementById('printButton').addEventListener(
        'click',
        () => {
            window.print();
        }
    );

    document.getElementById('mobileMenu').addEventListener(
        'click',
        () => {
            document.getElementById('sidebar')
                .classList.toggle('open');
        }
    );
};

const iniciarPagina = () => {
    const sesion =
        obtenerSesion();

    if (!sesion) return;

    mostrarUsuario(
        sesion.usuario
    );

    configurarEventos();

    cargarRecibo();
};

iniciarPagina();