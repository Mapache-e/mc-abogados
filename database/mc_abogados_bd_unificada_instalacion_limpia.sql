-- ============================================================================
-- M&C ABOGADOS E.I.R.L. | INSTALACION INTEGRAL PostgreSQL 14+
-- ARCHIVO UNIFICADO PARA UNA BASE DE DATOS NUEVA Y VACIA (DESARROLLO)
-- ============================================================================
-- Combina, en orden:
--   1. mc_abogados_db.sql                  (estructura + registros iniciales + login)
--   2. ampliacion_mc_abogados.sql           (perfiles, audiencias, recibos, vistas)
--   3. configuracion_admin.sql              (parametros del estudio)
--   4. mc_abogados_datos_demo_15_usuarios.sql (15 cuentas + datos ficticios)
-- Query_1Avance.sql es COPIA EXACTA de mc_abogados_db.sql, no se repite.
--
-- *** IMPORTANTE ***
-- Este archivo NO es una migracion para tu base existente.
-- Crea una base de datos VACIA desde pgAdmin y ejecuta este SQL UNA SOLA VEZ.
-- Si existe el esquema mc_abogados, se detiene de forma segura SIN MODIFICARLO.
-- Para proteger datos reales, realiza backup antes de cualquier cambio.
-- NO ejecutar en phpMyAdmin/MySQL/MariaDB; solo PostgreSQL.
--
-- Credenciales SOLO para pruebas locales:
--   Maria Torres: conserva Prueba123 segun semilla original.
--   Otras 14 cuentas: Demo2026! (hash bcrypt en base de datos).
-- Nunca usar estas credenciales ni datos ficticios en produccion.
--
-- Codificacion del archivo: UTF-8.
-- ============================================================================
BEGIN;

-- PROTECCION: impide que una segunda ejecucion toque la base ya instalada.
DO $proteccion$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'mc_abogados') THEN
        RAISE EXCEPTION 'El esquema mc_abogados ya existe. No ejecutes la instalacion unificada sobre una base con datos. Crea una base de datos nueva y vacia.';
    END IF;
END;
$proteccion$;


-- ===== BLOQUE 1/4: ESQUEMA PRINCIPAL =====

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

-- ===== BLOQUE 2/4: AMPLIACION WEB =====

-- M&C ABOGADOS E.I.R.L.
-- AMPLIACION DEL ESQUEMA PARA EL SISTEMA WEB
-- Complementa mc_abogados_db.sql sin reemplazarlo.

SET search_path TO mc_abogados, public;

-- 1. DATOS ADICIONALES DE CLIENTES

ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS tipo_documento_identidad VARCHAR(10),
    ADD COLUMN IF NOT EXISTS numero_documento VARCHAR(20),
    ADD COLUMN IF NOT EXISTS representante_legal TEXT,
    ADD COLUMN IF NOT EXISTS direccion TEXT,
    ADD COLUMN IF NOT EXISTS foto_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_numero_documento
    ON clientes(numero_documento)
    WHERE numero_documento IS NOT NULL;


-- 2. DATOS ADICIONALES DEL EQUIPO

ALTER TABLE personas
    ADD COLUMN IF NOT EXISTS numero_documento VARCHAR(20),
    ADD COLUMN IF NOT EXISTS direccion TEXT,
    ADD COLUMN IF NOT EXISTS foto_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_personas_numero_documento
    ON personas(numero_documento)
    WHERE numero_documento IS NOT NULL;


-- 3. PERFIL PROFESIONAL DE ABOGADOS

