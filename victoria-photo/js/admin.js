/* ============================================
   admin.js — логика админ-панели
   ============================================ */

(function () {

    // ============== UTIL ==============

    function $(sel) { return document.querySelector(sel); }
    function $$(sel) { return document.querySelectorAll(sel); }

    function escapeHTML(str) {
        return String(str || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function toast(message, type = 'info') {
        const container = $('#toast-container');
        const t = document.createElement('div');
        t.className = 'toast ' + type;
        t.textContent = message;
        container.appendChild(t);
        setTimeout(() => {
            t.style.transition = 'opacity 0.3s';
            t.style.opacity = '0';
            setTimeout(() => t.remove(), 300);
        }, 3000);
    }

    // ============== CONFIG CHECK ==============

    if (!window.SUPABASE_IS_CONFIGURED) {
        $('#config-warning').style.display = 'block';
        $('#login-btn').disabled = true;
        return;
    }

    // ============== AUTH ==============

    async function init() {
        const user = await window.DataAPI.getUser();
        if (user) {
            showAdminPanel(user);
        } else {
            showLogin();
        }
    }

    function showLogin() {
        $('#login-screen').style.display = 'flex';
        $('#admin-panel').style.display = 'none';
    }

    function showAdminPanel(user) {
        $('#login-screen').style.display = 'none';
        $('#admin-panel').style.display = 'block';
        $('#admin-user-email').textContent = user.email;
        loadAndRenderPortfolio();
        loadAndRenderPricing();
    }

    $('#login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = $('#login-email').value.trim();
        const password = $('#login-password').value;
        const errorEl = $('#login-error');
        const btn = $('#login-btn');

        errorEl.style.display = 'none';
        btn.disabled = true;
        btn.textContent = 'Вход…';

        try {
            await window.DataAPI.signIn(email, password);
            const user = await window.DataAPI.getUser();
            showAdminPanel(user);
        } catch (err) {
            errorEl.textContent = err.message || 'Ошибка входа';
            errorEl.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Войти';
        }
    });

    $('#logout-btn').addEventListener('click', async () => {
        await window.DataAPI.signOut();
        location.reload();
    });

    // ============== TABS ==============

    $$('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            $$('.admin-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            $$('.admin-section').forEach(s => s.classList.remove('active'));
            $('#section-' + target).classList.add('active');
        });
    });

    // ============== PORTFOLIO ==============

    let currentCategory = 'studio';
    const CATEGORY_LABELS = { studio: 'Студия', corporate: 'Корпоратив' };

    // Переключатель категорий — только для портфолио!
    $$('#category-switcher .category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('#category-switcher .category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            $('#upload-category-label').textContent = CATEGORY_LABELS[currentCategory];
            loadAndRenderPortfolio();
        });
    });

    async function loadAndRenderPortfolio() {
        const grid = $('#photo-grid');
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--admin-muted); padding: 40px;">Загрузка…</p>';
        try {
            const items = await window.DataAPI.loadPortfolio(currentCategory);
            grid.innerHTML = '';

            if (!items.length || items.every(i => !i.src)) {
                grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--admin-muted); padding: 40px;">В разделе «${CATEGORY_LABELS[currentCategory]}» пока ни одного фото. Загрузите первое выше ↑</p>`;
                return;
            }

            items.filter(i => i.src).forEach(item => {
                const card = document.createElement('div');
                card.className = 'photo-card';
                card.innerHTML = `
                    <div class="photo-card-img">
                        <img src="${escapeHTML(item.src)}" alt="${escapeHTML(item.label)}" loading="lazy">
                    </div>
                    <div class="photo-card-body">
                        <span class="photo-card-label">${escapeHTML(item.label || 'без названия')}</span>
                        <button class="photo-card-delete" data-id="${escapeHTML(item.id)}">Удалить</button>
                    </div>
                `;
                grid.appendChild(card);
            });

            grid.querySelectorAll('.photo-card-delete').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (!confirm('Удалить это фото? Действие нельзя отменить.')) return;
                    btn.disabled = true;
                    try {
                        await window.DataAPI.deletePortfolioItem(btn.dataset.id);
                        toast('Фото удалено', 'success');
                        loadAndRenderPortfolio();
                    } catch (err) {
                        toast('Ошибка удаления: ' + err.message, 'error');
                        btn.disabled = false;
                    }
                });
            });

        } catch (err) {
            grid.innerHTML = '<p style="color: var(--admin-danger); padding: 40px; text-align: center;">Не удалось загрузить портфолио: ' + escapeHTML(err.message) + '</p>';
        }
    }

    // -------- UPLOAD --------

    const uploadZone = $('#upload-zone');
    const fileInput = $('#file-input');
    const progressEl = $('#upload-progress');

    fileInput.addEventListener('change', (e) => {
        handleFiles(Array.from(e.target.files));
        e.target.value = '';
    });

    ['dragover', 'dragenter'].forEach(ev => {
        uploadZone.addEventListener(ev, (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(ev => {
        uploadZone.addEventListener(ev, (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
        });
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        handleFiles(files);
    });

    async function handleFiles(files) {
        if (!files.length) return;

        const total = files.length;
        let done = 0;

        progressEl.innerHTML = `<div class="alert">Загрузка: <strong id="upload-counter">0 / ${total}</strong></div>`;

        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) {
                toast(`${file.name} > 10 МБ — пропущено`, 'error');
                continue;
            }
            try {
                const { publicUrl } = await window.DataAPI.uploadPhoto(file);
                const label = file.name.replace(/\.[^.]+$/, '');
                await window.DataAPI.addPortfolioItem({
                    src: publicUrl, label, order: 0, category: currentCategory,
                });
                done++;
                const counter = $('#upload-counter');
                if (counter) counter.textContent = `${done} / ${total}`;
            } catch (err) {
                toast(`Ошибка ${file.name}: ${err.message}`, 'error');
            }
        }

        progressEl.innerHTML = '';
        if (done === 0) {
            toast('Не удалось загрузить ни одного файла', 'error');
        } else if (done < total) {
            toast(`Загружено ${done} из ${total} — остальные с ошибками`, 'error');
        } else {
            toast(`Загружено: ${done} из ${total}`, 'success');
        }
        loadAndRenderPortfolio();
    }

    // ============== PRICING ==============

    let currentPricingCategory = 'studio';

    // переключатель категорий цен
    $$('#pricing-category-switcher .category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('#pricing-category-switcher .category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPricingCategory = btn.dataset.category;
            loadAndRenderPricing();
        });
    });

    // добавить новый тариф
    $('#add-pricing-btn').addEventListener('click', async () => {
        const btn = $('#add-pricing-btn');
        btn.disabled = true;
        try {
            await window.DataAPI.addPricing({
                name: 'Новый тариф',
                category: currentPricingCategory,
            });
            toast('Тариф добавлен — отредактируйте поля', 'success');
            await loadAndRenderPricing();
        } catch (err) {
            toast('Ошибка: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
        }
    });

    async function loadAndRenderPricing() {
        const editor = $('#price-editor');
        editor.innerHTML = '<p style="text-align: center; color: var(--admin-muted); padding: 40px;">Загрузка…</p>';
        try {
            const plans = await window.DataAPI.loadPricing(currentPricingCategory);
            editor.innerHTML = '';

            if (!plans.length) {
                editor.innerHTML = `<p style="text-align: center; color: var(--admin-muted); padding: 40px;">В разделе «${currentPricingCategory === 'studio' ? 'Студия' : 'Корпоратив'}» пока нет тарифов. Жми «+ Добавить тариф» сверху.</p>`;
                return;
            }

            plans.forEach(plan => {
                const card = document.createElement('div');
                card.className = 'price-editor-card' + (plan.featured ? ' featured' : '');
                card.dataset.id = plan.id;

                const featuresHtml = (plan.features || []).map((f, i) => `
                    <div class="feature-row">
                        <input type="text" value="${escapeHTML(f)}" data-feature-index="${i}">
                        <button type="button" class="remove-feature">×</button>
                    </div>
                `).join('');

                card.innerHTML = `
                    <h3>${escapeHTML(plan.name)}</h3>
                    <div class="price-card-id">id: ${escapeHTML(plan.id)}</div>

                    <div class="field">
                        <label>Название</label>
                        <input type="text" name="name" value="${escapeHTML(plan.name)}">
                    </div>

                    <div class="field">
                        <label>Подзаголовок</label>
                        <input type="text" name="subtitle" value="${escapeHTML(plan.subtitle || '')}">
                    </div>

                    <div class="field-inline">
                        <div class="field">
                            <label>Цена</label>
                            <input type="text" name="price" value="${escapeHTML(plan.price)}">
                        </div>
                        <div class="field">
                            <label>Валюта</label>
                            <input type="text" name="currency" value="${escapeHTML(plan.currency || '₽')}">
                        </div>
                    </div>

                    <div class="field">
                        <label>Длительность</label>
                        <input type="text" name="duration" value="${escapeHTML(plan.duration || '')}">
                    </div>

                    <div class="field">
                        <label>Что входит</label>
                        <div class="features-list">${featuresHtml}</div>
                        <button type="button" class="add-feature-btn">+ Добавить пункт</button>
                    </div>

                    <div class="field">
                        <label>Текст кнопки</label>
                        <input type="text" name="cta_text" value="${escapeHTML(plan.cta_text || 'Забронировать')}">
                    </div>

                    <div class="field field-checkbox">
                        <input type="checkbox" id="featured-${plan.id}" name="featured" ${plan.featured ? 'checked' : ''}>
                        <label for="featured-${plan.id}">Выделить как основной тариф</label>
                    </div>

                    <div class="price-editor-card-actions">
                        <button type="button" class="admin-btn admin-btn-accent save-plan-btn">Сохранить</button>
                        <button type="button" class="admin-btn admin-btn-secondary delete-plan-btn">Удалить</button>
                    </div>
                `;

                editor.appendChild(card);
            });

            attachPricingHandlers();

        } catch (err) {
            editor.innerHTML = '<p style="color: var(--admin-danger); padding: 40px; text-align: center;">Не удалось загрузить цены: ' + escapeHTML(err.message) + '</p>';
        }
    }

    function attachPricingHandlers() {
        $$('.price-editor-card').forEach(card => {
            // добавить пункт features
            card.querySelector('.add-feature-btn').addEventListener('click', () => {
                const list = card.querySelector('.features-list');
                const row = document.createElement('div');
                row.className = 'feature-row';
                row.innerHTML = `<input type="text" placeholder="Новый пункт"><button type="button" class="remove-feature">×</button>`;
                list.appendChild(row);
                row.querySelector('.remove-feature').addEventListener('click', () => row.remove());
                row.querySelector('input').focus();
            });

            // удалить пункт features
            card.querySelectorAll('.remove-feature').forEach(btn => {
                btn.addEventListener('click', () => btn.closest('.feature-row').remove());
            });

            // удалить тариф
            card.querySelector('.delete-plan-btn').addEventListener('click', async () => {
                const name = card.querySelector('[name="name"]').value || 'этот тариф';
                if (!confirm(`Удалить тариф «${name}»? Действие нельзя отменить.`)) return;
                const delBtn = card.querySelector('.delete-plan-btn');
                delBtn.disabled = true;
                try {
                    await window.DataAPI.deletePricing(card.dataset.id);
                    toast('Тариф удалён', 'success');
                    loadAndRenderPricing();
                } catch (err) {
                    toast('Ошибка удаления: ' + err.message, 'error');
                    delBtn.disabled = false;
                }
            });

            // сохранить
            card.querySelector('.save-plan-btn').addEventListener('click', async () => {
                const btn = card.querySelector('.save-plan-btn');
                btn.disabled = true;
                btn.textContent = 'Сохранение…';

                try {
                    const id = card.dataset.id;
                    const features = Array.from(card.querySelectorAll('.features-list input'))
                        .map(i => i.value.trim()).filter(Boolean);

                    const updates = {
                        name: card.querySelector('[name="name"]').value.trim(),
                        subtitle: card.querySelector('[name="subtitle"]').value.trim(),
                        price: card.querySelector('[name="price"]').value.trim(),
                        currency: card.querySelector('[name="currency"]').value.trim(),
                        duration: card.querySelector('[name="duration"]').value.trim(),
                        cta_text: card.querySelector('[name="cta_text"]').value.trim(),
                        featured: card.querySelector('[name="featured"]').checked,
                        features,
                    };

                    await window.DataAPI.updatePricing(id, updates);
                    toast('Тариф "' + updates.name + '" сохранён', 'success');
                    card.classList.toggle('featured', updates.featured);
                    card.querySelector('h3').textContent = updates.name;
                } catch (err) {
                    toast('Ошибка: ' + err.message, 'error');
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Сохранить';
                }
            });
        });
    }

    // ============== START ==============

    init();

})();
