const API_URL = 'http://localhost:3000/api';

let movimientoActual = null;

const movementId = document.getElementById('movementId');
const amount = document.getElementById('amount');
const receiptForm = document.getElementById('receiptForm');
const saveButton = document.getElementById('saveButton');
const formMessage = document.getElementById('formMessage');

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
    localStorage.removeItem('mc_token');
    localStorage.removeItem('mc_usuario');
    sessionStorage.removeItem('mc_token');
    sessionStorage.removeItem('mc_usuario');

    window.location.href = '../../index.html';
};

const obtenerIniciales = nombre => {
    if (!nombre) return 'MC';

    const partes = nombre.trim().split(/\s+/);

    return partes.length > 1
        ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
        : partes[0].substring(0, 2).toUpperCase();
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

const formatearMoneda = valor => {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN'
    }).format(Number(valor || 0));
};

const mostrarMensaje = (mensaje, tipo = 'error') => {
    formMessage.textContent = mensaje;
    formMessage.className = `form-message ${tipo}`;
};

const limpiarMensaje = () => {
    formMessage.textContent = '';
    formMessage.className = 'form-message hidden';
};

const actualizarResumenPago = () => {
    const pago = Number(amount.value || 0);

    document.getElementById('summaryNewPayment').textContent =
        formatearMoneda(pago);

    if (!movimientoActual) {
        document.getElementById('summaryRemaining').textContent =
            formatearMoneda(0);

        return;
    }

    const restante = Math.max(
        Number(movimientoActual.pendiente || 0) - pago,
        0
    );

    document.getElementById('summaryRemaining').textContent =
        formatearMoneda(restante);
};

const mostrarMovimiento = movimiento => {
    document.getElementById('clientName').value =
        movimiento.cliente?.nombre || '';

    document.getElementById('caseCode').value =
        movimiento.expediente?.codigo || '';

    document.getElementById('serviceName').value =
        movimiento.servicio || '';

    document.getElementById('pendingAmount').value =
        formatearMoneda(movimiento.pendiente);

    document.getElementById('summaryAgreed').textContent =
        formatearMoneda(movimiento.montoAcordado);

    document.getElementById('summaryCollected').textContent =
        formatearMoneda(movimiento.montoCobrado);

    document.getElementById('summaryPending').textContent =
        formatearMoneda(movimiento.pendiente);

    amount.max = movimiento.pendiente;

    if (!amount.value) {
        amount.value = movimiento.pendiente;
    }

    if (!document.getElementById('concept').value) {
        document.getElementById('concept').value =
            `Pago por ${movimiento.servicio || 'servicios legales'}`;
    }

    actualizarResumenPago();
};

const cargarMovimiento = async () => {
    limpiarMensaje();

    const id = Number(movementId.value);

    if (!Number.isInteger(id) || id <= 0) {
        movimientoActual = null;
        return;
    }

    const sesion = obtenerSesion();

    if (!sesion) return;

    try {
        const respuesta = await fetch(
            `${API_URL}/recibos/movimientos/${id}`,
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
                'No se pudo cargar el movimiento.'
            );
        }

        movimientoActual = datos.movimiento;

        mostrarMovimiento(movimientoActual);
    } catch (error) {
        movimientoActual = null;

        mostrarMensaje(
            error.message ||
            'No se pudo obtener el movimiento.'
        );
    }
};

const registrarRecibo = async event => {
    event.preventDefault();

    limpiarMensaje();

    if (!movimientoActual) {
        mostrarMensaje(
            'Primero selecciona un movimiento economico valido.'
        );

        return;
    }

    const sesion = obtenerSesion();

    if (!sesion) return;

    const datos = {
        movimientoId: movimientoActual.id,
        fechaEmision:
            document.getElementById('issueDate').value,
        concepto:
            document.getElementById('concept').value.trim(),
        monto:
            Number(amount.value),
        metodoPago:
            document.getElementById('paymentMethod').value,
        observaciones:
            document.getElementById('observations').value.trim() || null
    };

    try {
        saveButton.disabled = true;
        saveButton.textContent = 'Registrando...';

        const respuesta = await fetch(
            `${API_URL}/recibos`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sesion.token}`
                },
                body: JSON.stringify(datos)
            }
        );

        if (respuesta.status === 401 || respuesta.status === 403) {
            cerrarSesion();
            return;
        }

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                resultado.mensaje ||
                'No se pudo registrar el recibo.'
            );
        }

        mostrarMensaje(
            'Recibo registrado correctamente.',
            'success'
        );

        setTimeout(() => {
            window.location.href =
                `./recibo-detalle.html?id=${resultado.recibo.id}`;
        }, 500);
    } catch (error) {
        mostrarMensaje(
            error.message ||
            'No se pudo registrar el recibo.'
        );
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Registrar recibo';
    }
};

const configurarEventos = () => {
    document.getElementById('logoutButton').addEventListener(
        'click',
        cerrarSesion
    );

    movementId.addEventListener(
        'change',
        cargarMovimiento
    );

    amount.addEventListener(
        'input',
        actualizarResumenPago
    );

    receiptForm.addEventListener(
        'submit',
        registrarRecibo
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
    const sesion = obtenerSesion();

    if (!sesion) return;

    mostrarUsuario(sesion.usuario);

    document.getElementById('issueDate').value =
        new Date().toISOString().substring(0, 10);

    configurarEventos();

    const parametros =
        new URLSearchParams(window.location.search);

    const movimiento =
        parametros.get('movimiento');

    if (movimiento) {
        movementId.value = movimiento;
        cargarMovimiento();
    }
};

iniciarPagina();