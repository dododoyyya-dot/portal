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

// ── 모바일 메뉴(좌측 드로어): 닫기버튼·배경딤 주입 + 스크롤 잠금 + 링크 탭 시 닫힘 (menuScrollLock)
(function(){
  document.addEventListener('DOMContentLoaded',function(){
    var menu=document.querySelector('nav.menu');if(!menu)return;
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
