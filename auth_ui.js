// 전 페이지 공용: ① 상단 메뉴 일괄 렌더(A안) ② 로그인/로그아웃 전환 ③ 알림 배지
(function(){
  var CFG={apiKey:"AIzaSyB-YuoXtSnuodHEbbjwHRyEjdShgNu4iLg",authDomain:"koreaflyingdiscfederation.firebaseapp.com",projectId:"koreaflyingdiscfederation",appId:"1:1081847355343:web:ca40ed9a52e13f607f64ba"};

  // ── 메뉴 구성 (2026-09-07 정리: 이모지·중복·화살표 제거, 항목명 간결화. 자격증 → 안전교육은 강사·활동에만) ──
  // [아이콘 2026-09-07] 이모지를 체육회 스타일 선 아이콘으로 바꿔 그리는 icons.js 를 모든 페이지에서 불러옵니다 (페이지 파일 무수정)
  try{if(!document.querySelector('script[src^="icons.js"]')){var _ic=document.createElement('script');_ic.src='icons.js?v=20260907';document.head.appendChild(_ic)}}catch(e){}
  // ══ [아이디 로그인 2026-09-09] KFDF_IDLOGIN — 아이디 ↔ 로그인용 이메일. loginIds/{아이디} 문서에 비밀번호(PBKDF2→AES-GCM)로 잠근 실제 이메일을 두어, 비밀번호 없이는 이메일이 드러나지 않습니다.
  //   이메일이 없는 계정(학생회원·보호자가 만든 자녀 계정)은 합성 주소(아이디@member.kfdf.local / @kids.kfdf.local)를 그대로 씁니다.
  window.KFDF_IDLOGIN=(function(){
    var DOM_MEMBER='@member.kfdf.local',DOM_KIDS='@kids.kfdf.local';
    function norm(id){return String(id||'').trim().toLowerCase()}
    function valid(id){return /^[a-z0-9._-]{4,20}$/.test(id)}
    function b64(buf){var a=new Uint8Array(buf),s='';for(var i=0;i<a.length;i++)s+=String.fromCharCode(a[i]);return btoa(s)}
    function unb64(s){var b=atob(s),a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}
    function key(id,pw){var te=new TextEncoder();return crypto.subtle.importKey('raw',te.encode(String(pw)),'PBKDF2',false,['deriveKey']).then(function(base){return crypto.subtle.deriveKey({name:'PBKDF2',salt:te.encode('kfdf-loginid:'+id),iterations:120000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])})}
    function enc(id,pw,email){return key(id,pw).then(function(k){var iv=crypto.getRandomValues(new Uint8Array(12));return crypto.subtle.encrypt({name:'AES-GCM',iv:iv},k,new TextEncoder().encode(email)).then(function(ct){return b64(iv)+'.'+b64(ct)})})}
    function dec(id,pw,blob){var p=String(blob||'').split('.');return key(id,pw).then(function(k){return crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(p[0])},k,unb64(p[1]))}).then(function(pt){return new TextDecoder().decode(pt)})}
    // 아이디+비밀번호 → 로그인용 이메일. 문서가 없으면 자녀 계정 도메인, 비밀번호가 틀리면 null
    // lookup: {email, data} — data 는 loginIds 문서(없으면 null). email 은 resolve 와 같은 규칙
    function lookup(DB,id,pw){id=norm(id);return DB.collection('loginIds').doc(id).get().then(function(d){if(!d.exists)return {email:id+DOM_KIDS,data:null};var x=d.data()||{};if(x.enc)return dec(id,pw,x.enc).then(function(e){return {email:e,data:x}}).catch(function(){return {email:null,data:x}});return {email:x.email||(id+DOM_MEMBER),data:x}})}
    function resolve(DB,id,pw){return lookup(DB,id,pw).then(function(r){return r.email})}
    return {norm:norm,valid:valid,enc:enc,dec:dec,resolve:resolve,lookup:lookup,DOM_MEMBER:DOM_MEMBER,DOM_KIDS:DOM_KIDS};
  })();
  var MENU=[
    {t:'연맹소개',h:'about.html',d:[
      ['인사말 · 미션','about.html#greet'],['CI 소개','about.html#ci'],['조직도','about.html#org'],
      ['정관 · 규정','about.html#rule'],['시도연맹 · 권역','about.html#region'],['후원 안내','sponsor.html'],['오시는 길','about.html#way']]},
    {t:'종목소개',h:'sports.html',d:[
      ['얼티미트','sports.html'],['디스크골프','sports.html'],['원반윷놀이 · 기타 종목','sports.html'],['경기 규칙','sports.html']]},
    {t:'사업안내',h:'business.html',d:[
      ['유소년 스포츠 기반구축사업','business.html#youth'],['학교체육 강습','business.html#school'],
      ['방과후 · 늘봄','business.html#after'],['교원연수 · 교재개발','business.html#train'],['학교 강습 신청','apply.html']]},
    {t:'대회',h:'competition.html',d:[
      ['대회 일정 · 안내','competition.html'],['참가 신청','competition.html#staff'],
      ['심판 · 운영요원 모집','staff.html'],['대회 결과','results.html'],['사진첩','gallery.html']]},
    {t:'클럽',h:'club.html',d:[
      ['클럽 찾기 · 가입','club.html'],['클럽 만들기','club.html'],['내 클럽 · 가입 승인','club.html'],['클럽 교류전','club.html?tab=4']]},
    {t:'자격증',h:'license.html',d:[
      ['연맹 자격증 신청 (지도자 · 심판)','license.html'],['자격 · 이수증 진위확인','verify.html'],
      ['체육지도자 자격검정 (국가자격)','certification.html']]},
    {t:'강사·활동',h:'jobs.html',d:[
      ['강사 활동 지원 · 지명','jobs.html'],['단기 강사 구인','jobs.html#gigList'],['안전교육 이수 (위촉 전 필수)','safety.html'],
      ['강사 가이드','guide.html'],['리더 레벨 시스템','leader.html']]},
    {t:'알림마당',h:'notice.html',d:[
      ['공지사항 · 공고','notice.html'],['연맹 일정 캘린더','calendar.html'],['자료실 (서식 다운로드)','archive.html'],['자주 묻는 질문','faq.html']]}
  ];
  function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
  function renderNav(){
    var nav=document.querySelector('header .menu');if(!nav)return;
    var here=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    var html=MENU.map(function(m){
      var act=(m.h.toLowerCase()===here)||m.d.some(function(x){return x[1].split('#')[0].toLowerCase()===here});
      return '<div><a href="'+m.h+'" class="top'+(act?' active':'')+'">'+esc(m.t)+'</a>'
        +'<div class="drop">'+m.d.map(function(x){return '<a href="'+x[1]+'"'+(x[2]?' style="'+x[2]+'"':'')+'>'+esc(x[0])+'</a>'}).join('')+'</div></div>';
    }).join('');
    // [체육회 스타일 2026-09-07] 우측 알약 버튼 묶음 (색은 style.css .navcta)
    html+='<div class="navcta"><a href="apply.html" class="cta">강습 신청</a><a href="jobs.html" class="cta cta2">강사신청</a></div>';
    nav.innerHTML=html;
    // [메가메뉴] 메뉴에 마우스를 올리면 헤더 아래로 전 분야가 한 번에 펼쳐집니다 (PC). 휴대폰은 종전 접이식 그대로.
    try{
      var header=nav.closest('header');if(!header||header.querySelector('.mega'))return;
      var mega=document.createElement('div');mega.className='mega';
      mega.innerHTML='<div class="wrap mega-in">'+MENU.map(function(m){return '<div class="mcol"><a class="mh" href="'+m.h+'">'+esc(m.t)+'</a>'+m.d.map(function(x){return '<a href="'+x[1]+'"'+(x[2]?' style="'+x[2]+'"':'')+'>'+esc(x[0])+'</a>'}).join('')+'</div>'}).join('')+'</div>';
      header.appendChild(mega);
      var tm=null;
      function open(){if(window.innerWidth<=1080)return;clearTimeout(tm);header.classList.add('mega-open')}
      function close(){clearTimeout(tm);tm=setTimeout(function(){header.classList.remove('mega-open')},120)}
      nav.addEventListener('mouseenter',open);mega.addEventListener('mouseenter',open);
      nav.addEventListener('mouseleave',close);mega.addEventListener('mouseleave',close);
      header.addEventListener('mouseleave',close);
    }catch(e){}
    try{renderSubnav(nav.closest('header'))}catch(e){}
  }
  // [서브 내비 2026-09-07] 체육회 서브 화면처럼 헤더 바로 아래에 현재 분야의 하위 메뉴 줄을 둡니다 (홈·메뉴에 없는 페이지는 생략)
  function renderSubnav(header){
    if(!header||document.querySelector('.subnav'))return;
    var here=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    if(here==='index.html'||here==='')return;
    var grp=null;
    MENU.forEach(function(m){if(grp)return;var hit=(m.h.split('#')[0].toLowerCase()===here)||m.d.some(function(x){return x[1].split('#')[0].toLowerCase()===here});if(hit)grp=m});
    if(!grp)return;
    var seen={},marked=false;
    var links=grp.d.filter(function(x){if(seen[x[1]])return false;seen[x[1]]=1;return true});
    var sn=document.createElement('div');sn.className='subnav';
    sn.innerHTML='<div class="wrap"><a class="sn-home" href="index.html" aria-label="홈"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg></a>'
      +'<a class="sn-grp" href="'+grp.h+'">'+esc(grp.t)+'</a><div class="sn-links">'
      +links.map(function(x){var f=x[1].split('#')[0].toLowerCase(),h=x[1].indexOf('#')>=0?x[1].slice(x[1].indexOf('#')):'';var on=!marked&&f===here&&(!h||h===location.hash||!location.hash);if(on)marked=true;return '<a href="'+x[1]+'"'+(on?' class="on"':'')+'>'+esc(x[0])+'</a>'}).join('')+'</div></div>';
    header.insertAdjacentElement('afterend',sn);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderNav);else renderNav();
  // ══ [사이트 설정 2026-09-07] 관리자 페이지 [사이트 설정]에서 저장한 siteContent/site 를 모든 페이지에 적용 ══
  //   · 상단 연락처(.util) · 푸터(footer .bottom / .links) · 관련 사이트(.rel) · 홈 히어로(문구·버튼)
  //   · 문서가 없거나 항목이 비어 있으면 HTML 에 적힌 기본값을 그대로 둡니다 (실패해도 화면 영향 없음)
  function applySiteContent(){
    try{
      if(!window.firebase||!firebase.apps||!firebase.apps.length||!firebase.firestore)return;
      firebase.firestore().collection('siteContent').doc('site').get().then(function(d){
        if(!d.exists)return;var c=d.data()||{};
        var cont=c.contact||{};
        // 상단 유틸 바 연락처
        try{var ua=document.querySelector('.util a[href^="mailto:"]');if(ua&&cont.email){ua.href='mailto:'+cont.email;ua.textContent=cont.email}
          if(ua&&cont.tel){var box=ua.parentNode;box.innerHTML=box.innerHTML.replace(/\d{2,4}-\d{3,4}-\d{4}/,esc(cont.tel))}
          var ub=document.querySelector('.util .wrap > div:first-child');if(ub&&cont.brandLine)ub.innerHTML='<b>'+esc(cont.org||'대한민국플라잉디스크연맹')+'</b> · '+esc(cont.brandLine);}catch(e){}
        // 푸터
        try{var f=c.footer||{};var fb=document.querySelector('footer .bottom');
          if(fb&&(f.org||cont.org)){fb.innerHTML=(f.notice?'<span style="display:inline-block;margin-bottom:8px;padding:4px 14px;background:rgba(255,255,255,.08);border-radius:999px;font-size:12px;font-weight:700;color:#c3c9d4">'+esc(f.notice)+'</span><br>':'')
            +'<b>'+esc(f.org||cont.org)+'</b>'+(f.addr?' &nbsp;|&nbsp; '+esc(f.addr):'')+'<br>'
            +(cont.tel?'TEL '+esc(cont.tel):'')+(cont.tel&&cont.email?' &nbsp;|&nbsp; ':'')+(cont.email?'EMAIL '+esc(cont.email):'')+'<br>'
            +esc(f.copy||'© 2026 KOREA FLYING DISC FEDERATION. All rights reserved.')+' &nbsp;|&nbsp; <a href="privacy.html" style="color:#9aa1ad">개인정보처리방침</a>'}
          var fl=document.querySelector('footer .links');if(fl&&f.links&&f.links.length)fl.innerHTML=f.links.filter(function(x){return x&&x.t&&x.h}).map(function(x){return '<a href="'+esc(x.h)+'">'+esc(x.t)+'</a>'}).join('');
          var fbrand=document.querySelector('footer .f-brand b');if(fbrand&&(f.org||cont.org))fbrand.textContent=(f.org||cont.org).replace(/^사단법인\s*/,'');}catch(e){}
        // 관련 사이트
        try{var rel=document.querySelector('.rel .wrap');if(rel&&c.relSites&&c.relSites.length)rel.innerHTML='<b>관련 사이트</b>'+c.relSites.filter(function(x){return x&&x.name&&x.url}).map(function(x){return '<a href="'+esc(x.url)+'" target="_blank" rel="noopener">'+esc(x.name)+'</a>'}).join('')}catch(e){}
        // 홈 히어로
        try{var h=c.hero||{};var se=document.querySelector('.hero .slogan-en');if(se&&h.slogan)se.innerHTML=esc(h.slogan)+(h.sloganEm?' <em>'+esc(h.sloganEm)+'</em>':'');
          var h1=document.querySelector('.hero h1');if(h1&&h.title){var t=esc(h.title);if(h.titleHi&&h.title.indexOf(h.titleHi)>=0)t=t.replace(esc(h.titleHi),'<span class="pt">'+esc(h.titleHi)+'</span>');h1.innerHTML=t}
          var hp=document.querySelector('.hero .h-grid p');if(hp&&h.desc)hp.textContent=h.desc;
          var bs=document.querySelectorAll('.hero .hcta a');(h.buttons||[]).forEach(function(b,i){var a=bs[i];if(!a||!b||!b.t)return;var svg=a.querySelector('svg');a.innerHTML=(svg?svg.outerHTML:'')+esc(b.t);if(b.h)a.setAttribute('href',b.h)});
          var tg=document.querySelector('.hero .tag');if(tg&&h.tag)tg.textContent=h.tag;}catch(e){}
      }).catch(function(){});
    }catch(e){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applySiteContent);else applySiteContent();

  // ══════════ [NEW 배지 2026-09-09] 항목 단위 추적 ══════════
  //  · 공개 조회가 되는 컬렉션에서 최근 항목을 읽어(10분 캐시), 읽지 않은 항목이 있으면 상단 메뉴 → 하위 메뉴 → 목록의 그 항목에 N 배지를 붙입니다.
  //  · 항목을 열면(목록에서 클릭, 또는 ?slot= ?post= ?id= 상세 주소로 진입) 그 항목만 읽음 처리되고, 하위·상단 배지의 숫자가 줄어듭니다. 모두 읽으면 배지가 사라집니다.
  //  · 상세 페이지가 없는 항목(자격 공고·일정·교류전)은 그 목록 페이지를 보면 읽음 처리합니다(pageSeen).
  //  · 목록 페이지는 행 요소에 data-newkey="항목ID" 만 붙이면 됩니다 (competition·staff·gallery·results 적용). 읽기 권한이 없거나 오류면 조용히 넘어갑니다.
  //  · 처음 방문한 사람에게는 최근 14일치만 새 항목으로 봅니다. 읽음 표시는 이 브라우저(localStorage)에 저장됩니다.
  var NEW_SRC=[
    {menu:'대회',link:'competition.html',col:'competitions',field:'createdAt',limit:20,keys:function(d,id){return (d.slotIds&&d.slotIds.length)?d.slotIds:[id]},params:['slot']},
    {menu:'대회',link:'staff.html',col:'competitionStaff',field:'createdAt',limit:20,params:['post']},
    {menu:'대회',link:'gallery.html',col:'gallery',where:['status','==','published'],time:['at','updatedAt'],limit:40,params:['id']},
    {menu:'대회',link:'results.html',col:'eventReports',where:['kind','==','comp'],time:['createdAt','at','updatedAt'],limit:40,params:['id']},
    {menu:'대회',link:'results.html',col:'schoolClubEvents',time:['createdAt','updatedAt'],limit:40,params:['id']},
    {menu:'자격증',link:'license.html',col:'licenseNotices',field:'createdAt',limit:12,pageSeen:true},
    {menu:'알림마당',link:'notice.html',col:'licenseNotices',field:'createdAt',limit:12,pageSeen:true},
    {menu:'알림마당',link:'calendar.html',col:'events',field:'createdAt',limit:20,pageSeen:true},
    {menu:'클럽',link:'club.html',col:'clubMeets',field:'createdAt',limit:20,pageSeen:true}
  ];
  var NEW_TTL=10*60*1000,NEW_FIRST=14*24*60*60*1000,NEW_ITEMS=[];
  function nGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function nSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  function nMs(v){try{if(!v)return 0;if(v.toDate)return v.toDate().getTime();if(v.seconds)return v.seconds*1000;var t=Date.parse(v);return isNaN(t)?0:t}catch(e){return 0}}
  function nHere(){return (location.pathname.split('/').pop()||'index.html').toLowerCase()}
  function nSeen(){try{return JSON.parse(nGet('kfdfNewSeen')||'{}')||{}}catch(e){return {}}}
  function nSaveSeen(o){var ks=Object.keys(o);if(ks.length>600){ks.sort(function(x,y){return (o[x]||0)-(o[y]||0)});ks.slice(0,ks.length-600).forEach(function(k){delete o[k]})}nSet('kfdfNewSeen',JSON.stringify(o))}
  function nFirst(){var f=parseInt(nGet('kfdfNewFirst')||'0',10);if(!f){f=Date.now();nSet('kfdfNewFirst',String(f))}return f}
  function nFetch(cb){
    var c=nGet('kfdfNewCache');
    if(c){try{var o=JSON.parse(c);if(o&&o.at&&(Date.now()-o.at)<NEW_TTL&&o.items){cb(o.items);return}}catch(e){}}
    if(!window.firebase||!firebase.firestore||!firebase.apps.length)return;
    var db;try{db=firebase.firestore()}catch(e){return}
    var items=[],left=NEW_SRC.length;
    function done(){if(--left===0){nSet('kfdfNewCache',JSON.stringify({at:Date.now(),items:items}));cb(items)}}
    NEW_SRC.forEach(function(s){
      try{
        var q=db.collection(s.col);
        if(s.where)q=q.where(s.where[0],s.where[1],s.where[2]);
        if(s.field)q=q.orderBy(s.field,'desc');
        q.limit(s.limit||20).get().then(function(sn){
          sn.forEach(function(doc){
            var d=doc.data()||{},t=0;
            if(s.field)t=nMs(d[s.field]);else (s.time||[]).some(function(f){t=nMs(d[f]);return t>0});
            if(!t)return;
            (s.keys?s.keys(d,doc.id):[doc.id]).forEach(function(k){items.push({k:String(k),t:t,link:s.link,menu:s.menu,page:!!s.pageSeen})});
          });done();
        },function(){done()});
      }catch(e){done()}
    });
  }
  function nUnread(){var seen=nSeen(),base=nFirst()-NEW_FIRST;return NEW_ITEMS.filter(function(it){return it.t>base&&!seen[it.k]})}
  function nBadge(n,small){var b=document.createElement('span');b.className='kfdfNew';b.textContent=n>1?String(n):'N';b.title='새로 올라온 내용 '+(n||1)+'건';
    b.style.cssText='display:inline-block;min-width:14px;height:14px;line-height:14px;margin-left:4px;padding:0 4px;border-radius:999px;background:#C41E2F;color:#fff;font-size:9.5px;font-weight:900;letter-spacing:0;text-align:center;vertical-align:top'+(small?';font-size:9px;height:13px;line-height:13px;min-width:13px':'');return b}
  function nFile(href){return String(href||'').split('#')[0].split('?')[0].split('/').pop().toLowerCase()}
  function nRender(){
    var un=nUnread(),byMenu={},byLink={},byKey={};
    un.forEach(function(it){byMenu[it.menu]=(byMenu[it.menu]||0)+1;byLink[it.link]=(byLink[it.link]||0)+1;byKey[it.k]=1});
    document.querySelectorAll('.kfdfNew').forEach(function(b){b.parentNode&&b.parentNode.removeChild(b)});
    // 상단 메뉴
    document.querySelectorAll('header .menu a.top').forEach(function(a){var t=a.textContent.trim();if(byMenu[t])a.appendChild(nBadge(byMenu[t]))});
    // 하위 메뉴(드롭다운·메가메뉴·서브 내비) — 같은 파일을 가리키는 첫 링크에만
    var done={};
    ['header .menu .drop a','header .mega .mcol a:not(.mh)','.subnav .sn-links a'].forEach(function(sel){var seenIn={};
      document.querySelectorAll(sel).forEach(function(a){var f=nFile(a.getAttribute('href'));if(!byLink[f]||seenIn[f])return;seenIn[f]=1;a.appendChild(nBadge(byLink[f],true))})});
    // 목록 행
    document.querySelectorAll('[data-newkey]').forEach(function(el){var k=el.getAttribute('data-newkey');if(!byKey[k])return;var host=el.querySelector('.ctitle,.strowname,.gl-title,.rs-title,h3,b')||el;host.appendChild(nBadge(1,true))});
  }
  function nMark(keys){if(!keys||!keys.length)return;var seen=nSeen(),ch=false;keys.forEach(function(k){if(k&&!seen[k]){seen[k]=Date.now();ch=true}});if(ch){nSaveSeen(seen);nRender()}}
  function nCheckUrl(){
    try{var here=nHere(),qs=new URLSearchParams(location.search),ks=[];
      NEW_SRC.forEach(function(s){if(s.link!==here)return;
        if(s.pageSeen){NEW_ITEMS.forEach(function(it){if(it.link===here)ks.push(it.k)});return}
        (s.params||[]).forEach(function(p){var v=qs.get(p);if(v)ks.push(v)});
      });
      nMark(ks);
    }catch(e){}
  }
  function nStart(tries){
    if(!document.querySelector('header .menu'))return;
    if(window.firebase&&firebase.firestore&&firebase.apps.length){
      nFetch(function(items){NEW_ITEMS=items||[];nCheckUrl();nRender();
        try{
          // 목록에 나중에 그려지는 행(data-newkey)에도 배지를 붙입니다
          var mo=new MutationObserver(function(muts){for(var i=0;i<muts.length;i++){for(var j=0;j<muts[i].addedNodes.length;j++){var n=muts[i].addedNodes[j];if(n.nodeType===1&&(n.hasAttribute&&n.hasAttribute('data-newkey')||n.querySelector&&n.querySelector('[data-newkey]'))){nRender();return}}}});
          mo.observe(document.body,{childList:true,subtree:true});
        }catch(e){}
      });return}
    if((tries||0)>14)return;
    setTimeout(function(){nStart((tries||0)+1)},500);
  }
  // 항목을 열면 읽음: 목록 행 클릭 · 상세 주소로 바뀔 때(replaceState) · 페이지 진입
  document.addEventListener('click',function(e){try{var el=e.target&&e.target.closest?e.target.closest('[data-newkey]'):null;if(el)nMark([el.getAttribute('data-newkey')])}catch(x){}},true);
  try{var _rs=history.replaceState;history.replaceState=function(){var r=_rs.apply(history,arguments);try{nCheckUrl()}catch(e){}return r}}catch(e){}
  window.KFDF_NEW={isNew:function(k){return nUnread().some(function(it){return it.k===String(k)})},markSeen:function(k){nMark([].concat(k))},refresh:nRender,unread:nUnread};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){nStart(0)});
  else nStart(0);

  // ── 로그인 전환 + 알림 배지 ──
  function badge(u){
    try{
      var el=document.getElementById('utilAuth');if(!el||!el.parentNode)return;
      var b=document.getElementById('kfdfBell');
      if(!b){
        b=document.createElement('a');
        b.id='kfdfBell';
        b.href='mypage.html#alarmBox';
        b.title='알림함';
        b.style.cssText='color:#fff;font-weight:900;margin-right:10px;text-decoration:none';
        b.innerHTML='🔔';
        el.parentNode.insertBefore(b,el);
      }
      if(!firebase.firestore)return;
      firebase.firestore().collection('notifications').where('toUid','==',u.uid).where('read','==',false).limit(30).get().then(function(snap){
        var n=snap.size;if(!n)return;
        b.innerHTML='🔔<span style="background:#C41E2F;border-radius:999px;padding:1px 7px;font-size:11px;margin-left:3px">'+(n>=30?'30+':n)+'</span>';
      }).catch(function(){});
    }catch(e){}
  }
  // ── 안전교육 미이수 표시 ──
  // 강사군(지도자·교사·국가공인자격 회원, 또는 강습 분야를 등록한 회원)이 로그인하면 상단 로그인 줄 옆에
  // 빨간 "🛡 안전교육 미이수" 링크를 붙여 어느 페이지에서든 영상 페이지로 바로 가게 합니다.
  // 이수 유효기간(1년, safety.html 과 동일)이 지난 경우도 미이수로 봅니다. 읽기 실패 시 조용히 넘어갑니다.
  function safetyPill(u){
    try{
      if(!firebase.firestore||document.getElementById('utilSafety'))return;
      var el=document.getElementById('utilAuth');if(!el)return;
      firebase.firestore().collection('users').doc(u.uid).get().then(function(d){
        if(!d.exists)return;var v=d.data()||{};
        var target=['instructor','teacher','natcert'].indexOf(v.accountType)>=0||(v.instructorFor&&Object.keys(v.instructorFor).length>0);
        if(!target)return;
        var valid=false;
        if(v.safetyEdu){valid=true;var at=v.safetyEduAt;if(at){try{var t=at.toDate?at.toDate():new Date(at);valid=(Date.now()-t.getTime())<365*86400000}catch(e){}}}
        if(valid||document.getElementById('utilSafety'))return;
        // [모바일 수정] 좁은 화면에서는 상단 줄에 넣으면 로그인·마이페이지 링크가 밀려 가려지므로, 화면 오른쪽 아래에 떠 있는 배지로 표시
        var ICO='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3zM9 12l2 2 4-4"/></svg>';
        var a=document.createElement('a');a.id='utilSafety';a.href='safety.html';
        a.innerHTML=ICO+'안전교육 미이수';a.title='강습 활동 전 안전교육 영상을 시청해 주세요';
        var mobile=window.innerWidth<=760;
        if(mobile){
          a.style.cssText='position:fixed;right:12px;bottom:18px;z-index:9990;background:#C41E2F;color:#fff;font-weight:900;font-size:12.5px;padding:9px 14px;border-radius:999px;text-decoration:none;white-space:nowrap;box-shadow:0 8px 22px rgba(196,30,47,.35);display:inline-flex;align-items:center';
          document.body.appendChild(a);
        }else{
          a.style.cssText='margin-left:10px;background:#C41E2F;color:#fff;font-weight:900;font-size:12px;padding:3px 10px;border-radius:999px;text-decoration:none;white-space:nowrap;display:inline-flex;align-items:center';
          el.parentNode.insertBefore(a,el.nextSibling);
        }
      }).catch(function(){});
    }catch(e){}
  }
  function ready(){
    if(!window.firebase||!firebase.auth)return;
    if(!firebase.apps.length)firebase.initializeApp(CFG);
    firebase.auth().onAuthStateChanged(function(u){
      var el=document.getElementById('utilAuth');if(!el)return;
      if(u){
        el.textContent='로그아웃';el.href='#';
        el.onclick=function(e){e.preventDefault();if(confirm('로그아웃 할까요?'))firebase.auth().signOut().then(function(){location.href='index.html'})};
        badge(u);
        safetyPill(u);
        if(!firebase.firestore){
          var s3=document.createElement('script');
          s3.src='https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js';
          s3.onload=function(){badge(u)};document.head.appendChild(s3);
        }
      }else{
        el.textContent='로그인';el.href='login.html';el.onclick=null;
      }
    });
  }
  if(window.firebase&&firebase.auth){ready();return}
  var s1=document.createElement('script');
  s1.src='https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js';
  s1.onload=function(){
    var s2=document.createElement('script');
    s2.src='https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js';
    s2.onload=ready;document.head.appendChild(s2);
  };
  document.head.appendChild(s1);
})();
