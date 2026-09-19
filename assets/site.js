(function(){
  "use strict";
  var doc = document;

  /* إعادة تحديث الصفحة → نبدأ دوماً من أعلاها (لا استرجاع موضع التمرير) */
  if('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  if(doc.documentElement) doc.documentElement.scrollTop = 0;
  if(doc.body) doc.body.scrollTop = 0;

  var header = doc.getElementById('siteHeader');
  var lastY = window.scrollY;
  window.addEventListener('scroll', function(){
    var y = window.scrollY;
    if(y > 160 && y > lastY){ if(header) header.classList.add('hidden'); }
    else { if(header) header.classList.remove('hidden'); }
    lastY = y;
  }, {passive:true});

  var burger = doc.getElementById('burger');
  var nav = doc.getElementById('siteNav');
  function closeNav(){
    if(!nav || !burger) return;
    nav.classList.remove('open');
    burger.classList.remove('x');
    burger.setAttribute('aria-expanded','false');
  }
  if(burger && nav){
    burger.addEventListener('click', function(){
      var open = nav.classList.toggle('open');
      burger.classList.toggle('x', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', closeNav); });
  }
  doc.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeNav(); });

  var toTop = doc.getElementById('toTop');
  if(toTop){
    toTop.addEventListener('click', function(){
      if(window.__lenis) window.__lenis.scrollTo(0);
      else window.scrollTo({ top:0, behavior:'smooth' });
    });
  }

  var y = doc.getElementById('year');
  if(y) y.textContent = new Date().getFullYear();

  /* ==================== شاشة التحميل ==================== */
  var boot = doc.getElementById('boot');
  if(boot){
    var bootPct = doc.getElementById('bootPct');
    var bootBar = doc.getElementById('bootBar');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var minShow = reduce ? 150 : 900;   /* أقل مدة ظاهرة قبل الاختفاء */
    var maxShow = 5000;                 /* سقف أمان */
    var bootStart = Date.now();
    var shown = 0;
    var realDone = false;
    var t1 = null, t2 = null, t3 = null;

    function paint(p){
      shown = Math.max(shown, Math.min(100, Math.round(p)));
      if(bootPct) bootPct.textContent = shown;
      if(bootBar) bootBar.style.width = shown + '%';
    }
    function fade(){
      boot.classList.add('done');
      setTimeout(function(){ boot.remove(); doc.body.classList.remove('no-scroll'); }, reduce ? 0 : 900);
    }
    function settle(){
      var wait = Math.max(0, minShow - (Date.now() - bootStart));
      var done = function(){ if(!realDone) realDone = true; };
      clearTimeout(t2);
      t2 = setTimeout(function(){
        fade();
        if(window.__preloadDone) window.__preloadDone();
      }, wait);
    }

    /* تقدم وهمي لطيف يصل لـ ٦٦٪ ثم ينتظر الحقيقي */
    function anim(){
      var p = shown;
      if(p < 34) paint(p + 2);
      else if(p < 60) paint(p + 1);
      else settle();               /* ننتظر الـ load أو الخطافات */
      if(shown < 60 && !realDone) t1 = setTimeout(anim, reduce ? 200 : 240);
    }

    /* نُثبّت الخطافات دائمًا (motion.js يأتي لاحقاً على كل الصفحات)، حتى يغذّي
       تقدم تحميل فريمات السكرول شاشة الإقلاع فعلاً بدل الانتظار الافتراضي فقط */
    var prevTick = window.__preloadTick;
    window.__preloadTick = function(loaded, total){
      if(prevTick) prevTick(loaded, total);
      var p = Math.round((loaded / Math.max(total || 1, 1)) * 100);
      paint(p >= 10 ? 30 + p * 0.55 : p);   /* تحويل إلى مقياس ٣٠→٨٥ */
      if(loaded >= total) realDone = true;
    };

    /* window load + الخطاف النهائي من motion.js ينهيان */
    window.addEventListener('load', function(){
      paint(88);
      setTimeout(settle, reduce ? 0 : 250);
    });
    var prevDone = window.__preloadDone;
    window.__preloadDone = function(){
      if(prevDone) prevDone();
      realDone = true;
      paint(100);
      setTimeout(settle, 120);
    };
    setTimeout(function(){ fade(); }, maxShow); /* طوارئ: لا شيء يعلق للأبد */

    doc.body.classList.add('no-scroll');
    paint(3);
    t1 = setTimeout(anim, 120);
  }
})();
