/* ============================================
   render.js — рендер портфолио и цен на studio.html
   ============================================ */

(async function () {

    function escapeHTML(str) {
        return String(str || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // -------- PORTFOLIO --------
    const portfolioEl = document.getElementById('portfolio-grid');
    if (portfolioEl) {
        const category = portfolioEl.dataset.category || null;
        const items = await window.DataAPI.loadPortfolio(category);
        portfolioEl.innerHTML = '';

        if (!items.length) {
            portfolioEl.innerHTML = '<div class="portfolio-empty">Скоро здесь появятся работы</div>';
        } else {
            items.forEach((item, i) => {
                const hasPhoto = !!item.src;
                const div = document.createElement('div');
                div.className = `portfolio-item reveal ${hasPhoto ? '' : 'is-placeholder'}`;
                div.dataset.label = item.label || '';

                if (hasPhoto) {
                    div.innerHTML = `<img src="${escapeHTML(item.src)}" alt="${escapeHTML(item.label || 'Portfolio')}" loading="lazy">`;
                }

                portfolioEl.appendChild(div);
            });
        }

        // Дёргаем reveal-observer вручную: новые элементы вставлены после DOMContentLoaded
        if (window.observeReveals) window.observeReveals();
    }

    // -------- PRICING --------
    const pricingEl = document.getElementById('pricing-grid');
    if (pricingEl) {
        const pricingCategory = pricingEl.dataset.category || null;
        const plans = await window.DataAPI.loadPricing(pricingCategory);
        pricingEl.innerHTML = '';

        if (!plans.length) {
            pricingEl.innerHTML = '<div class="portfolio-empty" style="color: rgba(242, 239, 234, 0.5);">Цены скоро появятся</div>';
        } else {
            plans.forEach(plan => {
                const card = document.createElement('div');
                card.className = `price-card reveal${plan.featured ? ' featured' : ''}`;

                const features = (plan.features || [])
                    .map(f => `<li>${escapeHTML(f)}</li>`).join('');

                const btnClass = plan.featured ? 'btn btn-accent' : 'btn btn-light';

                card.innerHTML = `
                    <div class="price-card-name">${escapeHTML(plan.name)}</div>
                    <div class="price-card-subtitle">${escapeHTML(plan.subtitle || '')}</div>
                    <div class="price-card-amount">${escapeHTML(plan.price)}<span>${escapeHTML(plan.currency || '₽')}</span></div>
                    <div class="price-card-duration">${escapeHTML(plan.duration || '')}</div>
                    <ul class="price-card-features">${features}</ul>
                    <a href="#" class="${btnClass}">${escapeHTML(plan.cta_text || 'Забронировать')}</a>
                `;

                pricingEl.appendChild(card);
            });
        }

        if (window.observeReveals) window.observeReveals();
    }

})();
