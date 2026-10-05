const API_URL = 'http://localhost:3000/api';

let materias = [];

const obtenerSesion = () => {
    const token =
        localStorage.getItem('mc_token') ||
        sessionStorage.getItem('mc_token');

    const usuarioGuardado =
        localStorage.getItem('mc_usuario') ||
        sessionStorage.getItem('mc_usuario');

    if (!token || !usuarioGuardado) {
        window.location.href =
            '../../index.html';

        return null;
    }

    try {
        return {
            token,
            usuario:
                JSON.parse(usuarioGuardado)
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

    window.location.href =
        '../../index.html';
};

const obtenerIniciales = nombre => {
    if (!nombre) return 'MC';

    const partes =
        nombre.trim().split(/\s+/);

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

    document.getElementById('userName')
        .textContent = nombre;

    document.getElementById('userRole')
        .textContent =
        usuario.rol || 'USUARIO';

    document.getElementById('userAvatar')
        .textContent =
        obtenerIniciales(nombre);
};

const mostrarMensaje = (
    texto,
    tipo = 'success'
) => {
    const message =
        document.getElementById('message');

    message.textContent = texto;
    message.className =
        `message ${tipo}`;

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });

    setTimeout(() => {
        message.classList.add('hidden');
    }, 3500);
};

const cargarConfiguracion = async () => {
    const sesion =
        obtenerSesion();

    if (!sesion) return;

    try {
        const respuesta =
            await fetch(
                `${API_URL}/configuracion`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${sesion.token}`
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
                'No se pudo cargar la configuracion.'
            );
        }

        const configuracion =
            datos.configuracion || {};

        document.getElementById('studyName').value =
            configuracion.nombre_estudio || '';

        document.getElementById('studyEmail').value =
            configuracion.correo_estudio || '';

        document.getElementById('studyPhone').value =
            configuracion.telefono_estudio || '';

        document.getElementById('studyAddress').value =
            configuracion.direccion_estudio || '';

        document.getElementById('currency').value =
            configuracion.moneda || 'PEN';

        materias =
            Array.isArray(datos.materias)
                ? datos.materias
                : [];

        renderizarMaterias();
    } catch (error) {
        mostrarMensaje(
            error.message,
            'error'
        );
    }
};

const cargarPerfil = async () => {
    const sesion =
        obtenerSesion();

    if (!sesion) return;

    try {
        const respuesta =
            await fetch(
                `${API_URL}/configuracion/perfil`,
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
                'No se pudo cargar el perfil.'
            );
        }

        const perfil =
            datos.perfil;

        document.getElementById('profileName').value =
            perfil.nombre || '';

        document.getElementById('profileEmail').value =
            perfil.correo || '';

        document.getElementById('profilePhone').value =
            perfil.telefono || '';

        document.getElementById('profileDocument').value =
            perfil.numeroDocumento || '';

        document.getElementById('profileAddress').value =
            perfil.direccion || '';

        document.getElementById('profilePhoto').value =
            perfil.fotoUrl || '';

        document.getElementById('profilePreviewName')
            .textContent =
            perfil.nombre || 'Administrador';

        document.getElementById('profileAvatar')
            .textContent =
            obtenerIniciales(perfil.nombre);
    } catch (error) {
        mostrarMensaje(
            error.message,
            'error'
        );
    }
};

const guardarEstudio = async event => {
    event.preventDefault();

    const sesion =
        obtenerSesion();

    if (!sesion) return;

    try {
        const respuesta =
            await fetch(
                `${API_URL}/configuracion`,
                {
                    method: 'PUT',

                    headers: {
                        'Content-Type':
                            'application/json',

                        Authorization:
                            `Bearer ${sesion.token}`
                    },

                    body: JSON.stringify({
                        nombreEstudio:
                            document.getElementById('studyName').value.trim(),

                        correoEstudio:
                            document.getElementById('studyEmail').value.trim(),

                        telefonoEstudio:
                            document.getElementById('studyPhone').value.trim(),

                        direccionEstudio:
                            document.getElementById('studyAddress').value.trim(),

                        moneda:
                            document.getElementById('currency').value
                    })
                }
            );

        const datos =
            await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje
            );
        }

        mostrarMensaje(
            datos.mensaje
        );
    } catch (error) {
        mostrarMensaje(
            error.message ||
            'No se pudo guardar.',
            'error'
        );
    }
};

const guardarPerfil = async event => {
    event.preventDefault();

    const sesion =
        obtenerSesion();

    if (!sesion) return;

    try {
        const respuesta =
            await fetch(
                `${API_URL}/configuracion/perfil`,
                {
                    method: 'PUT',

                    headers: {
                        'Content-Type':
                            'application/json',

                        Authorization:
                            `Bearer ${sesion.token}`
                    },

                    body: JSON.stringify({
                        nombre:
                            document.getElementById('profileName').value.trim(),

                        correo:
                            document.getElementById('profileEmail').value.trim(),

                        telefono:
                            document.getElementById('profilePhone').value.trim(),

                        numeroDocumento:
                            document.getElementById('profileDocument').value.trim(),

                        direccion:
                            document.getElementById('profileAddress').value.trim(),

                        fotoUrl:
                            document.getElementById('profilePhoto').value.trim()
                    })
                }
            );

        const datos =
            await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje
            );
        }

        const usuarioActualizado = {
            ...sesion.usuario,
            nombre:
                datos.perfil.nombre,
            nombreCompleto:
                datos.perfil.nombre,
            correo:
                datos.perfil.correo
        };

        if (
            localStorage.getItem('mc_usuario')
        ) {
            localStorage.setItem(
                'mc_usuario',
                JSON.stringify(
                    usuarioActualizado
                )
            );
        } else {
            sessionStorage.setItem(
                'mc_usuario',
                JSON.stringify(
                    usuarioActualizado
                )
            );
        }

        mostrarUsuario(
            usuarioActualizado
        );

        document.getElementById('profilePreviewName')
            .textContent =
            datos.perfil.nombre;

        document.getElementById('profileAvatar')
            .textContent =
            obtenerIniciales(
                datos.perfil.nombre
            );

        mostrarMensaje(
            datos.mensaje
        );
    } catch (error) {
        mostrarMensaje(
            error.message ||
            'No se pudo actualizar el perfil.',
            'error'
        );
    }
};

const renderizarMaterias = () => {
    const lista =
        document.getElementById('mattersList');

    const empty =
        document.getElementById('mattersEmpty');

    if (materias.length === 0) {
        lista.innerHTML = '';
        lista.classList.add('hidden');
        empty.classList.remove('hidden');

        return;
    }

    empty.classList.add('hidden');
    lista.classList.remove('hidden');

    lista.innerHTML =
        materias.map(item => `
            <article class="matter-item">
                <span class="matter-name">
                    ${item.nombre}
                </span>

                <div class="matter-actions">
                    <button
                        type="button"
                        onclick="editarMateria(${item.id})"
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        class="delete-button"
                        onclick="borrarMateria(${item.id})"
                    >
                        Eliminar
                    </button>
                </div>
            </article>
        `).join('');
};

const crearMateria = async event => {
    event.preventDefault();

    const input =
        document.getElementById('matterName');

    const nombre =
        input.value.trim();

    if (!nombre) return;

    const sesion =
        obtenerSesion();

    try {
        const respuesta =
            await fetch(
                `${API_URL}/configuracion/materias`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json',

                        Authorization:
                            `Bearer ${sesion.token}`
                    },

                    body:
                        JSON.stringify({
                            nombre
                        })
                }
            );

        const datos =
            await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje
            );
        }

        materias.push(
            datos.materia
        );

        materias.sort(
            (a, b) =>
                a.nombre.localeCompare(
                    b.nombre,
                    'es'
                )
        );

        input.value = '';

        renderizarMaterias();

        mostrarMensaje(
            datos.mensaje
        );
    } catch (error) {
        mostrarMensaje(
            error.message,
            'error'
        );
    }
};

window.editarMateria = async id => {
    const materia =
        materias.find(
            item =>
                Number(item.id) === Number(id)
        );

    if (!materia) return;

    const nuevoNombre =
        prompt(
            'Nuevo nombre de la materia:',
            materia.nombre
        );

    if (
        nuevoNombre === null ||
        !nuevoNombre.trim()
    ) {
        return;
    }

    const sesion =
        obtenerSesion();

    try {
        const respuesta =
            await fetch(
                `${API_URL}/configuracion/materias/${id}`,
                {
                    method: 'PUT',

                    headers: {
                        'Content-Type':
                            'application/json',

                        Authorization:
                            `Bearer ${sesion.token}`
                    },

                    body:
                        JSON.stringify({
                            nombre:
                                nuevoNombre.trim()
                        })
                }
            );

        const datos =
            await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                datos.mensaje
            );
        }

        materia.nombre =
            datos.materia.nombre;

        renderizarMaterias();

        mostrarMensaje(
            datos.mensaje
        );
    } catch (error) {
        mostrarMensaje(
            error.message,
            'error'
        );
    }
};

window.borrarMateria = async id => {
    const confirmar =
        confirm(
            '¿Deseas eliminar esta materia?'
        );

    if (!confirmar) return;

    const sesion =
        obtenerSesion();

    try {
        const respuesta =
            await fetch(
                `${API_URL}/configuracion/materias/${id}`,
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

        materias =
            materias.filter(
                item =>
                    Number(item.id) !== Number(id)
            );

        renderizarMaterias();

        mostrarMensaje(
            datos.mensaje
        );
    } catch (error) {
        mostrarMensaje(
            error.message,
            'error'
        );
    }
};

const configurarTabs = () => {
    document.querySelectorAll(
        '.settings-tab'
    ).forEach(tab => {
        tab.addEventListener(
            'click',
            () => {
                document
                    .querySelectorAll(
                        '.settings-tab'
                    )
                    .forEach(item =>
                        item.classList.remove(
                            'active'
                        )
                    );

                document
                    .querySelectorAll(
                        '.settings-panel'
                    )
                    .forEach(item =>
                        item.classList.remove(
                            'active'
                        )
                    );

                tab.classList.add(
                    'active'
                );

                const nombre =
                    tab.dataset.tab;

                const panelId =
                    nombre === 'study'
                        ? 'studyPanel'
                        : nombre === 'profile'
                            ? 'profilePanel'
                            : 'mattersPanel';

                document
                    .getElementById(
                        panelId
                    )
                    .classList.add(
                        'active'
                    );
            }
        );
    });
};

const configurarEventos = () => {
    document
        .getElementById('studyForm')
        .addEventListener(
            'submit',
            guardarEstudio
        );

    document
        .getElementById('profileForm')
        .addEventListener(
            'submit',
            guardarPerfil
        );

    document
        .getElementById('matterForm')
        .addEventListener(
            'submit',
            crearMateria
        );

    document
        .getElementById('logoutButton')
        .addEventListener(
            'click',
            cerrarSesion
        );

    document
        .getElementById('mobileMenu')
        .addEventListener(
            'click',
            () => {
                document
                    .getElementById('sidebar')
                    .classList.toggle(
                        'open'
                    );
            }
        );

    configurarTabs();
};

const iniciarPagina = () => {
    const sesion =
        obtenerSesion();

    if (!sesion) return;

    mostrarUsuario(
        sesion.usuario
    );

    configurarEventos();

    Promise.all([
        cargarConfiguracion(),
        cargarPerfil()
    ]);
};

iniciarPagina();