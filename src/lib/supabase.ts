import { createClient } from '@supabase/supabase-js';

/**
 * CONFIGURATION SUPABASE
 * Remplacez les valeurs ci-dessous par vos propres identifiants Supabase
 * Vous pouvez les trouver dans Project Settings > API
 */
const SUPABASE_URL = 'https://hshjdcxhjzsecsrfecsp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_f9Qh_FICW11zCyc_w9P4Pg_6c5LpP9F';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * SCHEMA SQL À EXÉCUTER DANS VOTRE SQL EDITOR SUPABASE :
 * 
 * -- 1. Table des utilisateurs
 * CREATE TABLE public.users (
 *   id UUID PRIMARY KEY,
 *   username TEXT NOT NULL,
 *   balance BIGINT DEFAULT 1000,
 *   bank_balance BIGINT DEFAULT 0,
 *   vip_level INT DEFAULT 1,
 *   total_wagered BIGINT DEFAULT 0,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   has_deposited BOOLEAN DEFAULT FALSE,
 *   used_promo_codes TEXT[] DEFAULT '{}'
 * );
 * 
 * -- 2. Table des codes promo
 * CREATE TABLE public.promo_codes (
 *   code TEXT PRIMARY KEY,
 *   type TEXT NOT NULL, -- 'currency', 'multiplier', 'crypto'
 *   value NUMERIC NOT NULL,
 *   duration INT,
 *   reward_text TEXT,
 *   max_uses INT DEFAULT 100,
 *   used_count INT DEFAULT 0,
 *   crypto_symbol TEXT,
 *   is_active BOOLEAN DEFAULT TRUE,
 *   is_unlimited BOOLEAN DEFAULT FALSE
 * );
 * 
 * -- 3. Table des transactions
 * CREATE TABLE public.transactions (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   user_id UUID REFERENCES public.users(id),
 *   type TEXT NOT NULL,
 *   amount BIGINT NOT NULL,
 *   game TEXT,
 *   balance_after BIGINT,
 *   timestamp TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 4. Table de l'historique des jeux
 * CREATE TABLE public.game_history (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   user_id UUID REFERENCES public.users(id),
 *   game TEXT NOT NULL,
 *   bet BIGINT NOT NULL,
 *   multiplier NUMERIC,
 *   payout BIGINT,
 *   outcome TEXT, -- 'win', 'loss'
 *   timestamp TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- ACTIVER RLS (Row Level Security) OU DÉSACTIVER POUR LES TESTS RAPIDES
 * -- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
 * -- CREATE POLICY "Public Access" ON public.users FOR ALL USING (true);
 * -- (Répéter pour les autres tables)
 */
