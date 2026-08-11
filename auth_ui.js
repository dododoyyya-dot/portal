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
      ['심판 · 운영요원 신청','competition.html#staff'],['연맹 일정 캘린더','calendar.html']]},
    {t:'클럽',h:'club.html',d:[
      ['클럽 찾기 · 가입','club.html'],['클럽 만들기 (클럽장)','club.html'],['내 클럽 · 가입 승인','club.html']]},
    {t:'지도자·심판',h:'jobs.html',d:[
      ['자격증 안내 · 검정','certification.html'],['연맹 자격 신청 (지도자·심판)','license.html'],['이수증 · 자격 진위확인','verify.html'],
      ['강사 활동 지원','jobs.html'],['단기 강사 구인 게시판','jobs.html#gigList'],
      ['강사 가이드','guide.html'],['안전교육 이수','safety.html'],['레벨업 (포인트) 시스템','leader.html']]},
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
        +'<div class="drop">'+m.d.map(function(x){return '<a href="'+x[1]+'">'+esc(x[0])+'</a>'}).join('')+'</div></div>';
    }).join('');
    html+='<a href="apply.html" class="cta">강습 신청</a>'
        +'<a href="mypage.html" class="cta" style="background:#1F4E9C;margin-left:8px">마이페이지</a>';
    nav.innerHTML=html;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderNav);else renderNav();

  // ── 로그인 전환 + 알림 배지 ──
  function badge(u){
    try{
      if(!firebase.firestore)return;
      firebase.firestore().collection('notifications').where('toUid','==',u.uid).where('read','==',false).limit(30).get().then(function(snap){
        var n=snap.size;if(!n)return;
        var el=document.getElementById('utilAuth');if(!el||!el.parentNode)return;
        var b=document.createElement('a');
        b.href='mypage.html#alarmBox';
        b.style.cssText='color:#fff;font-weight:900;margin-right:10px;text-decoration:none';
        b.innerHTML='🔔<span style="background:#C41E2F;border-radius:999px;padding:1px 7px;font-size:11px;margin-left:3px">'+(n>=30?'30+':n)+'</span>';
        el.parentNode.insertBefore(b,el);
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
        if(firebase.firestore)badge(u);
        else{
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
