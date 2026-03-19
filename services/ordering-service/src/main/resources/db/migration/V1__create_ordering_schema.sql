CREATE SCHEMA IF NOT EXISTS ordering;

CREATE TABLE ordering.orders (
    order_id       UUID PRIMARY KEY,
    table_number   INT          NOT NULL CHECK (table_number BETWEEN 1 AND 5),
    status         VARCHAR(20)  NOT NULL,
    total_amount   INT          NOT NULL CHECK (total_amount >= 0),
    cash_received  INT,
    change_given   INT,
    placed_at      TIMESTAMP    NOT NULL,
    confirmed_at   TIMESTAMP,
    paid_at        TIMESTAMP,
    delivered_at   TIMESTAMP,
    completed_at   TIMESTAMP
);

CREATE TABLE ordering.order_items (
    item_id        UUID PRIMARY KEY,
    order_id       UUID         NOT NULL REFERENCES ordering.orders(order_id),
    coffee_type    VARCHAR(20)  NOT NULL,
    size           VARCHAR(10)  NOT NULL,
    quantity       INT          NOT NULL CHECK (quantity >= 1),
    customizations VARCHAR(255),
    unit_price     INT          NOT NULL CHECK (unit_price >= 0),
    surcharge      INT          NOT NULL DEFAULT 0 CHECK (surcharge >= 0),
    line_total     INT          NOT NULL CHECK (line_total >= 0)
);

CREATE INDEX idx_orders_status ON ordering.orders(status);
CREATE INDEX idx_order_items_order_id ON ordering.order_items(order_id);
