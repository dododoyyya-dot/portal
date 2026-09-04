// 전 페이지 공용: ① 상단 메뉴 일괄 렌더(A안) ② 로그인/로그아웃 전환 ③ 알림 배지
(function(){
  var CFG={apiKey:"AIzaSyB-YuoXtSnuodHEbbjwHRyEjdShgNu4iLg",authDomain:"koreaflyingdiscfederation.firebaseapp.com",projectId:"koreaflyingdiscfederation",appId:"1:1081847355343:web:ca40ed9a52e13f607f64ba"};

  // ── 메뉴 구성 (2026-08 A안: 역할별 7개 상단) ──
  var MENU=[
    {t:'연맹소개',h:'about.html',d:[
      ['인사말 · 미션','about.html#greet'],['CI 소개','about.html#ci'],['조직도','about.html#org'],
      ['정관 · 규정','about.html#rule'],['시도연맹 · 권역','about.html#region'],['후원안내','sponsor.html'],['오시는 길','about.html#way']]},
    {t:'종목소개',h:'sports.html',d:[
      ['얼티미트','sports.html'],['디스크골프','sports.html'],['원반윷놀이 · 기타 종목','sports.html'],['경기 규칙','sports.html']]},
    {t:'사업안내',h:'business.html',d:[
      ['2026 유소년 스포츠기반구축사업','business.html#youth'],['학교체육 강습','business.html#school'],
      ['방과후 · 늘봄','business.html#after'],['교원연수 · 교재개발','business.html#train'],['학교 강습 신청 →','apply.html']]},
    {t:'대회',h:'competition.html',d:[
      ['대회 일정 · 안내','competition.html'],['참가 신청 (선수)','competition.html'],
      ['심판 · 운영요원 신청','competition.html#staff'],['연맹 일정 캘린더','calendar.html'],['📸 대회 갤러리','gallery.html']]},
    {t:'클럽',h:'club.html',d:[
      ['클럽 찾기 · 가입','club.html'],['클럽 만들기 (클럽장)','club.html'],['내 클럽 · 가입 승인','club.html'],['⚔️ 클럽 교류전','club.html?tab=4']]},
    {t:'자격증',h:'license.html',d:[
      ['연맹 자격증 신청 (지도자·심판)','license.html'],
      ['이수증 · 자격 진위확인','verify.html'],['🛡 안전교육 이수 (영상)','safety.html','color:#C41E2F;font-weight:800'],
      ['체육지도자 실기·구술 검정 (연 1회)','certification.html']]},
    {t:'강사·활동',h:'jobs.html',d:[
      ['🛡 안전교육 이수 (영상 시청 · 위촉 전 필수)','safety.html','color:#C41E2F;font-weight:800'],
      ['강사 활동 지원 (분야 등록)','jobs.html'],['단기 강사 구인 게시판','jobs.html#gigList'],
      ['강사 가이드 (일지·운영·유의사항)','guide.html'],['레벨업 (포인트) 시스템','leader.html']]},
    {t:'알림마당',h:'notice.html',d:[
      ['공지사항 · 공고','notice.html'],['연맹 일정 캘린더','calendar.html'],['자료실 (서식 다운로드)','archive.html'],['📸 대회 갤러리','gallery.html'],['자주 묻는 질문','faq.html']]}
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
    html+='<a href="apply.html" class="cta">강습 신청</a>'
        +'<a href="jobs.html" class="cta" style="background:#1F4E9C;margin-left:8px">강사신청</a>';
    nav.innerHTML=html;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderNav);else renderNav();

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
        var a=document.createElement('a');a.id='utilSafety';a.href='safety.html';
        a.textContent='🛡 안전교육 미이수';a.title='강습 활동 전 안전교육 영상을 시청해 주세요';
        a.style.cssText='margin-left:10px;background:#C41E2F;color:#fff;font-weight:900;font-size:12px;padding:3px 10px;border-radius:999px;text-decoration:none;white-space:nowrap';
        el.parentNode.insertBefore(a,el.nextSibling);
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
