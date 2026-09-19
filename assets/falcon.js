import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   ⚙️ حركة الصقر — Falcon Motion (وحدة مستقلة)
   ------------------------------------------------------------
   هذا الملف مخصّص لصاحب الموقع: عدّل القيم أدناه (DEFAULTS)
   دون الحاجة لمسّ بقية الملفات. الحركة مربوطة حالياً فقط ببطاقات
   قسم الحلو — العناصر التي تحمل الوصيفة data-falcon في sweets.html.

   جدول القيم الافتراضية:
   ┌──────────┬───────────┬─────────┬─────────┬──────────┬─────────┬───────┬────────┬────────────────┐
   │ الوضع    │ start     │ y → 0   │ scale→1 │ rotation→│ opacity→│ المدة │ ease   │ stagger        │
   ├──────────┼───────────┼─────────┼─────────┼──────────┼─────────┼───────┼────────┼────────────────┤
   │ موبايل   │ top 45%   │ 24      │ 0.97    │ -2       │ 1       │ 0.55s │ power3 │ 0              │
   │ (≤600px) │           │ من الأسفل│         │          │         │       │ .out   │                │
   ├──────────┼───────────┼─────────┼─────────┼──────────┼─────────┼───────┼────────┼────────────────┤
   │ ديسكتوب  │ top 50%   │ 40      │ 0.96    │ -3       │ 1       │ 0.65s │ power3 │ (i%4)*0.08 ث   │
   │ (>600px) │           │ من الأسفل│         │          │         │       │ .out   │ ضمن الصف فقط   │
   └──────────┴───────────┴─────────┴─────────┴──────────┴─────────┴───────┴────────┴────────────────┘

   لمسة الصقر: rotation يبدأ سالباً (-2 موبايل / -3 ديسكتوب) ويستقر
   عند 0 = إحساس "انقضاضة" دون كسر اتجاه RTL/LTR.
   القواعد: transform+opacity فقط (لا box-shadow/filter داخل الحركة حتى
   يبقى .item:hover مستقلاً). will-change أثناء الحركة ثم clearProps حتى
   يعمل hover أصلاً. كل عناصر دالة initFalcon داخل try/catch. عندما تكون
   prefers-reduced-motion أو خطأ: البطاقات تظهر فوراً (visible-by-default).
   ============================================================ */

const DEFAULTS = {
  scope: document,
  selector: '[data-falcon]',
  once: true,
  /* حاجز الدخول: لا تنطلق أي بطاقة قبل أن يدخل القسم الحاوي (menu) الشاشة فعلياً —
     يفصل أنيميشينات الأصناف عن التمرير داخل منطقة الصور */
  barrier: '.menu',
  start: { desktop: 'top 50%', mobile: 'top 45%' },
  duration: { desktop: 0.65, mobile: 0.55 },
  ease: 'power3.out',
  from: {
    desktop: { y: 40, scale: 0.96, rotation: -3, opacity: 0 },
    mobile:  { y: 24, scale: 0.97, rotation: -2, opacity: 0 }
  },
  to: { y: 0, scale: 1, rotation: 0, opacity: 1 },
  stagger: {
    desktop: function(i){ return (i % 4) * 0.08; },
    mobile: 0
  },
  desktopBreak: '(min-width: 601px)',
  mobileBreak:  '(max-width: 600px)'
};

const reduce = typeof window !== 'undefined' && window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function noop(){}

