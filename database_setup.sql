-- =========================================================================
-- SUPABASE DATABASE SETUP & POLICIES CONFIGURATION
-- =========================================================================
-- INSTRUCTIONS:
-- 1. Copy the entire contents of this file.
-- 2. Go to your Supabase Project Dashboard -> SQL Editor.
-- 3. Click "New query", paste the SQL commands, and click "Run".
-- =========================================================================

-- ==========================================
-- 1. PROFILE AUTOMATION TRIGGER
-- ==========================================
-- This trigger automatically creates profiles and vendor records when users sign up,
-- using the metadata supplied during the `signUp` API call.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into public.profiles
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'User'),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  );

  -- Insert into public.vendors if role is vendor
  IF coalesce(new.raw_user_meta_data->>'role', 'customer') = 'vendor' THEN
    INSERT INTO public.vendors (id, business_name, description, phone, address)
    VALUES (
      new.id,
      coalesce(new.raw_user_meta_data->>'business_name', 'My Store'),
      new.raw_user_meta_data->>'description',
      new.raw_user_meta_data->>'phone',
      new.raw_user_meta_data->>'address'
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the trigger to auth.users (runs AFTER signup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable Row Level Security on core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;


-- --- PROFILES TABLE POLICIES ---
DROP POLICY IF EXISTS "Allow public select profiles" ON public.profiles;
CREATE POLICY "Allow public select profiles" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users insert own profile" ON public.profiles;
CREATE POLICY "Allow users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users update own profile" ON public.profiles;
CREATE POLICY "Allow users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);


-- --- VENDORS TABLE POLICIES ---
DROP POLICY IF EXISTS "Allow public select vendors" ON public.vendors;
CREATE POLICY "Allow public select vendors" ON public.vendors
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow vendors insert own storefront" ON public.vendors;
CREATE POLICY "Allow vendors insert own storefront" ON public.vendors
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow vendors update own storefront" ON public.vendors;
CREATE POLICY "Allow vendors update own storefront" ON public.vendors
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow vendors delete own storefront" ON public.vendors;
CREATE POLICY "Allow vendors delete own storefront" ON public.vendors
  FOR DELETE USING (auth.uid() = id);


-- --- CARTS TABLE POLICIES ---
DROP POLICY IF EXISTS "Allow users select own cart" ON public.carts;
CREATE POLICY "Allow users select own cart" ON public.carts
  FOR SELECT USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Allow users manage own cart" ON public.carts;
CREATE POLICY "Allow users manage own cart" ON public.carts
  FOR ALL USING (customer_id = auth.uid());


-- --- CART ITEMS TABLE POLICIES ---
DROP POLICY IF EXISTS "Allow users manage own cart items" ON public.cart_items;
CREATE POLICY "Allow users manage own cart items" ON public.cart_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE id = cart_id AND customer_id = auth.uid()
    )
  );


-- --- CATEGORIES TABLE POLICIES ---
DROP POLICY IF EXISTS "Allow public select categories" ON public.categories;
CREATE POLICY "Allow public select categories" ON public.categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert categories" ON public.categories;
CREATE POLICY "Allow authenticated insert categories" ON public.categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('vendor', 'admin')
    )
  );

DROP POLICY IF EXISTS "Allow admins manage categories" ON public.categories;
CREATE POLICY "Allow admins manage categories" ON public.categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- --- PRODUCTS TABLE POLICIES ---
DROP POLICY IF EXISTS "Allow public select products" ON public.products;
CREATE POLICY "Allow public select products" ON public.products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow vendors manage own products" ON public.products;
CREATE POLICY "Allow vendors manage own products" ON public.products
  FOR ALL USING (vendor_id = auth.uid());

DROP POLICY IF EXISTS "Allow admins manage all products" ON public.products;
CREATE POLICY "Allow admins manage all products" ON public.products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- --- ORDERS TABLE POLICIES ---
DROP POLICY IF EXISTS "Allow users select own orders" ON public.orders;
CREATE POLICY "Allow users select own orders" ON public.orders
  FOR SELECT USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('vendor', 'admin')
    )
  );

DROP POLICY IF EXISTS "Allow customers insert own orders" ON public.orders;
CREATE POLICY "Allow customers insert own orders" ON public.orders
  FOR INSERT WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Allow admins update all orders" ON public.orders;
CREATE POLICY "Allow admins update all orders" ON public.orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- --- ORDER ITEMS TABLE POLICIES ---
DROP POLICY IF EXISTS "Allow users select own order items" ON public.order_items;
CREATE POLICY "Allow users select own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id AND customer_id = auth.uid()
    )
    OR vendor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Allow customers insert own order items" ON public.order_items;
CREATE POLICY "Allow customers insert own order items" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id AND customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow vendors update order items" ON public.order_items;
CREATE POLICY "Allow vendors update order items" ON public.order_items
  FOR UPDATE USING (vendor_id = auth.uid());


-- --- REVIEWS TABLE POLICIES ---
DROP POLICY IF EXISTS "Allow public select reviews" ON public.reviews;
CREATE POLICY "Allow public select reviews" ON public.reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow customers insert own reviews" ON public.reviews;
CREATE POLICY "Allow customers insert own reviews" ON public.reviews
  FOR INSERT WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Allow customers manage own reviews" ON public.reviews;
CREATE POLICY "Allow customers manage own reviews" ON public.reviews
  FOR UPDATE USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Allow customers delete own reviews" ON public.reviews;
CREATE POLICY "Allow customers delete own reviews" ON public.reviews
  FOR DELETE USING (customer_id = auth.uid());


-- --- WISHLISTS TABLE POLICIES ---
DROP POLICY IF EXISTS "Allow customers select own wishlist" ON public.wishlists;
CREATE POLICY "Allow customers select own wishlist" ON public.wishlists
  FOR SELECT USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Allow customers manage own wishlist" ON public.wishlists;
CREATE POLICY "Allow customers manage own wishlist" ON public.wishlists
  FOR ALL USING (customer_id = auth.uid());


-- --- COUPONS TABLE POLICIES ---
DROP POLICY IF EXISTS "Allow public select coupons" ON public.coupons;
CREATE POLICY "Allow public select coupons" ON public.coupons
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow vendors manage own coupons" ON public.coupons;
CREATE POLICY "Allow vendors manage own coupons" ON public.coupons
  FOR ALL USING (vendor_id = auth.uid());
