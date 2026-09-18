import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger);

const doc = document;
const root = doc.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function revealAll(){
  doc.querySelectorAll('[data-reveal], .cat-card').forEach(function(el){
    el.classList.add('in');
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
  ScrollTrigger.batch(items, {
    start:'top 86%',
    once:true,
    onEnter(batch){
      gsap.to(batch, {
        opacity:1, x:0, y:0,
        duration:.9, stagger:.12,
        ease:'power3.out', overwrite:true
      });
      batch.forEach(function(el){ el.classList.add('in'); });
    }
  });
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
const scrubBase = 'imag 2/ezgif-frame-';
const scrubPad = function(n){ return String(n).padStart(3, '0'); };
const scrubSrc = function(i){ return scrubBase + scrubPad(i) + '.jpg'; };

function settleScrub(){
  const hero = doc.getElementById('sweetsHero');
  const img = hero && hero.querySelector('.scrub-frame');
  const count = doc.getElementById('scrubCount');
  if(!hero || !img || !reduce) return;
  hero.classList.add('scrub-static');
  img.src = scrubSrc(scrubFrames);
  if(count) count.textContent = scrubPad(scrubFrames);
}

function startScrub(){
  const hero = doc.getElementById('sweetsHero');
  if(!hero) return;
  const img = hero.querySelector('.scrub-frame');
  const bar = doc.getElementById('scrubBar');
  const count = doc.getElementById('scrubCount');
  const hint = doc.getElementById('scrubHint');
  if(!img) return;

  const preloaded = new Set();
  function preload(i){
    if(i < 1 || i > scrubFrames || preloaded.has(i)) return;
    preloaded.add(i);
    const im = new Image();
    im.src = scrubSrc(i);
  }

  let current = 1;
  let hinted = false;
  function show(i){
    if(i === current || i < 1 || i > scrubFrames) return;
    current = i;
    img.src = scrubSrc(i);
  }

  hero.style.height = 'calc(100svh + ' + ((scrubFrames - 1) * 2.15).toFixed(2) + 'vh)';

  for(let k = 1; k <= 3; k++) preload(k);

  gsap.fromTo(img, { scale:1.14 }, {
    scale:1.02,
    ease:'none',
    scrollTrigger:{
      trigger: hero,
      start:'top top',
      end:'bottom bottom',
      scrub:.35,
      onUpdate(self){
        const idx = 1 + Math.round(self.progress * (scrubFrames - 1));
        show(idx);
        for(let k = idx; k <= idx + 20; k++) preload(k);
        for(let k = idx - 1; k >= idx - 10 && k >= 1; k--) preload(k);
        if(bar) bar.style.transform = 'scaleY(' + self.progress + ')';
        if(count) count.textContent = scrubPad(idx);
        if(!hinted && self.progress > 0.03){
          hinted = true;
          if(hint) hint.classList.add('hidden');
        }
      }
    }
  });

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
      lenis.scrollTo(target, { offset:-72, duration:1.1 });
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
    revealAll();
    return;
  }

  try{
    root.classList.add('motion');
    bindLenis();
    startScrollProgress();
    startHero();
    startReveals();
    startComing();
    startScrub();
  }catch(err){
    root.classList.remove('motion');
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
