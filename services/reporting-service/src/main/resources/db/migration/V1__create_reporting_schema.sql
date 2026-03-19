CREATE SCHEMA IF NOT EXISTS reporting;

CREATE TABLE reporting.sales_projections (
    id           UUID        PRIMARY KEY,
    order_id     UUID        NOT NULL UNIQUE,
    table_number INT         NOT NULL,
    items        TEXT,
    total        INT         NOT NULL,
    placed_at    TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE reporting.inventory_projections (
    id                   UUID             PRIMARY KEY,
    material             VARCHAR(255)     NOT NULL,
    quantity_deducted    DOUBLE PRECISION NOT NULL,
    remaining_level      DOUBLE PRECISION NOT NULL,
    max_capacity         DOUBLE PRECISION NOT NULL,
    percentage_remaining DOUBLE PRECISION NOT NULL,
    recorded_at          TIMESTAMP        NOT NULL
);

CREATE INDEX idx_inventory_projections_material_recorded
    ON reporting.inventory_projections (material, recorded_at DESC);
