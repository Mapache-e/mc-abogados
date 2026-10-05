const API_URL = 'http://localhost:3000/api';

let idPracticante = null;

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
        usuario:
            JSON.parse(usuarioGuardado)
    };
};

const cerrarSesion = () => {
    localStorage.removeItem('mc_token');
    localStorage.removeItem('mc_usuario');
    sessionStorage.removeItem('mc_token');
    sessionStorage.removeItem('mc_usuario');

    window.location.href =
        '../../index.html';
};

const iniciales = nombre => {
    if (!nombre) return 'MC';

    const partes =
        nombre.trim().split(/\s+/);

    return partes.length > 1
        ? `${partes[0][0]}${partes[1][0]}`.toUpperCase()
        : partes[0].substring(0, 2).toUpperCase();
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
        iniciales(nombre);
};

const mostrarMensaje = (
    texto,
    tipo = 'error'
) => {
    const mensaje =
        document.getElementById('message');

    mensaje.textContent =
        texto;

    mensaje.className =
        `message ${tipo}`;
};

const cargarMaterias = async () => {
    const sesion =
        obtenerSesion();

    const respuesta =
        await fetch(
            `${API_URL}/practicantes/catalogos`,
            {
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

    const select =
        document.getElementById('matter');

    datos.materias.forEach(item => {
        const option =
            document.createElement('option');

        option.value =
            item.id;

        option.textContent =
            item.nombre;

        select.appendChild(option);
    });
};

const cargarPracticante = async () => {
    if (!idPracticante) return;

    const sesion =
        obtenerSesion();

    const respuesta =
        await fetch(
            `${API_URL}/practicantes/${idPracticante}`,
            {
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

    const practicante =
        datos.practicante;

    document.getElementById('name').value =
        practicante.nombre || '';

    document.getElementById('email').value =
        practicante.correo || '';

    document.getElementById('phone').value =
        practicante.telefono || '';

    document.getElementById('document').value =
        practicante.numeroDocumento || '';

    document.getElementById('matter').value =
        practicante.materia?.id || '';

    document.getElementById('address').value =
        practicante.direccion || '';

    document.getElementById('photo').value =
        practicante.fotoUrl || '';

    document.getElementById('active').value =
        String(
            practicante.activo !== false
        );
};

const guardarPracticante = async event => {
    event.preventDefault();

    const sesion =
        obtenerSesion();

    const datos = {
        nombre:
            document.getElementById('name').value.trim(),

        correo:
            document.getElementById('email').value.trim(),

        telefono:
            document.getElementById('phone').value.trim() || null,

        numeroDocumento:
            document.getElementById('document').value.trim() || null,

        materiaId:
            Number(document.getElementById('matter').value) || null,

        direccion:
            document.getElementById('address').value.trim() || null,

        fotoUrl:
            document.getElementById('photo').value.trim() || null,

        activo:
            document.getElementById('active').value === 'true'
    };

    const boton =
        document.getElementById('saveButton');

    try {
        boton.disabled = true;

        const respuesta =
            await fetch(
                idPracticante
                    ? `${API_URL}/practicantes/${idPracticante}`
                    : `${API_URL}/practicantes`,
                {
                    method:
                        idPracticante
                            ? 'PUT'
                            : 'POST',

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

        mostrarMensaje(
            resultado.mensaje,
            'success'
        );

        setTimeout(() => {
            window.location.href =
                `./practicante-detalle.html?id=${resultado.practicante.id}`;
        }, 500);
    } catch (error) {
        mostrarMensaje(
            error.message ||
            'No se pudo guardar el practicante.'
        );
    } finally {
        boton.disabled = false;
    }
};

const iniciar = async () => {
    const sesion =
        obtenerSesion();

    if (!sesion) return;

    mostrarUsuario(
        sesion.usuario
    );

    const parametros =
        new URLSearchParams(
            window.location.search
        );

    idPracticante =
        parametros.get('id');

    if (idPracticante) {
        document.getElementById('pageTitle').textContent =
            'Editar practicante';

        document.getElementById('breadcrumbText').textContent =
            'Editar practicante';

        document.getElementById('pageDescription').textContent =
            'Actualiza los datos del practicante.';

        document.getElementById('saveButton').textContent =
            'Guardar cambios';
    }

    try {
        await cargarMaterias();
        await cargarPracticante();
    } catch (error) {
        mostrarMensaje(
            error.message
        );
    }

    document.getElementById('internForm').addEventListener(
        'submit',
        guardarPracticante
    );

    document.getElementById('logoutButton').addEventListener(
        'click',
        cerrarSesion
    );

    document.getElementById('mobileMenu').addEventListener(
        'click',
        () => {
            document.getElementById('sidebar')
                .classList.toggle('open');
        }
    );
};

iniciar();