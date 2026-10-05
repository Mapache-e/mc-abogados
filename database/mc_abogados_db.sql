-- =====================================================================
-- BASE DE DATOS: M&C ABOGADOS E.I.R.L. — HERRAMIENTA DE GESTIÓN
-- Generado a partir de: MC_Abogados_Herramienta_Gestion_Dia_1_V2-1.xlsx
-- Motor: PostgreSQL 14+
-- Versión 2: normalizada — sin campos derivables ni redundantes.
--
-- Cambios respecto a la v1 (ver notas al final del archivo):
--   - Catálogo "materias" (antes texto libre repetido en 4 tablas).
--   - "cliente_id" eliminado donde ya se obtiene vía asunto_id.
--   - "segundo_control" pasa de FK a persona -> bandera Sí/No/Pendiente
--     (el Excel lo define como control, no como firma de un revisor).
--   - Banderas derivables de otra tabla/columna eliminadas
--     (conflicto_revisado, consulta_agendada, ultima_actualizacion).
--   - equipo_carga_snapshot ya no guarda conteos calculables por vista.
--   - Auditoría (creado_en/actualizado_en) estandarizada en todas las
--     tablas transaccionales.
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS mc_abogados;
SET search_path TO mc_abogados, public;

-- =====================================================================
-- 1. TIPOS ENUM
--    Solo para vocabularios cerrados y estables (hoja 99_Listas).
--    Los catálogos que pueden crecer (materias) se modelan como tabla,
--    no como ENUM, para no requerir ALTER TYPE cada vez que el estudio
--    agregue una especialidad.
-- =====================================================================

CREATE TYPE si_no                    AS ENUM ('Sí','No');
CREATE TYPE control_simple           AS ENUM ('Sí','No','Pendiente');
CREATE TYPE documentos_estado        AS ENUM ('Sí','No','Parcial');
CREATE TYPE estado_basico            AS ENUM ('Pendiente','En curso','Completada','Bloqueada','Cancelada');
CREATE TYPE estado_general_lead      AS ENUM ('Pendiente','En curso','Completada','Bloqueada','Cancelada','Perdida','Contratado');
CREATE TYPE estado_asunto            AS ENUM ('Activo','En revisión','En espera','Cerrado','Suspendido','Archivado');
CREATE TYPE nivel                    AS ENUM ('Crítica','Alta','Media','Baja');           -- urgencia / prioridad
CREATE TYPE nivel_carga              AS ENUM ('Alta','Media','Baja');
CREATE TYPE nivel_impacto            AS ENUM ('Alto','Medio','Bajo');
CREATE TYPE estado_cobro             AS ENUM ('Pendiente','Parcial','Cobrado','Vencido');
CREATE TYPE estado_relacion          AS ENUM ('Nuevo','Activo','Seguimiento','Inactivo');
CREATE TYPE satisfaccion_cliente     AS ENUM ('Alta','Media','Baja','No evaluada');
CREATE TYPE nivel_confidencialidad   AS ENUM ('Alta','Media','Baja');
CREATE TYPE tipo_reunion             AS ENUM ('Dirección','Operativa','Mejora','Seguimiento');
CREATE TYPE plataforma_marketing     AS ENUM ('Instagram','TikTok','Facebook');
CREATE TYPE pilar_contenido          AS ENUM ('Educación legal','Autoridad','Confianza','Error común','Procedimiento paso a paso','Derechos del cliente','Conversión');
CREATE TYPE resultado_conflicto      AS ENUM ('Sin conflicto','Requiere revisión','Conflicto identificado');
CREATE TYPE rol_persona              AS ENUM ('Administrador','Abogado','Practicante','Recepción','Coordinación');
CREATE TYPE tipo_documento           AS ENUM ('Contrato','Demanda','Poder','Escrito','Informe','Propuesta','Correspondencia','Otro');

-- =====================================================================
-- 2. FUNCIÓN AUXILIAR: mantener "actualizado_en" en cada UPDATE
-- =====================================================================

CREATE OR REPLACE FUNCTION mc_abogados.fn_set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 3. CATÁLOGO DE MATERIAS
--    Reemplaza el texto libre "Materia" repetido en asuntos, leads,
--    control_economico y conflictos_cumplimiento del archivo original.
-- =====================================================================

CREATE TABLE materias (
    id_materia    SERIAL PRIMARY KEY,
    nombre        TEXT NOT NULL UNIQUE
);
INSERT INTO materias (nombre) VALUES ('Penal'), ('Civil'), ('Laboral'), ('Otro');

-- =====================================================================
-- 4. PERSONAS / EQUIPO
-- =====================================================================