CREATE TABLE IF NOT EXISTS abogados_perfil (
    id_abogado_perfil SERIAL PRIMARY KEY,
    persona_id INT NOT NULL UNIQUE
        REFERENCES personas(id_persona) ON DELETE CASCADE,

    numero_colegiatura VARCHAR(50),
    colegio_abogados TEXT,
    especialidad_descripcion TEXT,
    biografia TEXT,

    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_abogados_perfil_upd ON abogados_perfil;

CREATE TRIGGER trg_abogados_perfil_upd
BEFORE UPDATE ON abogados_perfil
FOR EACH ROW
EXECUTE FUNCTION mc_abogados.fn_set_actualizado_en();


-- 4. PERFIL DE PRACTICANTES

CREATE TABLE IF NOT EXISTS practicantes_perfil (
    id_practicante_perfil SERIAL PRIMARY KEY,

    persona_id INT NOT NULL UNIQUE
        REFERENCES personas(id_persona) ON DELETE CASCADE,

    universidad TEXT,
    carrera TEXT,
    ciclo VARCHAR(20),

    convenio_practicas TEXT,
    contrato_url TEXT,

    fecha_inicio DATE,
    fecha_fin DATE,

    horario_entrada TIME,
    horario_salida TIME,

    dias_practica TEXT,

    seguro_fola BOOLEAN NOT NULL DEFAULT FALSE,
    seguro_fola_detalle TEXT,

    vacaciones_desde DATE,
    vacaciones_hasta DATE,

    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_practicante_fechas
        CHECK (
            fecha_fin IS NULL
            OR fecha_inicio IS NULL
            OR fecha_fin >= fecha_inicio
        ),

    CONSTRAINT chk_practicante_vacaciones
        CHECK (
            vacaciones_hasta IS NULL
            OR vacaciones_desde IS NULL
            OR vacaciones_hasta >= vacaciones_desde
        )
);

DROP TRIGGER IF EXISTS trg_practicantes_perfil_upd ON practicantes_perfil;

CREATE TRIGGER trg_practicantes_perfil_upd
BEFORE UPDATE ON practicantes_perfil
FOR EACH ROW
EXECUTE FUNCTION mc_abogados.fn_set_actualizado_en();


-- 5. INFORMACION JUDICIAL ADICIONAL DE EXPEDIENTES

ALTER TABLE asuntos
    ADD COLUMN IF NOT EXISTS carpeta_fiscal TEXT,
    ADD COLUMN IF NOT EXISTS denuncia_policial TEXT,
    ADD COLUMN IF NOT EXISTS titulo_asunto TEXT;


-- 6. DISPONIBILIDAD DEL EQUIPO


CREATE TABLE IF NOT EXISTS disponibilidad_equipo (
    id_disponibilidad SERIAL PRIMARY KEY,

    persona_id INT NOT NULL
        REFERENCES personas(id_persona) ON DELETE CASCADE,

    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,

    disponible BOOLEAN NOT NULL DEFAULT TRUE,
    motivo TEXT,

    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_disponibilidad_horas
        CHECK (hora_fin > hora_inicio),

    UNIQUE (persona_id, fecha, hora_inicio, hora_fin)
);

CREATE INDEX IF NOT EXISTS idx_disponibilidad_persona
    ON disponibilidad_equipo(persona_id);

CREATE INDEX IF NOT EXISTS idx_disponibilidad_fecha
    ON disponibilidad_equipo(fecha);

DROP TRIGGER IF EXISTS trg_disponibilidad_upd ON disponibilidad_equipo;

CREATE TRIGGER trg_disponibilidad_upd
BEFORE UPDATE ON disponibilidad_equipo
FOR EACH ROW
EXECUTE FUNCTION mc_abogados.fn_set_actualizado_en();


-- 7. AUDIENCIAS

CREATE TABLE IF NOT EXISTS audiencias (
    id_audiencia SERIAL PRIMARY KEY,

    codigo VARCHAR(30) UNIQUE,

    asunto_id INT NOT NULL
        REFERENCES asuntos(id_asunto) ON DELETE CASCADE,

    responsable_id INT
        REFERENCES personas(id_persona),

    titulo TEXT NOT NULL,
    tipo TEXT,

    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME,

    modalidad VARCHAR(30),
    ubicacion TEXT,
    enlace_virtual TEXT,

    juzgado_sala TEXT,

    estado VARCHAR(30) NOT NULL DEFAULT 'Programada',

    grabacion_url TEXT,
    notas TEXT,

    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_audiencia_horas
        CHECK (
            hora_fin IS NULL
            OR hora_fin > hora_inicio
        )
);

CREATE INDEX IF NOT EXISTS idx_audiencias_asunto
    ON audiencias(asunto_id);

CREATE INDEX IF NOT EXISTS idx_audiencias_responsable
    ON audiencias(responsable_id);

CREATE INDEX IF NOT EXISTS idx_audiencias_fecha
    ON audiencias(fecha);

DROP TRIGGER IF EXISTS trg_audiencias_upd ON audiencias;

CREATE TRIGGER trg_audiencias_upd
BEFORE UPDATE ON audiencias
FOR EACH ROW
EXECUTE FUNCTION mc_abogados.fn_set_actualizado_en();


-- 8. PARTICIPANTES DE AUDIENCIAS

CREATE TABLE IF NOT EXISTS audiencia_participantes (
    audiencia_id INT NOT NULL
        REFERENCES audiencias(id_audiencia) ON DELETE CASCADE,

    persona_id INT NOT NULL
        REFERENCES personas(id_persona) ON DELETE CASCADE,

    PRIMARY KEY (audiencia_id, persona_id)
);


-- 9. DOCUMENTOS DE AUDIENCIAS

CREATE TABLE IF NOT EXISTS audiencia_documentos (
    audiencia_id INT NOT NULL
        REFERENCES audiencias(id_audiencia) ON DELETE CASCADE,

    documento_id INT NOT NULL
        REFERENCES documentos(id_documento) ON DELETE CASCADE,

    PRIMARY KEY (audiencia_id, documento_id)
);


-- 10. RECIBOS / COMPROBANTES

CREATE TABLE IF NOT EXISTS recibos (
    id_recibo SERIAL PRIMARY KEY,

    numero_recibo VARCHAR(30) NOT NULL UNIQUE,

    movimiento_id INT
        REFERENCES control_economico(id_movimiento),

    cliente_id INT NOT NULL
        REFERENCES clientes(id_cliente),

    asunto_id INT
        REFERENCES asuntos(id_asunto),

    fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,

    concepto TEXT NOT NULL,

    monto NUMERIC(12,2) NOT NULL,

    metodo_pago TEXT,

    observaciones TEXT,

    pdf_url TEXT,

    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_recibo_monto
        CHECK (monto >= 0)
);

CREATE INDEX IF NOT EXISTS idx_recibos_cliente
    ON recibos(cliente_id);

CREATE INDEX IF NOT EXISTS idx_recibos_asunto
    ON recibos(asunto_id);

CREATE INDEX IF NOT EXISTS idx_recibos_fecha
    ON recibos(fecha_emision);

DROP TRIGGER IF EXISTS trg_recibos_upd ON recibos;

CREATE TRIGGER trg_recibos_upd
BEFORE UPDATE ON recibos
FOR EACH ROW
EXECUTE FUNCTION mc_abogados.fn_set_actualizado_en();


-- 11. VISTA DE EXPEDIENTES PARA LA WEB

CREATE OR REPLACE VIEW vw_expedientes_web AS
SELECT
    a.id_asunto,
    a.codigo,
    a.titulo_asunto,
    a.numero_expediente,
    a.carpeta_fiscal,
    a.denuncia_policial,
    a.contraparte,
    a.organo,
    a.estado,
    a.urgencia,
    a.proximo_hito,
    a.fecha_hito,
    a.documentos_completos,
    a.observaciones,

    c.id_cliente,
    c.nombre_cliente,

    m.id_materia,
    m.nombre AS materia,

    p.id_persona AS responsable_id,
    p.nombre_completo AS responsable

FROM asuntos a
INNER JOIN clientes c
    ON c.id_cliente = a.cliente_id
LEFT JOIN materias m
    ON m.id_materia = a.materia_id
LEFT JOIN personas p
    ON p.id_persona = a.responsable_id;


-- 12. VISTA DE AUDIENCIAS PARA LA WEB

CREATE OR REPLACE VIEW vw_audiencias_web AS
SELECT
    au.id_audiencia,
    au.codigo,
    au.titulo,
    au.tipo,
    au.fecha,
    au.hora_inicio,
    au.hora_fin,
    au.modalidad,
    au.ubicacion,
    au.enlace_virtual,
    au.juzgado_sala,
    au.estado,
    au.grabacion_url,
    au.notas,

    a.id_asunto,
    a.codigo AS codigo_asunto,
    a.numero_expediente,

    c.id_cliente,
    c.nombre_cliente,

    p.id_persona AS responsable_id,
    p.nombre_completo AS responsable

FROM audiencias au
INNER JOIN asuntos a
    ON a.id_asunto = au.asunto_id
INNER JOIN clientes c
    ON c.id_cliente = a.cliente_id
LEFT JOIN personas p
    ON p.id_persona = au.responsable_id;

-- ===== BLOQUE 3/4: CONFIGURACION =====

CREATE TABLE IF NOT EXISTS mc_abogados.configuracion_sistema (
    id_configuracion SERIAL PRIMARY KEY,
    clave VARCHAR(100) NOT NULL UNIQUE,
    valor TEXT,
    descripcion VARCHAR(255),
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO mc_abogados.configuracion_sistema (
    clave,
    valor,
    descripcion
)
VALUES
    (
        'nombre_estudio',
        'M&C Abogados E.I.R.L.',
        'Nombre comercial del estudio juridico'
    ),
    (
        'correo_estudio',
        'contacto@mycabogados.pe',
        'Correo principal del estudio'
    ),
    (
        'telefono_estudio',
        '',
        'Telefono principal del estudio'
    ),
    (
        'direccion_estudio',
        '',
        'Direccion principal del estudio'
    ),
    (
        'moneda',
        'PEN',
        'Moneda utilizada en el sistema'
    )
ON CONFLICT (clave) DO NOTHING;

-- ===== BLOQUE 4/4: CUENTAS Y DATOS DE DEMOSTRACION =====

-- M&C ABOGADOS E.I.R.L. | Datos DEMO para desarrollo (NO produccion)
-- Requisitos: ejecutar antes mc_abogados_db.sql y ampliacion_mc_abogados.sql.
-- Opcional: configuracion_admin.sql (para el modulo Configuracion).
-- Carga incremental: no borra datos y no duplica registros DEMO al repetirla.
-- Resultado en una base recien creada: 5 administradores, 5 abogados,
-- 5 practicantes; 25 clientes, 30 expedientes, 60 tareas, 20 audiencias,
-- 30 documentos, 30 registros economicos, 10 recibos, 30 horarios.
-- Maria Torres conserva su contraseña preexistente. Las NUEVAS cuentas usan
-- la contraseña temporal Demo2026! (hash bcrypt). CAMBIAR antes de publicar.

SET LOCAL search_path TO mc_abogados, public;
-- pgcrypto ya se activó en el bloque base.

-- 1. Personal ficticio. Juan Perez y Maria Torres ya vienen en la base.
INSERT INTO personas (nombre_completo, rol, materia_id, correo, activo)
SELECT d.nombre, d.rol::rol_persona, m.id_materia, d.correo, TRUE
FROM (VALUES
    ('Adriana Salazar', 'Administrador', NULL, 'adriana.admin@example.test'),
    ('César Valdivia', 'Administrador', NULL, 'cesar.admin@example.test'),
    ('Lucía Paredes', 'Administrador', NULL, 'lucia.admin@example.test'),
    ('Tomás Guerra', 'Administrador', NULL, 'tomas.admin@example.test'),
    ('Daniela Rojas', 'Abogado', 'Civil', 'daniela.abogada@example.test'),
    ('Felipe Castillo', 'Abogado', 'Laboral', 'felipe.abogado@example.test'),
    ('Rocío Mendoza', 'Abogado', 'Penal', 'rocio.abogada@example.test'),
    ('Martín Vega', 'Abogado', 'Otro', 'martin.abogado@example.test'),
    ('Alma Silva', 'Practicante', NULL, 'alma.practicante@example.test'),
    ('Diego Núñez', 'Practicante', NULL, 'diego.practicante@example.test'),
    ('Esteban Soto', 'Practicante', NULL, 'esteban.practicante@example.test'),
    ('Carla López', 'Practicante', NULL, 'carla.practicante@example.test'),
    ('Gabriela Medina', 'Practicante', NULL, 'gabriela.practicante@example.test')
) AS d(nombre, rol, materia, correo)
LEFT JOIN materias m ON m.nombre = d.materia
WHERE NOT EXISTS (
    SELECT 1 FROM personas p WHERE lower(p.correo) = lower(d.correo)
);

-- 2. Cuentas: incluye a Maria y Juan si aun no tienen usuario.
-- No reescribe contraseñas, roles ni activacion de cuentas existentes.
INSERT INTO usuarios (persona_id, rol, password_hash)
SELECT p.id_persona, p.rol::text::rol_acceso,
       crypt('Demo2026!', gen_salt('bf', 10))
FROM personas p
WHERE p.correo IN (
    'mtorres@mycabogados.pe', 'jperez@mycabogados.pe',
    'adriana.admin@example.test', 'cesar.admin@example.test',
    'lucia.admin@example.test', 'tomas.admin@example.test',
    'daniela.abogada@example.test', 'felipe.abogado@example.test',
    'rocio.abogada@example.test', 'martin.abogado@example.test',
    'alma.practicante@example.test', 'diego.practicante@example.test',
    'esteban.practicante@example.test', 'carla.practicante@example.test',
    'gabriela.practicante@example.test'
)
AND NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.persona_id = p.id_persona);

-- 3. Perfiles profesionales del equipo legal.
WITH abogados AS (
    SELECT p.id_persona, p.nombre_completo,
           ROW_NUMBER() OVER (ORDER BY p.correo) AS n
    FROM personas p
    WHERE p.correo IN (
        'jperez@mycabogados.pe', 'daniela.abogada@example.test',
        'felipe.abogado@example.test', 'rocio.abogada@example.test',
        'martin.abogado@example.test'
    )
)
INSERT INTO abogados_perfil
    (persona_id, numero_colegiatura, colegio_abogados, especialidad_descripcion, biografia)
SELECT id_persona, 'DEMO-CAL-' || LPAD(n::text, 3, '0'),
       'Colegiatura ficticia para pruebas',
       'Asesoría y defensa legal (perfil de demostración)',
       'Perfil creado exclusivamente para probar el sistema.'
FROM abogados
ON CONFLICT (persona_id) DO NOTHING;

INSERT INTO practicantes_perfil
    (persona_id, universidad, carrera, ciclo, convenio_practicas,
     fecha_inicio, fecha_fin, horario_entrada, horario_salida,
     dias_practica, seguro_fola, seguro_fola_detalle)
SELECT p.id_persona, 'Universidad de demostración', 'Derecho', 'IX',
       'Convenio ficticio de prácticas', CURRENT_DATE - 30,
       CURRENT_DATE + 180, '08:30', '14:30',
       'Lunes a viernes', TRUE, 'Cobertura ficticia para pruebas'
FROM personas p
WHERE p.correo IN (
    'alma.practicante@example.test', 'diego.practicante@example.test',
    'esteban.practicante@example.test', 'carla.practicante@example.test',
    'gabriela.practicante@example.test'
)
ON CONFLICT (persona_id) DO NOTHING;

-- 4. Clientes ficticios; numeros de documento y telefonos intencionalmente vacios.
WITH nombres AS (
    SELECT nombre, n
    FROM UNNEST(ARRAY[
        'Andrés Quispe', 'Valeria Lozano', 'Comercial Las Palmas S.A.C.',
        'Patricia Herrera', 'Servicios Costa Norte E.I.R.L.',
        'Sofía Cárdenas', 'Jorge Robles', 'Constructora Horizonte S.A.C.',
        'Elena Vásquez', 'Diego Fuentes', 'Transportes Bahía S.A.C.',
        'Carolina Ponce', 'Luis Calderón', 'Rosa Salinas',
        'Inversiones Mar Azul S.A.C.', 'Manuel Ramos', 'Mariana Soto',
        'Distribuidora Arco S.A.C.', 'Paula Fernández', 'Santiago Núñez',
        'Paola Vargas', 'Tecno Norte E.I.R.L.', 'César Medina',
        'Mariela Flores', 'Fernando Ríos'
    ]) WITH ORDINALITY AS t(nombre, n)
)
INSERT INTO clientes
    (codigo, nombre_cliente, contacto_principal, correo,
     consentimiento_contacto, observaciones)
SELECT 'DEM-CLI-' || LPAD(n::text, 4, '0'), nombre, nombre,
       'cliente' || LPAD(n::text, 2, '0') || '@example.test',
       'No'::si_no, 'DATOS FICTICIOS PARA DESARROLLO. No contactar.'
FROM nombres
ON CONFLICT (codigo) DO NOTHING;

-- 5. Expedientes, tareas, audiencias, participantes, documentos y economia.
DO $demo$
DECLARE
    i INTEGER;
    v_cliente INTEGER;
    v_abogado INTEGER;
    v_practicante INTEGER;
    v_asunto INTEGER;
    v_audiencia INTEGER;
    v_movimiento INTEGER;
    v_materia INTEGER;
    v_monto NUMERIC(12,2);
    v_cobrado NUMERIC(12,2);
    v_codigo TEXT;
    v_abogados TEXT[] := ARRAY[
        'jperez@mycabogados.pe', 'daniela.abogada@example.test',
        'felipe.abogado@example.test', 'rocio.abogada@example.test',
        'martin.abogado@example.test'
    ];
    v_practicantes TEXT[] := ARRAY[
        'alma.practicante@example.test', 'diego.practicante@example.test',
        'esteban.practicante@example.test', 'carla.practicante@example.test',
        'gabriela.practicante@example.test'
    ];
    v_materias TEXT[] := ARRAY['Penal', 'Civil', 'Laboral', 'Otro'];
    v_titulos TEXT[] := ARRAY[
        'Defensa en investigación preliminar',
        'Proceso de obligación de dar suma de dinero',
        'Reclamación por beneficios sociales',
        'Asesoría contractual empresarial',
        'Proceso de alimentos',
        'Seguimiento de investigación fiscal',
        'Demanda por incumplimiento de contrato',
        'Reposición laboral y derechos adquiridos',
        'Rectificación registral',
        'Procedimiento administrativo sancionador'
    ];
BEGIN
    IF (SELECT COUNT(*) FROM personas WHERE correo = ANY(v_abogados)) <> 5
       OR (SELECT COUNT(*) FROM personas WHERE correo = ANY(v_practicantes)) <> 5 THEN
        RAISE EXCEPTION 'Falta Juan Perez o uno de los abogados/practicantes DEMO. Ejecuta primero el SQL base.';
    END IF;

    FOR i IN 1..30 LOOP
        v_codigo := 'DEM-AS-' || LPAD(i::text, 4, '0');
        SELECT id_cliente INTO STRICT v_cliente FROM clientes
        WHERE codigo = 'DEM-CLI-' || LPAD((1 + (i - 1) % 25)::text, 4, '0');
        SELECT id_persona INTO STRICT v_abogado FROM personas
        WHERE correo = v_abogados[1 + (i - 1) % 5];
        SELECT id_persona INTO STRICT v_practicante FROM personas
        WHERE correo = v_practicantes[1 + (i - 1) % 5];
        SELECT id_materia INTO STRICT v_materia FROM materias
        WHERE nombre = v_materias[1 + (i - 1) % 4];

        INSERT INTO asuntos (
            codigo, cliente_id, materia_id, titulo_asunto,
            contraparte, organo, numero_expediente, carpeta_fiscal,
            denuncia_policial, responsable_id, estado, urgencia,
            proximo_hito, fecha_hito, documentos_completos, observaciones
        ) VALUES (
            v_codigo, v_cliente, v_materia,
            v_titulos[1 + (i - 1) % 10],
            'Contraparte ficticia ' || i,
            'Órgano jurisdiccional de demostración',
            'EXP-DEMO-2026-' || LPAD(i::text, 4, '0'),
            'CF-DEMO-2026-' || LPAD(i::text, 4, '0'),
            CASE WHEN i % 4 = 0 THEN 'DEN-DEMO-' || LPAD(i::text, 4, '0') ELSE NULL END,
            v_abogado,
            (CASE WHEN i % 9 = 0 THEN 'Cerrado'
                  WHEN i % 7 = 0 THEN 'En espera'
                  WHEN i % 5 = 0 THEN 'En revisión'
                  ELSE 'Activo' END)::estado_asunto,
            (CASE WHEN i % 8 = 0 THEN 'Crítica'
                  WHEN i % 3 = 0 THEN 'Alta'
                  ELSE 'Media' END)::nivel,
            'Revisar siguiente actuación procesal',
            CURRENT_DATE + (i % 28) - 4,
            (CASE WHEN i % 4 = 0 THEN 'Sí' ELSE 'Parcial' END)::documentos_estado,
            'EXPEDIENTE FICTICIO. Solo para demostrar flujos y tableros.'
        ) ON CONFLICT (codigo) DO NOTHING;

        SELECT id_asunto INTO STRICT v_asunto FROM asuntos WHERE codigo = v_codigo;

        -- 1 tarea del abogado y 1 del practicante por expediente.
        INSERT INTO tareas
            (codigo, asunto_id, tarea, responsable_id, prioridad,
             fecha_asignacion, fecha_limite, estado,
             requiere_revision_abogado, segundo_control,
             evidencia, fecha_cierre, observaciones)
        VALUES (
            'DEM-TAR-A-' || LPAD(i::text, 4, '0'), v_asunto,
            'Preparar estrategia y revisión del expediente ' || v_codigo,
            v_abogado,
            (CASE WHEN i % 4 = 0 THEN 'Alta' ELSE 'Media' END)::nivel,
            CURRENT_DATE - 10, CURRENT_DATE + (i % 14) - 2,
            (CASE WHEN i % 6 = 0 THEN 'Completada'
                  WHEN i % 2 = 0 THEN 'En curso' ELSE 'Pendiente' END)::estado_basico,
            'No'::si_no, 'Pendiente'::control_simple,
            CASE WHEN i % 6 = 0 THEN 'Borrador revisado (evidencia ficticia)' ELSE NULL END,
            CASE WHEN i % 6 = 0 THEN CURRENT_DATE ELSE NULL END,
            'Asignación de demostración al abogado'
        ) ON CONFLICT (codigo) DO NOTHING;

        INSERT INTO tareas
            (codigo, asunto_id, tarea, responsable_id, prioridad,
             fecha_asignacion, fecha_limite, estado,
             requiere_revision_abogado, segundo_control,
             evidencia, fecha_cierre, observaciones)
        VALUES (
            'DEM-TAR-P-' || LPAD(i::text, 4, '0'), v_asunto,
            'Organizar documentación y ficha procesal ' || v_codigo,
            v_practicante,
            (CASE WHEN i % 5 = 0 THEN 'Alta' ELSE 'Media' END)::nivel,
            CURRENT_DATE - 10, CURRENT_DATE + (i % 12) - 3,
            (CASE WHEN i % 5 = 0 THEN 'Completada'
                  WHEN i % 2 = 0 THEN 'En curso' ELSE 'Pendiente' END)::estado_basico,
            'Sí'::si_no, 'Pendiente'::control_simple,
            CASE WHEN i % 5 = 0 THEN 'Informe presentado (evidencia ficticia)' ELSE NULL END,
            CASE WHEN i % 5 = 0 THEN CURRENT_DATE ELSE NULL END,
            'Requiere supervisión del abogado'
        ) ON CONFLICT (codigo) DO NOTHING;

        INSERT INTO documentos
            (codigo, asunto_id, nombre_documento, tipo,
             responsable_id, revision_abogado, estado,
             confidencialidad, observaciones)
        VALUES (
            'DEM-DOC-' || LPAD(i::text, 4, '0'), v_asunto,
            'Carpeta procesal de demostración ' || v_codigo,
            'Informe'::tipo_documento, v_practicante,
            'Pendiente'::control_simple,
            'En curso'::estado_basico,
            'Media'::nivel_confidencialidad,
            'Registro ficticio; no existe archivo adjunto real.'
        ) ON CONFLICT (codigo) DO NOTHING;

        -- Se crea un movimiento economico por expediente, sin duplicar al reejecutar.
        v_monto := 1500 + i * 110;
        v_cobrado := CASE WHEN i % 3 = 0 THEN 0
                          WHEN i % 3 = 1 THEN v_monto / 2
                          ELSE v_monto END;
        INSERT INTO control_economico
            (fecha, asunto_id, servicio, canal,
             monto_acordado, monto_cobrado, costo_directo,
             estado_cobro, observaciones)
        SELECT CURRENT_DATE - (i % 15), v_asunto,
               'Servicio jurídico DEMO', 'Transferencia',
               v_monto, v_cobrado, 100 + i * 12,
               (CASE WHEN v_cobrado = 0 THEN 'Pendiente'
                     WHEN v_cobrado = v_monto THEN 'Cobrado'
                     ELSE 'Parcial' END)::estado_cobro,
               'Montos ficticios para probar reportes y recibos'
        WHERE NOT EXISTS (
            SELECT 1 FROM control_economico
            WHERE asunto_id = v_asunto AND servicio = 'Servicio jurídico DEMO'
        );
        SELECT id_movimiento INTO STRICT v_movimiento
        FROM control_economico
        WHERE asunto_id = v_asunto AND servicio = 'Servicio jurídico DEMO'
        ORDER BY id_movimiento ASC LIMIT 1;

        IF i <= 15 AND i % 3 <> 0 THEN
            INSERT INTO recibos
                (numero_recibo, movimiento_id, cliente_id, asunto_id,
                 fecha_emision, concepto, monto, metodo_pago, observaciones)
            VALUES (
                'DEM-REC-' || LPAD(i::text, 4, '0'),
                v_movimiento, v_cliente, v_asunto, CURRENT_DATE - (i % 15),
                'Abono por servicio jurídico DEMO', v_cobrado,
                'Transferencia', 'Recibo ficticio: no es comprobante tributario válido'
            ) ON CONFLICT (numero_recibo) DO NOTHING;
        END IF;

        IF i <= 20 THEN
            INSERT INTO audiencias
                (codigo, asunto_id, responsable_id, titulo, tipo,
                 fecha, hora_inicio, hora_fin, modalidad,
                 ubicacion, enlace_virtual, juzgado_sala, estado, notas)
            VALUES (
                'DEM-AUD-' || LPAD(i::text, 4, '0'),
                v_asunto, v_abogado,
                'Audiencia de seguimiento ' || v_codigo,
                'Seguimiento procesal', CURRENT_DATE + 1 + (i % 21),
                CASE WHEN i % 2 = 0 THEN '09:00'::time ELSE '11:00'::time END,
                CASE WHEN i % 2 = 0 THEN '10:00'::time ELSE '12:00'::time END,
                CASE WHEN i % 2 = 0 THEN 'Virtual' ELSE 'Presencial' END,
                CASE WHEN i % 2 = 0 THEN NULL ELSE 'Sala de demostración' END,
                CASE WHEN i % 2 = 0 THEN 'https://example.test/audiencia/' || i ELSE NULL END,
                'Juzgado ficticio de Chiclayo',
                CASE WHEN i % 5 = 0 THEN 'Reprogramada' ELSE 'Programada' END,
                'AUDIENCIA FICTICIA: no corresponde a un proceso judicial real.'
            ) ON CONFLICT (codigo) DO NOTHING;

            SELECT id_audiencia INTO STRICT v_audiencia
            FROM audiencias WHERE codigo = 'DEM-AUD-' || LPAD(i::text, 4, '0');
            INSERT INTO audiencia_participantes (audiencia_id, persona_id)
            VALUES (v_audiencia, v_abogado), (v_audiencia, v_practicante)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END;
$demo$;

-- 6. Disponibilidad de todos los 15 usuarios de la cohorte de prueba.
INSERT INTO disponibilidad_equipo
    (persona_id, fecha, hora_inicio, hora_fin, disponible, motivo)
SELECT u.persona_id, CURRENT_DATE + d.dia,
       d.inicio, d.fin, d.disponible, d.motivo
FROM usuarios u
JOIN personas p ON p.id_persona = u.persona_id
CROSS JOIN (VALUES
    (1, '08:30'::time, '10:30'::time, TRUE, 'Disponible para coordinación DEMO'),
    (2, '14:00'::time, '16:00'::time, TRUE, 'Atención y seguimiento DEMO')
) AS d(dia, inicio, fin, disponible, motivo)
WHERE p.correo IN (
    'mtorres@mycabogados.pe', 'jperez@mycabogados.pe',
    'adriana.admin@example.test', 'cesar.admin@example.test',
    'lucia.admin@example.test', 'tomas.admin@example.test',
    'daniela.abogada@example.test', 'felipe.abogado@example.test',
    'rocio.abogada@example.test', 'martin.abogado@example.test',
    'alma.practicante@example.test', 'diego.practicante@example.test',
    'esteban.practicante@example.test', 'carla.practicante@example.test',
    'gabriela.practicante@example.test'
)
ON CONFLICT (persona_id, fecha, hora_inicio, hora_fin) DO NOTHING;


-- 7. Verificaciones (no muestran password_hash).
SELECT u.rol::text AS rol, COUNT(*) AS cuentas_de_prueba
FROM mc_abogados.usuarios u
JOIN mc_abogados.personas p ON p.id_persona = u.persona_id
WHERE p.correo LIKE '%@example.test'
   OR p.correo IN ('mtorres@mycabogados.pe', 'jperez@mycabogados.pe')
GROUP BY u.rol ORDER BY rol;

SELECT 'clientes' AS tabla, COUNT(*) AS registros FROM mc_abogados.clientes WHERE codigo LIKE 'DEM-CLI-%'
UNION ALL SELECT 'expedientes', COUNT(*) FROM mc_abogados.asuntos WHERE codigo LIKE 'DEM-AS-%'
UNION ALL SELECT 'tareas', COUNT(*) FROM mc_abogados.tareas WHERE codigo LIKE 'DEM-TAR-%'
UNION ALL SELECT 'audiencias', COUNT(*) FROM mc_abogados.audiencias WHERE codigo LIKE 'DEM-AUD-%'
UNION ALL SELECT 'documentos', COUNT(*) FROM mc_abogados.documentos WHERE codigo LIKE 'DEM-DOC-%'
UNION ALL SELECT 'recibos', COUNT(*) FROM mc_abogados.recibos WHERE numero_recibo LIKE 'DEM-REC-%'
ORDER BY tabla;

-- Login: Maria Torres conserva la clave que ya tenia (en la base original, Prueba123).
-- Las cuentas nuevas de este script usan Demo2026! y correos de ejemplo.test.
-- Deben usarse SOLO para desarrollo local; no subir credenciales activas a produccion.


-- COMMIT GLOBAL: todos los bloques se guardan juntos o se revierten si fallan.
COMMIT;

-- ============================================================================
-- VERIFICACIONES DE SOLO LECTURA (despues del COMMIT)
-- ============================================================================
SELECT u.rol::text AS rol, COUNT(*) AS cantidad
FROM mc_abogados.usuarios u
GROUP BY u.rol
ORDER BY rol;

SELECT 'usuarios' AS tabla, COUNT(*) AS cantidad FROM mc_abogados.usuarios
UNION ALL SELECT 'clientes', COUNT(*) FROM mc_abogados.clientes
UNION ALL SELECT 'expedientes', COUNT(*) FROM mc_abogados.asuntos
UNION ALL SELECT 'tareas', COUNT(*) FROM mc_abogados.tareas
UNION ALL SELECT 'audiencias', COUNT(*) FROM mc_abogados.audiencias
UNION ALL SELECT 'documentos', COUNT(*) FROM mc_abogados.documentos
UNION ALL SELECT 'movimientos_economicos', COUNT(*) FROM mc_abogados.control_economico
UNION ALL SELECT 'recibos', COUNT(*) FROM mc_abogados.recibos
UNION ALL SELECT 'disponibilidades', COUNT(*) FROM mc_abogados.disponibilidad_equipo
ORDER BY tabla;
