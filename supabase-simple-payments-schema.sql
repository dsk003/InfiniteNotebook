-- Simple payment system for single product purchases

-- User payments table to track individual payments
CREATE TABLE IF NOT EXISTS user_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_id TEXT NOT NULL UNIQUE, -- Dodo Payments payment ID
    product_id TEXT NOT NULL,
    amount DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, cancelled
    payment_link TEXT,
    completed_at TIMESTAMPTZ,
    payment_data JSONB, -- Store full payment data from Dodo
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_payments_user_id ON user_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_payment_id ON user_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_status ON user_payments(status);

-- Enable Row Level Security (RLS)
ALTER TABLE user_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_payments
CREATE POLICY "Users can view their own payments" ON user_payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" ON user_payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can update payments" ON user_payments
    FOR UPDATE USING (true); -- Allow service to update payment status via webhooks

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_user_payments_updated_at 
    BEFORE UPDATE ON user_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
