import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-config.js';

const configured =
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !String(SUPABASE_URL).includes('YOUR_PROJECT_REF') &&
    !String(SUPABASE_ANON_KEY).includes('YOUR_SUPABASE_ANON_KEY');

if (configured) {
    window.guitarIoSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    });
} else {
    console.warn(
        'guitar.io: Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in js/supabase-config.js (Dashboard → Project Settings → API).'
    );
}

window.dispatchEvent(new Event('guitar-io-supabase-ready'));
