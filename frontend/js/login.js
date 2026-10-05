const loginForm = document.getElementById('loginForm');
const roleCards = document.querySelectorAll('.role-card');
const correoInput = document.getElementById('correo');
const passwordInput = document.getElementById('password');
const recordarInput = document.getElementById('recordar');
const togglePassword = document.getElementById('togglePassword');
const loginMessage = document.getElementById('loginMessage');
const loginButton = document.querySelector('.login-button');

let rolSeleccionado = null;

// SELECCION DE ROL

roleCards.forEach(card => {
    card.addEventListener('click', () => {
        roleCards.forEach(item => item.classList.remove('active'));
        card.classList.add('active');
        rolSeleccionado = card.dataset.role;
        limpiarMensaje();
    });
});

// MOSTRAR / OCULTAR PASSWORD

togglePassword.addEventListener('click', () => {
    const passwordVisible = passwordInput.type === 'text';

    passwordInput.type = passwordVisible ? 'password' : 'text';
    togglePassword.textContent = passwordVisible ? '◉' : '◎';
    togglePassword.setAttribute(
        'aria-label',
        passwordVisible ? 'Mostrar contraseña' : 'Ocultar contraseña'
    );
});

// LOGIN

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    limpiarMensaje();

    const correo = correoInput.value.trim();
    const password = passwordInput.value;

    if (!rolSeleccionado) {
        mostrarMensaje('Seleccione un rol de acceso.', 'error');
        return;
    }

    if (!correo || !password) {
        mostrarMensaje('Ingrese su correo y contraseña.', 'error');
        return;
    }

    cambiarEstadoBoton(true);

    try {
        const respuesta = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                correo,
                password,
                rol: rolSeleccionado
            })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            mostrarMensaje(
                datos.mensaje || 'No se pudo iniciar sesión.',
                'error'
            );
            return;
        }

        guardarSesion(datos);
        mostrarMensaje('Inicio de sesión correcto. Redirigiendo...', 'success');

        setTimeout(() => {
            redirigirSegunRol(datos.usuario.rol);
        }, 500);

    } catch (error) {
        console.error('Error al iniciar sesión:', error);

        mostrarMensaje(
            'No se pudo conectar con el servidor.',
            'error'
        );
    } finally {
        cambiarEstadoBoton(false);
    }
});

// GUARDAR SESION

function guardarSesion(datos) {
    const almacenamiento = recordarInput.checked
        ? localStorage
        : sessionStorage;

    localStorage.removeItem('mc_token');
    localStorage.removeItem('mc_usuario');
    sessionStorage.removeItem('mc_token');
    sessionStorage.removeItem('mc_usuario');

    almacenamiento.setItem('mc_token', datos.token);
    almacenamiento.setItem(
        'mc_usuario',
        JSON.stringify(datos.usuario)
    );
}

// REDIRECCION POR ROL

function redirigirSegunRol(rol) {
    switch (rol) {
        case 'Administrador':
            window.location.href = './pages/admin/dashboard.html';
            break;

        case 'Abogado':
            window.location.href = './pages/abogado/dashboard.html';
            break;

        case 'Practicante':
            window.location.href = './pages/practicante/dashboard.html';
            break;

        default:
            mostrarMensaje(
                'No existe un panel configurado para este usuario.',
                'error'
            );
    }
}

// MENSAJES

function mostrarMensaje(mensaje, tipo) {
    loginMessage.textContent = mensaje;
    loginMessage.className = `login-message ${tipo}`;
}

function limpiarMensaje() {
    loginMessage.textContent = '';
    loginMessage.className = 'login-message';
}

// BOTON LOGIN

function cambiarEstadoBoton(cargando) {
    loginButton.disabled = cargando;

    loginButton.innerHTML = cargando
        ? '<span>Verificando acceso...</span>'
        : '<span>Acceder de forma segura</span><span>↗</span>';
}