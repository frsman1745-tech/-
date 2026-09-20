import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   Product page — يعرض صنفاً من قائمة الحلو (sweets.html) في صفحة
   معرض بصور قابلة للتكبير. يقرأ المعرّف من الرابط: product.html?item=01
   ------------------------------------------------------------
   عدّل الأسماء والنصوص قرب سجل ITEMS أدناه حسب الحاجة.
   الصور المعروضة حالياً مؤقتة (من شبكة أصناف الشامية) — استبدلها
   بصور الصنف الحقيقية داخل مصفوفة imgs لكل صنف.
   ============================================================ */

const ITEMS = {
  1: {
    ar: { name: 'بقلاوة بالفستق الحلبي', text: 'عجينة رقيقة محشوّة بالفستق الحلبي، معمّرة القطر لنتيجة هشّة لا تُقاوم.', tag: 'فستق حلبي' },
    en: { name: 'Pistachio Baklava', text: 'Thin sheets of pastry filled with Aleppo pistachio, steeped in syrup for an irresistible crunch.', tag: 'Aleppo Pistachio' },
    imgs: [1, 2, 5, 3]
  },
  2: {
    ar: { name: 'كنافة بالقشطة', text: 'خيوط كنافة ذهبية تتدفّق عليها قشطة طازجة وتُقطّر على السخونة بماء الورد.', tag: 'قشطة طازجة' },
    en: { name: 'Cream Knafeh', text: 'Golden strands of shredded pastry topped with fresh cream and drizzled hot with rose water.', tag: 'Fresh Cream' },
    imgs: [2, 7, 1, 8]
  },
  3: {
    ar: { name: 'حلويات مشكّلة', text: 'تشكيلة تجمع أرقى أصناف الشامية في صينية واحدة — مثالية لضمون وصالونات العيد.', tag: 'تشكيلة الشامية' },
    en: { name: 'Assorted Sweets', text: 'A selection of Shamieh\'s finest in a single tray — perfect for occasions and Eid gatherings.', tag: 'Shamieh Selection' },
    imgs: [3, 5, 1, 6]
  },
  4: {
    ar: { name: 'بقلاوة بالجوز', text: 'حشوة جوز فاخرة مع لمسة قرفة، مغموسة بقطر ذهبي ليسوّق الطعم الكلاسيكي.', tag: 'جوز · قطر طبيعي' },
    en: { name: 'Walnut Baklava', text: 'A rich walnut filling with a hint of cinnamon, dipped in golden syrup for a classic finish.', tag: 'Walnut · Natural Syrup' },
    imgs: [4, 1, 3, 7]
  },
  5: {
    ar: { name: 'صينية السهرة', text: 'صينية ملكية تجمع تشكيلة الحلو طرّاً — رفيقة مجالسكم وضيافتكم الكبيرة.', tag: 'للمناسبات' },
    en: { name: 'Evening Tray', text: 'A royal tray bringing together the full assortment — the perfect companion for your gatherings.', tag: 'For Occasions' },
    imgs: [5, 3, 8, 1]
  },
  6: {
    ar: { name: 'معمول وغريبة', text: 'معمول محشو بالتمر والفستق مع غريبة تذوب في الفم — رفيقة القهوة في كل جلسة.', tag: 'رفيقة القهوة' },
    en: { name: 'Maamoul & Ghuraiba', text: 'Date and pistachio maamoul with shortbread that melts in your mouth — the companion of Arabic coffee.', tag: 'Coffee Companion' },
    imgs: [6, 8, 2, 4]
  },
  7: {
    ar: { name: 'قطايف بالقشطة', text: 'قطايف مقلية ذهبية تُحشى بالقشطة الطازجة وتُقطّر بالعسل — حكاية رمضانية كاملة.', tag: 'طازجة يومياً' },
    en: { name: 'Cream Qatayef', text: 'Golden fried qatayef filled with fresh cream and drizzled with honey — a full Ramadan story.', tag: 'Made Fresh Daily' },
    imgs: [7, 2, 6, 3]
  },
  8: {
    ar: { name: 'مربعات العسل', text: 'مربعات معجّنة هشّة مغطاة بالعسل الطبيعي ورشّة فستق — لمسة حلو ختامية مثالية.', tag: 'عسل · فستق' },
    en: { name: 'Honey Squares', text: 'Crisp pastry squares coated in natural honey with a sprinkle of pistachio — the perfect sweet finish.', tag: 'Honey · Pistachio' },
    imgs: [8, 6, 5, 4]
  }
};

const doc = document;
const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad = function(n){ return String(n).padStart(2, '0'); };
const src = function(n){ return 'imeg/opt/item-' + pad(n) + '.webp'; };

