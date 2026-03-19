CREATE SCHEMA IF NOT EXISTS preparation;

CREATE TABLE preparation.preparations (
    preparation_id UUID PRIMARY KEY,
    order_id UUID NOT NULL UNIQUE,
    table_number INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE TABLE preparation.preparation_items (
    item_id UUID PRIMARY KEY,
    preparation_id UUID NOT NULL REFERENCES preparation.preparations(preparation_id),
    coffee_type VARCHAR(30) NOT NULL,
    size VARCHAR(20) NOT NULL,
    customizations TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_preparations_status ON preparation.preparations(status);
CREATE INDEX idx_preparations_order_id ON preparation.preparations(order_id);
CREATE INDEX idx_preparation_items_preparation_id ON preparation.preparation_items(preparation_id);

CREATE TABLE preparation.outbox (
    id UUID PRIMARY KEY,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    published_at TIMESTAMP
);

CREATE INDEX idx_outbox_unpublished ON preparation.outbox(published_at) WHERE published_at IS NULL;
