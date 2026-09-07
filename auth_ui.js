// 전 페이지 공용: ① 상단 메뉴 일괄 렌더(A안) ② 로그인/로그아웃 전환 ③ 알림 배지
(function(){
  var CFG={apiKey:"AIzaSyB-YuoXtSnuodHEbbjwHRyEjdShgNu4iLg",authDomain:"koreaflyingdiscfederation.firebaseapp.com",projectId:"koreaflyingdiscfederation",appId:"1:1081847355343:web:ca40ed9a52e13f607f64ba"};

  // ── 메뉴 구성 (2026-09-07 정리: 이모지·중복·화살표 제거, 항목명 간결화. 자격증 → 안전교육은 강사·활동에만) ──
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

  // ══════════ 업데이트 NEW 배지 (자동 감지) ══════════
  // 공개 조회가 허용된 컬렉션의 '가장 최근 등록 시각'만 읽어, 회원이 마지막으로 본 시점보다
  // 새 글이 있으면 상단 메뉴에 빨간 N 배지를 붙입니다. 해당 메뉴를 방문하면 그 배지만 사라집니다.
  // · 읽는 값은 각 컬렉션에서 1건뿐이고, 결과는 10분간 브라우저에 캐시합니다.
  // · 읽기 권한이 없거나 오류가 나면 조용히 넘어갑니다 (배지만 안 붙고 화면은 그대로).
  var UPD_SRC=[
    {menu:'대회',     col:'competitions',   field:'createdAt'},
    {menu:'자격증',   col:'licenseNotices', field:'createdAt'},
    {menu:'알림마당', col:'licenseNotices', field:'createdAt'},
    {menu:'클럽',     col:'clubMeets',      field:'createdAt'}
  ];
  var UPD_TTL=10*60*1000;          // 최신 등록시각 캐시 10분
  var UPD_FIRST=14*24*60*60*1000;  // 처음 방문한 사람에게는 최근 14일치만 새 글로 봄
  function updGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function updSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  function updMs(v){
    try{
      if(!v)return 0;
      if(v.toDate)return v.toDate().getTime();
      if(v.seconds)return v.seconds*1000;
      var t=Date.parse(v); return isNaN(t)?0:t;
    }catch(e){return 0}
  }
  function updKeys(){
    var seen={},out=[];
    UPD_SRC.forEach(function(s){var k=s.col+'|'+s.field;if(!seen[k]){seen[k]=1;out.push(k)}});
    return out;
  }
  function updFetch(cb){
    var c=updGet('kfdfUpdCache');
    if(c){try{var o=JSON.parse(c);if(o&&o.at&&(Date.now()-o.at)<UPD_TTL&&o.v){cb(o.v);return}}catch(e){}}
    if(!window.firebase||!firebase.firestore||!firebase.apps.length)return;
    var db,keys=updKeys(),res={},left=keys.length;
    try{db=firebase.firestore()}catch(e){return}
    keys.forEach(function(k){
      var p=k.split('|'),done=function(){if(--left===0){updSet('kfdfUpdCache',JSON.stringify({at:Date.now(),v:res}));cb(res)}};
      try{
        db.collection(p[0]).orderBy(p[1],'desc').limit(1).get().then(function(sn){
          res[k]=sn.size?updMs(sn.docs[0].data()[p[1]]):0;done();
        },function(){res[k]=0;done()});
      }catch(e){res[k]=0;done()}
    });
  }
  function updHere(menuTitle){
    var here=(location.pathname.split('/').pop()||'index.html').toLowerCase(),m=null;
    for(var i=0;i<MENU.length;i++)if(MENU[i].t===menuTitle){m=MENU[i];break}
    if(!m)return false;
    if(m.h.toLowerCase()===here)return true;
    return m.d.some(function(x){return x[1].split('#')[0].toLowerCase()===here});
  }
  function updApply(res){
    var nav=document.querySelector('header .menu');if(!nav)return;
    var tops=nav.querySelectorAll('a.top');
    UPD_SRC.forEach(function(s){
      var latest=res[s.col+'|'+s.field]||0;if(!latest)return;
      // 지금 보고 있는 메뉴는 '읽음' 처리하고 배지를 붙이지 않습니다
      if(updHere(s.menu)){updSet('kfdfSeen_'+s.menu,String(latest));return}
      var raw=updGet('kfdfSeen_'+s.menu);
      var seen=raw?parseInt(raw,10):(Date.now()-UPD_FIRST);
      if(!(latest>seen))return;
      for(var i=0;i<tops.length;i++){
        if(tops[i].textContent.trim()!==s.menu)continue;
        if(tops[i].querySelector('.kfdfNew'))break;
        var b=document.createElement('span');
        b.className='kfdfNew';b.textContent='N';b.title='새로 올라온 내용이 있습니다';
        b.style.cssText='display:inline-block;min-width:14px;height:14px;line-height:14px;'
          +'margin-left:4px;padding:0 4px;border-radius:999px;background:#C41E2F;color:#fff;'
          +'font-size:9.5px;font-weight:900;letter-spacing:0;text-align:center;vertical-align:top';
        tops[i].appendChild(b);
        break;
      }
    });
  }
  function updStart(tries){
    if(!document.querySelector('header .menu'))return;
    if(window.firebase&&firebase.firestore&&firebase.apps.length){updFetch(updApply);return}
    if((tries||0)>14)return;                       // 최대 약 7초까지만 기다림
    setTimeout(function(){updStart((tries||0)+1)},500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){updStart(0)});
  else updStart(0);

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
