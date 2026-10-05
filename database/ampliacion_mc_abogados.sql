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

