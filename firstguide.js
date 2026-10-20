/* [2026-10-20] 처음 오신 분 안내 팝업 — 「무엇을 하러 오셨어요?」 → 역할별 단계(로그인·서명 상태를 보고 지금 할 차례 표시)
   · 처음 방문(기기 기준) 때 한 번 자동으로 열림(index·competition·match 만, 경기 기록 화면 ?m= 제외) — 이후에는 왼쪽 아래 「❓ 처음이세요?」 버튼
   · <script src="firstguide.js" data-auto="1" data-bottom="14"> — data-auto: 자동 열기, data-bottom: 버튼 높이(px)
   · 축전 공고 FG_SLOT, 안내 기간 FG_END 이후에는 버튼·팝업 모두 숨김 */
(function(){
  var FG_SLOT='DTxbzDpc1D0m1hiEi0lA', FG_END='2026-11-08', TEL='031-984-3248';
  var K_SEEN='kfdfFG1_seen', K_ROLE='kfdfFG1_role', K_HIDE='kfdfFG1_hideBtn';
  if(new Date().toISOString().slice(0,10)>FG_END)return;
  var me=document.currentScript||{};var auto=me.getAttribute&&me.getAttribute('data-auto')==='1';var bottom=+((me.getAttribute&&me.getAttribute('data-bottom'))||14);
  function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){return null}}
  var S='slot='+FG_SLOT;
  var ROLES={
    teacher:{ic:'🧑‍🏫',t:'선생님',d:'우리 학교 팀을 데리고 나가요',steps:[
      {k:'login',t:'회원가입 · 로그인',d:'회원 유형 <b>일반회원 → 협력기관</b>으로 가입하면 바로 쓸 수 있어요. 이미 회원이면 로그인만!',go:[['회원가입','login.html?tab=signup&next=mypage.html'],['로그인','login.html']]},
      {k:'sign',t:'서명 등록',d:'한 번만 해 두면 오더지·결과지에 자동으로 들어가요. (1분)',go:[['서명하러 가기','mypage.html#sigBox']]},
      {k:'apply',t:'단체전 참가 신청',d:'대회 공고에서 <b>👥 단체전 참가 신청</b> → 학교·부문 고르고 선수 명단(엑셀 가능) 올리기',go:[['대회 공고 열기','competition.html?'+S]]},
      {k:'order',t:'오더지 제출',d:'<b>📝 오더지</b> 탭 → 우리 팀 작성 → 경기복 색·배번·주장 1명 → <b>✅ 제출</b>. 첫 경기 전까지!',go:[['오더지 쓰러 가기','match.html?'+S+'&tab=order']]},
      {k:'board',t:'대회 전날 시간표 확인',d:'우리 경기 시각·구장을 보고(로그인 상태), 학생들에게 입을 경기복·배번을 알려 주세요. 학부모님께는 로그인 없이 보는 <b>대회 결과</b> 화면을 알려 주시면 돼요.',go:[['시간표 보기','match.html?'+S+'&tab=board']]},
      {k:'result',t:'당일 응원 · 결과 확인',d:'기록은 심판이 해요. 선생님은 응원! 결과·기록지는 끝나면 바로 볼 수 있어요.',go:[['실시간 스코어','index.html'],['대회 결과','results.html?id=slot_'+FG_SLOT],['📸 사진 공모전','photo.html']]}
    ],more:['📖 선생님 안내서 전체 보기','teacher_guide.html']},
    referee:{ic:'🧑‍⚖️',t:'심판 · 운영요원',d:'대회에서 심판·기록을 맡아요',steps:[
      {k:'login',t:'로그인',d:'심판 모집에 <b>신청한 그 계정</b>으로 로그인해야 내 경기와 기록 권한이 보여요.',go:[['로그인','login.html']]},
      {k:'sign',t:'서명 등록',d:'경기 결과지 심판 서명란에 자동으로 들어가요.',go:[['서명하러 가기','mypage.html#sigBox']]},
      {k:'mine',t:'내 담당 경기 확인',d:'시간표에서 <b>🔎 내 경기 찾기</b>를 누르면 내 경기가 보라색 테두리로 보여요.',go:[['시간표 · 내 경기','match.html?'+S+'&tab=board']]},
      {k:'rec',t:'경기 기록하는 법',d:'경기 카드를 눌러 기록 화면 → 득점·제재 입력 → 감독관이 종료·확정. 미리 한 번 읽어 두세요!',go:[['심판 가이드','referee_guide.html']]}
    ],more:['📖 심판 가이드 전체 보기','referee_guide.html']},
    fan:{ic:'📣',t:'학부모 · 학생',d:'경기 보고 응원하러 왔어요',steps:[
      {k:'board',t:'우리 학교 경기 시간',d:'대진·결과 화면에서 부문별로 경기 시각·구장을 볼 수 있어요. <b>로그인 없이</b> 볼 수 있고, 점수도 자동으로 바뀌어요.',go:[['경기 시간표 · 대진','results.html?id=slot_'+FG_SLOT]]},
      {k:'live',t:'실시간 스코어 · 중계',d:'홈 화면 위쪽에 구장별 점수가 실시간으로 떠요. 라이브 중계도 있어요.',go:[['실시간 스코어','index.html'],['라이브 중계','live.html']]},
      {k:'play',t:'🥏 원반 놀이터',d:'경기 사이 쉬는 시간엔 원반 골프 미니게임·룰 퀴즈·포지션 테스트·오늘의 운세! 승부 예측도 해 보세요.',go:[['놀이터 가기','play.html']]},
      {k:'photo',t:'📸 사진 공모전',d:'경기 사진을 우리 학교 앨범에 올려 주세요. 계정당 10장, 부문별 1위 시상! (로그인 필요)',go:[['사진 올리러 가기','photo.html']]},
      {k:'result',t:'결과 · 기록 보기',d:'같은 화면의 📋 순위표 · ⚡ 득점 · 어시스트 탭에서 순위와 득점 기록을 볼 수 있어요.',go:[['대회 결과','results.html?id=slot_'+FG_SLOT]]}
    ]}
  };
  var ST={login:null,sign:null};   // null = 아직 모름
  var CSS='.fg-btn{position:fixed;left:14px;z-index:9000;display:flex;align-items:center;gap:6px;background:#153A77;color:#fff;border:0;border-radius:999px;padding:10px 15px 10px 12px;font:800 13.5px/1 Pretendard,"Malgun Gothic",sans-serif;box-shadow:0 6px 18px rgba(21,58,119,.35);cursor:pointer}'
   +'.fg-btn i{font-style:normal;display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#ffd84d;color:#153A77;font-size:13px}'
   +'.fg-btn:hover{transform:translateY(-1px)}'
   +'.fg-ov{position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,.5);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Pretendard,"Malgun Gothic",sans-serif;word-break:keep-all;overflow-wrap:break-word}'
   +'.fg-box{background:#fff;border-radius:22px;max-width:520px;width:100%;max-height:calc(100vh - 32px);overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);color:#1c2430;animation:fgIn .22s ease-out}'
   +'@keyframes fgIn{from{transform:translateY(14px);opacity:0}to{transform:none;opacity:1}}'
   +'.fg-hd{background:linear-gradient(135deg,#153A77,#2f6db5);color:#fff;padding:20px 22px 18px;border-radius:22px 22px 0 0;position:relative}'
   +'.fg-hd h3{margin:0;font-size:19px;font-weight:900}.fg-hd p{margin:6px 0 0;font-size:13px;opacity:.88;line-height:1.5}'
   +'.fg-x{position:absolute;right:12px;top:12px;width:32px;height:32px;border-radius:50%;border:0;background:rgba(255,255,255,.18);color:#fff;font-size:16px;cursor:pointer}'
   +'.fg-bd{padding:16px 18px 6px}'
   +'.fg-who{display:grid;gap:10px}.fg-who button{display:flex;align-items:center;gap:14px;text-align:left;border:2px solid #e2e8f2;background:#fff;border-radius:16px;padding:14px 16px;cursor:pointer;font-family:inherit}'
   +'.fg-who button:hover{border-color:#2f6db5;background:#f5f9ff}.fg-who .e{font-size:30px;line-height:1}.fg-who b{display:block;font-size:16px;color:#153A77}.fg-who small{font-size:12.5px;color:#6b7280}'
   +'.fg-st{display:flex;gap:12px;padding:12px 0;border-bottom:1px dashed #e2e8f2}.fg-st:last-child{border-bottom:0}'
   +'.fg-n{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:900;font-size:14px;background:#eef2f8;color:#6b7280}'
   +'.fg-st.now .fg-n{background:#ffd84d;color:#153A77;box-shadow:0 0 0 4px rgba(255,216,77,.35)}.fg-st.done .fg-n{background:#16a34a;color:#fff}'
   +'.fg-st.now{background:#fffbea;margin:0 -10px;padding:12px 10px;border-radius:14px;border-bottom-color:transparent}'
   +'.fg-st h4{margin:3px 0 3px;font-size:15px;color:#153A77}.fg-st h4 em{font-style:normal;font-size:11px;font-weight:900;border-radius:999px;padding:2px 7px;margin-left:6px;vertical-align:2px}'
   +'.fg-st.now h4 em{background:#153A77;color:#ffd84d}.fg-st.done h4 em{background:#dcfce7;color:#15803d}'
   +'.fg-st p{margin:0 0 7px;font-size:13px;color:#4b5563;line-height:1.55}.fg-go{display:flex;flex-wrap:wrap;gap:6px}'
   +'.fg-go a{display:inline-block;text-decoration:none;font-size:12.5px;font-weight:800;color:#153A77;background:#eaf1fb;border-radius:999px;padding:6px 12px}'
   +'.fg-st.now .fg-go a:first-child{background:#153A77;color:#fff}'
   +'.fg-ft{padding:12px 18px 18px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:12.5px;color:#6b7280}'
   +'.fg-ft a.more{font-weight:800;color:#153A77;text-decoration:none;background:#f3f5f9;border-radius:10px;padding:8px 12px}'
   +'.fg-ft .lk{border:0;background:none;color:#6b7280;text-decoration:underline;cursor:pointer;font:inherit;padding:0}'
   +'.fg-tel{display:block;width:100%;margin-top:4px}.fg-tel a{color:#153A77;font-weight:800}'
   +'@media (max-width:560px){.fg-ov{align-items:flex-end;padding:0}.fg-box{border-radius:22px 22px 0 0;max-height:88vh}.fg-btn{padding:9px 13px 9px 10px;font-size:12.5px}}'
   +'@media print{.fg-btn,.fg-ov{display:none!important}}body:has(.rc) .fg-btn,body:has(#fgOv) .fg-btn{display:none}';   /* 경기 기록 화면 위에서는 숨김 */
  function css(){if(document.getElementById('fgCss'))return;var s=document.createElement('style');s.id='fgCss';s.textContent=CSS;document.head.appendChild(s)}
  function close(){var o=document.getElementById('fgOv');if(o)o.remove();ls(K_SEEN,'1');document.removeEventListener('keydown',onKey)}
  function onKey(e){if(e.key==='Escape')close()}
  function stepState(k){if(k==='login')return ST.login===true?'done':ST.login===false?'todo':'';if(k==='sign')return ST.sign===true?'done':(ST.login===true&&ST.sign===false)?'todo':'';return ''}
  function body(role){
    if(!role||!ROLES[role]){
      return '<div class="fg-hd"><button class="fg-x" data-fg="x" aria-label="닫기">✕</button><h3>🥏 처음 오셨나요? 반가워요!</h3><p>무엇을 하러 오셨는지 골라 주시면<br>지금 해야 할 일을 순서대로 알려 드릴게요.</p></div>'
        +'<div class="fg-bd"><div class="fg-who">'+Object.keys(ROLES).map(function(k){var r=ROLES[k];return '<button data-fg="role" data-r="'+k+'"><span class="e">'+r.ic+'</span><span><b>'+r.t+'</b><small>'+r.d+'</small></span></button>'}).join('')+'</div></div>'
        +'<div class="fg-ft"><button class="lk" data-fg="x">그냥 둘러볼게요</button><span class="fg-tel">막히면 연맹 사무국 <a href="tel:'+TEL+'">'+TEL+'</a> (평일 09~18시 · 대회 기간 현장 운영본부)</span></div>';
    }
    var r=ROLES[role];var nowSet=false;
    var rows=r.steps.map(function(s,i){var st=stepState(s.k);var cls='';
      if(st==='done')cls='done';else if(!nowSet&&(st==='todo'||(st===''&&(s.k!=='sign'||ST.login!==null)))){cls='now';nowSet=true}
      return '<div class="fg-st '+cls+'"><div class="fg-n">'+(cls==='done'?'✓':(i+1))+'</div><div style="flex:1;min-width:0"><h4>'+s.t+(cls==='done'?'<em>완료</em>':cls==='now'?'<em>지금 할 차례</em>':'')+'</h4><p>'+s.d+'</p><div class="fg-go">'+s.go.map(function(g){return '<a href="'+g[1]+'" data-fg="go">'+g[0]+' →</a>'}).join('')+'</div></div></div>'}).join('');
    return '<div class="fg-hd"><button class="fg-x" data-fg="x" aria-label="닫기">✕</button><h3>'+r.ic+' '+r.t+' — 이 순서대로 하시면 돼요</h3><p>'+(ST.login===true?'로그인되어 있어요. 노란 칸이 지금 하실 일이에요.':'노란 칸부터 차례대로! 버튼을 누르면 그 화면으로 바로 가요.')+'</p></div>'
      +'<div class="fg-bd">'+rows+'</div>'
      +'<div class="fg-ft">'+(r.more?'<a class="more" href="'+r.more[1]+'" data-fg="go">'+r.more[0]+'</a>':'')+'<span style="flex:1"></span><button class="lk" data-fg="back">← 다른 역할 고르기</button>'
      +'<span class="fg-tel">막히면 연맹 사무국 <a href="tel:'+TEL+'">'+TEL+'</a> · <button class="lk" data-fg="hide">왼쪽 아래 버튼 숨기기</button></span></div>';
  }
  function open(role){css();var o=document.getElementById('fgOv');
    if(!o){o=document.createElement('div');o.id='fgOv';o.className='fg-ov';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');
      o.addEventListener('click',function(e){var t=e.target.closest?e.target.closest('[data-fg]'):null;if(e.target===o){close();return}if(!t)return;var a=t.getAttribute('data-fg');
        if(a==='x')close();else if(a==='role'){ls(K_ROLE,t.getAttribute('data-r'));draw(t.getAttribute('data-r'))}else if(a==='back'){ls(K_ROLE,null);draw('')}
        else if(a==='hide'){ls(K_HIDE,'1');var b=document.getElementById('fgBtn');if(b)b.remove();close()}else if(a==='go'){ls(K_SEEN,'1')}});
      document.body.appendChild(o);document.addEventListener('keydown',onKey)}
    draw(role===undefined?(ls(K_ROLE)||''):role)}
  function draw(role){var o=document.getElementById('fgOv');if(!o)return;o.innerHTML='<div class="fg-box">'+body(role)+'</div>';o.dataset.role=role||''}
  function redraw(){var o=document.getElementById('fgOv');if(o)draw(o.dataset.role||'')}
  function button(){if(ls(K_HIDE)||document.getElementById('fgBtn'))return;css();var b=document.createElement('button');b.id='fgBtn';b.className='fg-btn';b.style.bottom='calc('+bottom+'px + env(safe-area-inset-bottom,0px))';b.innerHTML='<i>?</i>처음이세요?';b.title='처음 오신 분 안내';b.onclick=function(){open()};document.body.appendChild(b)}
  // 로그인·서명 상태(있으면) — firebase 가 늦게 올라오는 페이지도 있어 잠시 기다림
  function watchAuth(n){
    if(window.firebase&&firebase.apps&&firebase.apps.length&&firebase.auth){
      firebase.auth().onAuthStateChanged(function(u){ST.login=!!u;ST.sign=null;redraw();
        if(u&&firebase.firestore)firebase.firestore().collection('users').doc(u.uid).get().then(function(d){ST.sign=!!(d.exists&&d.data().signatureImg);redraw()}).catch(function(){})});return}
    if(n<40)setTimeout(function(){watchAuth(n+1)},300);else{ST.login=false;redraw()}}
  function autoOpen(n){
    if(!auto||ls(K_SEEN))return;if(/[?&]m=/.test(location.search))return;
    if(document.querySelector('[id^="sitePopup_"],.modal-ov.show,#fgOv')&&n<60){setTimeout(function(){autoOpen(n+1)},700);return}   // 관리자 공지 팝업이 먼저 떠 있으면 닫힌 뒤에
    open()}
  function start(){button();watchAuth(0);setTimeout(function(){autoOpen(0)},1200)}
  window.KFDF_FG={open:open};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
