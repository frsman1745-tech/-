import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { initFalcon } from './falcon.js';

gsap.registerPlugin(ScrollTrigger);

const doc = document;
const root = doc.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function revealAll(){
  doc.querySelectorAll('[data-reveal], .cat-card').forEach(function(el){
    el.classList.add('in');
  });
  doc.querySelectorAll('.cat-card').forEach(function(el){
    el.style.opacity = '';
    el.style.transform = '';
  });
}

function refresh(){
  ScrollTrigger.refresh();
}

function startScrollProgress(){
  const bar = doc.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  doc.body.appendChild(bar);
  gsap.fromTo(bar, { scaleX:0 }, {
    scaleX:1,
    ease:'none',
    scrollTrigger:{
      trigger:doc.documentElement,
      start:'top top',
      end:'bottom bottom',
      scrub:0.35
    }
  });
}

function startHero(){
  const hero = doc.getElementById('home');
  if(!hero) return;

  const spans = gsap.utils.toArray('#home h1 .line > span');
  const kicker = hero.querySelector('.kicker');
  const lead = hero.querySelector('p.lead');
  const ctas = hero.querySelector('.hero-ctas');
  const stats = hero.querySelector('.hero-stats');
  const note = hero.querySelector('.hero-note');
  const visual = hero.querySelector('.hero-visual');

  gsap.set(spans, { yPercent:110, y:0 });
  gsap.set([kicker, lead, ctas, stats, note].filter(Boolean), { y:22 });
  if(visual) gsap.set(visual, { y:26 });

  const tl = gsap.timeline({ defaults:{ ease:'power3.out' } });
  if(kicker) tl.to(kicker, { opacity:1, y:0, duration:.7 });
  tl.to(spans, { yPercent:0, duration:1.05, stagger:.13 }, kicker ? '-=0.45' : 0);
  if(lead) tl.to(lead, { opacity:1, y:0, duration:.8 }, '-=0.65');
  if(ctas) tl.to(ctas, { opacity:1, y:0, duration:.8 }, '-=0.6');
  if(stats) tl.to(stats, { opacity:1, y:0, duration:.8 }, '-=0.45');
  if(note) tl.to(note, { opacity:1, y:0, duration:.8 }, '-=0.45');
  if(visual) tl.to(visual, { opacity:1, y:0, duration:1.1 }, '-=1.0');

  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', function(){
    if(visual){
      gsap.to(visual, {
        yPercent:-7,
        ease:'none',
        scrollTrigger:{ trigger:hero, start:'top top', end:'bottom top', scrub:true }
      });
    }
    const cardImg = hero.querySelector('.hero-card img');
    if(cardImg){
      gsap.fromTo(cardImg, { scale:1.06 }, {
        scale:1.16,
        ease:'none',
        scrollTrigger:{ trigger:hero, start:'top top', end:'bottom top', scrub:true }
      });
    }
  });
}

