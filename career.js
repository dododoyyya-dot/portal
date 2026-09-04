/* ═══════════════════════════════════════════════════════════════════════
   KFDF 경력 공용 모듈 (career.js) — 이력 · 경력 점수 · 등급 · 배지 · 아이콘 · 종료 보고 · 갤러리 초안
   ─────────────────────────────────────────────────────────────────────
   저장소: staffCareer/{id}  (한 사람의 하루 임무/참가/입상이 문서 1건)
     uid, name, date(YYYY-MM-DD), competitionName, role(주심·부심·운영·선수·입상 …), group(위원|심판|운영|봉사|지도|선수|입상),
     kind(staff|athlete|award|volunteer), sport, location, organizer, division, team, result(입상 내용), days(1),
     postId|slotId, source(staff-complete|comp-complete|manual), verified(true), kidName, registeredAt, by
   종료 보고: eventReports/{id}   갤러리: gallery/{id}  (자세한 필드는 각 함수 주석)
   아이콘: 이모지 대신 직접 그린 SVG 세트 — CAREER.svg(이름,{size,color}) · CAREER.medal(배지) · CAREER.emblem(등급)
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
  /* ────────── 1. SVG 아이콘 세트 (24×24, 선 1.8px, 둥근 끝) ────────── */
  var P={
    flag:'M5 21V4M5 4h11l-2 4 2 4H5',
    check:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8.5 12.2l2.4 2.4 4.8-5',
    x:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5l5 5M14.5 9.5l-5 5',
    edit:'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
    user:'M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 3.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8',
    users:'M17 21v-2a4 4 0 0 0-3-3.9M13 7a4 4 0 0 1 0 8M11 21v-2a4 4 0 0 0-4-4H4a4 4 0 0 0-3 4v2M7 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8',
    child:'M12 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM7 21v-4a5 5 0 0 1 10 0v4M9 14l-3 3M15 14l3 3',
    card:'M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
    whistle:'M3 13a6 6 0 1 0 12 0v-3H3zM15 10h6v3h-6zM9 13h.01',
    gear:'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    heart:'M12 21s-7.5-4.6-9.5-9.2A5.2 5.2 0 0 1 12 6.6a5.2 5.2 0 0 1 9.5 5.2C19.5 16.4 12 21 12 21z',
    megaphone:'M3 11v2a1 1 0 0 0 1 1h2l7 4V6l-7 4H4a1 1 0 0 0-1 1zM17 9a4.5 4.5 0 0 1 0 6M19.5 6.5a8 8 0 0 1 0 11',
    disc:'M3 12c0-2.2 4-4 9-4s9 1.8 9 4-4 4-9 4-9-1.8-9-4zM8 12c0-.8 1.8-1.5 4-1.5s4 .7 4 1.5-1.8 1.5-4 1.5-4-.7-4-1.5z',
    trophy:'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3',
    shield:'M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3zM12 8l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z',
    medal:'M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM8.5 14l-2 7 5.5-3 5.5 3-2-7M12 8l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2L9.1 10l2-.3z',
    star:'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z',
    sparkle:'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM5 17l.8 2.2L8 20l-2.2.8L5 23l-.8-2.2L2 20l2.2-.8zM19 15l.6 1.4L21 17l-1.4.6L19 19l-.6-1.4L17 17l1.4-.6z',
    camera:'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    play:'M5 4l14 8-14 8z',
    image:'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 16l5-5 4 4 3-3 6 6M16.5 9.5h.01',
    lock:'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V7a4 4 0 0 1 8 0v4',
    globe:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.7 4 5.7 4 9s-1.5 6.3-4 9c-2.5-2.7-4-5.7-4-9s1.5-6.3 4-9z',
    upload:'M12 16V4M7 9l5-5 5 5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
    trash:'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
    plus:'M12 5v14M5 12h14',
    calendar:'M4 5h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 10h18M8 3v4M16 3v4',
    pin:'M12 21s-6-5.7-6-11a6 6 0 0 1 12 0c0 5.3-6 11-6 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    doc:'M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h6',
    printer:'M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z',
    target:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
    clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
    map:'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
    stadium:'M3 10c0-2.5 4-4.5 9-4.5s9 2 9 4.5v4c0 2.5-4 4.5-9 4.5s-9-2-9-4.5zM3 10c0 2.5 4 4.5 9 4.5s9-2 9-4.5M8 6v-2M16 6v-2M12 5.5v-2.5',
    layers:'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
    sun:'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    snow:'M12 2v20M2 12h20M5 5l14 14M19 5L5 19M12 2l-2 2M12 2l2 2M12 22l-2-2M12 22l2-2',
    leaf:'M5 21c0-9 5-16 16-16-1 11-6 16-16 16zM5 21c4-6 8-9 12-12',
    moon:'M20 15A8.5 8.5 0 0 1 9 4a8.5 8.5 0 1 0 11 11z',
    bolt:'M13 2L4 14h7l-1 8 9-12h-7z',
    fire:'M12 22c-4 0-7-3-7-7 0-3 2-5 3-7 0 2 1 3 2 3 0-4 2-7 5-9 0 3 1 5 3 7 2 2 2 4 2 6 0 4-3 7-8 7zM12 22c-2 0-3-1.5-3-3s1.5-3 3-5c1.5 2 3 3 3 5s-1 3-3 3z',
    rocket:'M5 19c1-3 3-4 3-4M12 4c3-1 6 0 7 1-1 3-3 6-7 9l-2-2 2-8zM9 12l-3 1 1 3M12 12l3 3-1 3',
    crown:'M3 18h18l-1 3H4zM3 18l-1-9 5 4 5-8 5 8 5-4-1 9',
    handshake:'M8 12l4-4 4 4M3 11l5-5 4 1 4-1 5 5M3 11l4 4 5 5 5-5 4-4M9 15l3 3M12 12l3 3',
    key:'M15 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM15 9h.01M10.5 13.5L3 21M6 18l2 2M8 16l2 2',
    coffee:'M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h2a2 2 0 0 1 0 4h-2M7 3v2M11 3v2',
    dice:'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01',
    ghost:'M5 21V11a7 7 0 0 1 14 0v10l-2.3-2-2.4 2-2.3-2-2.3 2-2.4-2zM9.5 10h.01M14.5 10h.01',
    turtle:'M4 14c0-4 3.5-7 8-7s8 3 8 7H4zM4 14h16v2H4zM6 16l-1 3M18 16l1 3M12 7V5M2 13h2M20 13h2',
    balloon:'M12 3a6 7 0 1 0 0 14 6 7 0 0 0 0-14zM12 17l-1 2h2zM12 19c0 1 1 2 0 3',
    cake:'M4 13h16v8H4zM4 17h16M8 13V9M12 13V9M16 13V9M8 9c0-1 1-2 0-3M12 9c0-1 1-2 0-3M16 9c0-1 1-2 0-3',
    compass:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z',
    trend:'M3 17l6-6 4 4 8-8M15 7h6v6',
    hourglass:'M6 3h12M6 21h12M8 3c0 4 4 6 4 9s-4 5-4 9M16 3c0 4-4 6-4 9s4 5 4 9',
    gamepad:'M6 8h12a4 4 0 0 1 4 4v3a3 3 0 0 1-5.5 1.6L15 15H9l-1.5 1.6A3 3 0 0 1 2 15v-3a4 4 0 0 1 4-4zM8 11v3M6.5 12.5h3M16 11h.01M18 13h.01',
    bell:'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
    home:'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    scale:'M12 3v18M4 7h16M6 7l-3 7a4 4 0 0 0 8 0zM18 7l-3 7a4 4 0 0 0 8 0zM8 21h8',
    numbers:'M4 8h4M6 8v9M12 12a2 2 0 1 1 4 0c0 2-4 3-4 5h4M20 8v9',
    eye:'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    smile:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 10h.01M15 10h.01M8.5 14a4 4 0 0 0 7 0'
  };
  var _gid=0;
  function svg(name,o){
    o=o||{};var d=P[name]||P.sparkle;var sz=o.size||18;var col=o.color||'currentColor';var sw=o.stroke||1.8;
    return '<svg class="ci" width="'+sz+'" height="'+sz+'" viewBox="0 0 24 24" fill="'+(o.fill||'none')+'" stroke="'+col+'" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;flex:none'+(o.style?';'+o.style:'')+'" aria-hidden="true"><path d="'+d+'"/></svg>';
  }
  /* 메달(배지) — 희귀도별 그라데이션 원형 + 안쪽 링 + 흰 글리프. 잠김이면 회색·자물쇠 */
  var RARITY={common:['#7f8ea3','#4b5a70'],uncommon:['#3dbb8c','#0f766e'],rare:['#4f8ef7','#153A77'],epic:['#b06cff','#5b21b6'],legendary:['#ffb547','#c2410c'],fun:['#ff7aa2','#c41e2f']};
  function medal(o){
    o=o||{};var sz=o.size||56;var id='cg'+(++_gid);var c=RARITY[o.rarity]||RARITY.common;
    var locked=!!o.locked;var g1=locked?'#cfd5df':c[0],g2=locked?'#9aa3b2':c[1];
    var glyph='<svg x="16" y="16" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="'+(P[o.icon]||P.sparkle)+'"/></svg>';
    var lock=locked?'<circle cx="50" cy="50" r="9" fill="#fff"/><svg x="43" y="43" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="'+P.lock+'"/></svg>':'';
    return '<svg width="'+sz+'" height="'+sz+'" viewBox="0 0 64 64" aria-hidden="true" style="display:block;flex:none;'+(locked?'opacity:.75':'')+'"><defs><radialGradient id="'+id+'" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="'+g1+'"/><stop offset="1" stop-color="'+g2+'"/></radialGradient></defs>'
      +'<circle cx="32" cy="32" r="30" fill="url(#'+id+')"/><circle cx="32" cy="32" r="30" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/><circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.2" stroke-dasharray="3 3"/>'
      +(locked?'':'<path d="M18 14a20 20 0 0 1 28 0" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="3" stroke-linecap="round"/>')
      +glyph+lock+'</svg>';
  }
  /* 등급 엠블럼 — 육각형 + 등급 색 그라데이션 + 짧은 표기 */
  function emblem(tier,sz){
    sz=sz||64;var id='ce'+(++_gid);var col=tier.color||'#8a919d';var short=(tier.short||tier.name.slice(0,2));
    return '<svg width="'+sz+'" height="'+sz+'" viewBox="0 0 64 64" aria-hidden="true" style="display:block;flex:none"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".15" stop-color="'+col+'"/><stop offset="1" stop-color="#0b1a3a"/></linearGradient></defs>'
      +'<path d="M32 3l25 14.5v29L32 61 7 46.5v-29z" fill="url(#'+id+')"/><path d="M32 8l20.7 12v24L32 56 11.3 44V20z" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1.6"/>'
      +'<text x="32" y="38" text-anchor="middle" font-family="Pretendard,Malgun Gothic,sans-serif" font-weight="900" font-size="'+(short.length>2?13:16)+'" fill="#fff" style="letter-spacing:.5px">'+short+'</text></svg>';
  }
  /* ────────── 2. 역할 분류 ────────── */
  var ROLES=[
    {g:'위원',list:['위원장','부위원장','총괄','경기위원장','심판위원장','대회본부']},
    {g:'심판',list:['주심','부심','점수심','선심','심판','기록심','계시']},
    {g:'운영',list:['기록원','운영','운영요원','진행','안전','의무','장비','접수','방송','촬영']},
    {g:'봉사',list:['봉사','자원봉사','자원봉사자']},
    {g:'지도',list:['감독','코치','인솔자','지도자']},
    {g:'선수',list:['선수','참가자']},
    {g:'입상',list:['입상','우승','준우승','3위','MVP','수상']}
  ];
  var GROUP_GLYPH={'위원':'shield','심판':'whistle','운영':'gear','봉사':'heart','지도':'megaphone','선수':'disc','입상':'trophy'};
  var GROUP_COLOR={'위원':'#7c3aed','심판':'#b8860b','운영':'#153A77','봉사':'#0f766e','지도':'#0e7490','선수':'#C41E2F','입상':'#d97706'};
  var GROUP_ICON={};Object.keys(GROUP_GLYPH).forEach(function(g){GROUP_ICON[g]=svg(GROUP_GLYPH[g],{size:14,stroke:2.2})});
  function careerGroup(role){
    var r=String(role||'').trim();
    if(!r)return '운영';
    for(var i=0;i<ROLES.length;i++){var L=ROLES[i].list;for(var j=0;j<L.length;j++){if(r===L[j])return ROLES[i].g}}
    if(/위원장|총괄|본부/.test(r))return '위원';
    if(/심|판/.test(r))return '심판';
    if(/봉사/.test(r))return '봉사';
    if(/감독|코치|인솔|지도/.test(r))return '지도';
    if(/선수|참가/.test(r))return '선수';
    if(/입상|우승|위$|MVP|수상/.test(r))return '입상';
    return '운영';
  }
  /* ────────── 3. 경력 점수·등급 ────────── */
  var POINTS={'위원':12,'심판':10,'운영':8,'봉사':6,'지도':8,'선수':5,'입상':15};
  var TIERS=[[0,'루키','RK','#8a919d'],[20,'브론즈','BR','#b87333'],[60,'실버','SV','#8a9bb0'],[150,'골드','GD','#d4a017'],[300,'플래티넘','PT','#3aa7a0'],[600,'다이아몬드','DIA','#3b82f6'],[1200,'마스터','MS','#7c3aed'],[2500,'레전드','LG','#C41E2F']];
  function tierOf(pts){var t=TIERS[0],i;for(i=0;i<TIERS.length;i++){if(pts>=TIERS[i][0])t=TIERS[i]}var nx=null;for(i=0;i<TIERS.length;i++){if(TIERS[i][0]>pts){nx={min:TIERS[i][0],name:TIERS[i][1]};break}}return {min:t[0],name:t[1],short:t[2],color:t[3],next:nx}}
  /* ────────── 4. 통계 (배지 계산용 파생값 포함) ────────── */
  function stats(recs){
    var s={total:0,days:0,points:0,byGroup:{},byRole:{},sports:{},places:{},years:{},events:{},awards:[],first:'',last:'',
      byDow:{},byMonth:{},perDay:{},eventRepeat:{},placeRepeat:{},results:{},kids:0,teams:0,firstGroup:'',sorted:[]};
    var arr=(recs||[]).slice().sort(function(a,b){return String(a.date||'').localeCompare(String(b.date||''))});
    s.sorted=arr;
    arr.forEach(function(c,i){
      var g=c.group||careerGroup(c.role||c.duty);var d=+(c.days||1)||1;
      s.total++;s.days+=d;s.points+=(POINTS[g]||5);
      s.byGroup[g]=(s.byGroup[g]||0)+1;
      var role=c.role||c.duty||'-';s.byRole[role]=(s.byRole[role]||0)+1;
      if(c.sport)String(c.sport).split(/[·,\/]/).forEach(function(x){x=x.trim();if(x)s.sports[x]=(s.sports[x]||0)+1});
      var pl=String(c.location||'').trim().split(/\s+/)[0];if(pl){s.places[pl]=(s.places[pl]||0)+1;s.placeRepeat[pl]=s.places[pl]}
      var y=String(c.date||'').slice(0,4);if(y)s.years[y]=(s.years[y]||0)+1;
      var m=String(c.date||'').slice(5,7);if(m)s.byMonth[m]=(s.byMonth[m]||0)+1;
      if(c.date){var dt=new Date(c.date+'T00:00:00');if(!isNaN(dt)){var dow=dt.getDay();s.byDow[dow]=(s.byDow[dow]||0)+1}if(g!=='입상')s.perDay[c.date]=(s.perDay[c.date]||0)+1}   // 입상은 참가와 같은 날이므로 하루 건수에서 제외
      var ek=(c.competitionName||'')+'|'+y;s.events[ek]=1;
      var en=String(c.competitionName||'').replace(/\s*\d{4}\s*/g,'').replace(/제\s*\d+\s*회/,'').trim();if(en)s.eventRepeat[en]=(s.eventRepeat[en]||0)+1;
      if(g==='입상'){s.awards.push(c);var r=String(c.result||c.role||'');var k=/1위|우승|금/.test(r)?'1':/2위|준우승|은/.test(r)?'2':/3위|동/.test(r)?'3':/MVP/i.test(r)?'mvp':'etc';s.results[k]=(s.results[k]||0)+1}
      if(c.kidName)s.kids++;if(c.team)s.teams++;
      if(i===0)s.firstGroup=g;
      if(c.date){if(!s.first||c.date<s.first)s.first=c.date;if(!s.last||c.date>s.last)s.last=c.date}
    });
    s.eventCount=Object.keys(s.events).length;s.sportCount=Object.keys(s.sports).length;s.placeCount=Object.keys(s.places).length;s.yearCount=Object.keys(s.years).length;
    s.roleCount=Object.keys(s.byRole).length;
    s.maxPerDay=Math.max.apply(null,[0].concat(Object.keys(s.perDay).map(function(k){return s.perDay[k]})));
    s.maxEventRepeat=Math.max.apply(null,[0].concat(Object.keys(s.eventRepeat).map(function(k){return s.eventRepeat[k]})));
    s.maxPlaceRepeat=Math.max.apply(null,[0].concat(Object.keys(s.places).map(function(k){return s.places[k]})));
    s.weekend=(s.byDow[0]||0)+(s.byDow[6]||0);s.weekday=s.total-s.weekend;
    s.summer=(s.byMonth['06']||0)+(s.byMonth['07']||0)+(s.byMonth['08']||0);s.winter=(s.byMonth['12']||0)+(s.byMonth['01']||0)+(s.byMonth['02']||0);
    s.spring=(s.byMonth['03']||0)+(s.byMonth['04']||0)+(s.byMonth['05']||0);s.autumn=(s.byMonth['09']||0)+(s.byMonth['10']||0)+(s.byMonth['11']||0);
    // 연속 일수·7일 내 건수
    var ds=Object.keys(s.perDay).sort();var best=0,run=0,prev=null,win7=0;
    ds.forEach(function(d,i){var t=new Date(d+'T00:00:00').getTime();run=(prev!==null&&t-prev===86400000)?run+1:1;if(run>best)best=run;prev=t;var n=0;for(var j=i;j>=0;j--){if(t-new Date(ds[j]+'T00:00:00').getTime()<=6*86400000)n+=s.perDay[ds[j]];else break}if(n>win7)win7=n});
    s.streakDays=best;s.within7=win7;
    var ys=Object.keys(s.years).map(Number).sort();var yb=0,yr=0,yp=null;ys.forEach(function(y){yr=(yp!==null&&y===yp+1)?yr+1:1;if(yr>yb)yb=yr;yp=y});s.yearStreak=yb;
    s.firstAward=!!(arr.length&&s.awards.length&&arr.findIndex(function(c){return (c.group||careerGroup(c.role||c.duty))==='입상'})<=1);
    s.tier=tierOf(s.points);
    return s;
  }
  /* ────────── 5. 배지 — 희귀도(common·uncommon·rare·epic·legendary) + 재미(fun) ────────── */
  var G=function(s,g){return s.byGroup[g]||0};
  var BADGES=[
    // 시작
    {id:'first',icon:'rocket',rarity:'common',name:'첫 발걸음',desc:'첫 임무·참가 기록',need:function(s){return [s.total,1]}},
    {id:'ref1',icon:'whistle',rarity:'common',name:'심판 데뷔',desc:'심판 임무 1회',need:function(s){return [G(s,'심판'),1]}},
    {id:'ops1',icon:'gear',rarity:'common',name:'현장의 손',desc:'운영 임무 1회',need:function(s){return [G(s,'운영'),1]}},
    {id:'ath1',icon:'disc',rarity:'common',name:'선수 데뷔',desc:'대회 참가 1회',need:function(s){return [G(s,'선수'),1]}},
    {id:'vol1',icon:'heart',rarity:'common',name:'천사 데뷔',desc:'봉사 1회',need:function(s){return [G(s,'봉사'),1]}},
    {id:'lead1',icon:'megaphone',rarity:'common',name:'선생님',desc:'인솔·지도 1회',need:function(s){return [G(s,'지도'),1]}},
    // 역할 전문
    {id:'head',icon:'scale',rarity:'uncommon',name:'호루라기 잡은 날',desc:'주심 1회',need:function(s){return [s.byRole['주심']||0,1]}},
    {id:'head5',icon:'scale',rarity:'rare',name:'호루라기 마스터',desc:'주심 5회',need:function(s){return [s.byRole['주심']||0,5]}},
    {id:'assist5',icon:'eye',rarity:'uncommon',name:'믿음직한 조연',desc:'부심 5회',need:function(s){return [s.byRole['부심']||0,5]}},
    {id:'score',icon:'numbers',rarity:'uncommon',name:'숫자의 마법사',desc:'점수심·기록원 3회',need:function(s){return [(s.byRole['점수심']||0)+(s.byRole['기록원']||0)+(s.byRole['기록심']||0),3]}},
    {id:'ref10',icon:'whistle',rarity:'rare',name:'베테랑 심판',desc:'심판 임무 10회',need:function(s){return [G(s,'심판'),10]}},
    {id:'ref30',icon:'crown',rarity:'legendary',name:'심판 마스터',desc:'심판 임무 30회',need:function(s){return [G(s,'심판'),30]}},
    {id:'ops5',icon:'gear',rarity:'uncommon',name:'운영의 달인',desc:'운영 임무 5회',need:function(s){return [G(s,'운영'),5]}},
    {id:'vol3',icon:'handshake',rarity:'uncommon',name:'따뜻한 손길',desc:'봉사 3회',need:function(s){return [G(s,'봉사'),3]}},
    {id:'chair',icon:'shield',rarity:'epic',name:'리더십',desc:'위원장·총괄 임무 1회',need:function(s){return [G(s,'위원'),1]}},
    {id:'multi',icon:'key',rarity:'rare',name:'만능 열쇠',desc:'서로 다른 역할 5종',need:function(s){return [s.roleCount,5]}},
    {id:'both',icon:'layers',rarity:'rare',name:'양손잡이',desc:'심판도 하고 선수도 하고',need:function(s){return [(G(s,'심판')?1:0)+(G(s,'선수')?1:0),2]}},
    // 선수·입상
    {id:'ath10',icon:'fire',rarity:'rare',name:'대회 단골',desc:'대회 참가 10회',need:function(s){return [G(s,'선수'),10]}},
    {id:'award1',icon:'trophy',rarity:'uncommon',name:'첫 입상',desc:'입상 1회',need:function(s){return [G(s,'입상'),1]}},
    {id:'award5',icon:'medal',rarity:'epic',name:'메달 콜렉터',desc:'입상 5회',need:function(s){return [G(s,'입상'),5]}},
    {id:'champ',icon:'crown',rarity:'epic',name:'챔피언',desc:'1위·우승 1회',need:function(s){return [s.results['1']||0,1]}},
    {id:'silver3',icon:'medal',rarity:'fun',name:'만년 2등',desc:'2위·준우승 3회 — 다음엔 꼭!',need:function(s){return [s.results['2']||0,3]}},
    {id:'bronze',icon:'medal',rarity:'common',name:'동메달의 맛',desc:'3위 1회',need:function(s){return [s.results['3']||0,1]}},
    {id:'mvp',icon:'star',rarity:'legendary',name:'MVP',desc:'최우수선수 선정',need:function(s){return [s.results['mvp']||0,1]}},
    {id:'comet',icon:'bolt',rarity:'epic',name:'혜성처럼',desc:'첫 참가에 바로 입상',need:function(s){return [s.firstAward?1:0,1]}},
    {id:'grit',icon:'turtle',rarity:'fun',name:'도전 정신',desc:'입상 없이 5회 참가 — 꾸준함이 실력',need:function(s){return [(G(s,'입상')===0?G(s,'선수'):0),5]}},
    {id:'kid',icon:'child',rarity:'common',name:'꿈나무 응원단',desc:'자녀 대회 참가 기록',need:function(s){return [s.kids,1]}},
    // 종목·지역·대회
    {id:'sport3',icon:'target',rarity:'rare',name:'올라운더',desc:'3개 종목 활동',need:function(s){return [s.sportCount,3]}},
    {id:'ulti5',icon:'disc',rarity:'uncommon',name:'질주 본능',desc:'얼티미트 5회',need:function(s){return [s.sports['얼티미트']||0,5]}},
    {id:'golf5',icon:'target',rarity:'uncommon',name:'홀인원 꿈나무',desc:'디스크골프 5회',need:function(s){return [s.sports['디스크골프']||0,5]}},
    {id:'yut',icon:'dice',rarity:'common',name:'전통 놀이꾼',desc:'원반윷놀이 1회',need:function(s){return [s.sports['원반윷놀이']||0,1]}},
    {id:'place5',icon:'map',rarity:'rare',name:'전국구',desc:'5개 지역 활동',need:function(s){return [s.placeCount,5]}},
    {id:'expedition',icon:'compass',rarity:'uncommon',name:'원정대',desc:'3개 지역 활동',need:function(s){return [s.placeCount,3]}},
    {id:'hometown',icon:'home',rarity:'common',name:'고향 지킴이',desc:'같은 지역 3회',need:function(s){return [s.maxPlaceRepeat,3]}},
    {id:'regular',icon:'bell',rarity:'uncommon',name:'단골 손님',desc:'같은 대회 2년 이상 참여',need:function(s){return [s.maxEventRepeat,2]}},
    {id:'ev20',icon:'stadium',rarity:'epic',name:'대회 20',desc:'서로 다른 대회 20개',need:function(s){return [s.eventCount,20]}},
    // 시간·계절·리듬 (꾸준하지 않아도 열림)
    {id:'weekend',icon:'sun',rarity:'common',name:'주말 전사',desc:'주말 활동 3회',need:function(s){return [s.weekend,3]}},
    {id:'weekday',icon:'coffee',rarity:'fun',name:'연차 쓰고 왔어요',desc:'평일 활동 1회',need:function(s){return [s.weekday,1]}},
    {id:'summer',icon:'sun',rarity:'common',name:'여름 사냥꾼',desc:'6~8월 활동 3회',need:function(s){return [s.summer,3]}},
    {id:'winter',icon:'snow',rarity:'uncommon',name:'설원의 심판',desc:'12~2월 활동 1회',need:function(s){return [s.winter,1]}},
    {id:'spring',icon:'leaf',rarity:'common',name:'봄바람',desc:'3~5월 활동 1회',need:function(s){return [s.spring,1]}},
    {id:'autumn',icon:'leaf',rarity:'common',name:'가을 하늘 원반',desc:'9~11월 활동 1회',need:function(s){return [s.autumn,1]}},
    {id:'twice',icon:'ghost',rarity:'fun',name:'분신술',desc:'하루에 2건 기록',need:function(s){return [s.maxPerDay,2]}},
    {id:'combo',icon:'bolt',rarity:'uncommon',name:'연타',desc:'이틀 연속 활동',need:function(s){return [s.streakDays,2]}},
    {id:'marathon',icon:'hourglass',rarity:'rare',name:'마라토너',desc:'7일 안에 3건',need:function(s){return [s.within7,3]}},
    {id:'season5',icon:'calendar',rarity:'uncommon',name:'시즌러',desc:'한 해 5회 이상 활동',need:function(s){var m=0;Object.keys(s.years).forEach(function(y){if(s.years[y]>m)m=s.years[y]});return [m,5]}},
    {id:'year3',icon:'trend',rarity:'epic',name:'3년 개근',desc:'3개 연도 연속 활동',need:function(s){return [s.yearStreak,3]}},
    {id:'days30',icon:'clock',rarity:'rare',name:'100시간 클럽',desc:'활동 30일 누적',need:function(s){return [s.days,30]}},
    {id:'fifty',icon:'balloon',rarity:'epic',name:'반백 기록',desc:'기록 50건',need:function(s){return [s.total,50]}},
    {id:'century',icon:'cake',rarity:'legendary',name:'백전노장',desc:'기록 100건',need:function(s){return [s.total,100]}},
    {id:'smile',icon:'smile',rarity:'fun',name:'그냥 좋아서',desc:'기록 3건 — 이유는 필요 없죠',need:function(s){return [s.total,3]}}
  ];
  var RARITY_LABEL={common:'일반',uncommon:'고급',rare:'희귀',epic:'영웅',legendary:'전설',fun:'재미'};
  function badges(s){
    return BADGES.map(function(b){var n=b.need(s);var cur=Math.min(n[0],n[1]);return {id:b.id,icon:b.icon,rarity:b.rarity,rarityLabel:RARITY_LABEL[b.rarity]||'',name:b.name,desc:b.desc,cur:cur,need:n[1],done:n[0]>=n[1],pct:Math.round(cur/n[1]*100)}});
  }
  /* ────────── 6. 경력 문서 쓰기 / 갤러리 초안 ────────── */
  function key(rec){return [rec.uid,rec.date,rec.postId||rec.slotId||rec.competitionName||'',rec.role||''].join('|')}
  function write(DB,rec,by){
    var g=rec.group||careerGroup(rec.role);
    var doc={uid:rec.uid,name:rec.name||'',date:rec.date||'',competitionName:rec.competitionName||'',role:rec.role||'',duty:rec.role||'',group:g,
      kind:rec.kind||(g==='선수'?'athlete':g==='입상'?'award':g==='봉사'?'volunteer':'staff'),
      sport:rec.sport||'',location:rec.location||'',organizer:rec.organizer||'',division:rec.division||'',team:rec.team||'',result:rec.result||'',
      days:rec.days||1,postId:rec.postId||'',slotId:rec.slotId||'',source:rec.source||'manual',verified:true,kidName:rec.kidName||'',
      ckey:key(rec),by:by||'',registeredAt:firebase.firestore.FieldValue.serverTimestamp()};
    return DB.collection('staffCareer').where('ckey','==',doc.ckey).limit(1).get().then(function(q){
      if(!q.empty){delete doc.registeredAt;doc.updatedAt=firebase.firestore.FieldValue.serverTimestamp();return DB.collection('staffCareer').doc(q.docs[0].id).update(doc).then(function(){return {id:q.docs[0].id,updated:true}})}
      return DB.collection('staffCareer').add(doc).then(function(r){return {id:r.id,updated:false}});
    });
  }
  function galleryDraft(DB,g,by){
    var base={title:g.title||'',date:g.date||'',endDate:g.endDate||g.date||'',place:g.place||'',sport:g.sport||'',summary:g.summary||'',
      refKind:g.refKind||'',refId:g.refId||'',by:by||'',updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
    return DB.collection('gallery').where('refId','==',g.refId||'__none__').limit(1).get().then(function(q){
      if(!q.empty){var ex=q.docs[0].data();var upd={updatedAt:base.updatedAt};
        ['title','date','endDate','place','sport'].forEach(function(k){if(!ex[k]&&base[k])upd[k]=base[k]});
        if(!ex.summary&&base.summary)upd.summary=base.summary;
        if(g.media&&g.media.length){upd.media=(ex.media||[]).concat(g.media);if(!ex.cover)upd.cover=g.media[0].url}
        return DB.collection('gallery').doc(q.docs[0].id).update(upd).then(function(){return {id:q.docs[0].id,updated:true}})}
      base.media=g.media||[];base.cover=(g.media&&g.media[0]&&g.media[0].url)||'';base.status='draft';base.featured=false;base.at=firebase.firestore.FieldValue.serverTimestamp();
      return DB.collection('gallery').add(base).then(function(r){return {id:r.id,updated:false}});
    });
  }
  function roleChips(cur,onclickFn){
    return ROLES.map(function(grp){return '<div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin:3px 0"><span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:900;color:'+GROUP_COLOR[grp.g]+';min-width:46px">'+GROUP_ICON[grp.g]+grp.g+'</span>'
      +grp.list.map(function(r){return '<button type="button" class="crchip'+(r===cur?' on':'')+'" data-role="'+r+'" onclick="'+onclickFn+'(this)" style="border:1.5px solid '+(r===cur?GROUP_COLOR[grp.g]:'#dfe5ee')+';background:'+(r===cur?GROUP_COLOR[grp.g]:'#fff')+';color:'+(r===cur?'#fff':'#333')+';border-radius:999px;padding:3px 9px;font-size:11.5px;font-weight:800;cursor:pointer;font-family:inherit">'+r+'</button>'}).join('')+'</div>'}).join('');
  }
  function groupTag(g,label){return '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:900;color:#fff;background:'+(GROUP_COLOR[g]||'#153A77')+';border-radius:999px;padding:2px 9px 2px 7px">'+GROUP_ICON[g]+(label||g)+'</span>'}
  /* ────────── 7. PDF → 페이지 이미지 (동의서를 PDF 로 올리면 장별 JPG 로 바꿔 좌표 지정·서명 기입이 되게) ────────── */
  var PDFJS_URL='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',PDFJS_WORKER='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  function loadPdfjs(){
    return new Promise(function(ok,no){
      if(window.pdfjsLib){ok(window.pdfjsLib);return}
      var s=document.createElement('script');s.src=PDFJS_URL;
      s.onload=function(){try{window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;ok(window.pdfjsLib)}catch(e){no(e)}};
      s.onerror=function(){no(new Error('PDF 변환 도구를 불러오지 못했습니다'))};
      document.head.appendChild(s);
    });
  }
  function pdfPages(file,opts){
    opts=opts||{};var maxPx=opts.maxPx||1800,maxPages=opts.maxPages||10,quality=opts.quality||0.88;
    return loadPdfjs().then(function(lib){
      return new Promise(function(ok,no){var fr=new FileReader();fr.onload=function(){ok(fr.result)};fr.onerror=no;fr.readAsArrayBuffer(file)})
        .then(function(buf){return lib.getDocument({data:buf}).promise});
    }).then(function(pdf){
      var n=Math.min(pdf.numPages,maxPages),out=[],base=String(file.name||'문서').replace(/\.pdf$/i,'');
      var chain=Promise.resolve();
      for(var i=1;i<=n;i++)(function(p){chain=chain.then(function(){return pdf.getPage(p)}).then(function(page){
        var v1=page.getViewport({scale:1});var sc=Math.min(3,maxPx/Math.max(v1.width,v1.height));var vp=page.getViewport({scale:sc});
        var c=document.createElement('canvas');c.width=Math.round(vp.width);c.height=Math.round(vp.height);var ctx=c.getContext('2d');
        ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
        // intent:'print' — 화면 갱신 신호(rAF)에 의존하지 않아 탭이 가려져 있어도 렌더가 끝남
        return page.render({canvasContext:ctx,viewport:vp,intent:'print'}).promise.then(function(){
          var dataUrl=c.toDataURL('image/jpeg',quality);
          return new Promise(function(res){c.toBlob(function(b){res(b)},'image/jpeg',quality)}).then(function(blob){
            out.push({dataUrl:dataUrl,blob:blob,name:base+'_p'+p+'.jpg',page:p,pages:pdf.numPages});
          });
        });
      })})(i);
      return chain.then(function(){return out});
    });
  }
  /* ────────── 8. 기입 위치 표시 크기 — 이미지 폭 680px 기준으로 지정한 px 를 실제 폭에 비례시켜(--ovk) 편집기·미리보기·인쇄가 같은 비율로 보이게 ────────── */
  var OVL_BASE=680;
  function ovlFitEl(el){var w=el.clientWidth||el.getBoundingClientRect().width;if(w>0)el.style.setProperty('--ovk',(w/OVL_BASE).toFixed(4))}
  function ovlFit(){[].forEach.call(document.querySelectorAll('.ovl-wrap'),ovlFitEl)}
  var _ro=null,_mo=null;
  function ovlWatch(){
    if(typeof document==='undefined')return;
    try{
      if(window.ResizeObserver&&!_ro){_ro=new ResizeObserver(function(es){es.forEach(function(e){ovlFitEl(e.target)})})}
      var hook=function(root){[].forEach.call((root.querySelectorAll?root.querySelectorAll('.ovl-wrap'):[]),function(el){if(el.dataset.ovw)return;el.dataset.ovw='1';ovlFitEl(el);if(_ro)_ro.observe(el)});if(root.classList&&root.classList.contains('ovl-wrap')&&!root.dataset.ovw){root.dataset.ovw='1';ovlFitEl(root);if(_ro)_ro.observe(root)}};
      if(!_mo&&window.MutationObserver){_mo=new MutationObserver(function(ms){ms.forEach(function(m){[].forEach.call(m.addedNodes,function(n){if(n.nodeType===1)hook(n)})})});_mo.observe(document.documentElement,{childList:true,subtree:true})}
      hook(document);window.addEventListener('resize',ovlFit);
    }catch(e){}
  }
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ovlWatch);else ovlWatch()}
  /* 인쇄창(career.js 없음)에 넣는 같은 계산식 */
  var OVL_PRINT_JS='(function(){function fit(){var L=document.querySelectorAll(".ovl-wrap");for(var i=0;i<L.length;i++){var w=L[i].clientWidth;if(w>0)L[i].style.setProperty("--ovk",(w/'+OVL_BASE+').toFixed(4))}}fit();window.addEventListener("resize",fit);setTimeout(fit,50);setTimeout(fit,400)})();';
  /* 편집기 '실제 모양 보기'용 샘플값 */
  var OVL_SAMPLE={name:'홍길동',birth:'2013-05-01',gender:'남',school:'대한초등학교',phone:'010-1234-5678',guardian:'김보호',gphone:'010-9876-5432',date:'2026. 09. 20.',rrn:'900101-1234567',addr:'서울시 강서구 화곡로 12',bank:'농협',acct:'123-4567-8901-23',holder:'홍길동'};
  var SIGN_SVG='<svg viewBox="0 0 120 40" preserveAspectRatio="xMinYMid meet" style="height:100%;width:auto;display:block"><path d="M6 30c8-18 14-22 16-14s-6 20 2 18 10-18 16-16-2 16 6 16 10-14 16-16 2 14 10 12 12-14 18-12 6 10 14 6" fill="none" stroke="#1a237e" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function ovlFontCss(fs){return 'font-size:calc(var(--ovk,1)*'+(fs||14)+'px)'}
  window.CAREER={pdfPages:pdfPages,ovlFit:ovlFit,ovlWatch:ovlWatch,OVL_PRINT_JS:OVL_PRINT_JS,OVL_SAMPLE:OVL_SAMPLE,SIGN_SVG:SIGN_SVG,ovlFontCss:ovlFontCss,
    checkMark:function(px){px=px||18;return '<svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="display:block;width:calc(var(--ovk,1)*'+px+'px);height:calc(var(--ovk,1)*'+px+'px)"><path d="M4 12.5l5 5L20 6"/></svg>'},ROLES:ROLES,GROUP_ICON:GROUP_ICON,GROUP_GLYPH:GROUP_GLYPH,GROUP_COLOR:GROUP_COLOR,POINTS:POINTS,TIERS:TIERS,RARITY:RARITY,RARITY_LABEL:RARITY_LABEL,
    group:careerGroup,tierOf:tierOf,stats:stats,badges:badges,BADGES:BADGES,write:write,galleryDraft:galleryDraft,roleChips:roleChips,groupTag:groupTag,key:key,
    svg:svg,medal:medal,emblem:emblem,ICONS:P};
})();
