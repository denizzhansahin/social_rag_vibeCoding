CREATE TABLE IF NOT EXISTS agent_chat_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES master_identities(id),
    query_text TEXT NOT NULL,
    ai_response_text TEXT,
    context_used JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_chat_admin ON agent_chat_logs(admin_id);