function startReveals(){
  const items = gsap.utils.toArray('[data-reveal]');
  if(!items.length) return;

  /* موضع بدء بموضع الشاشة المطلوب (frac من ارتفاع الشاشة) لكنه "مشبوك" بآخر بكسل
     قابل للتمرير: لو تجاوز start الحد الأقصى (عنصر أخير قرب قاع الصفحة على
     شاشة طويلة — start > maxScroll) فلن يشتغل once:true أبداً ويبقى مخفياً؛
     يشبك إلى آخر بكسل ليكشف العنصر حتماً عند أسفل الصفحة. */
  function clampStart(el, frac){
    return function(){
      const vh = window.innerHeight || doc.documentElement.clientHeight;
      const docTop = el.getBoundingClientRect().top + (window.scrollY || window.pageYOffset);
      const maxScroll = Math.max(0, doc.documentElement.scrollHeight - vh);
      return Math.round(Math.min(docTop - vh * frac, maxScroll - 2));
    };
  }

  function bindReveal(el, i, from, start, stagger){
    return gsap.fromTo(el, from, {
      x:0, y:0, opacity:1,
      duration:.85, ease:'power3.out', overwrite:'auto',
      delay:(i % 3) * stagger,
      scrollTrigger:{ trigger:el, start:start, once:true, invalidateOnRefresh:true },
      onComplete:function(){ el.classList.add('in'); }
    });
  }

  const mm = gsap.matchMedia();

  /* موبايل/تابلت: انزلاق يساري خفيف، موضع أضيق (top 75%) — لا rush-out */
  mm.add('(max-width: 768px)', function(){
    const tweens = items.map(function(el, i){ return bindReveal(el, i, { x:-36, y:0, opacity:0 }, clampStart(el, 0.75), 0); });
    return function(){ tweens.forEach(function(t){ if(t.scrollTrigger) t.scrollTrigger.kill(); }); };
  });

  /* ديسكتوب: نهوض من الأسفل، موضع أضيق (top 85%) + stagger خفيف للمتجاورين فقط */
  mm.add('(min-width: 769px)', function(){
    const tweens = items.map(function(el, i){ return bindReveal(el, i, { x:0, y:32, opacity:0 }, clampStart(el, 0.85), 0.05); });
    return function(){ tweens.forEach(function(t){ if(t.scrollTrigger) t.scrollTrigger.kill(); }); };
  });
}

/* ---------- Home: قائمة الشامية — ديسكتوب صف واحد ببطاقات تدخل من اليمين مع انجراف
   يساري خفيف؛ جوال/تابلت بانوراما أفقية مثبّتة: البطاقات كاملة الشاشة تنزاح يساراً
   مع التمرير العمودي (scrub)، والسكرول نفسه يُستهلك حتى تُعرض الأصناف كلها ثم تتحرر. ---------- */
let catsCleanup = null;
function startCats(){
  const sec = doc.getElementById('cats');
  if(!sec) return;
  const cards = gsap.utils.toArray(sec.querySelectorAll('.cat-card'));
  if(!cards.length) return;

  if(reduce){
    cards.forEach(function(c){ c.classList.add('in'); });
    return;
  }

  const grid = sec.querySelector('.cats-grid');

  /* ديسكتوب (≥1080): دخول من اليمين + انجراف يساري خفيف للشبكة ككل (~2%) scrubbed */
  const mmDesk = gsap.matchMedia();
  mmDesk.add('(min-width: 1080px)', function(){
    const tweens = cards.map(function(c, i){
      return gsap.fromTo(c, { x:92, opacity:0 }, {
        x:0, opacity:1,
        duration:.6, delay:(i % 6) * 0.06,
        ease:'power3.out', overwrite:'auto',
        scrollTrigger:{ trigger:c, start:'top 90%', once:true, invalidateOnRefresh:true },
        onComplete:function(){ c.classList.add('in'); }
      });
    });
    let drift = null;
    if(grid){
      drift = gsap.fromTo(grid, { x:0 }, {
        x:'-2%', ease:'none',
        scrollTrigger:{ trigger:sec, start:'top bottom', end:'bottom top', scrub:0.4, invalidateOnRefresh:true }
      });
    }
    return function(){
      tweens.forEach(function(t){ if(t.scrollTrigger) t.scrollTrigger.kill(); });
      if(drift && drift.scrollTrigger) drift.scrollTrigger.kill();
    };
  });

  /* جوال/تابلت (<1080): بانوراما مثبّتة — القسم يلتصق بأعلى الشاشة وكل تمرير
     ينقل البطاقات يساراً، ولا يُمرَّر القسم حتى تُستهلك كل الأصناف وتُعرض */
  const mmMob = gsap.matchMedia();
  mmMob.add('(max-width: 1079px)', function(){
    /* مسافة الحركة = عرض المسار الكامل ناقص الشاشة (تشمل فجوة 8px بين البطاقات) */
    const dist = function(){
      const w = grid.scrollWidth - (window.innerWidth || doc.documentElement.clientWidth);
      return Math.max(100, w);
    };
    const tween = gsap.to(grid, {
      x: function(){ return -dist(); },
      ease:'none',
      scrollTrigger:{
        trigger:sec, start:'top top',
        end:function(){ return '+=' + dist(); },
        pin:true, scrub:0.6, anticipatePin:1, invalidateOnRefresh:true
      }
    });
    return function(){
      if(tween.scrollTrigger) tween.scrollTrigger.kill();
      tween.kill();
      ScrollTrigger.refresh();
    };
  });

  catsCleanup = function(){
    mmDesk.revert();
    mmMob.revert();
  };
}

