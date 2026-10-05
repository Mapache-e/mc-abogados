const API_URL = 'http://localhost:3000/api';

let idAbogado = null;

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

const iniciales = nombre => {
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

    mensaje.textContent = texto;
    mensaje.className =
        `message ${tipo}`;
};

const cargarMaterias = async () => {
    const sesion = obtenerSesion();

    const respuesta = await fetch(
        `${API_URL}/abogados/catalogos`,
        {
            headers: {
                Authorization:
                    `Bearer ${sesion.token}`
            }
        }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(
            datos.mensaje ||
            'No se pudieron cargar las materias.'
        );
    }

    const select =
        document.getElementById('matter');

    datos.materias.forEach(item => {
        const option =
            document.createElement('option');

        option.value = item.id;
        option.textContent = item.nombre;

        select.appendChild(option);
    });
};

const cargarAbogado = async () => {
    if (!idAbogado) return;

    const sesion =
        obtenerSesion();

    const respuesta = await fetch(
        `${API_URL}/abogados/${idAbogado}`,
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
            datos.mensaje ||
            'No se pudo cargar el abogado.'
        );
    }

    const abogado =
        datos.abogado;

    document.getElementById('name').value =
        abogado.nombre || '';

    document.getElementById('email').value =
        abogado.correo || '';

    document.getElementById('phone').value =
        abogado.telefono || '';

    document.getElementById('document').value =
        abogado.numeroDocumento || '';

    document.getElementById('matter').value =
        abogado.materia?.id || '';

    document.getElementById('address').value =
        abogado.direccion || '';

    document.getElementById('photo').value =
        abogado.fotoUrl || '';

    document.getElementById('active').value =
        String(abogado.activo !== false);

    document.getElementById('registration').value =
        abogado.numeroColegiatura || '';

    document.getElementById('barAssociation').value =
        abogado.colegioAbogados || '';

    document.getElementById('specialty').value =
        abogado.especialidad || '';

    document.getElementById('biography').value =
        abogado.biografia || '';
};

const guardarAbogado = async event => {
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
            document.getElementById('active').value === 'true',

        numeroColegiatura:
            document.getElementById('registration').value.trim() || null,

        colegioAbogados:
            document.getElementById('barAssociation').value.trim() || null,

        especialidad:
            document.getElementById('specialty').value.trim() || null,

        biografia:
            document.getElementById('biography').value.trim() || null
    };

    const boton =
        document.getElementById('saveButton');

    try {
        boton.disabled = true;

        const respuesta = await fetch(
            idAbogado
                ? `${API_URL}/abogados/${idAbogado}`
                : `${API_URL}/abogados`,
            {
                method:
                    idAbogado
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

        const id =
            resultado.abogado.id;

        mostrarMensaje(
            resultado.mensaje,
            'success'
        );

        setTimeout(() => {
            window.location.href =
                `./abogado-detalle.html?id=${id}`;
        }, 500);
    } catch (error) {
        mostrarMensaje(
            error.message ||
            'No se pudo guardar el abogado.'
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

    idAbogado =
        parametros.get('id');

    if (idAbogado) {
        document.getElementById('pageTitle').textContent =
            'Editar abogado';

        document.getElementById('breadcrumbText').textContent =
            'Editar abogado';

        document.getElementById('pageDescription').textContent =
            'Actualiza la información del profesional.';

        document.getElementById('saveButton').textContent =
            'Guardar cambios';
    }

    try {
        await cargarMaterias();
        await cargarAbogado();
    } catch (error) {
        mostrarMensaje(error.message);
    }

    document.getElementById('lawyerForm').addEventListener(
        'submit',
        guardarAbogado
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