function currentLang(){
  return doc.documentElement.getAttribute('lang') === 'en' ? 'en' : 'ar';
}

function arabicNum(n){
  return ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'][n] || String(n);
}

/* ---------- حقن البيانات من سجل الأصناف ---------- */
let item = null;
function loadItem(){
  const match = (location.search.match(/[?&]item=(\d+)/) || [])[1];
  const key = (match && ITEMS[Number(match)]) ? Number(match) : 1;
  item = ITEMS[key];

  const lang = currentLang();
  const d = item[lang];

  const bg = doc.getElementById('prBg');
  if(bg) bg.src = src(item.imgs[0]);
  const title = doc.getElementById('prTitle');
  if(title) title.textContent = d.name;
  doc.title = (lang === 'en' ? d.name + ' | Al Shamieh' : d.name + ' | الشامية — Al Shamieh');
  const lead = doc.getElementById('prLead');
  if(lead) lead.textContent = d.text;
  const tag = doc.getElementById('prTag');
  if(tag) tag.querySelector('span').textContent = d.tag;

  /* أزرار المزيد والأصناف الأخرى تمتد على رمز الصنف */
  const figs = doc.querySelectorAll('.g-img');
  const nums = ['٠','١','٢','٣','٤'];
  figs.forEach(function(f, i){
    const num = item.imgs[i] || (i + 1);
    const img = f.querySelector('img');
    if(img){
      img.src = src(num);
      img.alt = d.name + ' — ' + (lang === 'en' ? 'shot ' + (i + 1) : 'لقطة ' + nums[i + 1]);
    }
    const cap = f.querySelector('figcaption');
    if(cap){
      cap.querySelector('b').textContent = d.name;
      cap.querySelector('small').textContent = lang === 'en'
        ? 'Gallery shot ' + (i + 1)
        : 'من معرض الشامية — ' + nums[i + 1];
    }
  });

  const shot = doc.getElementById('prShot');
  if(shot) shot.textContent = '4';

  buildThumbs();
}

/* ---------- دخول الهيرو (بعد شاشة التحميل) ---------- */
function animateHero(){
  const hero = doc.getElementById('prHero');
  if(!hero) return;
  const content = hero.querySelector('.pr-content');
  const kids = content ? Array.prototype.slice.call(content.children) : [];
  const bgImg = hero.querySelector('.pr-bg img');

  if(reduce){
    if(bgImg) gsap.set(bgImg, { scale: 1.02 });
    return;
  }

  gsap.set(content, { autoAlpha: 0, y: 24 });
  if(bgImg) gsap.fromTo(bgImg, { scale: 1.18 }, { scale: 1.04, duration: 2.2, ease: 'power2.out' });

  const boot = doc.getElementById('boot');
  const run = function(){
    gsap.to(content, {
      autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out',
      onStart: function(){
        if(kids.length){
          gsap.fromTo(kids, { autoAlpha: 0, y: 26 }, {
            autoAlpha: 1, y: 0, duration: .9, stagger: .12, ease: 'power3.out', delay: .15
          });
        }
      }
    });
    if(bgImg && !reduce){
      gsap.to(bgImg, {
        scale: 1.1,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
      });
    }
  };
  if(!boot || boot.classList.contains('done') || boot.hasAttribute('done')){ run(); return; }
  const t = setInterval(function(){
    if(!doc.getElementById('boot') || boot.classList.contains('done')){
      clearInterval(t);
      run();
    }
  }, 90);
}

/* ---------- السهم: تمرير سلس إلى المعرض ---------- */
function bindScroll(){
  const scroll = doc.getElementById('prScroll');
  if(!scroll) return;
  scroll.addEventListener('click', function(){
    const lenis = window.__lenis;
    if(lenis) lenis.scrollTo('#gallery', { duration: 1.2 });
    else doc.getElementById('gallery').scrollIntoView({ behavior: 'smooth' });
  });
}

/* ---------- Lightbox ---------- */
const lb = doc.getElementById('lightbox');
const lbImg = doc.getElementById('lbImg');
const lbCap = doc.getElementById('lbCap');
const lbSub = doc.getElementById('lbSub');
const lbCur = doc.getElementById('lbCur');
const lbTot = doc.getElementById('lbTot');
const lbThumbs = doc.getElementById('lbThumbs');
let openIndex = null;

function cm(){
  return currentLang() === 'en' ? 'Gallery shot ' : 'من معرض الشامية — ';
}

function numberLabel(i){
  return currentLang() === 'en' ? String(i + 1) : arabicNum(i + 1);
}

