-- Migration 004: Additional task enhancements for AI and productivity features

-- Add AI provider and confidence score to tasks table
ALTER TABLE tasks ADD COLUMN ai_provider TEXT;
ALTER TABLE tasks ADD COLUMN confidence_score INTEGER;

-- Add estimate_minutes column for better time tracking
ALTER TABLE tasks ADD COLUMN estimate_minutes INTEGER;

-- Add priority_score column for sorting and analytics
ALTER TABLE tasks ADD COLUMN priority_score INTEGER DEFAULT 50;