const API_URL = 'http://localhost:3000/api';

let modoEdicion = false;
let idCliente = null;
let clienteActual = null;

const clientForm = document.getElementById('clientForm');
const tipoDocumento = document.getElementById('tipoDocumento');
const numeroDocumento = document.getElementById('numeroDocumento');
const nombreCliente = document.getElementById('nombreCliente');
const fotoUrl = document.getElementById('fotoUrl');
const telefono = document.getElementById('telefono');
const correo = document.getElementById('correo');
const contactoPrincipal = document.getElementById('contactoPrincipal');
const representanteLegal = document.getElementById('representanteLegal');
const direccion = document.getElementById('direccion');
const consentimientoContacto = document.getElementById('consentimientoContacto');
const observaciones = document.getElementById('observaciones');
const formMessage = document.getElementById('formMessage');
const saveButton = document.getElementById('saveButton');
const saveButtonText = document.getElementById('saveButtonText');
const photoInitials = document.getElementById('photoInitials');
const photoImage = document.getElementById('photoImage');

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
    const nombre = usuario.nombre || usuario.nombreCompleto || 'Usuario';

    document.getElementById('userName').textContent = nombre;
    document.getElementById('userRole').textContent = usuario.rol || 'USUARIO';
    document.getElementById('userAvatar').textContent = obtenerIniciales(nombre);
};

const generarCodigoCliente = () => {
    const fecha = new Date();

    const anio = fecha.getFullYear().toString().slice(-2);
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const hora = String(fecha.getHours()).padStart(2, '0');
    const minuto = String(fecha.getMinutes()).padStart(2, '0');
    const segundo = String(fecha.getSeconds()).padStart(2, '0');

    return `CLI-${anio}${mes}${dia}${hora}${minuto}${segundo}`;
};

const mostrarMensaje = (mensaje, tipo = 'error') => {
    formMessage.textContent = mensaje;
    formMessage.className = `form-message ${tipo}`;
    formMessage.classList.remove('hidden');

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
};

const ocultarMensaje = () => {
    formMessage.className = 'form-message hidden';
    formMessage.textContent = '';
};

const actualizarVistaPrevia = () => {
    const nombre = nombreCliente.value.trim();

    photoInitials.textContent = obtenerIniciales(nombre || 'MC');

    const url = fotoUrl.value.trim();

    if (!url) {
        photoImage.classList.add('hidden');
        photoInitials.classList.remove('hidden');
        photoImage.removeAttribute('src');
        return;
    }

    photoImage.src = url;

    photoImage.onload = () => {
        photoInitials.classList.add('hidden');
        photoImage.classList.remove('hidden');
    };

    photoImage.onerror = () => {
        photoImage.classList.add('hidden');
        photoInitials.classList.remove('hidden');
    };
};

const configurarModoEdicion = () => {
    const parametros = new URLSearchParams(window.location.search);
    const id = parametros.get('id');

    if (!id) {
        modoEdicion = false;
        return;
    }

    idCliente = Number(id);

    if (!Number.isInteger(idCliente) || idCliente <= 0) {
        modoEdicion = false;
        idCliente = null;
        return;
    }

    modoEdicion = true;

    document.title = 'Editar Cliente | M&C Abogados';
    document.getElementById('breadcrumbCurrent').textContent = 'Editar cliente';
    document.getElementById('pageTitle').textContent = 'Editar cliente';
    document.getElementById('pageDescription').textContent = 'Actualiza la información registrada del cliente.';
    saveButtonText.textContent = 'Guardar cambios';
};

const cargarCliente = async (sesion) => {
    if (!modoEdicion) return;

    try {
        saveButton.disabled = true;
        saveButtonText.textContent = 'Cargando...';

        const respuesta = await fetch(`${API_URL}/clientes/${idCliente}`, {
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
                datos.mensaje || 'No se pudo obtener el cliente.'
            );
        }

        clienteActual = datos.cliente;

        tipoDocumento.value = clienteActual.tipoDocumento || '';
        numeroDocumento.value = clienteActual.numeroDocumento || '';
        nombreCliente.value = clienteActual.nombre || '';
        fotoUrl.value = clienteActual.fotoUrl || '';
        telefono.value = clienteActual.telefono || '';
        correo.value = clienteActual.correo || '';
        contactoPrincipal.value = clienteActual.contactoPrincipal || '';
        representanteLegal.value = clienteActual.representanteLegal || '';
        direccion.value = clienteActual.direccion || '';
        consentimientoContacto.value = clienteActual.consentimientoContacto || '';
        observaciones.value = clienteActual.observaciones || '';

        actualizarVistaPrevia();
    } catch (error) {
        console.error('Error al cargar cliente:', error);

        mostrarMensaje(
            error.message || 'No se pudo cargar el cliente.'
        );
    } finally {
        saveButton.disabled = false;
        saveButtonText.textContent = 'Guardar cambios';
    }
};

