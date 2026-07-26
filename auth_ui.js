// 우측 상단 로그인/로그아웃 자동 전환 (전 페이지 공용)
(function(){
  var CFG={apiKey:"AIzaSyB-YuoXtSnuodHEbbjwHRyEjdShgNu4iLg",authDomain:"koreaflyingdiscfederation.firebaseapp.com",projectId:"koreaflyingdiscfederation",appId:"1:1081847355343:web:ca40ed9a52e13f607f64ba"};
  function ready(){
    if(!window.firebase||!firebase.auth)return;
    if(!firebase.apps.length)firebase.initializeApp(CFG);
    firebase.auth().onAuthStateChanged(function(u){
      var el=document.getElementById('utilAuth');if(!el)return;
      if(u){
        el.textContent='로그아웃';el.href='#';
        el.onclick=function(e){e.preventDefault();if(confirm('로그아웃 할까요?'))firebase.auth().signOut().then(function(){location.href='index.html'})};
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

// ── 모바일 메뉴(좌측 드로어): 스타일 직접 주입 — CSS 캐시와 무관하게 항상 적용
(function(){
  document.addEventListener('DOMContentLoaded',function(){
    var menu=document.querySelector('nav.menu');if(!menu)return;
    // 드로어 CSS를 <head> 맨 끝에 주입 (가장 나중 = 최우선)
    var st=document.createElement('style');st.id='kfdfDrawer';
    st.textContent='@media(max-width:1080px){'
      +'nav.menu{display:flex!important;flex-direction:column!important;align-items:stretch!important;'
      +'position:fixed!important;top:0!important;left:0!important;bottom:0!important;right:auto!important;'
      +'width:90%!important;max-width:400px!important;height:100%!important;max-height:none!important;'
      +'background:#fff!important;z-index:120!important;padding:64px 20px 80px!important;'
      +'overflow-y:auto!important;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;'
      +'box-shadow:14px 0 44px rgba(17,17,20,.25)!important;border:none!important;'
      +'transform:translateX(-105%)!important;transition:transform .22s ease!important;visibility:hidden!important}'
      +'nav.menu.open{transform:translateX(0)!important;visibility:visible!important}'
      +'nav.menu>div{width:100%!important}'
      +'nav.menu a.top{display:block!important;width:100%!important;font-size:19px!important;font-weight:800!important;'
      +'padding:16px 14px!important;border-bottom:1.5px solid #eef1f5!important;color:#1a1c22!important}'
      +'nav.menu .drop{display:block!important;position:static!important;transform:none!important;'
      +'box-shadow:none!important;border:none!important;min-width:0!important;padding:4px 0 14px 24px!important}'
      +'nav.menu .drop a{display:block!important;padding:13px 12px!important;font-size:16px!important;'
      +'font-weight:600!important;white-space:normal!important;color:#333!important}'
      +'.mclose{display:block!important;position:absolute;top:12px;right:12px;width:46px;height:46px;'
      +'border:none;background:#f2f4f8;border-radius:12px;font-size:22px;font-weight:900;color:#333;cursor:pointer;z-index:2}'
      +'.mbackdrop{position:fixed;inset:0;background:rgba(17,17,20,.5);z-index:110;opacity:0;visibility:hidden;transition:opacity .22s}'
      +'.mbackdrop.show{opacity:1;visibility:visible}}'
      +'@media(min-width:1081px){.mclose,.mbackdrop{display:none!important}}';
    document.head.appendChild(st);
    // 배경 딤
    var bd=document.createElement('div');bd.className='mbackdrop';document.body.appendChild(bd);
    // 닫기 버튼
    var cb=document.createElement('button');cb.className='mclose';cb.textContent='✕';cb.setAttribute('aria-label','메뉴 닫기');
    menu.insertBefore(cb,menu.firstChild);
    function close(){menu.classList.remove('open');bd.classList.remove('show');document.body.style.overflow='';}
    cb.addEventListener('click',close);
    bd.addEventListener('click',close);
    var mo=new MutationObserver(function(){
      var open=menu.classList.contains('open');
      bd.classList.toggle('show',open);
      document.body.style.overflow=open?'hidden':'';
    });
    mo.observe(menu,{attributes:true,attributeFilter:['class']});
    menu.addEventListener('click',function(e){
      if(e.target.tagName==='A')close();
    });
  });
})();
