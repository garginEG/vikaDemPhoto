/* ============================================
   wow.js — премиум-эффекты
   1. Кастомный курсор + magnetic
   2. Page transitions (шторка)
   3. Split-text заголовки
   ============================================ */

(function () {

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

    // ============================================
    // 1. КАСТОМНЫЙ КУРСОР
    // ============================================
    function initCursor() {
        if (reduceMotion || isTouch) return;

        document.documentElement.classList.add('has-custom-cursor');

        const dot = document.createElement('div');
        dot.className = 'cursor-dot';

        const ring = document.createElement('div');
        ring.className = 'cursor-ring';
        ring.innerHTML = '<span class="cursor-label">Смотреть</span>';

        document.body.appendChild(dot);
        document.body.appendChild(ring);

        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let ringX = mouseX;
        let ringY = mouseY;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            // точка двигается мгновенно
            dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
        });

        // кольцо двигается с инерцией
        function animateRing() {
            ringX += (mouseX - ringX) * 0.18;
            ringY += (mouseY - ringY) * 0.18;
            ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
            requestAnimationFrame(animateRing);
        }
        animateRing();

        // делегирование: реагируем на наведение
        document.addEventListener('mouseover', (e) => {
            const t = e.target;
            if (t.closest('.portfolio-item')) {
                ring.classList.add('is-view');
                ring.classList.remove('is-hover');
                dot.classList.add('is-hidden');
            } else if (t.closest('a, button, .btn, .service-card, .price-card')) {
                ring.classList.add('is-hover');
                ring.classList.remove('is-view');
                dot.classList.remove('is-hidden');
            }
        });

        document.addEventListener('mouseout', (e) => {
            const t = e.target;
            if (t.closest('.portfolio-item, a, button, .btn, .service-card, .price-card')) {
                ring.classList.remove('is-hover', 'is-view');
                dot.classList.remove('is-hidden');
            }
        });

        // прячем курсор когда мышь уходит за окно
        document.addEventListener('mouseleave', () => {
            dot.style.opacity = '0';
            ring.style.opacity = '0';
        });
        document.addEventListener('mouseenter', () => {
            dot.style.opacity = '';
            ring.style.opacity = '';
        });
    }

    // ============================================
    // MAGNETIC BUTTONS
    // ============================================
    function initMagnetic() {
        if (reduceMotion || isTouch) return;

        const magnets = document.querySelectorAll('.btn, .service-arrow');

        magnets.forEach(magnet => {
            magnet.addEventListener('mousemove', (e) => {
                const rect = magnet.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                magnet.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
            });
            magnet.addEventListener('mouseleave', () => {
                magnet.style.transform = '';
            });
        });
    }

    // ============================================
    // 2. PAGE TRANSITIONS
    // ============================================
    function initPageTransitions() {
        if (reduceMotion) return;

        // создаём шторку
        const overlay = document.createElement('div');
        overlay.className = 'page-transition';
        overlay.innerHTML = '<span class="pt-logo">Victoria</span>';
        document.body.appendChild(overlay);

        // ВХОД: при загрузке страницы шторка уезжает вверх
        // (только если пришли по внутренней ссылке — флаг в sessionStorage)
        if (sessionStorage.getItem('pt-navigating') === '1') {
            sessionStorage.removeItem('pt-navigating');
            overlay.style.transform = 'translateY(0)';
            requestAnimationFrame(() => {
                overlay.classList.add('is-entering');
            });
            overlay.addEventListener('animationend', () => {
                overlay.classList.remove('is-entering');
                overlay.style.transform = '';
            }, { once: true });
        }

        // УХОД: перехватываем клики по внутренним ссылкам
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href) return;

            // только внутренние html-ссылки
            const isInternal = /\.html$/.test(href) || href === '/';
            const isSamePage = href === location.pathname.split('/').pop();
            const isNewTab = link.target === '_blank';
            const isModified = e.metaKey || e.ctrlKey || e.shiftKey;

            if (!isInternal || isSamePage || isNewTab || isModified) return;

            e.preventDefault();
            sessionStorage.setItem('pt-navigating', '1');

            overlay.classList.add('is-leaving');

            setTimeout(() => {
                window.location.href = href;
            }, 600);
        });

        // bfcache: при возврате через «Назад» страница восстанавливается
        // с закрытой шторкой — принудительно убираем её, чтобы не застрять
        window.addEventListener('pageshow', (e) => {
            if (e.persisted) {
                overlay.classList.remove('is-leaving', 'is-entering');
                overlay.style.transform = '';
                sessionStorage.removeItem('pt-navigating');
            }
        });
    }

    // ============================================
    // 3. SPLIT-TEXT (анимация заголовков по словам)
    // ============================================
    function initSplitText() {
        const targets = document.querySelectorAll('[data-split]');
        if (!targets.length) return;

        targets.forEach(el => {
            // Разбиваем на слова через DOM-узлы (без innerHTML-интерполяции) —
            // безопасно даже если внутри окажутся данные из БД
            const frag = document.createDocumentFragment();

            Array.from(el.childNodes).forEach(node => {
                // <br> и прочие элементы (например <br>) переносим как есть
                if (node.nodeType === Node.ELEMENT_NODE) {
                    frag.appendChild(node.cloneNode(true));
                    return;
                }
                // текстовый узел → разбиваем на слова
                if (node.nodeType === Node.TEXT_NODE) {
                    const words = node.textContent.split(/(\s+)/);
                    words.forEach(w => {
                        if (w === '') return;
                        if (w.trim() === '') {
                            frag.appendChild(document.createTextNode(w));
                        } else {
                            const outer = document.createElement('span');
                            outer.className = 'split-word';
                            const inner = document.createElement('span');
                            inner.textContent = w; // textContent = экранирование «из коробки»
                            outer.appendChild(inner);
                            frag.appendChild(outer);
                        }
                    });
                }
            });

            el.replaceChildren(frag);
            el.classList.add('split-line');
        });

        if (reduceMotion) {
            targets.forEach(el => el.classList.add('is-visible'));
            return;
        }

        // появление при скролле + стаггер по словам
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const el = entry.target;
                        const words = el.querySelectorAll('.split-word > span');
                        words.forEach((w, i) => {
                            w.style.transitionDelay = (i * 0.06) + 's';
                        });
                        el.classList.add('is-visible');
                        io.unobserve(el);
                    }
                });
            }, { threshold: 0.3, rootMargin: '0px 0px -10% 0px' });

            targets.forEach(el => io.observe(el));
        } else {
            targets.forEach(el => el.classList.add('is-visible'));
        }
    }

    // ============================================
    // INIT
    // ============================================
    function init() {
        initCursor();
        initMagnetic();
        initPageTransitions();
        initSplitText();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
