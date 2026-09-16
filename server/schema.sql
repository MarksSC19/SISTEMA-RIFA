-- Esquema de Base de Datos PostgreSQL para Gran Rifa 2026
-- Puerto predeterminado: 5433

CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(64) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(128) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(128) NOT NULL,
    dni VARCHAR(16) UNIQUE NOT NULL,
    phone VARCHAR(32) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('super_admin', 'admin')),
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    quota INT NOT NULL DEFAULT 20,
    must_change_password BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS raffles (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(16) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    ticket_price NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
    total_tickets INT NOT NULL DEFAULT 620,
    status VARCHAR(32) NOT NULL DEFAULT 'activa' CHECK (status IN ('activa', 'cerrada', 'sorteo', 'borrador')),
    draw_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prizes (
    id VARCHAR(64) PRIMARY KEY,
    raffle_id VARCHAR(64) NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
    position INT NOT NULL,
    title VARCHAR(128) NOT NULL,
    category VARCHAR(64) NOT NULL,
    description TEXT,
    winner_ticket_id VARCHAR(64),
    winner_name VARCHAR(128),
    winner_phone VARCHAR(32),
    drawn_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_raffle_position UNIQUE (raffle_id, position)
);

CREATE TABLE IF NOT EXISTS tickets (
    id VARCHAR(64) PRIMARY KEY,
    ticket_number INT NOT NULL,
    ticket_code VARCHAR(32) UNIQUE NOT NULL,
    raffle_id VARCHAR(64) NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
    seller_admin_id VARCHAR(64) NOT NULL REFERENCES users(id),
    buyer_name VARCHAR(128) NOT NULL,
    buyer_phone VARCHAR(32) NOT NULL,
    buyer_dni VARCHAR(16) NOT NULL,
    payment_method VARCHAR(32) NOT NULL CHECK (payment_method IN ('yape', 'plin', 'efectivo', 'transferencia')),
    payment_reference VARCHAR(64),
    price_paid NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
    verification_hash VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'cancelled')),
    sold_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_ticket_per_raffle UNIQUE (raffle_id, ticket_number)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    action VARCHAR(64) NOT NULL,
    performed_by VARCHAR(128) NOT NULL,
    target VARCHAR(128) NOT NULL,
    details TEXT,
    hash_signature VARCHAR(128) NOT NULL,
    previous_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices de alto rendimiento para búsquedas y consultas
CREATE INDEX IF NOT EXISTS idx_tickets_raffle ON tickets(raffle_id);
CREATE INDEX IF NOT EXISTS idx_tickets_seller ON tickets(seller_admin_id);
CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_tickets_dni ON tickets(buyer_dni);
CREATE INDEX IF NOT EXISTS idx_prizes_raffle ON prizes(raffle_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
