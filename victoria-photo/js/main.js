/* ============================================
   Victoria Photography — Main Script
   GSAP + ScrollTrigger + Lenis (с защитой от падений)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    const hasLenis = typeof Lenis !== 'undefined';
    const hasGsap = typeof gsap !== 'undefined';
    const hasST = typeof ScrollTrigger !== 'undefined';

    // --------------------------------------------
    // 1. LENIS — Smooth scroll (опционально)
    // --------------------------------------------
    let lenis = null;
    if (hasLenis) {
        try {
            lenis = new Lenis({
                duration: 1.2,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                smoothWheel: true,
                smoothTouch: false,
            });

            function raf(time) {
                lenis.raf(time);
                requestAnimationFrame(raf);
            }
            requestAnimationFrame(raf);

            if (hasST) {
                lenis.on('scroll', ScrollTrigger.update);
                gsap.ticker.add((time) => lenis.raf(time * 1000));
                gsap.ticker.lagSmoothing(0);
            }
        } catch (err) {
            console.warn('Lenis init failed, falling back to native scroll', err);
            lenis = null;
        }
    }

    // --------------------------------------------
    // 2. HEADER — scroll state
    // --------------------------------------------
    const header = document.querySelector('.header');
    const onScroll = (scrollY) => {
        if (!header) return;
        if (scrollY > 60) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    };

    if (lenis) {
        lenis.on('scroll', ({ scroll }) => onScroll(scroll));
    } else {
        window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
    }

    // --------------------------------------------
    // 3. BURGER MENU (mobile)
    // --------------------------------------------
    const burger = document.getElementById('burger');
    const nav = document.getElementById('nav');

    if (burger && nav) {
            burger.addEventListener('click', () => {
            burger.classList.toggle('open');
            nav.classList.toggle('open');
            document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : '';
            document.body.classList.toggle('menu-open', nav.classList.contains('open'));
        });

        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                burger.classList.remove('open');
                nav.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    // --------------------------------------------
    // 4. HERO — line mask reveal on load
    // --------------------------------------------
    const heroMasks = document.querySelectorAll('.hero .line-mask');
    setTimeout(() => {
        heroMasks.forEach((el, i) => {
            setTimeout(() => el.classList.add('is-visible'), i * 120);
        });
    }, 200);

    // --------------------------------------------
    // 5. SCROLL REVEAL — IntersectionObserver
    // (observeReveals доступен снаружи — для динамически добавленных элементов)
    // --------------------------------------------
    let io = null;
    if ('IntersectionObserver' in window) {
        io = new IntersectionObserver((entries) => {
            entries.forEach((entry, i) => {
                if (entry.isIntersecting) {
                    setTimeout(() => entry.target.classList.add('is-visible'), i * 60);
                    io.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.12,
            rootMargin: '0px 0px -8% 0px',
        });
    }

    window.observeReveals = function () {
        const reveals = document.querySelectorAll('.reveal:not(.is-visible), .line-mask:not(.is-visible):not(.hero .line-mask)');
        if (io) {
            reveals.forEach(el => io.observe(el));
        } else {
            reveals.forEach(el => el.classList.add('is-visible'));
        }
    };

    window.observeReveals();

    // Подстраховка: через 3 сек принудительно показываем всё, что не появилось
    setTimeout(() => {
        document.querySelectorAll('.reveal:not(.is-visible), .line-mask:not(.is-visible)')
            .forEach(el => el.classList.add('is-visible'));
    }, 3000);

    // --------------------------------------------
    // 6. PORTFOLIO — micro-parallax on hover (event delegation)
    // --------------------------------------------
    document.addEventListener('mousemove', (e) => {
        const item = e.target.closest('.portfolio-item');
        if (!item) return;
        const rect = item.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        item.style.transform = `scale(1.02) translate(${x * 8}px, ${y * 8}px)`;
        item.style.transition = 'transform 0.4s ease-out';
    });

    document.addEventListener('mouseout', (e) => {
        const item = e.target.closest('.portfolio-item');
        if (item && !item.contains(e.relatedTarget)) {
            item.style.transform = '';
        }
    });

    // --------------------------------------------
    // 7. HERO BG — parallax on scroll
    // --------------------------------------------
    if (hasGsap && hasST) {
        const heroBg = document.querySelector('.hero-bg');
        if (heroBg) {
            gsap.to(heroBg, {
                yPercent: 25,
                ease: 'none',
                scrollTrigger: {
                    trigger: '.hero',
                    start: 'top top',
                    end: 'bottom top',
                    scrub: true,
                },
            });
        }
    }

    // --------------------------------------------
    // 8. ANCHOR LINKS — smooth scroll
    // --------------------------------------------
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href === '#' || href.length < 2) return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                if (lenis) {
                    lenis.scrollTo(target, { offset: -80, duration: 1.4 });
                } else {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

});
