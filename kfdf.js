/* ═══════════════════════════════════════════════════════════════
   KFDF 공용 권한·인증 모듈  (모든 페이지 공용, 1곳에서 관리)
   - Firebase 설정/초기화 단일화
   - 3축 권한체계 헬퍼: ① role(관리등급) ② caps(자격) ③ 소속
   사용법:
     <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
     <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
     <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
     <script src="kfdf.js"></script>
     <script>KFDF.ready(function(user, me, K){ ... });</script>
   ※ me 는 users/{uid} 문서 데이터(비로그인/미가입이면 null)
   ═══════════════════════════════════════════════════════════════ */
(function () {
  var CFG = {
    apiKey: "AIzaSyB-YuoXtSnuodHEbbjwHRyEjdShgNu4iLg",
    authDomain: "koreaflyingdiscfederation.firebaseapp.com",
    projectId: "koreaflyingdiscfederation",
    storageBucket: "koreaflyingdiscfederation.firebasestorage.app",
    messagingSenderId: "1081847355343",
    appId: "1:1081847355343:web:ca40ed9a52e13f607f64ba"
  };

  // ── 리더 레벨(포인트) 정의 — 단일 소스 ──
  var LVS = [[0, '어쏘 리더'], [100, '필드 리더'], [300, '치프 리더'], [600, '엘리트 리더'], [1000, '마스터 리더']];
  var LVC = ['#8a919d', '#0f766e', '#1F4E9C', '#7c3aed', '#b8860b'];
  function lvOf(p) { p = +p || 0; for (var i = LVS.length - 1; i >= 0; i--) if (p >= LVS[i][0]) return i + 1; return 1; }
  function lvName(p) { return LVS[lvOf(p) - 1][1]; }
  function lvColor(p) { return LVC[lvOf(p) - 1]; }

  function initApp() {
    if (!window.firebase || !firebase.initializeApp) return false;
    if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(CFG);
    return true;
  }

  /* ─── ① 관리 권한 등급 (role, 1인 1개) ─── */
  function roleOf(d) { return (d && d.role) || 'member'; }
  function isOwner(d) { return !!(d && d.owner === true); }
  function isAdmin(d) { return roleOf(d) === 'admin' || isOwner(d); }
  function isSidoOfficer(d) { return roleOf(d) === 'sidoOfficer'; }
  function isGugunOfficer(d) { return roleOf(d) === 'gugunOfficer'; }   // 구·군연맹 임원
  // 권역장: 만료일(regionAdminExpiresAt)이 지나면 자동 무효
  function regionActive(d) {
    if (roleOf(d) !== 'regionAdmin') return false;
    var e = d && d.regionAdminExpiresAt;
    if (!e) return true;
    try { var t = e.toDate ? e.toDate() : new Date(e); return new Date() < t; } catch (_) { return true; }
  }
  function isRegionAdmin(d) { return regionActive(d); }
  function isApproved(d) { return !!(d && d.status === 'approved'); }
  // 시도 단위 임원 권한 (시도임원 role 또는 하위호환 플래그)
  function canCalendar(d) { return isAdmin(d) || isSidoOfficer(d) || !!(d && d.calendarEditor === true); }
  function canApproveClub(d, sido, gugun) {
    return isAdmin(d)
      || (isSidoOfficer(d) && d && d.sido === sido)
      || (isGugunOfficer(d) && d && d.sido === sido && d.gugun === gugun)
      || !!(d && d.clubAdminSido === sido);
  }

  /* ─── ② 자격·활동 꼬리표 (caps, 여러 개 가능) ─── */
  function instFor(d) { return (d && d.instructorFor) || {}; }
  function isInstructor(d) { var f = instFor(d); return !!(f.school || f.after); }          // 강사(학교/방과후)
  function isVerifiedInstructor(d) { return isInstructor(d) && !!(d && d.instructorVerified); } // 사무국 검증 강사
  function isReferee(d) { return !!instFor(d).referee; }                                     // 심판
  function isStaff(d) { return !!instFor(d).staff; }                                         // 운영요원
  function isAthlete(d) { return !!(d && d.caps && d.caps.athlete) || !!(d && d.children && d.children.length); } // 선수(본인/자녀)

  /* ─── ③ 대표 신분 라벨 ─── */
  function roleLabel(d) {
    if (isOwner(d)) return '오너';
    if (roleOf(d) === 'admin') return '중앙관리자';
    if (isSidoOfficer(d)) return '시도연맹 임원';
    if (isGugunOfficer(d)) return '구·군연맹 임원';
    if (roleOf(d) === 'regionAdmin') return regionActive(d) ? '권역장' : '권역장(만료)';
    return '일반회원';
  }
  // 보유한 모든 자격 꼬리표 배열(뱃지 표시용)
  function capBadges(d) {
    var b = [];
    if (isVerifiedInstructor(d)) b.push('✔ 검증강사'); else if (isInstructor(d)) b.push('강사(신청)');
    if (isReferee(d)) b.push('심판');
    if (isStaff(d)) b.push('운영요원');
    if (isAthlete(d)) b.push('선수');
    if (d && d.edu2026) b.push('🎓 연수이수');
    return b;
  }

  /* ─── 인증 준비 + 내 문서 1회 로드 ─── */
  var _cache = null, _loaded = false, _waiters = [];
  function ready(cb) {
    if (_loaded) { cb(_cache && _cache.user, _cache && _cache.me, API); return; }
    _waiters.push(cb);
    if (_waiters.length > 1) return; // 최초 호출만 부팅
    boot(0);
  }
  function boot(n) {
    if (!initApp() || !firebase.auth) { if (n < 40) return void setTimeout(function () { boot(n + 1); }, 150); return finish(null, null); }
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) return finish(null, null);
      // firestore 로드 보장
      if (!firebase.firestore) {
        var s = document.createElement('script');
        s.src = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js';
        s.onload = function () { loadDoc(user); };
        s.onerror = function () { finish(user, null); };
        document.head.appendChild(s);
      } else loadDoc(user);
    });
  }
  function loadDoc(user) {
    firebase.firestore().collection('users').doc(user.uid).get()
      .then(function (d) { finish(user, d.exists ? d.data() : null); })
      .catch(function () { finish(user, null); });
  }
  function finish(user, me) {
    _cache = { user: user, me: me }; _loaded = true;
    var w = _waiters.slice(); _waiters = [];
    w.forEach(function (cb) { try { cb(user, me, API); } catch (e) { console.warn(e); } });
  }

  // 알림 생성 (수신자 uid, 제목, 클릭 시 이동 링크) — 실패해도 본 작업엔 영향 없음
  function notify(toUid, title, link) {
    try {
      if (!toUid || !window.firebase || !firebase.firestore) return Promise.resolve();
      return firebase.firestore().collection('notifications').add({
        toUid: toUid, title: String(title || ''), link: String(link || ''),
        read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(function () {});
    } catch (e) { return Promise.resolve(); }
  }

  // ── 전국 학교 표준 DB (내장 JSON) 자동완성 ──
  var _schools=null, _schoolLoading=false, _schoolWaiters=[];
  function escHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function loadSchools(cb){
    if(_schools) return cb(_schools);
    _schoolWaiters.push(cb);
    if(_schoolLoading) return;
    _schoolLoading=true;
    fetch('schools_min.json?v=20260818')
      .then(function(r){ return r.json(); })
      .then(function(a){ _schools=a; _schoolLoading=false; var w=_schoolWaiters.slice(); _schoolWaiters=[]; w.forEach(function(fn){ fn(_schools); }); })
      .catch(function(e){ _schoolLoading=false; console.warn('schools load fail',e); var w=_schoolWaiters.slice(); _schoolWaiters=[]; w.forEach(function(fn){ fn([]); }); });
  }
  function schoolSearch(q, limit){
    if(!_schools) return [];
    q=String(q||'').trim().replace(/\s+/g,'');
    if(!q) return [];
    var q2=q.replace(/(초등학교|중학교|고등학교|학교)$/,'');
    var re=new RegExp(q,'i');
    return _schools.filter(function(x){ return re.test(x.name) || (q2&&q2!==q && x.name.replace(/(초등학교|중학교|고등학교|학교)$/,'').indexOf(q2)>=0); }).slice(0, limit||10);
  }
  function schoolAuto(input, onSelect){
    input.setAttribute('autocomplete','off');
    var wrap=input.parentElement;
    var dd=document.createElement('div');
    dd.style.cssText='position:absolute;z-index:10000;top:'+(input.offsetTop+input.offsetHeight)+'px;left:'+input.offsetLeft+'px;max-height:240px;overflow:auto;background:#fff;border:1.5px solid #dfe5ee;border-radius:10px;padding:6px 0;box-shadow:0 10px 28px rgba(0,0,0,.12);width:'+input.offsetWidth+'px;display:none;';
    if(wrap){ wrap.style.position='relative'; wrap.appendChild(dd); }
    else { dd.style.position='fixed'; document.body.appendChild(dd); }
    function show(){ dd.style.display='block'; }
    function hide(){ dd.style.display='none'; }
    function fill(list){
      dd.innerHTML='';
      if(!list.length){ dd.innerHTML='<div style="padding:8px 14px;font-size:12.5px;color:#8a919d">검색 결과가 없습니다</div>'; show(); return; }
      list.forEach(function(s){
        var d=document.createElement('div');
        d.className='sch-item';
        d.style.cssText='padding:8px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid #f1f5f9';
        d.innerHTML=escHtml(s.name)+' <span style="font-size:11px;color:#8a919d">('+(s.kind||'-')+')</span>';
        d.onmousedown=function(e){ e.preventDefault(); input.value=s.name; hide(); if(typeof onSelect==='function') onSelect(s.name); };
        dd.appendChild(d);
      });
      show();
    }
    input.addEventListener('focus', function(){ loadSchools(function(){ fill(schoolSearch(input.value, 10)); }); });
    input.addEventListener('input', function(){ loadSchools(function(){ fill(schoolSearch(input.value, 10)); }); });
    input.addEventListener('keydown', function(e){ if(e.key==='Escape') hide(); });
    document.addEventListener('click', function(e){ if(e.target!==input && e.target!==dd) hide(); });
  }

  var API = {
    CFG: CFG, initApp: initApp, ready: ready, notify: notify,
    loadSchools: loadSchools, schoolSearch: schoolSearch, schoolAuto: schoolAuto,
    // 등급
    roleOf: roleOf, isOwner: isOwner, isAdmin: isAdmin, isSidoOfficer: isSidoOfficer, isGugunOfficer: isGugunOfficer,
    isRegionAdmin: isRegionAdmin, regionActive: regionActive, isApproved: isApproved,
    canCalendar: canCalendar, canApproveClub: canApproveClub,
    // 자격
    isInstructor: isInstructor, isVerifiedInstructor: isVerifiedInstructor,
    isReferee: isReferee, isStaff: isStaff, isAthlete: isAthlete,
    // 표시
    roleLabel: roleLabel, capBadges: capBadges,
    // 레벨
    LVS: LVS, LVC: LVC, lvOf: lvOf, lvName: lvName, lvColor: lvColor
  };
  window.KFDF = API;
})();