function startComing(){
  const inner = doc.querySelector('.page-coming .inner');
  if(!inner) return;
  const kids = Array.prototype.slice.call(inner.children);
  if(!kids.length) return;
  gsap.from(kids, {
    y:26, opacity:0,
    duration:.85, stagger:.09,
    ease:'power3.out', delay:.08
  });
}

/* ---------- Sweets: scroll-scrub "video" from image frames ---------- */
const scrubFrames = 169;
const scrubBase = 'imag 2/opt/ezgif-frame-';
const scrubExt = '.webp';
const scrubPad = function(n){ return String(n).padStart(3, '0'); };
const scrubSrc = function(i){ return scrubBase + scrubPad(i) + scrubExt; };

/* تقرير تقدم التحميل — يغذّي شاشة البداية (preloader) إن وُجدت */
const preloadProgress = {
  loaded: 0,
  total: 0
};
function preloadReport(loaded, total){
  if(window.__preloadTick) window.__preloadTick(loaded, total);
}

const eager = 30;

function settleScrub(){
  const hero = doc.getElementById('sweetsHero');
  const img = hero && hero.querySelector('.scrub-frame');
  const count = doc.getElementById('scrubCount');
  if(!hero || !img || !reduce) return;
  hero.classList.add('scrub-static');
  img.src = scrubSrc(scrubFrames);
  if(count) count.textContent = scrubPad(scrubFrames);
  if(window.__preloadDone) window.__preloadDone();
}

