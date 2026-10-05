const logoutButton = document.getElementById('logoutButton');
const mobileMenu = document.getElementById('mobileMenu');
const sidebar = document.querySelector('.sidebar');

const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const userAvatar = document.getElementById('userAvatar');
const welcomeName = document.getElementById('welcomeName');
const currentDate = document.getElementById('currentDate');

document.addEventListener('DOMContentLoaded', async () => {
    const sesion = verificarSesion();

    if (!sesion) {
        return;
    }

    cargarFecha();
    await cargarDashboard(sesion.token);
});

function obtenerSesion() {
    const token = localStorage.getItem('mc_token') || sessionStorage.getItem('mc_token');
    const usuarioGuardado = localStorage.getItem('mc_usuario') || sessionStorage.getItem('mc_usuario');

    if (!token || !usuarioGuardado) {
        return null;
    }

    try {
        return {
            token,
            usuario: JSON.parse(usuarioGuardado)
        };
    } catch (error) {
        return null;
    }
}

function verificarSesion() {
    const sesion = obtenerSesion();

    if (!sesion) {
        window.location.href = '../../index.html';
        return null;
    }

    if (sesion.usuario.rol !== 'Administrador') {
        redirigirSegunRol(sesion.usuario.rol);
        return null;
    }

    mostrarUsuario(sesion.usuario);
    return sesion;
}

function mostrarUsuario(usuario) {
    const nombre = usuario.nombre || 'Usuario';
    const partesNombre = nombre.trim().split(/\s+/);
    const primerNombre = partesNombre[0] || 'Usuario';

    userName.textContent = nombre;
    userRole.textContent = usuario.rol;
    welcomeName.textContent = primerNombre;
    userAvatar.textContent = obtenerIniciales(nombre);
}

function obtenerIniciales(nombre) {
    const partes = nombre.trim().split(/\s+/).filter(Boolean);

    if (partes.length === 0) {
        return 'MC';
    }

    if (partes.length === 1) {
        return partes[0].substring(0, 2).toUpperCase();
    }

    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

function cargarFecha() {
    const fecha = new Date();

    currentDate.textContent = fecha.toLocaleDateString('es-PE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

async function cargarDashboard(token) {
    try {
        const respuesta = await fetch('/api/dashboard/admin', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (respuesta.status === 401 || respuesta.status === 403) {
            cerrarSesion();
            return;
        }

        if (!respuesta.ok) {
            throw new Error('No se pudo cargar el dashboard');
        }

        const datos = await respuesta.json();

        document.getElementById('activeCases').textContent = datos.resumen.expedientesActivos;
        document.getElementById('activeClients').textContent = datos.resumen.clientesActivos;
        document.getElementById('upcomingHearings').textContent = datos.resumen.audienciasProximas;
        document.getElementById('pendingTasks').textContent = datos.resumen.tareasPendientes;

        renderizarGrafico(datos.distribucionExpedientes);
        renderizarAudiencias(datos.proximasAudiencias);
    } catch (error) {
        console.error('Error cargando dashboard:', error);
    }
}

function renderizarGrafico(datos) {
    const contenedor = document.getElementById('caseChart');

    if (!datos || datos.length === 0) {
        contenedor.innerHTML = `
            <div class="chart-empty">
                <span>▥</span>
                <p>No existen expedientes activos para mostrar.</p>
            </div>
        `;
        return;
    }

    const maximo = Math.max(...datos.map(item => item.cantidad));

    contenedor.innerHTML = `
        <div class="chart-bars">
            ${datos.map(item => {
                const altura = Math.max((item.cantidad / maximo) * 170, 8);

                return `
                    <div class="chart-column">
                        <span class="chart-value">${item.cantidad}</span>
                        <div class="chart-bar" style="height: ${altura}px;"></div>
                        <span class="chart-label">${item.tipo}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderizarAudiencias(audiencias) {
    const contenedor = document.getElementById('hearingsList');

    if (!audiencias || audiencias.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <span>□</span>
                <p>No hay audiencias próximas registradas.</p>
            </div>
        `;
        return;
    }

    contenedor.innerHTML = audiencias.map(audiencia => `
        <div class="hearing-item">
            <div class="hearing-date">
                <strong>${audiencia.dia}</strong>
                <span>${audiencia.mes}</span>
            </div>
            <div class="hearing-information">
                <h4>${audiencia.titulo}</h4>
                <p>${audiencia.hora} · ${audiencia.ubicacion}</p>
            </div>
        </div>
    `).join('');
}

function cerrarSesion() {
    localStorage.removeItem('mc_token');
    localStorage.removeItem('mc_usuario');
    sessionStorage.removeItem('mc_token');
    sessionStorage.removeItem('mc_usuario');

    window.location.href = '../../index.html';
}

function redirigirSegunRol(rol) {
    if (rol === 'Abogado') {
        window.location.href = '../abogado/dashboard.html';
        return;
    }

    if (rol === 'Practicante') {
        window.location.href = '../practicante/dashboard.html';
        return;
    }

    cerrarSesion();
}

logoutButton.addEventListener('click', cerrarSesion);

mobileMenu.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

document.addEventListener('click', event => {
    if (window.innerWidth > 850) {
        return;
    }

    if (!sidebar.contains(event.target) && !mobileMenu.contains(event.target)) {
        sidebar.classList.remove('open');
    }
});