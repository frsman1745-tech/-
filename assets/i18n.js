(function(){
  "use strict";
  var doc = document;

  var i18n = {
    titles:{
      home:{ar:'الشامية | Al Shamieh — طعم دمشق الحلو', en:'Al Shamieh | The Sweet Taste of Damascus'},
      sweets:{ar:'الحلو | الشامية — Al Shamieh', en:'Sweets | Al Shamieh'},
      dry:{ar:'النواشف | الشامية — Al Shamieh', en:'Dried Pastries | Al Shamieh'},
      mansaf:{ar:'المناسف | الشامية — Al Shamieh', en:'Banquet Trays | Al Shamieh'},
      mahashi:{ar:'المحاشي | الشامية — Al Shamieh', en:'Stuffed Dishes | Al Shamieh'}
    },
    navAria:{ar:'التنقل الرئيسي', en:'Main navigation'},
    navHome:{ar:'الرئيسية', en:'Home'},
    navSweets:{ar:'الحلو', en:'Sweets'},
    navDry:{ar:'النواشف', en:'Dried'},
    navMansaf:{ar:'المناسف', en:'Trays'},
    navMahashi:{ar:'المحاشي', en:'Stuffed'},
    navContact:{ar:'تواصل', en:'Contact'},
    orderNow:{ar:'اطلب الآن', en:'Order Now'},

    heroKicker:{ar:'الطعم الأصيل لدمشق', en:'The authentic taste of Damascus'},
    heroTitle:{
      ar:'<span class="line"><span>حلويات <span class="gold">الشامية</span></span></span><span class="line"><span>نكهة دمشق</span></span><span class="line line-sm"><span>الأصيلة <span class="gold-2">على مائدتكم</span></span></span>',
      en:'<span class="line"><span>Al <span class="gold">Shamieh</span></span></span><span class="line"><span>Authentic taste</span></span><span class="line line-sm"><span>of <span class="gold-2">Damascus</span></span></span>'
    },
    heroLead:{
      ar:'حلويات شرقية أصيلة، مناسف ومحاشٍ تُحضَّر يومياً بفستق حلبي طبيعي — بروح ضيافة دمشق.',
      en:'Authentic Levantine sweets, banquet trays and stuffed dishes — made fresh daily with natural Aleppo pistachio, in true Damascene hospitality.'
    },
    heroCta1:{ar:'تصفح الأقسام', en:'Browse Categories'},
    heroCta2:{ar:'اطلب الآن', en:'Order Now'},
    heroNote:{ar:'محبوبة من آلاف العائلات في دمشق وخارجها', en:'Loved by thousands of families in Damascus and beyond'},
    heroTag:{ar:'فستق حلبي · قطر طبيعي', en:'Aleppo pistachio · natural syrup'},
    heroFloatB:{ar:'بقلاوة الشامية', en:'Shamieh Baklava'},
    heroFloatS:{ar:'مقرمشة ومغموسة بالقطر<br>تُحضَّر طازجة كل يوم', en:'Crisp and syrup-soaked<br>made fresh every day'},
    heroStatsAria:{ar:'أرقام الشامية', en:'Al Shamieh in numbers'},
    heroStats1:{ar:'سنة حرفية', en:'years of craft'},
    heroStats2:{ar:'صنفاً يومياً', en:'items prepared daily'},
    heroStats3:{ar:'فستق حلبي', en:'Aleppo pistachio'},
    heroRing:{ar:'دِمَشق', en:'DAMASCUS'},
    heroSealAlt:{ar:'صينية بقلاوة مشكلة بالفستق الحلبي من الشامية', en:'Assorted pistachio baklava tray by Al Shamieh'},
    marqueeAria:{ar:'أصناف الشامية', en:'Al Shamieh products'},
    catsEyebrow:{ar:'قائمة الشامية', en:'Our Menu'},
    catsTitle:{ar:'ستة أقسام… ومذاق لا يُنسى', en:'Six categories, one unforgettable taste'},
    catsLead:{
      ar:'اخترنا لكم خلاصة المطبخ الدمشقي في ستة أقسام: حلو طري، نواشف مقرمشة، غريبة ذائبة، مثلجات منعشة، مناسف سخية، ومحاشٍ على الطريقة المنزلية. تفضّلوا، فلكل ذوقٍ نصيب.',
      en:'We gathered the best of the Damascene kitchen into six categories: soft sweets, crisp dried pastries, buttery ghuraiba, refreshing ice cream, generous trays, and home-style stuffed dishes. There is something for every taste.'
    },
    cardSweetTag:{ar:'Sweet', en:'Sweet'},
    cardSweetTitle:{ar:'الحلو', en:'Sweets'},
    cardSweetText:{ar:'بقلاوة بالفستق الحلبي، كنافة، وحلويات مشكّلة — أجمل ما تُقدّمه دمشق.', en:'Pistachio baklava, knafeh and assorted sweets — the finest Damascus has to offer.'},
    cardDryTag:{ar:'Dry', en:'Dry'},
    cardDryTitle:{ar:'النواشف', en:'Dried Pastries'},
    cardDryText:{ar:'غريبة، معمول بالتمر، وبيتي فور — رفيقة القهوة في كل جلسة.', en:'Shortbread, date maamoul and petit fours — the perfect match for every coffee.'},
    cardMansafTag:{ar:'Trays', en:'Trays'},
    cardMansafTitle:{ar:'المناسف', en:'Banquet Trays'},
    cardMansafText:{ar:'صواني كبيرة من الرز باللحم أو الدجاج — ضيافة سخية تكفي كل الحضور.', en:'Large trays of rice with lamb or chicken — generous hospitality for every gathering.'},
    cardMahashiTag:{ar:'Stuffed', en:'Stuffed'},
    cardMahashiTitle:{ar:'المحاشي', en:'Stuffed Dishes'},
    cardMahashiText:{ar:'كوسا، ملفوف، ويبرق باللبن — دفء البيت الشامي على مائدتكم.', en:'Stuffed courgettes, cabbage and vine leaves in yogurt — the warmth of a Damascene home.'},
    cardGhuraibaTag:{ar:'Ghuraiba', en:'Ghuraiba'},
    cardGhuraibaTitle:{ar:'الغريبة', en:'Ghuraiba'},
    cardGhuraibaText:{ar:'غريبة دمشقية باللوز والفستق — تذوب في الفم وتتآلف مع فنجان القهوة الشامية.', en:'Buttery Damascene shortbread with almonds and pistachio — crumbles in your mouth next to Arabic coffee.'},
    cardIceTag:{ar:'Ice Cream', en:'Ice Cream'},
    cardIceTitle:{ar:'الآيس كريم', en:'Ice Cream'},
    cardIceText:{ar:'مثلجات فاخرة بالحليب الطازج وماء الزهر — برودة دمشقية لعشاق الحلو.', en:'Premium ice cream made with fresh milk and orange blossom — a cool Damascene treat.'},
    cardGo:{ar:'تصفح القسم', en:'Browse category'},
    statsEyebrow:{ar:'أرقام', en:'Numbers'},
    statsTitle:{ar:'أرقام تحكي عن<br>حرفة توارثناها جيلاً بعد جيل', en:'Numbers that tell of a craft<br>passed down generation after generation'},
    statsSide:{
      ar:'من رقّة عجينة البقلاوة إلى سخاء منسف العائلة، نعطي كل تفصيلة حقّها لتصل إلى مائدتكم في أبهى صورة.',
      en:'From the finest baklava pastry to a generous family tray, we give every detail its due so it reaches your table at its very best.'
    },
    stat1:{ar:'سنة من الخبرة في صناعة الحلويات الشامية', en:'Years of experience in Damascene sweet-making'},
    stat2:{ar:'صنفاً من الحلويات والأطباق تُحضَّر يومياً', en:'Sweets and dishes prepared fresh every day'},
    stat3:{ar:'فستق حلبي طبيعي في الحشوات — بلا أي مواد صناعية', en:'Natural Aleppo pistachio in every filling — nothing artificial'},
    stat4:{ar:'متابع يتابعون طعم الشامية على وسائل التواصل', en:'Followers enjoying Shamieh on social media'},
    contactTitle:{ar:'جاهزون نضيف الحلو إلى مناسبتكم؟', en:'Ready to add something sweet to your occasion?'},
    contactLead:{
      ar:'زورونا في فرعنا بدمشق، خلف قيادة الشرطة، أو راسلونا لنطّلعكم على تشكيلة اليوم ونجهّز طلبكم بأسرع وقت.',
      en:'Visit our shop in Damascus, behind the police headquarters, or message us to see the selection of the day and have your order prepared quickly.'
    },
    contactBrand:{ar:'الشامية — Al Shamieh', en:'Al Shamieh'},
    contactAddr:{ar:'دمشق، خلف قيادة الشرطة', en:'Damascus, behind the police headquarters'},
    contactCall:{ar:'اتصل الآن', en:'Call Now'},
    contactIg:{ar:'افتح إنستغرام', en:'Open Instagram'},
    contactMsg:{ar:'راسلنا للطلب', en:'Message Us to Order'},
    footerCopy:{ar:'الشامية — حلويات ومأكولات شامية. جميع الحقوق محفوظة.', en:'Al Shamieh — Damascene sweets and dishes. All rights reserved.'},
    toTop:{ar:'العودة للأعلى', en:'Back to top'},
    modalAria:{ar:'طلب من الشامية', en:'Order from Al Shamieh'},
    modalTitle:{ar:'اطلب من الشامية', en:'Order from Al Shamieh'},
    modalLead:{ar:'عبّئ المعلومات وسنتواصل معكم لتأكيد الطلب وأقرب موعد للتوصيل.', en:'Fill in your details and we will contact you to confirm your order and delivery time.'},
    fName:{ar:'الاسم', en:'Name'},
    fNamePh:{ar:'اكتب اسمك', en:'Enter your name'},
    fPhone:{ar:'رقم الهاتف', en:'Phone number'},
    fNotes:{ar:'نوع الطلب أو ملاحظات <small style="opacity:.55;font-weight:400">(اختياري)</small>', en:'Order type or notes <small style="opacity:.55;font-weight:400">(optional)</small>'},
    fNotesPh:{ar:'مثال: صينية منسف رز بلحم لستة أشخاص', en:'e.g. A rice tray with lamb for six'},
    fSubmit:{ar:'إرسال الطلب', en:'Send Order'},
    formErr:{ar:'الرجاء تعبئة الاسم ورقم الهاتف بشكل صحيح.', en:'Please enter a valid name and phone number.'},
    okTitle:{ar:'شكراً لثقتكم!', en:'Thank you!'},
    okText:{ar:'تم استلام طلبكم، وسيتواصل معكم فريق الشامية بعد قليل لتأكيد التفاصيل.', en:'We have received your order. The Al Shamieh team will contact you shortly to confirm the details.'},
    okDone:{ar:'حسناً، شكراً', en:'Got it, thanks'},

    soon:{ar:'القسم قيد التجهيز', en:'This section is coming soon'},
    backHome:{ar:'العودة إلى الرئيسية', en:'Back to home'},
    subCopy:{ar:'الشامية — Al Shamieh', en:'Al Shamieh'},

    sweetsTag:{ar:'Sweet', en:'Sweet'},
    sweetsTitle:{ar:'الحلو', en:'Sweets'},
    sweetsText:{
      ar:'بقلاوة بالفستق الحلبي، كنافة، وحلويات مشكّلة — أجمل ما في دمشق، يُحضَّر طازجاً كل يوم.',
      en:'Pistachio baklava, knafeh and assorted sweets — the finest in Damascus, made fresh every day.'
    },
    scrubAria:{ar:'مقطع تحضير حلويات الشامية', en:'Al Shamieh sweets-making clip'},
    scrubHint:{ar:'اسحب للأسفل لتشاهد التحضير', en:'Scroll to watch it being made'},
    scrubChipB:{ar:'حلويات الشامية', en:'Al Shamieh Sweets'},
    menuEyebrow:{ar:'تشكيلة الحلو', en:'Sweet Selection'},
    menuTitle:{ar:'أصناف تُحضَّر يومياً… بفستقٍ حلبي وقطرٍ طبيعي', en:'Made fresh daily… with Aleppo pistachio and natural syrup'},
    menuLead:{
      ar:'من رقّة العجينة إلى سخاء القطر، كل قطعة شامية تُصنع بحرفية تُتوارث جيلاً بعد جيل. وهذه تشكيلة من مفضّلاتنا التي نفتخر بتقديمها لكم.',
      en:'From the finest pastry to the warmth of the syrup, every piece is crafted with skills passed down through generations. Here is a selection of our favourites.'
    },
    dryTag:{ar:'Dry', en:'Dry'},
    dryTitle:{ar:'النواشف', en:'Dried Pastries'},
    dryText:{
      ar:'غريبة، معمول بالتمر، وبيتي فور — رفيقة القهوة في كل بيت شامي.',
      en:'Shortbread, date maamoul and petit fours — the companion of coffee in every Damascene home.'
    },
    mansafTag:{ar:'Trays', en:'Trays'},
    mansafTitle:{ar:'المناسف', en:'Banquet Trays'},
    mansafText:{
      ar:'صواني كبيرة من الرز باللحم أو الدجاج — ضيافة سخية تكفي العائلة والأصدقاء في كل مناسبة.',
      en:'Large trays of rice with lamb or chicken — generous hospitality for family and friends on every occasion.'
    },
    mahashiTag:{ar:'Stuffed', en:'Stuffed'},
    mahashiTitle:{ar:'المحاشي', en:'Stuffed Dishes'},
    mahashiText:{
      ar:'كوسا، ملفوف، ويبرق باللبن — طعم البيت الشامي الدافئ بأروع صورة.',
      en:'Stuffed courgettes, cabbage and vine leaves in yogurt — the warm taste of a Damascene home at its finest.'
    },

    /* ============ إتاحة / أريا ============ */
    langToggleAria:{ar:'تبديل اللغة', en:'Switch language'},
    burgerAria:{ar:'فتح القائمة', en:'Open menus'},
    modalCloseAria:{ar:'إغلاق', en:'Close'},

    /* ============ أصناف قائمة الحلو (sweets.html) ============ */
    item01Title:{ar:'بقلاوة بالفستق الحلبي', en:'Pistachio Baklava'},
    item01Text:{
      ar:'عجينة رقيقة محشوّة بالفستق الحلبي، معمّرة القطر لنتيجة هشّة لا تُقاوم.',
      en:'Thin sheets of pastry filled with Aleppo pistachio, steeped in syrup for an irresistible crunch.'
    },
    item01Tag:{ar:'فستق حلبي', en:'Aleppo Pistachio'},
    item02Title:{ar:'كنافة بالقشطة', en:'Cream Knafeh'},
    item02Text:{
      ar:'خيوط كنافة ذهبية تتدفّق عليها قشطة طازجة وتُقطّر على السخونة بماء الورد.',
      en:'Golden strands of shredded pastry topped with fresh cream and drizzled hot with rose water.'
    },
    item02Tag:{ar:'قشطة طازجة', en:'Fresh Cream'},
    item03Title:{ar:'حلويات مشكّلة', en:'Assorted Sweets'},
    item03Text:{
      ar:'تشكيلة تجمع أرقى أصناف الشامية في صينية واحدة — مثالية لضمون وصالونات العيد.',
      en:'A selection of Shamieh\'s finest in a single tray — perfect for occasions and Eid gatherings.'
    },
    item03Tag:{ar:'تشكيلة الشامية', en:'Shamieh Selection'},
    item04Title:{ar:'بقلاوة بالجوز', en:'Walnut Baklava'},
    item04Text:{
      ar:'حشوة جوز فاخرة مع لمسة قرفة، مغموسة بقطر ذهبي ليسوّق الطعم الكلاسيكي.',
      en:'A rich walnut filling with a hint of cinnamon, dipped in golden syrup for a classic finish.'
    },
    item04Tag:{ar:'جوز · قطر طبيعي', en:'Walnut · Natural Syrup'},
    item05Title:{ar:'صينية السهرة', en:'Evening Tray'},
    item05Text:{
      ar:'صينية ملكية تجمع تشكيلة الحلو طرّاً — رفيقة مجالسكم وضيافتكم الكبيرة.',
      en:'A royal tray bringing together the full assortment — the perfect companion for your gatherings.'
    },
    item05Tag:{ar:'للمناسبات', en:'For Occasions'},
    item06Title:{ar:'معمول وغريبة', en:'Maamoul & Ghuraiba'},
    item06Text:{
      ar:'معمول محشو بالتمر والفستق مع غريبة تذوب في الفم — رفيقة القهوة في كل جلسة.',
      en:'Date and pistachio maamoul with shortbread that melts in your mouth — the companion of Arabic coffee.'
    },
    item06Tag:{ar:'رفيقة القهوة', en:'Coffee Companion'},
    item07Title:{ar:'قطايف بالقشطة', en:'Cream Qatayef'},
    item07Text:{
      ar:'قطايف مقلية ذهبية تُحشى بالقشطة الطازجة وتُقطّر بالعسل — حكاية رمضانية كاملة.',
      en:'Golden fried qatayef filled with fresh cream and drizzled with honey — a full Ramadan story.'
    },
    item07Tag:{ar:'طازجة يومياً', en:'Made Fresh Daily'},
    item08Title:{ar:'مربعات العسل', en:'Honey Squares'},
    item08Text:{
      ar:'مربعات معجّنة هشّة مغطاة بالعسل الطبيعي ورشّة فستق — لمسة حلو ختامية مثالية.',
      en:'Crisp pastry squares coated in natural honey with a sprinkle of pistachio — the perfect sweet finish.'
    },
    item08Tag:{ar:'عسل · فستق', en:'Honey · Pistachio'}
  };

  function applyLang(lang){
    if(lang !== 'en') lang = 'ar';
    doc.documentElement.setAttribute('lang', lang);
    doc.documentElement.setAttribute('dir', lang === 'en' ? 'ltr' : 'rtl');
    doc.querySelectorAll('[data-i18n]').forEach(function(el){
      var key = el.getAttribute('data-i18n');
      var entry = i18n[key];
      if(!entry || !entry[lang]) return;
      var attr = el.getAttribute('data-i18n-attr');
      if(attr) el.setAttribute(attr, entry[lang]);
      else el.innerHTML = entry[lang];
    });
    var lbl = doc.getElementById('langLabel');
    if(lbl) lbl.textContent = lang === 'en' ? 'ع' : 'EN';
    var page = doc.documentElement.getAttribute('data-page') || 'home';
    if(i18n.titles[page]) doc.title = i18n.titles[page][lang];
    try{ localStorage.setItem('shamieh-lang', lang); }catch(e){}
    try{ window.dispatchEvent(new CustomEvent('shamieh:lang', { detail:{ lang: lang } })); }catch(e){}
  }

  function init(){
    var savedLang = 'ar';
    try{ savedLang = localStorage.getItem('shamieh-lang') || 'ar'; }catch(e){}
    applyLang(savedLang);
    var toggle = doc.getElementById('langToggle');
    if(toggle){
      toggle.addEventListener('click', function(){
        applyLang(doc.documentElement.getAttribute('lang') === 'en' ? 'ar' : 'en');
      });
    }
  }

  if(doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