function startScrub(){
  const hero = doc.getElementById('sweetsHero');
  if(!hero) return;
  const img = hero.querySelector('.scrub-frame');
  const bar = doc.getElementById('scrubBar');
  const count = doc.getElementById('scrubCount');
  const hint = doc.getElementById('scrubHint');
  if(!img) return;

  /* ---------- لوحة رسم (canvas): الرسم خاطف بلا إعادة معالجة للـ src ----------
     تبديل img.src لكل فريم يجبر المتصفح على فك/طلي في الخيط الرئيسي حتى لو كان
     الفريم مقروءاً مسبقاً → تقطّع عند التمرير السريع. الرسم من كائن Image مفكوك
     عبر drawImage = بلِت GPU فوري بلا أي انتظار فك ترميز. */
  const cv = doc.createElement('canvas');
  cv.className = 'scrub-canvas';
  const ctx = cv.getContext('2d');

  /* ---------- تحميل مُدار بقدرة محدودة (لا نغرق المتصفح) ---------- */
  const pool = {};       /* i -> HTMLImageElement جاهز للعرض */
  const inflight = {};   /* i -> promise التحميل */
  const MAX_RUN = 6;     /* حد التزامن — المتصفح يسمح ~6 طلبات لكل مضيف */

  /* حالة العرض المصغَّرة: نُسجّل "الفريم المطلوب" فقط، ويتم الرسم في دورة rAF واحدة */
  let cvW = 0, cvH = 0, cvDPR = 1;
  let current = 1;       /* آخر فريم ظهر فعلياً (لوحة أو صورة) */
  let pending = 1;       /* الفريم المطلوب عرضه */
  let drawn = false;     /* هل رُسم فريم على اللوحة بعد؟ */
  let lastProgress = 0;
  let rafId = 0;
  let hinted = false;

  function paintFrame(i){
    const im = pool[i];
    if(!im) return false;
    const iw = im.naturalWidth || cvW;
    const ih = im.naturalHeight || cvH;
    let dw, dh;
    if(iw / ih > cvW / cvH){ dh = cvH; dw = cvH * iw / ih; }   /* cover مثل object-fit */
    else { dw = cvW; dh = cvW * ih / iw; }
    ctx.drawImage(im, (cvW - dw) / 2, (cvH - dh) / 2, dw, dh);
    drawn = true;
    current = i;
    if(img.style.visibility !== 'hidden') img.style.visibility = 'hidden';
    return true;
  }

  const wrap = hero.querySelector('.scrub-stage') || hero;
  function sizeCanvas(){
    const r = wrap.getBoundingClientRect();
    cvDPR = Math.min(window.devicePixelRatio || 1, 2);
    cvW = Math.max(1, Math.round(r.width));
    cvH = Math.max(1, Math.round(r.height));
    cv.width = Math.round(cvW * cvDPR);
    cv.height = Math.round(cvH * cvDPR);
    ctx.setTransform(cvDPR, 0, 0, cvDPR, 0, 0);
    /* إعادة القياس تُفرّغ اللوحة → نعيد رسم الفريم الحالي إن وُجد */
    if(drawn && pool[current]) paintFrame(current);
  }

  sizeCanvas();
  img.parentNode.insertBefore(cv, img);
  if(!reduce) img.style.visibility = 'hidden';   /* نعرض عبر canvas لا عبر img */
  window.addEventListener('resize', sizeCanvas);
  doc.fonts && doc.fonts.ready && doc.fonts.ready.then(sizeCanvas);

  function load(i){
    if(i < 1 || i > scrubFrames) return Promise.resolve(null);
    if(pool[i]) return Promise.resolve(pool[i]);      /* فريم مقروء جاهز */
    if(inflight[i]) return inflight[i];
    inflight[i] = new Promise(function(resolve){
      const im = new Image();
      im.decoding = 'async';
      im.onload = function(){
        pool[i] = im;
        preloadProgress.loaded++;
        preloadReport(preloadProgress.loaded, Math.max(scrubFrames, preloadProgress.total));
        delete inflight[i];
        resolve(im);
        /* لو هذا هو الفريم المطلوب حالياً نرسمه فوراً بلا انتظار دورة تمرير */
        if(i === pending && !drawn) paintFrame(i);
        else if(i === pending && i !== current) paintFrame(i);
      };
      im.onerror = function(){
        delete inflight[i];
        resolve(null);
      };
      im.src = scrubSrc(i);
    });
    return inflight[i];
  }

  /* تحميل الباقي (31 → 169) تدريجياً بقدرة محدودة حتى آخر فريم */
  let cursor = eager + 1;
  let running = 0;
  function pump(){
    while(running < MAX_RUN && cursor <= scrubFrames){
      const i = cursor++;
      running++;
      load(i).then(function(){
        running--;
        pump();
      });
    }
  }

  /* نافذة أمامية صغيرة: نضمن الفريمات القادمة جاهزة عند التمرير السريع */
  function aheadFrom(idx){
    for(let k = idx; k <= idx + 8; k++){
      if(k >= 1 && k <= scrubFrames && !pool[k] && !inflight[k]){
        load(k);
      }
    }
    /* نظرة خلفية قصيرة لاستيعاب التمرير السريع عكس الاتجاه */
    for(let k = idx - 1; k >= idx - 10 && k >= 1; k--){
      if(!pool[k] && !inflight[k]) load(k);
    }
  }

  /* دورة رسم واحدة لكل إطار شاشة: تقرأ أحدث pending وتحدّث الشريط/العدّاد معاً */
  function scheduleDraw(){
    if(rafId) return;                 /* دورة قائمة بالفعل → سترسم أحدث pending */
    rafId = requestAnimationFrame(function(){
      rafId = 0;
      const i = pending;
      if(i !== current){
        if(!paintFrame(i)){
          /* الفريم غير مقروء بعد: نعرضه مؤقتاً عبر الصورة حتى ترسمه اللوحة */
          current = i;
          img.src = scrubSrc(i);
          if(img.style.visibility !== 'visible') img.style.visibility = 'visible';
        }
      }
      if(bar) bar.style.transform = 'scaleY(' + lastProgress + ')';
      if(count) count.textContent = scrubPad(i);
      if(!hinted && lastProgress > 0.03){
        hinted = true;
        if(hint) hint.classList.add('hidden');
      }
    });
  }

  hero.style.height = 'calc(100svh + ' + ((scrubFrames - 1) * 2.15).toFixed(2) + 'vh)';

  /* تحميل أول 30 فريم على الفور (لتغذية البريلودر + بداية انسيابية) */
  preloadReport(0, eager);
  let eLoaded = 0;
  for(let k = 1; k <= eager; k++){
    load(k).then(function(){
      eLoaded++;
      preloadReport(eLoaded, eager);
    });
  }
  pump();

  gsap.fromTo(cv, { scale: 1.14 }, {
    scale: 1.02,
    ease: 'none',
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.35,
      onUpdate(self){
        /* هنا لا نلمس DOM إطلاقاً — فقط نسجّل الحالة المطلوبة ونُجدول الرسم */
        lastProgress = self.progress;
        pending = 1 + Math.round(self.progress * (scrubFrames - 1));
        aheadFrom(pending);
        scheduleDraw();
      }
    }
  });

  if(!reduce){
    /* انتهاء الشاشة الأولى = نضج التحميل المسبق */
    const markDone = function(){
      if(window.__preloadDone && !preloadProgress.done){
        preloadProgress.done = true;
        window.__preloadDone();
      }
    };
    Promise.all(Array.from({ length: eager }, function(_, k){ return load(k + 1); })).then(markDone);
    window.addEventListener('load', markDone);
  }

  const copy = hero.querySelector('.scrub-copy');
  const chip = hero.querySelector('.scrub-chip');
  const meta = hero.querySelector('.scrub-meta');

  const tl = gsap.timeline({
    defaults:{ ease:'none' },
    scrollTrigger:{ trigger:hero, start:'top top', end:'bottom bottom', scrub:true }
  });
  if(chip) tl.fromTo(chip, { y:30, opacity:0 }, { y:0, opacity:1 }, 0.04);
  if(meta) tl.fromTo(meta, { opacity:0 }, { opacity:1 }, 0.04);
  if(copy) tl.to(copy, { y:-70, opacity:.25 }, 0.82);
}

