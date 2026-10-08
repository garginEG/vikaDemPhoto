/* ============================================
   data.js — работа с данными портфолио и цен
   ============================================ */

const FALLBACK_PORTFOLIO = [
    { id: 'p1', src: '', label: 'Portrait · 01' },
    { id: 'p2', src: '', label: 'Fashion · 02' },
    { id: 'p3', src: '', label: 'Studio · 03' },
    { id: 'p4', src: '', label: 'Lookbook · 04' },
    { id: 'p5', src: '', label: 'Beauty · 05' },
    { id: 'p6', src: '', label: 'Portrait · 06' },
    { id: 'p7', src: '', label: 'Editorial · 07' },
    { id: 'p8', src: '', label: 'Fashion · 08' },
];

const FALLBACK_PRICING = [
    {
        id: 'soft', name: 'Soft', subtitle: 'Лёгкая съёмка, один образ',
        price: '15 000', currency: '₽', duration: '1 час · 1 локация',
        features: ['1 образ', '15 обработанных фото', 'Все исходники в облаке', 'Готовность за 5 дней'],
        featured: false, cta_text: 'Забронировать', order: 1,
    },
    {
        id: 'studio', name: 'Studio', subtitle: 'Базовый формат — чаще всего выбирают',
        price: '30 000', currency: '₽', duration: '2,5 часа · до 3 образов',
        features: ['До 3 образов', '35 обработанных фото', 'Помощь с позированием', 'Подбор студии и света', 'Готовность за 7 дней'],
        featured: true, cta_text: 'Забронировать', order: 2,
    },
    {
        id: 'editorial', name: 'Editorial', subtitle: "Для брендов и lookbook'ов",
        price: 'от 60 000', currency: '₽', duration: 'полный день · команда',
        features: ['Без ограничения образов', '60+ обработанных фото', 'Помощь с подбором стилиста и MUAH', 'Бэкстейдж по запросу', 'Готовность за 10 дней'],
        featured: false, cta_text: 'Обсудить', order: 3,
    },
];

window.DataAPI = {

    async loadPortfolio(category = null) {
        if (!window.SUPABASE_IS_CONFIGURED) {
            return category ? [] : FALLBACK_PORTFOLIO;
        }
        try {
            let query = window.supabaseClient.from('portfolio').select('*');
            if (category) query = query.eq('category', category);
            query = query.order('order', { ascending: true })
                         .order('created_at', { ascending: false });
            const { data, error } = await query;
            if (error) throw error;
            return data && data.length ? data : (category ? [] : FALLBACK_PORTFOLIO);
        } catch (err) {
            console.warn('Portfolio load failed, using fallback', err);
            return category ? [] : FALLBACK_PORTFOLIO;
        }
    },

    async loadPricing(category = null) {
        if (!window.SUPABASE_IS_CONFIGURED) {
            return category ? [] : FALLBACK_PRICING;
        }
        try {
            let query = window.supabaseClient.from('pricing').select('*');
            if (category) query = query.eq('category', category);
            query = query.order('order', { ascending: true });
            const { data, error } = await query;
            if (error) throw error;
            return data && data.length ? data : (category ? [] : FALLBACK_PRICING);
        } catch (err) {
            console.warn('Pricing load failed, using fallback', err);
            return category ? [] : FALLBACK_PRICING;
        }
    },

    async uploadPhoto(file) {
        const ext = file.name.split('.').pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await window.supabaseClient.storage
            .from('portfolio').upload(path, file, { cacheControl: '3600', upsert: false });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = window.supabaseClient.storage
            .from('portfolio').getPublicUrl(path);
        return { path, publicUrl };
    },

    async addPortfolioItem({ src, label = '', order = 0, category = 'studio' }) {
        // Только разрешённые категории
        const safeCategory = ['studio', 'corporate'].includes(category) ? category : 'studio';
        const { data, error } = await window.supabaseClient
            .from('portfolio').insert({
                src: String(src),
                label: String(label).slice(0, 200),
                order: Number(order) || 0,
                category: safeCategory,
            }).select().single();
        if (error) throw error;
        return data;
    },

    async deletePortfolioItem(id) {
        const { data: item } = await window.supabaseClient
            .from('portfolio').select('src').eq('id', id).single();

        const { error } = await window.supabaseClient
            .from('portfolio').delete().eq('id', id);
        if (error) throw error;

        if (item && item.src) {
            const url = new URL(item.src);
            const path = url.pathname.split('/portfolio/').pop();
            if (path) {
                await window.supabaseClient.storage.from('portfolio').remove([path]);
            }
        }
    },

    async addPricing({ name = 'Новый тариф', category = 'studio' } = {}) {
        const id = (window.crypto && crypto.randomUUID)
            ? crypto.randomUUID()
            : 'plan-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
        const { data, error } = await window.supabaseClient
            .from('pricing').insert({
                id, name, subtitle: '', price: '0', currency: '₽',
                duration: '', features: [], featured: false,
                cta_text: 'Забронировать', order: 99, category,
            }).select().single();
        if (error) throw error;
        return data;
    },

    async deletePricing(id) {
        const { error } = await window.supabaseClient
            .from('pricing').delete().eq('id', id);
        if (error) throw error;
    },

    async updatePricing(id, updates) {
        // Whitelist полей — клиент не может произвольно подменить колонки через DevTools
        const ALLOWED = ['name', 'subtitle', 'price', 'currency', 'duration',
                         'features', 'featured', 'cta_text', 'order', 'category'];
        const safeUpdates = {};
        for (const key of ALLOWED) {
            if (key in updates) safeUpdates[key] = updates[key];
        }
        safeUpdates.updated_at = new Date().toISOString();

        const { data, error } = await window.supabaseClient
            .from('pricing').update(safeUpdates)
            .eq('id', id).select().single();
        if (error) throw error;
        return data;
    },

    // ===== Auth =====

    async signIn(email, password) {
        const { data, error } = await window.supabaseClient.auth
            .signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    },

    async signOut() {
        await window.supabaseClient.auth.signOut();
    },

    async getUser() {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        return user;
    },
};
