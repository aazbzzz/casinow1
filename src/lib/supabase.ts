import { createClient } from '@supabase/supabase-js';

/**
 * CONFIGURATION SUPABASE
 * Remplacez les valeurs ci-dessous par vos propres identifiants Supabase
 * Vous pouvez les trouver dans Project Settings > API
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hshjdcxhjzsecsrfecsp.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzaGpkY3hoanpzZWNzcmZlY3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDA4MDcsImV4cCI6MjA5NDI3NjgwN30.pbdD8BB5Zd5nY3LsPG82OThWxK68o0zUZNtX5YHvquU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * SCHEMA SQL À EXÉCUTER DANS VOTRE SQL EDITOR SUPABASE :
 * 
 * -- 1. Table des utilisateurs
 * CREATE TABLE public.users (
 *   id TEXT PRIMARY KEY, -- TEXT pour supporter guest-XXXXXX et custom IDs
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
 *   is_unlimited BOOLEAN DEFAULT FALSE,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 3. Table des transactions
 * CREATE TABLE public.transactions (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id TEXT REFERENCES public.users(id),
 *   type TEXT NOT NULL,
 *   amount BIGINT NOT NULL,
 *   game TEXT,
 *   balance_after BIGINT,
 *   timestamp TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 4. Table de l'historique des jeux
 * CREATE TABLE public.game_history (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id TEXT REFERENCES public.users(id),
 *   game TEXT NOT NULL,
 *   bet BIGINT NOT NULL,
 *   multiplier NUMERIC,
 *   payout BIGINT,
 *   outcome TEXT, -- 'win', 'loss'
 *   timestamp TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 5. Table des quêtes (Per user sync)
 * CREATE TABLE public.quests (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id TEXT REFERENCES public.users(id),
 *   quest_id TEXT NOT NULL,
 *   title TEXT NOT NULL,
 *   description TEXT,
 *   reward BIGINT NOT NULL,
 *   requirement INT NOT NULL,
 *   type TEXT NOT NULL,
 *   progress INT DEFAULT 0,
 *   completed BOOLEAN DEFAULT FALSE,
 *   claimed BOOLEAN DEFAULT FALSE,
 *   UNIQUE(user_id, quest_id)
 * );
 * 
 * -- 6. Activer le Realtime pour les promo_codes et le leaderboard
 * ALTER PUBLICATION supabase_realtime ADD TABLE public.promo_codes;
 * ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
 * 
 * -- 7. Désactiver RLS pour simplifier le développement (À REVOIR EN PRODUCTION)
 * ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.promo_codes DISABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.game_history DISABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.quests DISABLE ROW LEVEL SECURITY;
 */
