-- Supabase SQL Schema for Vendly (matching actual table columns)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. VENDORS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    business VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255) UNIQUE NOT NULL,
    points_rule_amount NUMERIC(10, 2) DEFAULT 100.00 NOT NULL,
    points_rule_points INTEGER DEFAULT 10 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row-Level Security
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Policies for vendors
CREATE POLICY "Vendors can view their own profile" 
ON public.vendors FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Vendors can insert their own profile" 
ON public.vendors FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Vendors can update their own profile" 
ON public.vendors FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Vendors can delete their own profile" 
ON public.vendors FOR DELETE 
TO authenticated 
USING (auth.uid() = id);


-- ==========================================
-- 2. CUSTOMERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    points INTEGER DEFAULT 0 NOT NULL,
    qr_token VARCHAR(64) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row-Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Policies for customers (checking vendor_id against authenticated auth.uid())
CREATE POLICY "Vendors can view their own customers" 
ON public.customers FOR SELECT 
TO authenticated 
USING (vendor_id = auth.uid());

CREATE POLICY "Vendors can insert their own customers" 
ON public.customers FOR INSERT 
TO authenticated 
WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "Vendors can update their own customers" 
ON public.customers FOR UPDATE 
TO authenticated 
USING (vendor_id = auth.uid())
WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "Vendors can delete their own customers" 
ON public.customers FOR DELETE 
TO authenticated 
USING (vendor_id = auth.uid());


-- ==========================================
-- 3. TRANSACTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    points_earned INTEGER DEFAULT 0 NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row-Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policies for transactions
CREATE POLICY "Vendors can view their own transactions" 
ON public.transactions FOR SELECT 
TO authenticated 
USING (vendor_id = auth.uid());

CREATE POLICY "Vendors can insert their own transactions" 
ON public.transactions FOR INSERT 
TO authenticated 
WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "Vendors can update their own transactions" 
ON public.transactions FOR UPDATE 
TO authenticated 
USING (vendor_id = auth.uid())
WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "Vendors can delete their own transactions" 
ON public.transactions FOR DELETE 
TO authenticated 
USING (vendor_id = auth.uid());


-- ==========================================
-- 4. REWARDS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    reward_name VARCHAR(255) NOT NULL,
    points_required INTEGER NOT NULL CHECK (points_required >= 0),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row-Level Security
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- Policies for rewards
CREATE POLICY "Vendors can view their own rewards" 
ON public.rewards FOR SELECT 
TO authenticated 
USING (vendor_id = auth.uid());

CREATE POLICY "Vendors can insert their own rewards" 
ON public.rewards FOR INSERT 
TO authenticated 
WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "Vendors can update their own rewards" 
ON public.rewards FOR UPDATE 
TO authenticated 
USING (vendor_id = auth.uid())
WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "Vendors can delete their own rewards" 
ON public.rewards FOR DELETE 
TO authenticated 
USING (vendor_id = auth.uid());


-- ==========================================
-- 5. REDEMPTION HISTORY TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.redemption_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
    points_deducted INTEGER NOT NULL,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row-Level Security
ALTER TABLE public.redemption_history ENABLE ROW LEVEL SECURITY;

-- Policies for redemption_history
CREATE POLICY "Vendors can view their own redemptions"
ON public.redemption_history FOR SELECT
TO authenticated
USING (vendor_id = auth.uid());

CREATE POLICY "Vendors can insert their own redemptions"
ON public.redemption_history FOR INSERT
TO authenticated
WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "Vendors can delete their own redemptions"
ON public.redemption_history FOR DELETE
TO authenticated
USING (vendor_id = auth.uid());


-- ==========================================
-- 6. PERFORMANCE INDEXES
-- ==========================================

-- Indexes for customer lookup per vendor
CREATE INDEX IF NOT EXISTS idx_customers_vendor ON public.customers(vendor_id);

-- Indexes for transaction lookups
CREATE INDEX IF NOT EXISTS idx_transactions_vendor ON public.transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON public.transactions(customer_id);

-- Indexes for reward lookups
CREATE INDEX IF NOT EXISTS idx_rewards_vendor ON public.rewards(vendor_id);

-- Indexes for redemption history
CREATE INDEX IF NOT EXISTS idx_redemptions_vendor ON public.redemption_history(vendor_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_customer ON public.redemption_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_reward ON public.redemption_history(reward_id);

-- ==========================================
-- 7. ALTER STATEMENTS (run on existing DBs)
-- ==========================================
-- Run these if your Supabase instance already has the tables:
-- ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS points_rule_amount NUMERIC(10,2) DEFAULT 100.00 NOT NULL;
-- ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS points_rule_points INTEGER DEFAULT 10 NOT NULL;

-- QR Token support for existing customers tables:
-- ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS qr_token VARCHAR(64) UNIQUE DEFAULT gen_random_uuid()::text;
-- UPDATE public.customers SET qr_token = gen_random_uuid()::text WHERE qr_token IS NULL;
-- ALTER TABLE public.customers ALTER COLUMN qr_token SET NOT NULL;
-- CREATE INDEX IF NOT EXISTS idx_customers_qr_token ON public.customers(qr_token);


-- ==========================================
-- 8. OFFERS TABLE (Store Deals)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    original_price NUMERIC(10, 2),
    offer_price NUMERIC(10, 2) NOT NULL,
    points_cost INTEGER NOT NULL DEFAULT 50 CHECK (points_cost >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Policies for offers
CREATE POLICY "Anyone can view offers" 
ON public.offers FOR SELECT 
TO anon, authenticated 
USING (true);

CREATE POLICY "Vendors can manage their own offers" 
ON public.offers FOR ALL 
TO authenticated 
USING (vendor_id = auth.uid())
WITH CHECK (vendor_id = auth.uid());


-- ==========================================
-- 9. PREBOOKINGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.prebookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    points_deducted INTEGER NOT NULL CHECK (points_deducted >= 0),
    status VARCHAR(50) DEFAULT 'pending' NOT NULL, -- 'pending', 'claimed', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.prebookings ENABLE ROW LEVEL SECURITY;

-- Policies for prebookings
CREATE POLICY "Anyone can insert prebookings" 
ON public.prebookings FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Customers and vendors can view prebookings" 
ON public.prebookings FOR SELECT 
TO anon, authenticated 
USING (true);

CREATE POLICY "Vendors can update prebookings status" 
ON public.prebookings FOR UPDATE 
TO authenticated 
USING (vendor_id = auth.uid())
WITH CHECK (vendor_id = auth.uid());


-- ==========================================
-- 10. PUBLIC ACCESS POLICIES ON EXISTING TABLES
-- ==========================================
-- Customers need to view their customer record to see points balance and QR tokens
CREATE POLICY "Allow public lookups of customers by phone" 
ON public.customers FOR SELECT 
TO anon, authenticated 
USING (true);

-- Customers need to deduct points when prebooking (updates customer point balance)
CREATE POLICY "Allow public updates of customer points for prebooking" 
ON public.customers FOR UPDATE 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- Customers need to read vendor profile details (store name, etc.)
CREATE POLICY "Allow public select of vendors" 
ON public.vendors FOR SELECT 
TO anon, authenticated 
USING (true);

-- Customers need to insert a transaction to log point deductions
CREATE POLICY "Allow public insert of transactions" 
ON public.transactions FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Customers need to register/sign up themselves
CREATE POLICY "Allow public inserts of customers for registration" 
ON public.customers FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);


-- ==========================================
-- 11. INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_offers_vendor ON public.offers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_prebookings_vendor ON public.prebookings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_prebookings_customer ON public.prebookings(customer_id);

