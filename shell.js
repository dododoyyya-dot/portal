/* ══════════ KFDF shell.js (2026-11 · theme v3) ══════════
 * 모든 페이지 공통 겉틀의 동작: 상단 탭·글자 크기, 검색, 전체 메뉴, 펼침 메뉴 강조, 서브 메뉴 줄 위치,
 * 바닥글 사이트맵·관련 사이트, 오른쪽 빠른 메뉴, 스크롤 효과.
 * · 메뉴 자료는 auth_ui.js 가 그린 header nav.menu 를 그대로 읽습니다(메뉴를 바꿀 땐 auth_ui.js 의 MENU 만 고치면 됨).
 * · 기존 요소·id 는 지우지 않고 덧붙이기만 합니다. 이 파일이 실패해도 기존 화면은 그대로 동작합니다.
 */
(function(){
  if(window.KFDF_SHELL)return;
  var d=document;
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function el(tag,cls,html){var e=d.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
  function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
  var IC={
    search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.6-4.6"/></svg>',
    menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 6.5h16M4 12h16M4 17.5h16"/></svg>',
    x:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>',
    top:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V6M6 11l6-6 6 6"/></svg>',
    font:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18l5-12 5 12M5 14h6M15 18l3.2-8 3.3 8M16 15.5h4.5"/></svg>',
    school:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-5 9 5-9 5-9-5zM7 12.5V17c1.4 1.3 3.1 2 5 2s3.6-.7 5-2v-4.5M21 10v5"/></svg>',
    cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>'
  };
  var here=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  var MENU=[];   // [{t,h,d:[{t,h,admin,hidden}]}]
  function txt(a){var c=a.cloneNode(true);c.querySelectorAll('.kfdfNew').forEach(function(x){x.remove()});return c.textContent.trim()}   // 새 글 표시(N·숫자)는 빼고 이름만
  function readMenu(){
    MENU=[];
    d.querySelectorAll('header nav.menu > div').forEach(function(g){
      var top=g.querySelector('a.top');if(!top)return;
      var m={t:txt(top),h:top.getAttribute('href'),act:top.classList.contains('active'),d:[]};
      g.querySelectorAll('.drop a').forEach(function(a){m.d.push({t:txt(a),h:a.getAttribute('href'),admin:a.getAttribute('data-admin')==='1',hidden:a.hidden,blank:a.target==='_blank'})});
      MENU.push(m);
    });
    return MENU.length;
  }
  function linkHtml(x,cls){return '<a class="'+cls+'" href="'+esc(x.h)+'"'+(x.admin?' data-admin="1"'+(x.hidden?' hidden':''):'')+(x.blank?' target="_blank" rel="noopener"':'')+'>'+esc(x.t)+'</a>'}

  /* ── 상단 줄: 탭 + 글자 크기 ── */
  function util(){
    var w=d.querySelector('.util .wrap');if(!w||w.querySelector('.k-ut-tabs'))return;
    var tabs=[['연맹','index.html',/^(index|about|sports|notice|archive|faq|calendar|sponsor|privacy)\.html$/],
              ['유소년 사업','business.html?view=youth',/^(business|apply|jobs|safety|guide|leader|selected|schoollogs|completed)\.html$/],
              ['대회 · 기록','competition.html?view=list',/^(competition|match|results|live|gallery|play|tourney|photo|staff|club|clubhome|schoolclub)\.html$/],
              ['자격 · 증명','license.html?view=notices',/^(license|verify|certification|mypage)\.html$/]];
    var nav=el('nav','k-ut-tabs');nav.setAttribute('aria-label','분야 바로가기');
    nav.innerHTML=tabs.map(function(t){return '<a href="'+t[1]+'"'+(t[2].test(here)?' class="on"':'')+'>'+t[0]+'</a>'}).join('');
    w.insertBefore(nav,w.firstChild);
    var right=w.lastElementChild;
    if(right&&right!==nav){var fs=el('span','k-fs','<button type="button" data-z="-1" aria-label="글자 작게">가−</button><button type="button" data-z="1" aria-label="글자 크게">가+</button>');right.appendChild(fs);
      fs.addEventListener('click',function(e){var b=e.target.closest('button');if(b)zoom(+b.getAttribute('data-z'))})}
  }
  var ZL=[1,1.1,1.2];
  function zoom(step){var i=+(ls('kfdfZoom')||0);if(step!==undefined){i=Math.max(0,Math.min(ZL.length-1,i+step));ls('kfdfZoom',String(i))}
    try{d.body.style.zoom=ZL[i]===1?'':ZL[i]}catch(e){}}
  function zoomCycle(){var i=(+(ls('kfdfZoom')||0)+1)%ZL.length;ls('kfdfZoom',String(i));zoom()}

  /* ── 머리: 검색 · 전체 메뉴 단추 ── */
  function tools(){
    var nav=d.querySelector('header .nav');if(!nav||nav.querySelector('.k-tools'))return;
    var t=el('div','k-tools','<button type="button" class="k-b-s" aria-label="검색">'+IC.search+'</button><button type="button" class="k-b-m" aria-label="전체 메뉴">'+IC.menu+'</button>');
    nav.appendChild(t);
    t.querySelector('.k-b-s').addEventListener('click',openSearch);
    t.querySelector('.k-b-m').addEventListener('click',openAll);
    mega();
  }
  /* ── 메뉴별 펼침 판: 메뉴에 마우스를 올리면 머리가 흰 바탕으로 바뀌고, 그 메뉴의 하위 항목이 상자 모양으로 펼쳐짐 ── */
  var DESC={'연맹소개':'대한민국플라잉디스크연맹을 소개합니다.','종목소개':'원반 하나로 즐기는 플라잉디스크 종목을 안내합니다.','사업안내':'유소년 스포츠 기반구축사업과 학교 강습을 안내합니다.','대회':'대회 일정과 참가 신청, 경기 기록과 결과를 확인합니다.','클럽':'가까운 클럽을 찾고 함께 활동합니다.','자격증':'지도자·심판 자격 신청과 진위 확인을 합니다.','강사·활동':'강사 활동 지원과 안전교육을 안내합니다.','알림마당':'공지와 일정, 자료를 한곳에서 봅니다.'};
  function mega(){
    var header=d.querySelector('header'),nav=header&&header.querySelector('nav.menu');if(!nav||header.querySelector('.k-mega'))return;
    var mg=el('div','k-mega');
    mg.innerHTML='<div class="wrap">'+MENU.map(function(m){return '<div class="k-mg"><div class="k-mg-l"><b>'+esc(m.t)+'</b><p>'+esc(DESC[m.t]||'대한민국플라잉디스크연맹 누리집을 찾아 주셔서 고맙습니다.')+'</p></div><div class="k-mg-r">'+m.d.map(function(x){return linkHtml(x,'k-mg-a')}).join('')+'</div></div>'}).join('')+'</div>';
    header.appendChild(mg);
    var tm=null,panes=mg.querySelectorAll('.k-mg'),groups=nav.querySelectorAll(':scope > div');
    function open(i){if(window.innerWidth<=1080)return;clearTimeout(tm);panes.forEach(function(p,j){p.classList.toggle('on',i===j)});header.classList.add('k-mega-open')}
    function hold(){clearTimeout(tm)}
    function close(){clearTimeout(tm);tm=setTimeout(function(){header.classList.remove('k-mega-open')},140)}
    var gi=0;groups.forEach(function(g){if(!g.querySelector('a.top'))return;var i=gi++;g.addEventListener('mouseenter',function(){open(i)});g.addEventListener('focusin',function(){open(i)})});
    nav.addEventListener('mouseleave',close);mg.addEventListener('mouseenter',hold);mg.addEventListener('mouseleave',close);header.addEventListener('mouseleave',close);
    mg.addEventListener('focusin',hold);header.addEventListener('focusout',function(e){if(!header.contains(e.relatedTarget))close()});
    KFDF_SHELL.mega=open;
  }

  /* ── 검색 ── */
  var S=null,SIDX=[];
  function buildIndex(){
    SIDX=[];var seen={};
    MENU.forEach(function(m){m.d.forEach(function(x){if(x.admin&&x.hidden)return;var k=x.h;if(seen[k])return;seen[k]=1;SIDX.push({g:m.t,t:x.t,h:x.h,k:(m.t+' '+x.t).toLowerCase().replace(/\s/g,'')})})});
    [['회원','로그인 · 회원가입','login.html'],['회원','마이페이지 (내 정보 · 자격증 · 경력증명서)','mypage.html'],['안내','개인정보처리방침','privacy.html'],['대회','사진 공모전','photo.html'],['사업','담당교사 안내','teacher_guide.html'],['대회','심판 안내','referee_guide.html']]
      .forEach(function(x){if(!seen[x[2]])SIDX.push({g:x[0],t:x[1],h:x[2],k:(x[0]+x[1]).toLowerCase().replace(/\s/g,'')})});
  }
  function openSearch(){
    if(!S){
      S=el('div','k-search');S.setAttribute('role','dialog');S.setAttribute('aria-modal','true');S.setAttribute('aria-label','검색');
      S.innerHTML='<div class="k-dim"></div><div class="k-box"><button type="button" class="k-x" aria-label="닫기">'+IC.x+'</button><div class="k-in"><h3>무엇을 찾으세요?</h3>'
        +'<div class="k-field"><input type="search" placeholder="메뉴 이름을 입력하세요 (예: 자격증, 강습 신청, 대회 결과)" autocomplete="off"><button type="button" class="k-go" aria-label="검색">'+IC.search.replace('<svg','<svg width="22" height="22"')+'</button></div>'
        +'<div class="k-res"></div><div class="k-hint"></div></div></div>';
      d.body.appendChild(S);
      var inp=S.querySelector('input'),res=S.querySelector('.k-res'),sel=0,cur=[];
      S.querySelector('.k-hint').innerHTML=[['학교 강습 신청','apply.html'],['대회 일정','competition.html?view=list'],['연맹 자격증','license.html?view=notices'],['대회 결과','results.html'],['자료실','archive.html'],['자주 묻는 질문','faq.html?view=school']].map(function(x){return '<a href="'+x[1]+'">'+x[0]+'</a>'}).join('');
      function render(){var q=inp.value.toLowerCase().replace(/\s/g,'');
        if(!q){res.innerHTML='';cur=[];return}
        cur=SIDX.filter(function(x){return x.k.indexOf(q)>=0}).slice(0,9);sel=0;
        res.innerHTML=cur.length?cur.map(function(x,i){return '<a href="'+esc(x.h)+'"'+(i===0?' class="sel"':'')+'><small>'+esc(x.g)+'</small>'+esc(x.t)+'</a>'}).join('')
          :'<div class="k-none">맞는 메뉴가 없습니다. <a href="notice.html?view=board" style="color:#1452c8;font-weight:700;text-decoration:underline">공지사항</a>에서 찾아보세요.</div>'}
      function mark(){res.querySelectorAll('a').forEach(function(a,i){a.classList.toggle('sel',i===sel)})}
      inp.addEventListener('input',render);
      inp.addEventListener('keydown',function(e){
        if(e.key==='ArrowDown'){sel=Math.min(cur.length-1,sel+1);mark();e.preventDefault()}
        else if(e.key==='ArrowUp'){sel=Math.max(0,sel-1);mark();e.preventDefault()}
        else if(e.key==='Enter'){if(cur[sel])location.href=cur[sel].h}
      });
      S.querySelector('.k-go').addEventListener('click',function(){if(cur[sel])location.href=cur[sel].h;else inp.focus()});
      S.querySelector('.k-x').addEventListener('click',closeSearch);
      S.querySelector('.k-dim').addEventListener('click',closeSearch);
    }
    buildIndex();S.classList.add('on');d.documentElement.style.overflow='hidden';
    setTimeout(function(){var i=S.querySelector('input');if(i){i.value='';i.focus();S.querySelector('.k-res').innerHTML=''}},30);
  }
  function closeSearch(){if(S)S.classList.remove('on');d.documentElement.style.overflow=''}

  /* ── 전체 메뉴 ── */
  var A=null;
  function openAll(){
    if(!A){A=el('div','k-all');A.setAttribute('role','dialog');A.setAttribute('aria-modal','true');A.setAttribute('aria-label','전체 메뉴');d.body.appendChild(A);
      A.addEventListener('click',function(e){if(e.target.closest('.k-all-x'))closeAll()})}
    readMenu();
    var auth=d.getElementById('utilAuth');
    A.innerHTML='<div class="k-all-hd"><b>전체 메뉴</b><button type="button" class="k-all-x" aria-label="닫기">'+IC.x+'</button></div><div class="k-all-in">'
      +MENU.map(function(m){return '<div class="k-col"><h4><a href="'+esc(m.h)+'">'+esc(m.t)+'</a></h4>'+m.d.map(function(x){return linkHtml(x,'k-l')}).join('')+'</div>'}).join('')
      +'<div class="k-col"><h4>회원</h4><a class="k-l" href="'+esc(auth?auth.getAttribute('href'):'login.html')+'">'+esc(auth?auth.textContent.trim():'로그인')+'</a><a class="k-l" href="mypage.html">마이페이지</a><a class="k-l" href="apply.html">학교 강습 신청</a><a class="k-l" href="jobs.html?view=apply">강사 활동 지원</a></div></div>';
    A.classList.add('on');d.documentElement.style.overflow='hidden';
  }
  function closeAll(){if(A)A.classList.remove('on');d.documentElement.style.overflow=''}

  /* ── 서브 화면: 분야 번호 + 서브 메뉴 줄을 제목 띠 아래로 ── */
  function sub(){
    var gi=-1;MENU.forEach(function(m,i){if(m.act&&gi<0)gi=i});
    if(gi>=0)d.body.setAttribute('data-k-grp',String(gi+1));
    var ph=d.querySelector('.phero'),sn=d.querySelector('.subnav');
    if(ph&&sn&&sn.previousElementSibling!==ph&&ph.parentNode===sn.parentNode){ph.insertAdjacentElement('afterend',sn)}
  }

  /* ── 바닥글: 사이트맵 + 관련 사이트 ── */
  function foot(){
    var f=d.querySelector('footer .wrap');if(!f||f.querySelector('.k-ft-map'))return;
    var map=el('div','k-ft-map',MENU.map(function(m){return '<div><h5><a href="'+esc(m.h)+'">'+esc(m.t)+'</a></h5>'+m.d.filter(function(x){return !x.admin}).slice(0,7).map(function(x){return linkHtml(x,'k-l')}).join('')+'</div>'}).join(''));
    f.insertBefore(map,f.firstChild);
    var top=f.querySelector('.top');
    if(top){var fam=el('div','k-fam','<select aria-label="관련 사이트"><option value="">관련 사이트 바로가기</option>'
      +[['문화체육관광부','https://www.mcst.go.kr'],['국민체육진흥공단','https://www.kspo.or.kr'],['대한체육회','https://www.sports.or.kr'],['체육지도자연수원','https://sqms.kspo.or.kr'],['스포츠윤리센터','https://www.k-sec.or.kr'],['스포츠안전재단','https://www.sportsafety.or.kr'],['세계플라잉디스크연맹 (WFDF)','https://wfdf.sport']].map(function(x){return '<option value="'+x[1]+'">'+x[0]+'</option>'}).join('')+'</select>');
      top.appendChild(fam);
      fam.querySelector('select').addEventListener('change',function(){if(this.value){window.open(this.value,'_blank','noopener');this.value=''}})}
  }

  /* ── 오른쪽 빠른 메뉴 ── */
  function quick(){
    if(/^(admin|match|tourney|live|play|photo|intranet|tally|perm|sim)\.html$/.test(here)||d.querySelector('.k-quick'))return;
    var q=el('div','k-quick');q.setAttribute('aria-label','빠른 메뉴');
    q.innerHTML='<button type="button" class="q0" data-a="font">'+IC.font+'글자크기</button>'
      +'<a class="q1" href="apply.html">'+IC.school+'강습신청</a>'
      +'<a class="q2" href="calendar.html">'+IC.cal+'일정</a>'
      +'<a class="q0" href="about.html?view=way">'+IC.pin+'오시는길</a>'
      +'<button type="button" class="q3" data-a="top">'+IC.top+'TOP</button>';
    d.body.appendChild(q);
    q.addEventListener('click',function(e){var b=e.target.closest('[data-a]');if(!b)return;if(b.getAttribute('data-a')==='top')window.scrollTo({top:0,behavior:'smooth'});else zoomCycle()});
  }

  /* ── 스크롤 ── */
  function scroll(){
    var last=-1;
    function on(){var y=window.scrollY||0;if((y>8)!==(last>8))d.body.classList.toggle('k-scrolled',y>8);if(d.body.classList.contains('k-home'))d.body.classList.toggle('k-top',y<=40);last=y}
    window.addEventListener('scroll',on,{passive:true});on();
    if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.08});
      d.querySelectorAll('.k-rv').forEach(function(x){io.observe(x)});KFDF_SHELL.observe=function(x){io.observe(x)}}
    else d.querySelectorAll('.k-rv').forEach(function(x){x.classList.add('in')});
  }

  var done=false;
  function init(){
    if(done)return;
    if(!d.querySelector('header .nav'))return;             // 겉틀이 없는 단독 페이지(동의서·안내문 등)는 건드리지 않음
    readMenu();done=true;
    d.body.classList.add('k-shell');
    [util,tools,sub,foot,quick,scroll].forEach(function(f){try{f()}catch(e){console.warn('shell',e)}});
    zoom();
    try{var qv=new URLSearchParams(location.search).get('kshell');if(qv==='search')openSearch();else if(qv==='all')openAll();else if(qv&&qv.indexOf('mega')===0&&KFDF_SHELL.mega){KFDF_SHELL.mega(+(qv.slice(4)||3))}}catch(e){}   // 점검용: ?kshell=search|all|mega
    d.addEventListener('keydown',function(e){if(e.key==='Escape'){closeSearch();closeAll()}
      if(e.key==='/'&&!/^(INPUT|TEXTAREA|SELECT)$/.test((d.activeElement||{}).tagName||'')&&!(d.activeElement||{}).isContentEditable&&!e.ctrlKey&&!e.metaKey&&!e.altKey){/* '/' 로 검색 열기는 입력 화면과 겹칠 수 있어 쓰지 않음 */}});
  }
  window.KFDF_SHELL={init:init,search:openSearch,all:openAll,zoom:zoomCycle,observe:function(){}};
  // auth_ui.js 가 메뉴를 그린 뒤(DOMContentLoaded 처리 뒤)에 실행
  function later(){setTimeout(init,0);setTimeout(init,400)}
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',later);else later();
  window.addEventListener('load',function(){setTimeout(init,0)});
})();