/* ---------- Header theme (light/dark sections) ---------- */
function startHeaderTheme(){
  const header = doc.getElementById('siteHeader');
  const targets = doc.querySelectorAll('[data-light]');
  if(!header || !targets.length) return;
  const obs = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(en.isIntersecting) header.classList.add('light');
      else header.classList.remove('light');
    });
  }, { rootMargin:'-45% 0px -50% 0px' });
  targets.forEach(function(t){ obs.observe(t); });
}

function bindLenis(){
  const lenis = new Lenis({ lerp:0.1, wheelMultiplier:1, smoothWheel:true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function(time){ lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);
  window.__lenis = lenis;

  doc.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      const href = a.getAttribute('href');
      if(!href || href.length < 2) return;
      const target = doc.querySelector(href);
      if(!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { duration:1.1 });
    });
  });

  const modal = doc.getElementById('orderModal');
  if(modal){
    const sync = function(){
      if(modal.classList.contains('open')) lenis.stop();
      else lenis.start();
    };
    new MutationObserver(sync).observe(modal, { attributes:true, attributeFilter:['class'] });
  }
}

function init(){
  settleScrub();
  startHeaderTheme();
  if(reduce){
    startCats();
    initFalcon();
    revealAll();
    return;
  }

  let falcon = null;
  try{
    root.classList.add('motion');
    startCats();
    bindLenis();
    startScrollProgress();
    startHero();
    startReveals();
    falcon = initFalcon();
    startComing();
    startScrub();
  }catch(err){
    root.classList.remove('motion');
    if(falcon) falcon.reset();
    if(catsCleanup) catsCleanup();
    revealAll();
    return;
  }

  window.addEventListener('shamieh:lang', refresh);
  if(doc.fonts && doc.fonts.ready) doc.fonts.ready.then(refresh).catch(function(){});
  window.addEventListener('load', refresh);
  refresh();
}

if(doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
else init();
