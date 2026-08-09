-- Migration 004: Add Outlook Calendar support
-- Created: 2024-01-15

-- Add tenant_id column for Outlook Enterprise accounts
ALTER TABLE calendar_sync ADD COLUMN tenant_id TEXT;

-- Outlook calendar integration functions are handled via Outlook API client
-- The calendar_sync table stores tokens for both Google and Outlook providers