const validarFormulario = () => {
    const nombre = nombreCliente.value.trim();
    const documento = numeroDocumento.value.trim();
    const tipo = tipoDocumento.value;

    if (!tipo) {
        mostrarMensaje('Selecciona el tipo de documento.');
        tipoDocumento.focus();
        return false;
    }

    if (!documento) {
        mostrarMensaje('Ingresa el número de documento.');
        numeroDocumento.focus();
        return false;
    }

    if (!nombre) {
        mostrarMensaje('Ingresa el nombre o razón social del cliente.');
        nombreCliente.focus();
        return false;
    }

    if (tipo === 'DNI' && !/^\d{8}$/.test(documento)) {
        mostrarMensaje('El DNI debe contener exactamente 8 números.');
        numeroDocumento.focus();
        return false;
    }

    if (tipo === 'RUC' && !/^\d{11}$/.test(documento)) {
        mostrarMensaje('El RUC debe contener exactamente 11 números.');
        numeroDocumento.focus();
        return false;
    }

    return true;
};

const obtenerDatosFormulario = () => {
    return {
        nombreCliente: nombreCliente.value.trim(),
        tipoDocumentoIdentidad: tipoDocumento.value,
        numeroDocumento: numeroDocumento.value.trim(),
        contactoPrincipal: contactoPrincipal.value.trim() || null,
        representanteLegal: representanteLegal.value.trim() || null,
        telefono: telefono.value.trim() || null,
        correo: correo.value.trim() || null,
        direccion: direccion.value.trim() || null,
        fotoUrl: fotoUrl.value.trim() || null,
        consentimientoContacto: consentimientoContacto.value || null,
        observaciones: observaciones.value.trim() || null
    };
};

const registrarCliente = async (sesion) => {
    const datos = obtenerDatosFormulario();

    datos.codigo = generarCodigoCliente();

    return fetch(`${API_URL}/clientes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sesion.token}`
        },
        body: JSON.stringify(datos)
    });
};

const actualizarCliente = async (sesion) => {
    const datos = obtenerDatosFormulario();

    return fetch(`${API_URL}/clientes/${idCliente}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sesion.token}`
        },
        body: JSON.stringify(datos)
    });
};

const guardarCliente = async event => {
    event.preventDefault();

    ocultarMensaje();

    if (!validarFormulario()) return;

    const sesion = obtenerSesion();

    if (!sesion) return;

    try {
        saveButton.disabled = true;
        saveButtonText.textContent = modoEdicion
            ? 'Guardando cambios...'
            : 'Registrando cliente...';

        const respuesta = modoEdicion
            ? await actualizarCliente(sesion)
            : await registrarCliente(sesion);

        if (respuesta.status === 401 || respuesta.status === 403) {
            cerrarSesion();
            return;
        }

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje || 'No se pudo guardar el cliente.'
            );
        }

        mostrarMensaje(
            modoEdicion
                ? 'Cliente actualizado correctamente.'
                : 'Cliente registrado correctamente.',
            'success'
        );

        const clienteGuardado = datos.cliente;

        const clienteId =
            clienteGuardado?.id_cliente ||
            clienteGuardado?.id ||
            idCliente;

        setTimeout(() => {
            if (clienteId) {
                window.location.href =
                    `./cliente-detalle.html?id=${clienteId}`;
            } else {
                window.location.href = './clientes.html';
            }
        }, 600);
    } catch (error) {
        console.error('Error al guardar cliente:', error);

        mostrarMensaje(
            error.message || 'No se pudo guardar el cliente.'
        );
    } finally {
        saveButton.disabled = false;
        saveButtonText.textContent = modoEdicion
            ? 'Guardar cambios'
            : 'Registrar cliente';
    }
};

const configurarEventos = () => {
    const sidebar = document.getElementById('sidebar');
    const mobileMenu = document.getElementById('mobileMenu');
    const globalSearch = document.getElementById('globalSearch');

    clientForm.addEventListener('submit', guardarCliente);

    nombreCliente.addEventListener('input', actualizarVistaPrevia);
    fotoUrl.addEventListener('input', actualizarVistaPrevia);

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

const iniciarPagina = async () => {
    const sesion = obtenerSesion();

    if (!sesion) return;

    mostrarUsuario(sesion.usuario);
    configurarModoEdicion();
    configurarEventos();
    actualizarVistaPrevia();

    if (modoEdicion) {
        await cargarCliente(sesion);
    }
};

iniciarPagina();