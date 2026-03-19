CREATE SCHEMA IF NOT EXISTS inventory;

CREATE TABLE inventory.inventory_items (
    material_id     VARCHAR(100)     PRIMARY KEY,
    material_name   VARCHAR(255)     NOT NULL,
    current_level   DOUBLE PRECISION NOT NULL,
    max_capacity    DOUBLE PRECISION NOT NULL,
    unit            VARCHAR(50)      NOT NULL,
    alert_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    alert_triggered BOOLEAN          NOT NULL DEFAULT FALSE,
    last_updated    TIMESTAMP        NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory.replenishments (
    replenishment_id       UUID        PRIMARY KEY,
    material_id            VARCHAR(100) NOT NULL REFERENCES inventory.inventory_items(material_id),
    status                 VARCHAR(50)  NOT NULL,
    requested_at           TIMESTAMP    NOT NULL,
    supplier               VARCHAR(255),
    expected_delivery_date DATE,
    confirmed_at           TIMESTAMP
);
