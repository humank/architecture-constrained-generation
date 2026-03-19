-- Initialize schemas for each bounded context
-- This runs once when PostgreSQL container starts for the first time

CREATE SCHEMA IF NOT EXISTS ordering;
CREATE SCHEMA IF NOT EXISTS preparation;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS reporting;
