(function(){
  "use strict";
  var doc = document;

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
})();