CREATE TABLE personas (
    id_persona          SERIAL PRIMARY KEY,
    nombre_completo      TEXT NOT NULL,
    rol                 rol_persona NOT NULL,
    materia_id           INT REFERENCES materias(id_materia),   -- especialidad principal
    correo              TEXT,
    telefono             TEXT,
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en            TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_personas_upd BEFORE UPDATE ON personas
    FOR EACH ROW EXECUTE FUNCTION mc_abogados.fn_set_actualizado_en();

-- Evaluación cualitativa periódica de carga (hoja 04_Equipo_Carga).
-- Los conteos (asuntos asignados, tareas abiertas/críticas) NO se
-- guardan aquí: se calculan siempre al vuelo en vw_carga_equipo para
-- que nunca queden desactualizados respecto a asuntos/tareas reales.
CREATE TABLE equipo_carga_evaluacion (
    id_evaluacion        SERIAL PRIMARY KEY,
    persona_id           INT NOT NULL REFERENCES personas(id_persona),
    fecha_evaluacion       DATE NOT NULL DEFAULT CURRENT_DATE,
    carga_percibida        nivel_carga NOT NULL,
    necesita_apoyo         si_no NOT NULL DEFAULT 'No',
    observaciones          TEXT,
    creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (persona_id, fecha_evaluacion)
);

-- =====================================================================
-- 5. CLIENTES
-- =====================================================================

CREATE TABLE clientes (
    id_cliente           SERIAL PRIMARY KEY,
    codigo               VARCHAR(20) UNIQUE,               -- ID cliente del Excel
    nombre_cliente         TEXT NOT NULL,
    contacto_principal      TEXT,
    telefono              TEXT,
    correo               TEXT,
    consentimiento_contacto si_no NOT NULL DEFAULT 'No',
    observaciones          TEXT,
    creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_clientes_upd BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION mc_abogados.fn_set_actualizado_en();

-- =====================================================================
-- 6. ASUNTOS / EXPEDIENTES
-- =====================================================================

CREATE TABLE asuntos (
    id_asunto            SERIAL PRIMARY KEY,
    codigo               VARCHAR(20) UNIQUE,               -- ID asunto del Excel
    cliente_id            INT NOT NULL REFERENCES clientes(id_cliente),
    materia_id             INT REFERENCES materias(id_materia),
    contraparte            TEXT,
    organo               TEXT,                             -- juzgado / fiscalía / entidad
    numero_expediente        TEXT,
    responsable_id          INT REFERENCES personas(id_persona),
    segundo_control         control_simple NOT NULL DEFAULT 'Pendiente',  -- ¿pasó doble control?
    estado               estado_asunto NOT NULL DEFAULT 'Activo',
    urgencia              nivel NOT NULL DEFAULT 'Media',
    proximo_hito           TEXT,
    fecha_hito             DATE,
    documentos_completos      documentos_estado NOT NULL DEFAULT 'No',
    observaciones           TEXT,
    creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT now()   -- reemplaza "última actualización" manual
);
CREATE INDEX idx_asuntos_cliente ON asuntos(cliente_id);
CREATE INDEX idx_asuntos_materia ON asuntos(materia_id);
CREATE INDEX idx_asuntos_responsable ON asuntos(responsable_id);
CREATE INDEX idx_asuntos_estado ON asuntos(estado);
CREATE INDEX idx_asuntos_fecha_hito ON asuntos(fecha_hito);
CREATE TRIGGER trg_asuntos_upd BEFORE UPDATE ON asuntos
    FOR EACH ROW EXECUTE FUNCTION mc_abogados.fn_set_actualizado_en();

-- Seguimiento/relación con el cliente (hoja 08). Vive aparte de
-- "clientes" porque es un historial (varias filas en el tiempo), no un
-- atributo fijo del cliente.
CREATE TABLE seguimiento_clientes (
    id_seguimiento         SERIAL PRIMARY KEY,
    cliente_id            INT NOT NULL REFERENCES clientes(id_cliente),
    asunto_id             INT REFERENCES asuntos(id_asunto),
    responsable_id           INT REFERENCES personas(id_persona),
    ultimo_contacto          DATE,
    proximo_contacto         DATE,
    estado_relacion          estado_relacion NOT NULL DEFAULT 'Nuevo',
    satisfaccion            satisfaccion_cliente NOT NULL DEFAULT 'No evaluada',
    observaciones           TEXT,
    creado_en              TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_seg_clientes_cliente ON seguimiento_clientes(cliente_id);
CREATE INDEX idx_seg_clientes_asunto ON seguimiento_clientes(asunto_id);
CREATE TRIGGER trg_seg_clientes_upd BEFORE UPDATE ON seguimiento_clientes
    FOR EACH ROW EXECUTE FUNCTION mc_abogados.fn_set_actualizado_en();
-- Si asunto_id está presente, debe pertenecer al mismo cliente: evita
-- que ambos campos queden inconsistentes entre sí.
CREATE OR REPLACE FUNCTION mc_abogados.fn_check_seguimiento_cliente_asunto()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.asunto_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM asuntos a WHERE a.id_asunto = NEW.asunto_id AND a.cliente_id = NEW.cliente_id) THEN
            RAISE EXCEPTION 'El asunto % no pertenece al cliente %', NEW.asunto_id, NEW.cliente_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_seg_clientes_check BEFORE INSERT OR UPDATE ON seguimiento_clientes
    FOR EACH ROW EXECUTE FUNCTION mc_abogados.fn_check_seguimiento_cliente_asunto();

-- =====================================================================
-- 7. TAREAS Y PLAZOS
-- =====================================================================

CREATE TABLE tareas (
    id_tarea              SERIAL PRIMARY KEY,
    codigo                VARCHAR(20) UNIQUE,              -- ID tarea del Excel
    asunto_id             INT NOT NULL REFERENCES asuntos(id_asunto),
    tarea                 TEXT NOT NULL,
    responsable_id          INT REFERENCES personas(id_persona),
    prioridad              nivel NOT NULL DEFAULT 'Media',
    fecha_asignacion         DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_limite            DATE NOT NULL,
    estado                estado_basico NOT NULL DEFAULT 'Pendiente',
    requiere_revision_abogado  si_no NOT NULL DEFAULT 'No',
    segundo_control          control_simple NOT NULL DEFAULT 'Pendiente',
    evidencia              TEXT,
    fecha_cierre            DATE,
    observaciones           TEXT,
    creado_en              TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_tarea_fechas CHECK (fecha_cierre IS NULL OR fecha_cierre >= fecha_asignacion)
);
CREATE INDEX idx_tareas_asunto ON tareas(asunto_id);
CREATE INDEX idx_tareas_responsable ON tareas(responsable_id);
CREATE INDEX idx_tareas_estado ON tareas(estado);
CREATE INDEX idx_tareas_fecha_limite ON tareas(fecha_limite);
CREATE TRIGGER trg_tareas_upd BEFORE UPDATE ON tareas
    FOR EACH ROW EXECUTE FUNCTION mc_abogados.fn_set_actualizado_en();

-- =====================================================================
-- 8. LEADS / INTAKE
-- =====================================================================

CREATE TABLE leads (
    id_lead                SERIAL PRIMARY KEY,
    codigo                 VARCHAR(20) UNIQUE,             -- ID lead del Excel
    fecha                  DATE NOT NULL DEFAULT CURRENT_DATE,
    nombre                 TEXT NOT NULL,
    contacto                TEXT,
    origen                 TEXT,                           -- referido, redes, web...
    materia_id               INT REFERENCES materias(id_materia),
    urgencia                nivel DEFAULT 'Media',
    documentos               documentos_estado DEFAULT 'No',
    fecha_consulta            DATE,                          -- NULL = consulta aún no agendada
    propuesta                TEXT,
    estado                 estado_general_lead NOT NULL DEFAULT 'Pendiente',
    proxima_accion             TEXT,
    motivo_perdida             TEXT,
    cliente_convertido_id        INT REFERENCES clientes(id_cliente),  -- se llena si el lead se vuelve cliente
    creado_en                TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_estado ON leads(estado);
CREATE INDEX idx_leads_fecha ON leads(fecha);
CREATE INDEX idx_leads_materia ON leads(materia_id);
CREATE TRIGGER trg_leads_upd BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION mc_abogados.fn_set_actualizado_en();

-- =====================================================================
-- 9. CONTROL DOCUMENTAL
--    Todo documento pertenece a un asunto (asunto_id NOT NULL); el
--    cliente se obtiene vía asuntos.cliente_id — no se repite aquí.
-- =====================================================================

CREATE TABLE documentos (
    id_documento            SERIAL PRIMARY KEY,
    codigo                 VARCHAR(20) UNIQUE,             -- ID documento del Excel
    asunto_id               INT NOT NULL REFERENCES asuntos(id_asunto),
    nombre_documento           TEXT NOT NULL,
    tipo                   tipo_documento NOT NULL DEFAULT 'Otro',
    version                 TEXT,
    fecha                  DATE NOT NULL DEFAULT CURRENT_DATE,
    responsable_id             INT REFERENCES personas(id_persona),
    revision_abogado            control_simple NOT NULL DEFAULT 'Pendiente',
    estado                 estado_basico NOT NULL DEFAULT 'Pendiente',
    ubicacion_enlace            TEXT,
    confidencialidad            nivel_confidencialidad NOT NULL DEFAULT 'Media',
    observaciones             TEXT,
    creado_en               TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_documentos_asunto ON documentos(asunto_id);
CREATE TRIGGER trg_documentos_upd BEFORE UPDATE ON documentos
    FOR EACH ROW EXECUTE FUNCTION mc_abogados.fn_set_actualizado_en();

-- =====================================================================
-- 10. REUNIONES Y ACUERDOS
-- =====================================================================

CREATE TABLE reuniones (
    id_reunion              SERIAL PRIMARY KEY,
    codigo                 VARCHAR(20) UNIQUE,             -- ID reunión del Excel
    fecha                  DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo                   tipo_reunion NOT NULL DEFAULT 'Operativa',
    tema                   TEXT,
    decision_acuerdo           TEXT,
    accion                 TEXT,
    responsable_id             INT REFERENCES personas(id_persona),
    fecha_compromiso           DATE,
    estado                 estado_basico NOT NULL DEFAULT 'Pendiente',
    evidencia               TEXT,
    observaciones             TEXT,
    creado_en               TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reuniones_fecha ON reuniones(fecha);
CREATE TRIGGER trg_reuniones_upd BEFORE UPDATE ON reuniones
    FOR EACH ROW EXECUTE FUNCTION mc_abogados.fn_set_actualizado_en();

-- "Participantes" (texto libre en el Excel) normalizado como N:M.
CREATE TABLE reunion_participantes (
    reunion_id               INT NOT NULL REFERENCES reuniones(id_reunion) ON DELETE CASCADE,
    persona_id                INT NOT NULL REFERENCES personas(id_persona),
    PRIMARY KEY (reunion_id, persona_id)
);

-- =====================================================================
-- 11. INCIDENCIAS Y MEJORA CONTINUA
-- =====================================================================

CREATE TABLE incidencias (
    id_incidencia             SERIAL PRIMARY KEY,
    codigo                  VARCHAR(20) UNIQUE,
    fecha                   DATE NOT NULL DEFAULT CURRENT_DATE,
    area                    TEXT NOT NULL,
    incidencia                TEXT NOT NULL,
    impacto                 nivel_impacto NOT NULL DEFAULT 'Medio',
    causa_preliminar             TEXT,
    accion_inmediata             TEXT,
    responsable_id              INT REFERENCES personas(id_persona),
    fecha_compromiso            DATE,
    estado                  estado_basico NOT NULL DEFAULT 'Pendiente',
    accion_preventiva            TEXT,
    observaciones              TEXT,
    creado_en                TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_incidencias_estado ON incidencias(estado);
CREATE TRIGGER trg_incidencias_upd BEFORE UPDATE ON incidencias
    FOR EACH ROW EXECUTE FUNCTION mc_abogados.fn_set_actualizado_en();

-- =====================================================================
-- 12. CONTROL ECONÓMICO
--     Todo movimiento se ata a un asunto (asunto_id NOT NULL); cliente
--     y materia se obtienen por join, no se repiten aquí.
-- =====================================================================

CREATE TABLE control_economico (
    id_movimiento             SERIAL PRIMARY KEY,
    fecha                   DATE NOT NULL DEFAULT CURRENT_DATE,
    asunto_id                INT NOT NULL REFERENCES asuntos(id_asunto),
    servicio                 TEXT NOT NULL,
    canal                   TEXT,                          -- transferencia, efectivo, Yape...
    monto_acordado              NUMERIC(12,2) NOT NULL DEFAULT 0,
    monto_cobrado              NUMERIC(12,2) NOT NULL DEFAULT 0,
    pendiente                NUMERIC(12,2) GENERATED ALWAYS AS (monto_acordado - monto_cobrado) STORED,
    costo_directo              NUMERIC(12,2) NOT NULL DEFAULT 0,
    margen_bruto              NUMERIC(12,2) GENERATED ALWAYS AS (monto_cobrado - costo_directo) STORED,
    estado_cobro               estado_cobro NOT NULL DEFAULT 'Pendiente',
    observaciones              TEXT,
    creado_en                TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_montos_no_negativos CHECK (monto_acordado >= 0 AND monto_cobrado >= 0 AND costo_directo >= 0)
);
CREATE INDEX idx_econ_asunto ON control_economico(asunto_id);
CREATE INDEX idx_econ_estado_cobro ON control_economico(estado_cobro);
CREATE INDEX idx_econ_fecha ON control_economico(fecha);
CREATE TRIGGER trg_econ_upd BEFORE UPDATE ON control_economico
    FOR EACH ROW EXECUTE FUNCTION mc_abogados.fn_set_actualizado_en();

-- =====================================================================
-- 13. MARKETING JURÍDICO
-- =====================================================================

CREATE TABLE marketing_contenido (
    id_contenido              SERIAL PRIMARY KEY,
    codigo                  VARCHAR(20) UNIQUE,            -- ID contenido del Excel
    fecha                   DATE NOT NULL DEFAULT CURRENT_DATE,
    plataforma                plataforma_marketing NOT NULL,
    pilar                   pilar_contenido NOT NULL,
    tema                    TEXT NOT NULL,
    base_legal_fuente             TEXT,
    formato                 TEXT,                          -- video, carrusel, post...
    responsable_id              INT REFERENCES personas(id_persona),
    revision_legal              control_simple NOT NULL DEFAULT 'Pendiente',
    estado                  estado_basico NOT NULL DEFAULT 'Pendiente',
    cta                    TEXT,
    leads_generados             INT NOT NULL DEFAULT 0,
    observaciones              TEXT,
    creado_en                TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_marketing_fecha ON marketing_contenido(fecha);
CREATE TRIGGER trg_marketing_upd BEFORE UPDATE ON marketing_contenido
    FOR EACH ROW EXECUTE FUNCTION mc_abogados.fn_set_actualizado_en();

-- =====================================================================
-- 14. CONTROL DE CONFLICTOS Y CUMPLIMIENTO
--     Se revisa antes de aceptar un asunto: puede referir solo a un
--     lead (aún no hay cliente/asunto) o a un asunto ya existente.
--     "contraparte" se mantiene aquí porque el chequeo suele hacerse
--     antes de que exista el asunto formal (no es redundante con
--     asuntos.contraparte, que se registra después).
-- =====================================================================

CREATE TABLE conflictos_cumplimiento (
    id_revision               SERIAL PRIMARY KEY,
    codigo                  VARCHAR(20) UNIQUE,            -- ID revisión del Excel
    fecha                   DATE NOT NULL DEFAULT CURRENT_DATE,
    lead_id                  INT REFERENCES leads(id_lead),
    asunto_id                INT REFERENCES asuntos(id_asunto),
    contraparte                TEXT,
    revision_conflicto            TEXT,
    resultado                resultado_conflicto NOT NULL DEFAULT 'Sin conflicto',
    reviso_id                INT REFERENCES personas(id_persona),
    accion_requerida             TEXT,
    estado                  estado_basico NOT NULL DEFAULT 'Pendiente',
    observaciones              TEXT,
    creado_en                TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_conflicto_referencia CHECK (lead_id IS NOT NULL OR asunto_id IS NOT NULL)
);
CREATE INDEX idx_conflictos_lead ON conflictos_cumplimiento(lead_id);
CREATE INDEX idx_conflictos_asunto ON conflictos_cumplimiento(asunto_id);
CREATE TRIGGER trg_conflictos_upd BEFORE UPDATE ON conflictos_cumplimiento
    FOR EACH ROW EXECUTE FUNCTION mc_abogados.fn_set_actualizado_en();

-- =====================================================================
-- 15. PLAN DE INSTALACIÓN — DÍA 1
-- =====================================================================

CREATE TABLE plan_instalacion (
    id_bloque                SERIAL PRIMARY KEY,
    bloque                  TEXT NOT NULL,
    accion                  TEXT NOT NULL,
    entregable                TEXT,
    responsable_sugerido           TEXT,                    -- rol/combinación sugerida, no una persona real
    hora_sugerida              TIME,
    orden                   INT NOT NULL UNIQUE
);

CREATE TABLE plan_instalacion_ejecucion (
    id_ejecucion               SERIAL PRIMARY KEY,
    bloque_id                INT NOT NULL REFERENCES plan_instalacion(id_bloque),
    fecha                   DATE NOT NULL DEFAULT CURRENT_DATE,
    responsable_id              INT REFERENCES personas(id_persona),
    estado                  estado_basico NOT NULL DEFAULT 'Pendiente',
    evidencia                TEXT,
    observaciones              TEXT,
    UNIQUE (bloque_id, fecha)
);

INSERT INTO plan_instalacion (bloque, accion, entregable, responsable_sugerido, hora_sugerida, orden) VALUES
('1. Dirección',    'Reunión breve con abogado/dueño',                                   'Prioridades, riesgos y expectativas del día', 'Administrador',              '08:00', 1),
('2. Expedientes',  'Inventario rápido de asuntos activos y críticos',                    'Listado maestro inicial',                    'Administrador + equipo',     '09:00', 2),
('3. Plazos',       'Detectar vencimientos próximos y asuntos urgentes',                  'Semáforo de riesgos de plazo',                'Administrador + coordinación','10:00', 3),
('4. Personas',     'Identificar responsable y carga por practicante',                    'Mapa inicial de cargas',                     'Administrador',              '11:00', 4),
('5. Clientes',     'Revisar consultas/prospectos pendientes',                            'Registro inicial de leads y siguiente acción','Administrador/recepción',    '12:00', 5),
('6. Documentos',   'Revisar orden y nomenclatura de archivos',                            '3–5 mejoras inmediatas aplicables',            'Administrador',              '14:00', 6),
('7. Incidencias',  'Registrar problemas operativos observados',                          'Bitácora de incidencias + responsable',        'Administrador',              '15:00', 7),
('8. Cierre',       'Preparar reporte ejecutivo de 1 página',                             'Reporte al dueño + prioridades de mañana',      'Administrador',              '17:00', 8),
('9. Conflictos',   'Confirmar que los nuevos asuntos pasan por revisión de conflicto de interés.', 'Registro de revisión / resultado', 'Administrador + abogado',    NULL,    9),
('10. Cierre',      'Consolidar urgencias, pendientes, incidencias y prioridades de mañana.', 'Reporte ejecutivo de cierre',              'Administrador',              NULL,    10);

-- =====================================================================
-- 16. VISTAS
--     Sustituyen toda columna que antes duplicaba un dato calculable.
-- =====================================================================

-- Indicadores del tablero (hoja 07_Dashboard), siempre en tiempo real.
CREATE VIEW vw_dashboard_kpis AS
SELECT
    (SELECT COUNT(*) FROM asuntos)                                              AS asuntos_registrados,
    (SELECT COUNT(*) FROM asuntos WHERE urgencia = 'Crítica' AND estado NOT IN ('Cerrado','Archivado')) AS asuntos_criticos,
    (SELECT COUNT(*) FROM asuntos WHERE fecha_hito IS NOT NULL
        AND fecha_hito - CURRENT_DATE BETWEEN 0 AND 3
        AND estado NOT IN ('Cerrado','Archivado'))                              AS asuntos_hito_3_dias,
    (SELECT COUNT(*) FROM asuntos WHERE fecha_hito IS NOT NULL
        AND fecha_hito < CURRENT_DATE AND estado NOT IN ('Cerrado','Archivado')) AS asuntos_vencidos,
    (SELECT COUNT(*) FROM tareas WHERE estado NOT IN ('Completada','Cancelada')) AS tareas_abiertas,
    (SELECT COUNT(*) FROM tareas WHERE prioridad = 'Crítica' AND estado NOT IN ('Completada','Cancelada')) AS tareas_criticas,
    (SELECT COUNT(*) FROM leads)                                                AS leads_registrados,
    (SELECT COUNT(*) FROM leads WHERE estado = 'Contratado')                    AS leads_contratados,
    (SELECT COUNT(*) FROM incidencias WHERE estado NOT IN ('Completada','Cancelada')) AS incidencias_abiertas,
    (SELECT COALESCE(SUM(pendiente),0) FROM control_economico WHERE estado_cobro IN ('Pendiente','Parcial')) AS cobros_pendientes;

-- Asuntos con riesgo de plazo, con nombre de cliente/materia resueltos.
CREATE VIEW vw_asuntos_riesgo AS
SELECT
    a.id_asunto, a.codigo, m.nombre AS materia, a.estado, a.urgencia,
    a.fecha_hito, (a.fecha_hito - CURRENT_DATE) AS dias_restantes,
    c.nombre_cliente, p.nombre_completo AS responsable
FROM asuntos a
JOIN clientes c ON c.id_cliente = a.cliente_id
LEFT JOIN materias m ON m.id_materia = a.materia_id
LEFT JOIN personas p ON p.id_persona = a.responsable_id
WHERE a.estado NOT IN ('Cerrado','Archivado');

CREATE VIEW vw_tareas_riesgo AS
SELECT
    t.id_tarea, t.codigo, t.tarea, t.estado, t.prioridad, t.fecha_limite,
    (t.fecha_limite - CURRENT_DATE) AS dias_restantes,
    a.codigo AS codigo_asunto, p.nombre_completo AS responsable
FROM tareas t
JOIN asuntos a ON a.id_asunto = t.asunto_id
LEFT JOIN personas p ON p.id_persona = t.responsable_id
WHERE t.estado NOT IN ('Completada','Cancelada');

-- Carga de trabajo por persona, calculada en tiempo real (reemplaza los
-- conteos manuales que antes se guardaban en equipo_carga_snapshot).
CREATE VIEW vw_carga_equipo AS
SELECT
    p.id_persona, p.nombre_completo, p.rol,
    COUNT(DISTINCT a.id_asunto) FILTER (WHERE a.estado NOT IN ('Cerrado','Archivado')) AS asuntos_activos,
    COUNT(DISTINCT t.id_tarea) FILTER (WHERE t.estado NOT IN ('Completada','Cancelada')) AS tareas_abiertas,
    COUNT(DISTINCT t.id_tarea) FILTER (WHERE t.prioridad = 'Crítica' AND t.estado NOT IN ('Completada','Cancelada')) AS tareas_criticas,
    COUNT(DISTINCT a.id_asunto) FILTER (WHERE a.fecha_hito IS NOT NULL AND a.fecha_hito - CURRENT_DATE BETWEEN 0 AND 3
        AND a.estado NOT IN ('Cerrado','Archivado')) AS hitos_proximos
FROM personas p
LEFT JOIN asuntos a ON a.responsable_id = p.id_persona
LEFT JOIN tareas t ON t.responsable_id = p.id_persona
GROUP BY p.id_persona, p.nombre_completo, p.rol;

-- Estado de revisión de conflicto por lead (reemplaza el booleano
-- leads.conflicto_revisado, que duplicaba esta misma información).
CREATE VIEW vw_leads_conflicto AS
SELECT
    l.id_lead, l.codigo, l.nombre,
    cc.id_revision, cc.resultado, cc.fecha AS fecha_revision, cc.estado AS estado_revision
FROM leads l
LEFT JOIN conflictos_cumplimiento cc ON cc.lead_id = l.id_lead;

-- Detalle de conflictos con materia y cliente resueltos por join
-- (evita guardar materia_id/cliente_id repetidos en la tabla base).
CREATE VIEW vw_conflictos_detalle AS
SELECT
    cc.*,
    COALESCE(ma.nombre, ml.nombre) AS materia,
    cl.nombre_cliente
FROM conflictos_cumplimiento cc
LEFT JOIN asuntos a ON a.id_asunto = cc.asunto_id
LEFT JOIN leads l ON l.id_lead = cc.lead_id
LEFT JOIN materias ma ON ma.id_materia = a.materia_id
LEFT JOIN materias ml ON ml.id_materia = l.materia_id
LEFT JOIN clientes cl ON cl.id_cliente = a.cliente_id;

-- Documentos con cliente resuelto por join (ya no se guarda cliente_id
-- en la tabla documentos: siempre se obtiene vía asunto_id).
CREATE VIEW vw_documentos_detalle AS
SELECT d.*, a.cliente_id, cl.nombre_cliente
FROM documentos d
JOIN asuntos a ON a.id_asunto = d.asunto_id
JOIN clientes cl ON cl.id_cliente = a.cliente_id;

-- Movimientos económicos con cliente y materia resueltos por join.
CREATE VIEW vw_control_economico_detalle AS
SELECT ce.*, a.cliente_id, cl.nombre_cliente, a.materia_id, m.nombre AS materia
FROM control_economico ce
JOIN asuntos a ON a.id_asunto = ce.asunto_id
JOIN clientes cl ON cl.id_cliente = a.cliente_id
LEFT JOIN materias m ON m.id_materia = a.materia_id;

-- =====================================================================
-- 17. COMENTARIOS DE ESQUEMA
-- =====================================================================

COMMENT ON SCHEMA mc_abogados IS 'Base de datos de gestión operativa para el Estudio Jurídico M&C Abogados E.I.R.L., derivada de la herramienta Excel "Día 1".';
COMMENT ON TABLE materias IS 'Catálogo abierto de especialidades (Penal, Civil, Laboral...), referenciado por asuntos, leads y personas en vez de repetir texto libre.';
COMMENT ON TABLE personas IS 'Equipo del estudio: administradores, abogados y practicantes.';
COMMENT ON TABLE clientes IS 'Identidad de los clientes del estudio.';
COMMENT ON TABLE seguimiento_clientes IS 'Historial de seguimiento/relación con cada cliente, opcionalmente ligado a un asunto propio de ese cliente.';
COMMENT ON TABLE asuntos IS 'Registro maestro de expedientes/casos legales.';
COMMENT ON TABLE tareas IS 'Tareas y plazos asociados a cada asunto.';
COMMENT ON TABLE leads IS 'Prospectos e intake comercial.';
COMMENT ON TABLE documentos IS 'Control documental; siempre ligado a un asunto (el cliente se resuelve por join, ver vw_documentos_detalle).';
COMMENT ON TABLE reuniones IS 'Reuniones, decisiones y acuerdos.';
COMMENT ON TABLE incidencias IS 'Bitácora de incidencias y mejora continua.';
COMMENT ON TABLE control_economico IS 'Cobros, costos y márgenes por asunto (cliente/materia se resuelven por join, ver vw_control_economico_detalle).';
COMMENT ON TABLE marketing_contenido IS 'Plan de contenido y marketing jurídico.';
COMMENT ON TABLE conflictos_cumplimiento IS 'Revisión de conflicto de interés antes de aceptar un lead o asunto.';
COMMENT ON TABLE plan_instalacion IS 'Plantilla del checklist de instalación del sistema (Día 1).';

-- =====================================================================
-- NOTAS DE NORMALIZACIÓN (resumen de decisiones de diseño)
-- =====================================================================
-- 1. materias: tabla en vez de texto repetido en 4 lugares (asuntos,
--    leads, personas y, antes, control_economico/conflictos).
-- 2. cliente_id eliminado de documentos, control_economico y
--    conflictos_cumplimiento: siempre se llega al cliente vía
--    asunto_id -> asuntos.cliente_id. Vistas *_detalle lo resuelven.
-- 3. segundo_control: pasó de FK a persona a ENUM control_simple,
--    porque en el Excel es una bandera de doble control, no una firma.
-- 4. asuntos.ultima_actualizacion (manual) eliminado a favor de
--    actualizado_en, mantenido automáticamente por trigger.
-- 5. leads.conflicto_revisado y leads.consulta_agendada eliminados:
--    el primero se deduce de la existencia de una fila en
--    conflictos_cumplimiento (vw_leads_conflicto); el segundo, de
--    fecha_consulta IS NOT NULL.
-- 6. equipo_carga_snapshot -> equipo_carga_evaluacion: ya no guarda
--    conteos (asuntos/tareas asignadas), porque vw_carga_equipo los
--    calcula siempre correctos; solo conserva lo que es juicio humano
--    (carga percibida, necesita apoyo).
-- 7. personas.codigo eliminado: el Excel no identifica personas con un
--    ID propio: el id_persona interno basta.
-- 8. Auditoría (creado_en / actualizado_en + trigger) estandarizada en
--    todas las tablas transaccionales.
-- =====================================================================
-- Personas
INSERT INTO personas (nombre_completo, rol, materia_id, correo)
VALUES
  ('Juan Pérez', 'Abogado', (SELECT id_materia FROM materias WHERE nombre = 'Penal'), 'jperez@mycabogados.pe'),
  ('María Torres', 'Administrador', NULL, 'mtorres@mycabogados.pe');

-- Cliente
INSERT INTO clientes (codigo, nombre_cliente, contacto_principal, telefono, correo)
VALUES ('CLI-0001', 'Carlos Ramos', 'Carlos Ramos', '999888777', 'cramos@correo.com');

-- Asunto (usamos subconsultas para no depender de IDs fijos)
INSERT INTO asuntos (codigo, cliente_id, materia_id, contraparte, organo, numero_expediente, responsable_id, estado, urgencia, proximo_hito, fecha_hito)
VALUES (
  'AST-0001',
  (SELECT id_cliente FROM clientes WHERE codigo = 'CLI-0001'),
  (SELECT id_materia FROM materias WHERE nombre = 'Penal'),
  'Empresa XYZ S.A.C.',
  '2° Juzgado Penal de Chiclayo',
  'EXP-2026-0456',
  (SELECT id_persona FROM personas WHERE nombre_completo = 'Juan Pérez'),
  'Activo', 'Alta', 'Audiencia de control de acusación', CURRENT_DATE + INTERVAL '5 days'
);

-- Tareas
INSERT INTO tareas (codigo, asunto_id, tarea, responsable_id, prioridad, fecha_limite)
VALUES
  ('TAR-0001', (SELECT id_asunto FROM asuntos WHERE codigo = 'AST-0001'),
   'Preparar escrito de defensa', (SELECT id_persona FROM personas WHERE nombre_completo = 'Juan Pérez'),
   'Crítica', CURRENT_DATE + INTERVAL '3 days'),
  ('TAR-0002', (SELECT id_asunto FROM asuntos WHERE codigo = 'AST-0001'),
   'Recopilar pruebas documentales', (SELECT id_persona FROM personas WHERE nombre_completo = 'Juan Pérez'),
   'Media', CURRENT_DATE + INTERVAL '10 days');

-- Lead
INSERT INTO leads (codigo, nombre, contacto, origen, materia_id, urgencia, estado)
VALUES ('LEAD-0001', 'Ana Gómez', '987654321', 'Referido', (SELECT id_materia FROM materias WHERE nombre = 'Civil'), 'Media', 'Pendiente');

-- Documento
INSERT INTO documentos (codigo, asunto_id, nombre_documento, tipo, responsable_id)
VALUES ('DOC-0001', (SELECT id_asunto FROM asuntos WHERE codigo = 'AST-0001'),
        'Poder judicial', 'Poder', (SELECT id_persona FROM personas WHERE nombre_completo = 'Juan Pérez'));

-- Movimiento económico
INSERT INTO control_economico (asunto_id, servicio, canal, monto_acordado, monto_cobrado, costo_directo, estado_cobro)
VALUES ((SELECT id_asunto FROM asuntos WHERE codigo = 'AST-0001'),
        'Defensa penal - primera instancia', 'Transferencia', 3000.00, 1500.00, 200.00, 'Parcial');


SELECT * FROM vw_dashboard_kpis;
SELECT * FROM vw_asuntos_riesgo;
SELECT * FROM vw_tareas_riesgo;
SELECT * FROM vw_carga_equipo;

-- =====================================================================
-- M&C ABOGADOS — v3 (incremental): USUARIOS Y LOGIN
-- Se ejecuta SOBRE la base mc_abogados ya creada con mc_abogados_db.sql.
-- No borra ni modifica datos existentes.
--
-- Diseño (sin redundancia):
--   * Nombre, correo y estado laboral de la persona viven en "personas";
--     "usuarios" solo guarda lo propio del acceso (rol de acceso,
--     hash de contraseña, control de bloqueo).
--   * El correo de personas pasa a ser único: es el identificador de login.
--   * La contraseña NUNCA se guarda en texto plano: solo el hash (bcrypt),
--     que genera y verifica la aplicación web.
-- =====================================================================

SET search_path TO mc_abogados, public;

-- 1. Rol de ACCESO al sistema (distinto del cargo laboral de personas.rol:
--    un cargo como "Recepción" o "Coordinación" necesita un nivel de acceso).
CREATE TYPE rol_acceso AS ENUM ('Administrador','Abogado','Practicante');

-- 2. El correo identifica al usuario al iniciar sesión: debe ser único
--    (sin distinguir mayúsculas). Los NULL siguen permitidos.
CREATE UNIQUE INDEX uq_personas_correo ON personas (lower(correo)) WHERE correo IS NOT NULL;

-- 3. Tabla de usuarios: una persona tiene como máximo una cuenta.
CREATE TABLE usuarios (
    id_usuario         SERIAL PRIMARY KEY,
    persona_id         INT NOT NULL UNIQUE REFERENCES personas(id_persona),
    rol                rol_acceso NOT NULL,
    password_hash      TEXT NOT NULL,                       -- bcrypt/argon2, nunca texto plano
    activo             BOOLEAN NOT NULL DEFAULT TRUE,       -- cuenta habilitada (independiente de personas.activo)
    intentos_fallidos  SMALLINT NOT NULL DEFAULT 0 CHECK (intentos_fallidos >= 0),
    bloqueado_hasta    TIMESTAMPTZ,                         -- bloqueo temporal tras varios intentos fallidos
    ultimo_acceso      TIMESTAMPTZ,
    creado_en          TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_usuarios_upd BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION mc_abogados.fn_set_actualizado_en();

-- 4. Vista para el login: la app busca por correo y compara el hash.
--    Solo devuelve cuentas que pueden entrar (usuario y persona activos).
CREATE VIEW vw_usuarios_login AS
SELECT
    u.id_usuario,
    p.id_persona,
    p.nombre_completo,
    p.correo,
    u.rol,
    u.password_hash,
    u.intentos_fallidos,
    u.bloqueado_hasta,
    (u.bloqueado_hasta IS NOT NULL AND u.bloqueado_hasta > now()) AS esta_bloqueado
FROM usuarios u
JOIN personas p ON p.id_persona = u.persona_id
WHERE u.activo AND p.activo AND p.correo IS NOT NULL;

COMMENT ON TABLE usuarios IS 'Cuentas de acceso al sistema web. Nombre y correo se toman de personas.';
COMMENT ON COLUMN usuarios.password_hash IS 'Hash de la contraseña generado por la aplicación (bcrypt/argon2). Nunca texto plano.';

-- =====================================================================
-- 5. USUARIO DE PRUEBA (opcional, solo para desarrollo)
--    Crea la cuenta de María Torres (administradora de los datos de
--    prueba) con contraseña 'Prueba123'. Si esa persona no existe,
--    no inserta nada. CAMBIAR/ELIMINAR antes de usar datos reales.
--    crypt(..., gen_salt('bf')) genera un hash bcrypt compatible con
--    las librerías bcrypt de Node.js y password_verify de PHP/Laravel.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO usuarios (persona_id, rol, password_hash)
SELECT id_persona, 'Administrador', crypt('Prueba123', gen_salt('bf'))
FROM personas
WHERE lower(correo) = 'mtorres@mycabogados.pe';

SELECT nombre_completo, correo, rol, esta_bloqueado FROM vw_usuarios_login;