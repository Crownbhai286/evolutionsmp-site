-- ============================================================================
-- EvolutionSMP FamGateway Orders & Deliveries Schema
-- Migration: 002_famgateway_orders.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.store_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT UNIQUE NOT NULL,
  famgateway_order_id TEXT,
  username TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  original_usd_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_commands JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'expired')),
  payment_method TEXT NOT NULL DEFAULT 'famgateway_upi',
  utr TEXT,
  sender_upi TEXT,
  checkout_url TEXT NOT NULL DEFAULT '',
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'failed', 'manual_review')),
  delivered_at TIMESTAMPTZ,
  delivery_attempts INTEGER NOT NULL DEFAULT 0,
  delivery_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for rapid lookups and webhook idempotency verification
CREATE INDEX IF NOT EXISTS idx_store_orders_order_id ON public.store_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_famgateway_id ON public.store_orders(famgateway_order_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_username ON public.store_orders(username);
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON public.store_orders(status);
CREATE INDEX IF NOT EXISTS idx_store_orders_utr ON public.store_orders(utr);
CREATE INDEX IF NOT EXISTS idx_store_orders_created_at ON public.store_orders(created_at DESC);

-- Trigger for auto updating updated_at
CREATE TRIGGER trg_store_orders_updated_at
  BEFORE UPDATE ON public.store_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable Row Level Security
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

-- Admins have full access to view and manage all orders
CREATE POLICY "Admins manage store_orders"
  ON public.store_orders
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- Public users can view order tracking details by order_id
CREATE POLICY "Public read store_orders"
  ON public.store_orders
  FOR SELECT
  USING (TRUE);

-- Public checkout sessions can create initial pending orders
CREATE POLICY "Public insert store_orders"
  ON public.store_orders
  FOR INSERT
  WITH CHECK (TRUE);