function buildThumbs(){
  if(!lb || !item || !lbThumbs) return;
  lbThumbs.innerHTML = '';
  item.imgs.forEach(function(num, i){
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.setAttribute('role', 'listitem');
    btn.setAttribute('aria-label', (currentLang() === 'en' ? 'Shot ' : 'لقطة ') + (i + 1));
    const im = doc.createElement('img');
    im.src = src(num);
    im.alt = '';
    im.loading = 'lazy';
    btn.appendChild(im);
    btn.addEventListener('click', function(){ goTo(i); });
    lbThumbs.appendChild(btn);
  });
}

function setActiveThumb(){
  if(!lbThumbs) return;
  Array.prototype.forEach.call(lbThumbs.children, function(btn, i){
    btn.classList.toggle('on', i === openIndex);
  });
}

function swapImage(i, animate){
  if(!item || !lbImg) return;
  openIndex = i;
  const lang = currentLang();
  lbImg.src = src(item.imgs[i]);
  if(lbCap) lbCap.textContent = item[lang].name;
  if(lbSub) lbSub.textContent = cm() + numberLabel(i);
  if(lbCur) lbCur.textContent = String(i + 1);
  if(lbTot) lbTot.textContent = String(item.imgs.length);
  setActiveThumb();
  if(animate !== false){
    gsap.fromTo(lbImg, { autoAlpha: 0, scale: .9, y: 16 }, {
      autoAlpha: 1, scale: 1, y: 0, duration: .55, ease: 'power3.out', overwrite: 'auto'
    });
  } else {
    gsap.set(lbImg, { autoAlpha: 1, scale: 1, y: 0 });
  }
}

function openLightbox(i){
  if(!lb) return;
  openIndex = i;
  swapImage(i, false);
  lb.classList.add('open');
  lb.setAttribute('aria-hidden', 'false');
  if(window.__scrollLock) window.__scrollLock(true);
  const lenis = window.__lenis;
  if(lenis) lenis.stop();
  if(!reduce) gsap.fromTo(lb, { autoAlpha: 0 }, { autoAlpha: 1, duration: .35, ease: 'power2.out', overwrite: 'auto' });
  const closeBtn = lb.querySelector('.lb-close');
  if(closeBtn) closeBtn.focus();
}

function closeLightbox(){
  if(!lb) return;
  const finish = function(){
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    openIndex = null;
    if(window.__scrollLock) window.__scrollLock(false);
    const lenis = window.__lenis;
    if(lenis) lenis.start();
  };
  if(reduce){ finish(); return; }
  gsap.to(lb, {
    autoAlpha: 0, duration: .3, ease: 'power2.in',
    onComplete: finish, overwrite: 'auto'
  });
}

function goTo(i){
  if(!item) return;
  const n = item.imgs.length;
  const idx = ((i % n) + n) % n;
  if(idx === openIndex) return;
  swapImage(idx, true);
}

function bindLightbox(){
  if(!lb) return;

  const grid = doc.getElementById('galleryGrid');
  if(grid){
    grid.addEventListener('click', function(e){
      const fig = e.target.closest('.g-img');
      if(!fig) return;
      const i = Array.prototype.indexOf.call(grid.children, fig);
      if(i > -1) openLightbox(i);
    });
  }

  lb.addEventListener('click', function(e){
    const a = e.target.closest('[data-lb]');
    if(!a) return;
    const act = a.getAttribute('data-lb');
    if(act === 'close') closeLightbox();
    else if(act === 'prev') goTo(openIndex - 1);
    else if(act === 'next') goTo(openIndex + 1);
  });

  lbImg.addEventListener('click', closeLightbox);
  lb.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){ closeLightbox(); return; }
    const rtl = doc.documentElement.getAttribute('dir') === 'rtl';
    const prevKey = (rtl ? 'ArrowRight' : 'ArrowLeft');
    const nextKey = (rtl ? 'ArrowLeft' : 'ArrowRight');
    if(e.key === prevKey) goTo(openIndex - 1);
    else if(e.key === nextKey) goTo(openIndex + 1);
  });

  doc.addEventListener('keydown', function(e){
    if(!lb.classList.contains('open')) return;
    if(e.key === 'Escape') closeLightbox();
  });
  if(doc.body && typeof doc.body.classList !== 'undefined'){
    /* لا حاجة إضافية: no-scroll مدبّر في open/close */
  }
}

/* ---------- إعادة الرسم عند تبديل اللغة ---------- */
window.addEventListener('shamieh:lang', function(){
  loadItem();
  if(openIndex !== null && lbImg && item){
    lbImg.src = src(item.imgs[openIndex]);
    if(lbCap) lbCap.textContent = item[currentLang()].name;
    if(lbSub) lbSub.textContent = cm() + numberLabel(openIndex);
  }
});

function init(){
  loadItem();
  animateHero();
  bindScroll();
  bindLightbox();
}

if(doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
else init();