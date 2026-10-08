/* ============================================
   Supabase client — ВСТАВЬ СЮДА СВОИ КЛЮЧИ
   ============================================
   Получить можно в:
   Supabase Dashboard → Settings → API
   ============================================ */

const SUPABASE_URL = 'https://hzimhmkjbrzcbccwyxvj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_C6um8XyCH2LYaVXFSQdxbw_9942iFy6';

window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.SUPABASE_IS_CONFIGURED =
    !SUPABASE_URL.includes('YOUR-PROJECT-REF') &&
    !SUPABASE_ANON_KEY.includes('YOUR-ANON');