export function initFalcon(opts){
  /* دمج خيارات المستخدم فوق الافتراضيات (Object.assign عميقة للمسارات المهمة فقط) */
  const cfg = Object.assign({}, DEFAULTS, opts || {});
  cfg.from      = Object.assign({}, DEFAULTS.from,      (opts && opts.from)      || {});
  cfg.from.desktop = Object.assign({}, DEFAULTS.from.desktop, (opts && opts.from && opts.from.desktop) || {});
  cfg.from.mobile  = Object.assign({}, DEFAULTS.from.mobile,  (opts && opts.from && opts.from.mobile)  || {});
  cfg.to        = Object.assign({}, DEFAULTS.to,        (opts && opts.to)        || {});
  cfg.start     = Object.assign({}, DEFAULTS.start,     (opts && opts.start)     || {});
  cfg.duration  = Object.assign({}, DEFAULTS.duration,  (opts && opts.duration)  || {});
  cfg.stagger   = Object.assign({}, DEFAULTS.stagger,   (opts && opts.stagger)   || {});

  const api = { reset: noop, destroy: noop };
  const scope = cfg.scope || document;

  let cards;
  try{ cards = gsap.utils.toArray(cfg.selector, scope); }
  catch(e){ cards = []; }
  if(!cards.length) return api;

  function showAll(){
    cards.forEach(function(c){
      gsap.set(c, { clearProps: 'all' });
      c.classList.add('in');
    });
  }

  /* prefers-reduced-motion → إظهار فوري (بلا أي إخفاء مسبق عبر CSS/GSAP) */
  if(reduce){ showAll(); return api; }

  try{
    const mm = gsap.matchMedia();

    function bindCard(c, i, mode){
      const from = Object.assign({}, cfg.from[mode], { x: 0 });
      const drag = typeof cfg.stagger[mode] === 'function'
        ? cfg.stagger[mode](i)
        : (parseFloat(cfg.stagger[mode]) || 0);

      /* الإخفاء الوحيد يحدث هنا (gsap.set) وليس في CSS → visible-by-default */
      gsap.set(c, from);

      /* حاجز الدخول + موقع البطاقة: لا تنطلق قبل دخول القسم الحاوي (menu) الشاشة،
         وبعدها تُطلق عند وصولك الفعلي للبطاقة — مقاوم لقفز مواضع الأقسام على الجوال
         (تغيّر ارتفاع شريط المتصفح أثناء التمرير داخل منطقة الصور) */
      const vhFn = function(){ return window.innerHeight || (document.documentElement && document.documentElement.clientHeight); };
      const docTopFn = function(el){ return el.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0); };
      const fracParts = String(cfg.start[mode]).split(' ');
      const frac = (parseFloat(fracParts[fracParts.length - 1]) || 50) / 100;
      const sec = cfg.barrier
        ? (scope.querySelector(cfg.barrier) || (c.closest ? c.closest(cfg.barrier) : null))
        : null;
      const startPos = function(){
        const v = vhFn();
        let pos = Math.max(0, Math.round(docTopFn(c) - v * frac));
        if(sec){
          const barrier = Math.max(0, Math.round(docTopFn(sec) - v * 0.80));
          pos = Math.max(pos, barrier);
        }
        return pos;
      };
      const scroller = document.scrollingElement || document.documentElement;

      const tween = gsap.to(c, Object.assign({}, cfg.to, {
        x: 0,
        duration: cfg.duration[mode],
        ease: cfg.ease,
        delay: drag || 0,
        overwrite: 'auto',
        scrollTrigger: {
          trigger: scroller,
          start: startPos,
          once: cfg.once !== false
        },
        onStart: function(){
          /* تعطيل transition الخاصة بـ .item (sweets.css) أثناء الحركة:
             وإلا ستتصارع مع قيم GSAP اللحظية وتسبب jitter */
          c.style.transition = 'none';
          c.style.willChange = 'transform';
        },
        onComplete: function(){
          /* يجب مسح الـ transform/opacity حتى يعمل .item:hover الأصلي */
          gsap.set(c, { clearProps: 'transform,opacity' });
          c.style.transition = '';
          c.style.willChange = '';
          c.classList.add('in');
        }
      }));
      return tween;
    }

    mm.add(cfg.mobileBreak, function(){
      const tweens = cards.map(function(c, i){ return bindCard(c, i, 'mobile'); });
      return function(){ tweens.forEach(function(t){ if(t.scrollTrigger) t.scrollTrigger.kill(); }); };
    });
    mm.add(cfg.desktopBreak, function(){
      const tweens = cards.map(function(c, i){ return bindCard(c, i, 'desktop'); });
      return function(){ tweens.forEach(function(t){ if(t.scrollTrigger) t.scrollTrigger.kill(); }); };
    });

    api.reset = function(){ showAll(); mm.revert(); };
    api.destroy = function(){ mm.revert(); };
    return api;
  }catch(err){
    showAll();
    return api;
  }
}