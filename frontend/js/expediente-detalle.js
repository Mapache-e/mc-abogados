const API_URL = 'http://localhost:3000/api';

let expedienteActual = null;

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

const valor = (dato, respaldo = '—') => {
    if (dato === null || dato === undefined || dato === '') {
        return respaldo;
    }

    return dato;
};

const obtenerIniciales = (nombre, respaldo = 'MC') => {
    if (!nombre) return respaldo;

    return nombre
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(palabra => palabra.charAt(0).toUpperCase())
        .join('');
};

const formatearFechaObjeto = fecha => {
    if (!fecha) return null;

    const textoFecha = String(fecha).substring(0, 10);
    const partes = textoFecha.split('-');

    if (partes.length !== 3) return null;

    const objetoFecha = new Date(
        Number(partes[0]),
        Number(partes[1]) - 1,
        Number(partes[2])
    );

    if (Number.isNaN(objetoFecha.getTime())) {
        return null;
    }

    return objetoFecha;
};

const formatearFechaCorta = fecha => {
    const objetoFecha = formatearFechaObjeto(fecha);

    if (!objetoFecha) return '—';

    return objetoFecha.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const escaparHTML = texto => {
    if (texto === null || texto === undefined) return '';

    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

const mostrarUsuario = usuario => {
    const nombre = usuario.nombre || usuario.nombreCompleto || 'María Torres';
    const rol = usuario.rol || 'Administrador';

    document.getElementById('userName').textContent = nombre;
    document.getElementById('userRole').textContent = rol;
    document.getElementById('userAvatar').textContent = obtenerIniciales(nombre, 'MT');
};

const aplicarEstadoExpediente = estado => {
    const elemento = document.getElementById('caseStatus');
    const estadoNormalizado = String(estado || '').toLowerCase();

    elemento.textContent = estado || 'Sin estado';
    elemento.className = 'status-badge';

    if (
        estadoNormalizado.includes('revisión') ||
        estadoNormalizado.includes('revision') ||
        estadoNormalizado.includes('espera')
    ) {
        elemento.classList.add('status-review');
    } else if (estadoNormalizado.includes('suspendido')) {
        elemento.classList.add('status-suspended');
    } else if (
        estadoNormalizado.includes('cerrado') ||
        estadoNormalizado.includes('archivado')
    ) {
        elemento.classList.add('status-neutral');
    }
};

const obtenerClaseEstado = estado => {
    const texto = String(estado || '').toLowerCase();

    if (
        texto.includes('complet') ||
        texto.includes('aprobad') ||
        texto.includes('vigente')
    ) {
        return 'badge-green';
    }

    if (
        texto.includes('curso') ||
        texto.includes('revisión') ||
        texto.includes('revision')
    ) {
        return 'badge-blue';
    }

    if (
        texto.includes('pendiente') ||
        texto.includes('espera')
    ) {
        return 'badge-amber';
    }

    if (
        texto.includes('bloquead') ||
        texto.includes('cancelad') ||
        texto.includes('rechaz')
    ) {
        return 'badge-red';
    }

    return 'badge-neutral';
};

const obtenerClasePrioridad = prioridad => {
    const texto = String(prioridad || '').toLowerCase();

    if (
        texto.includes('alta') ||
        texto.includes('urgente') ||
        texto.includes('crítica') ||
        texto.includes('critica')
    ) {
        return 'priority-high';
    }

    if (
        texto.includes('media') ||
        texto.includes('normal')
    ) {
        return 'priority-medium';
    }

    if (texto.includes('baja')) {
        return 'priority-low';
    }

    return '';
};

const mostrarDatosGenerales = expediente => {
    document.getElementById('breadcrumbCode').textContent = valor(expediente.codigo, 'Detalle');
    document.getElementById('caseCode').textContent = valor(expediente.codigo, 'EXPEDIENTE');
    document.getElementById('caseNumber').textContent = valor(expediente.numeroExpediente, expediente.codigo);
    document.getElementById('caseTitle').textContent = valor(expediente.titulo, 'Asunto jurídico sin título registrado');
    document.getElementById('caseClient').textContent = `Cliente: ${valor(expediente.cliente?.nombre)}`;
    document.getElementById('caseMatter').textContent = `Materia: ${valor(expediente.materia?.nombre)}`;

    aplicarEstadoExpediente(expediente.estado);

    document.getElementById('infoCaseNumber').textContent = valor(expediente.numeroExpediente);
    document.getElementById('infoMatter').textContent = valor(expediente.materia?.nombre);
    document.getElementById('infoFiscalFolder').textContent = valor(expediente.carpetaFiscal);
    document.getElementById('infoCourt').textContent = valor(expediente.organo);
    document.getElementById('infoPoliceReport').textContent = valor(expediente.denunciaPolicial);
    document.getElementById('infoCounterparty').textContent = valor(expediente.contraparte);
    document.getElementById('infoUrgency').textContent = valor(expediente.urgencia);
    document.getElementById('infoDocumentsComplete').textContent = valor(expediente.documentosCompletos);

    document.getElementById('caseObservations').textContent = valor(
        expediente.observaciones,
        'No existen observaciones registradas para este expediente.'
    );
};

const mostrarCliente = cliente => {
    const datos = cliente || {};

    document.getElementById('clientName').textContent = valor(datos.nombre);
    document.getElementById('clientAvatar').textContent = obtenerIniciales(datos.nombre, 'CL');

    const documento = [datos.tipoDocumento, datos.numeroDocumento]
        .filter(Boolean)
        .join(' ');

    document.getElementById('clientDocument').textContent = documento || 'Documento no registrado';
    document.getElementById('clientEmail').textContent = valor(datos.correo);
    document.getElementById('clientPhone').textContent = valor(datos.telefono);
    document.getElementById('clientRepresentative').textContent = valor(datos.representanteLegal);
    document.getElementById('clientAddress').textContent = valor(datos.direccion);
};

const mostrarResponsable = responsable => {
    if (!responsable) {
        document.getElementById('lawyerName').textContent = 'Sin responsable asignado';
        document.getElementById('lawyerSpecialty').textContent = '—';
        document.getElementById('lawyerEmail').textContent = '—';
        document.getElementById('lawyerPhone').textContent = '—';
        document.getElementById('lawyerRegistration').textContent = '—';
        document.getElementById('lawyerAssociation').textContent = '—';
        document.getElementById('lawyerAvatar').textContent = 'AB';
        return;
    }

    document.getElementById('lawyerName').textContent = valor(responsable.nombre);
    document.getElementById('lawyerAvatar').textContent = obtenerIniciales(responsable.nombre, 'AB');
    document.getElementById('lawyerSpecialty').textContent = valor(responsable.especialidad, 'Abogado responsable');
    document.getElementById('lawyerEmail').textContent = valor(responsable.correo);
    document.getElementById('lawyerPhone').textContent = valor(responsable.telefono);
    document.getElementById('lawyerRegistration').textContent = valor(responsable.numeroColegiatura);
    document.getElementById('lawyerAssociation').textContent = valor(responsable.colegioAbogados);
};

const mostrarHito = expediente => {
    document.getElementById('milestoneTitle').textContent = valor(
        expediente.proximoHito,
        'Sin próximo hito registrado'
    );

    const fechaHito = formatearFechaObjeto(expediente.fechaHito);

    if (!fechaHito) {
        document.getElementById('milestoneDay').textContent = '—';
        document.getElementById('milestoneMonth').textContent = '—';
        document.getElementById('milestoneFullDate').textContent = 'No se ha establecido una fecha.';
        return;
    }

    document.getElementById('milestoneDay').textContent = fechaHito
        .getDate()
        .toString()
        .padStart(2, '0');

    document.getElementById('milestoneMonth').textContent = fechaHito
        .toLocaleDateString('es-PE', { month: 'short' })
        .replace('.', '')
        .toUpperCase();

    document.getElementById('milestoneFullDate').textContent = fechaHito.toLocaleDateString('es-PE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};

const mostrarDocumentos = documentos => {
    const lista = Array.isArray(documentos) ? documentos : [];
    const contador = document.getElementById('documentsCounter');
    const vacio = document.getElementById('documentsEmpty');
    const tabla = document.getElementById('documentsTableContainer');
    const cuerpo = document.getElementById('documentsTableBody');

    contador.textContent = `${lista.length} ${lista.length === 1 ? 'documento' : 'documentos'}`;
    cuerpo.innerHTML = '';

    if (lista.length === 0) {
        tabla.classList.add('hidden');
        vacio.classList.remove('hidden');
        return;
    }

    vacio.classList.add('hidden');
    tabla.classList.remove('hidden');

    cuerpo.innerHTML = lista.map(documento => {
        const nombre = escaparHTML(valor(documento.nombre, 'Documento sin nombre'));
        const codigo = escaparHTML(valor(documento.codigo, 'Sin código'));
        const tipo = escaparHTML(valor(documento.tipo, '—'));
        const version = escaparHTML(valor(documento.version, '—'));
        const responsable = escaparHTML(valor(documento.responsable?.nombre, 'Sin asignar'));
        const estado = escaparHTML(valor(documento.estado, 'Sin estado'));
        const fecha = escaparHTML(formatearFechaCorta(documento.fecha));
        const claseEstado = obtenerClaseEstado(documento.estado);

        const enlace = documento.enlace
            ? `<a href="${escaparHTML(documento.enlace)}" class="document-link" target="_blank" rel="noopener noreferrer" title="Abrir documento">↗</a>`
            : '<span>—</span>';

        return `
            <tr>
                <td>
                    <div class="document-name">
                        <div class="document-icon">${tipo.substring(0, 3).toUpperCase()}</div>
                        <div>
                            <strong>${nombre}</strong>
                            <span>${codigo}</span>
                        </div>
                    </div>
                </td>
                <td>${tipo}</td>
                <td>${version}</td>
                <td>${responsable}</td>
                <td>${fecha}</td>
                <td><span class="table-badge ${claseEstado}">${estado}</span></td>
                <td>${enlace}</td>
            </tr>
        `;
    }).join('');
};

const mostrarTareas = tareas => {
    const lista = Array.isArray(tareas) ? tareas : [];
    const contador = document.getElementById('tasksCounter');
    const vacio = document.getElementById('tasksEmpty');
    const contenedor = document.getElementById('tasksList');

    contador.textContent = `${lista.length} ${lista.length === 1 ? 'tarea' : 'tareas'}`;
    contenedor.innerHTML = '';

    if (lista.length === 0) {
        contenedor.classList.add('hidden');
        vacio.classList.remove('hidden');
        return;
    }

    vacio.classList.add('hidden');
    contenedor.classList.remove('hidden');

    contenedor.innerHTML = lista.map(tarea => {
        const nombre = escaparHTML(valor(tarea.tarea, 'Tarea sin descripción'));
        const codigo = escaparHTML(valor(tarea.codigo, ''));
        const prioridad = escaparHTML(valor(tarea.prioridad, 'Sin prioridad'));
        const estado = escaparHTML(valor(tarea.estado, 'Sin estado'));
        const responsable = escaparHTML(valor(tarea.responsable?.nombre, 'Sin asignar'));
        const fechaLimite = escaparHTML(formatearFechaCorta(tarea.fechaLimite));
        const claseEstado = obtenerClaseEstado(tarea.estado);
        const clasePrioridad = obtenerClasePrioridad(tarea.prioridad);

        const observaciones = tarea.observaciones
            ? `<p class="task-observation">${escaparHTML(tarea.observaciones)}</p>`
            : '';

        return `
            <article class="task-item">
                <div class="task-main">
                    <div class="task-indicator ${clasePrioridad}"></div>
                    <div class="task-content">
                        <div class="task-top">
                            <h3>${nombre}</h3>
                            ${codigo ? `<span class="task-code">${codigo}</span>` : ''}
                        </div>
                        <div class="task-meta">
                            <span>Responsable: <strong>${responsable}</strong></span>
                            <span>Fecha límite: <strong>${fechaLimite}</strong></span>
                        </div>
                        ${observaciones}
                    </div>
                </div>
                <div class="task-side">
                    <span class="task-badge ${claseEstado}">${estado}</span>
                    <span class="task-badge badge-neutral">${prioridad}</span>
                </div>
            </article>
        `;
    }).join('');
};

const mostrarExpediente = expediente => {
    expedienteActual = expediente;

    mostrarDatosGenerales(expediente);
    mostrarCliente(expediente.cliente);
    mostrarResponsable(expediente.responsable);
    mostrarHito(expediente);
    mostrarDocumentos(expediente.documentos);
    mostrarTareas(expediente.tareas);
};

const mostrarError = mensaje => {
    document.getElementById('detailBody').classList.add('hidden');
    document.getElementById('detailError').classList.remove('hidden');
    document.getElementById('detailErrorMessage').textContent = mensaje;
};

const cargarExpediente = async () => {
    if (!sesion) return;

    const parametros = new URLSearchParams(window.location.search);
    const id = parametros.get('id');

    if (!id || !/^\d+$/.test(id)) {
        mostrarError('El expediente solicitado no es válido.');
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/expedientes/${id}`, {
            method: 'GET',
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
            mostrarError(
                datos.mensaje ||
                'No se pudo obtener la información del expediente.'
            );
            return;
        }

        mostrarExpediente(datos.expediente);
    } catch (error) {
        console.error('Error al cargar expediente:', error);
        mostrarError('No se pudo establecer conexión con el servidor.');
    }
};

const configurarEventos = () => {
    document.getElementById('logoutButton').addEventListener('click', cerrarSesion);

    document.getElementById('mobileMenu').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('open');
    });

    document.getElementById('globalSearch').addEventListener('keydown', evento => {
        if (evento.key !== 'Enter') return;

        const busqueda = evento.target.value.trim();

        if (busqueda) {
            window.location.href = `./expedientes.html?q=${encodeURIComponent(busqueda)}`;
        }
    });

    document.getElementById('viewClientButton').addEventListener('click', () => {
        const idCliente = expedienteActual?.cliente?.id;

        if (!idCliente) return;

        console.log(`Ficha de cliente pendiente: ${idCliente}`);
    });

    document.getElementById('viewLawyerButton').addEventListener('click', () => {
        const idAbogado = expedienteActual?.responsable?.id;

        if (!idAbogado) return;

        console.log(`Perfil de abogado pendiente: ${idAbogado}`);
    });
};

const sesion = obtenerSesion();

if (sesion) {
    mostrarUsuario(sesion.usuario);
    configurarEventos();
    cargarExpediente();
}