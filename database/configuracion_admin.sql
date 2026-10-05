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