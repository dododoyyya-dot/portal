// ══════════════════════════════════════════════
// KFDF 공용 아이콘 (icons.js) — 2026-09-07 체육회 스타일 선 아이콘
//  · 화면에 표시되는 이모지(✓ 📍 👥 🏆 …)를 같은 뜻의 SVG 선 아이콘으로 바꿔 그립니다.
//  · 페이지 파일은 손대지 않고, 표시 시점(문서 로드 + 이후 동적으로 추가되는 화면)에만 바꿉니다.
//    → 저장 데이터·알림 문구·기능은 그대로이고, 보이는 모양만 바뀝니다.
//  · 사용: auth_ui.js 가 자동으로 불러옵니다. 직접 쓰려면 KFDF_ICONS.svg('trophy') / KFDF_ICONS.replace(엘리먼트)
// ══════════════════════════════════════════════
(function(){
  var P={
    check:'<path d="M5 12l5 5L20 7"/>',
    checkc:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    checksq:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/>',
    square:'<rect x="4" y="4" width="16" height="16" rx="3"/>',
    x:'<path d="M6 6l12 12M18 6L6 18"/>',
    xc:'<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
    warn:'<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18h.01"/>',
    ban:'<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>',
    undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    redo:'<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
    pin:'<path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    pushpin:'<path d="M12 17v5M8 17h8l-1.5-5V6h1V3H8.5v3h1v6L8 17z"/>',
    users:'<circle cx="9" cy="8" r="3.2"/><circle cx="16.5" cy="9" r="2.6"/><path d="M3.5 19c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5M15 18.5c0-2.5 1.8-4.2 4-4.2s3.5 1.7 3.5 4.2"/>',
    user:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/>',
    family:'<circle cx="9" cy="7" r="3"/><circle cx="17" cy="10" r="2.2"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M14.5 20c0-2.2 1.2-4 2.5-4s2.5 1.8 2.5 4"/>',
    clip:'<path d="M21 11.5l-8.5 8.5a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8"/>',
    hourglass:'<path d="M6 3h12M6 21h12M8 3v4l4 5 4-5V3M8 21v-4l4-5 4 5v4"/>',
    edit:'<path d="M4 20h4l11-11-4-4L4 16v4z"/><path d="M13 7l4 4"/>',
    doc:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    school:'<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/>',
    save:'<path d="M4 4h12l4 4v12H4z"/><path d="M8 4v5h7V4M7 20v-6h10v6"/>',
    link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
    grad:'<path d="M2 9l10-4 10 4-10 4L2 9z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5M22 9v6"/>',
    refresh:'<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
    medal:'<circle cx="12" cy="15" r="5"/><path d="M9 3l3 6 3-6M8 3h8"/>',
    trophy:'<path d="M8 21h8M12 17v4M5 4h14v4a7 7 0 0 1-14 0V4zM5 6H3a3 3 0 0 0 3 3M19 6h2a3 3 0 0 1-3 3"/>',
    lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-1.5"/>',
    play:'<path d="M7 4l12 8-12 8V4z"/>',
    left:'<path d="M17 4L5 12l12 8V4z"/>',
    search:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
    crown:'<path d="M3 8l4 4 5-7 5 7 4-4-2 12H5L3 8z"/>',
    shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    download:'<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
    sprout:'<path d="M12 21v-8"/><path d="M12 13c0-4 3-7 7-7 0 4-3 7-7 7zM12 13c0-3-2.5-5.5-5.5-5.5 0 3 2.5 5.5 5.5 5.5z"/>',
    mobile:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    megaphone:'<path d="M3 10v4h3l7 4V6l-7 4H3z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
    card:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/>',
    coin:'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h3.5a1.75 1.75 0 0 1 0 3.5h-2a1.75 1.75 0 0 0 0 3.5H15"/>',
    box:'<path d="M3 8l9-4 9 4v9l-9 4-9-4V8z"/><path d="M3 8l9 4 9-4M12 12v9"/>',
    stadium:'<path d="M3 9c0-2 4-4 9-4s9 2 9 4v7c0 2-4 4-9 4s-9-2-9-4V9z"/><path d="M3 9c0 2 4 4 9 4s9-2 9-4"/>',
    flag:'<path d="M5 21V4M5 4h13l-3 4 3 4H5"/>',
    teacher:'<rect x="3" y="3" width="18" height="12" rx="1.5"/><circle cx="8.5" cy="9" r="2"/><path d="M5 15c0-1.5 1.5-3 3.5-3s3.5 1.5 3.5 3M12 19h9M16 15v4"/>',
    bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    puzzle:'<path d="M10 3a2 2 0 0 1 4 0v2h3a1 1 0 0 1 1 1v3h2a2 2 0 0 1 0 4h-2v3a1 1 0 0 1-1 1h-3v2a2 2 0 0 1-4 0v-2H7a1 1 0 0 1-1-1v-3H4a2 2 0 0 1 0-4h2V6a1 1 0 0 1 1-1h3V3z"/>',
    star:'<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 3 1.1-6.2L3 9.7l6.2-.9L12 3z"/>',
    gift:'<rect x="3" y="9" width="18" height="12" rx="1.5"/><path d="M3 13h18M12 9v12M12 9c-3 0-4.5-1.5-4.5-3S9 3 10.5 4.5 12 9 12 9zm0 0c3 0 4.5-1.5 4.5-3S15 3 13.5 4.5 12 9 12 9z"/>',
    disc:'<circle cx="12" cy="12" r="8"/><ellipse cx="12" cy="12" rx="8" ry="3"/>',
    door:'<path d="M4 21h16M6 21V3h10v18M13 12h.01"/>',
    folder:'<path d="M3 6h6l2 2h10v12H3z"/>',
    key:'<circle cx="8" cy="14" r="4"/><path d="M11 11l9-9M16 6l3 3M14 8l2 2"/>',
    tag:'<path d="M3 12V4h8l9 9-8 8-9-9z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
    flask:'<path d="M9 3h6M10 3v6l-6 10a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3L14 9V3"/>',
    cake:'<path d="M4 21h16M5 21v-7h14v7M7 14v-3h10v3M9 8V5M12 8V4M15 8V5"/>',
    print:'<path d="M7 8V3h10v5M5 8h14a2 2 0 0 1 2 2v6h-4v5H7v-5H3v-6a2 2 0 0 1 2-2z"/>',
    camera:'<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
    swords:'<path d="M4 4l10 10M20 4L10 14M4 20l4-4M20 20l-4-4M14 14l2 2M10 14l-2 2"/>',
    tent:'<path d="M3 20L12 4l9 16H3z"/><path d="M12 4v16M8 20l4-7 4 7"/>',
    home:'<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    map:'<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z"/><path d="M9 4v14M15 6v14"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    arrows:'<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/>',
    truck:'<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    pause:'<path d="M8 5v14M16 5v14"/>',
    shirt:'<path d="M8 3h8l4 4-3 3-1-1v12H8V9L7 10 4 7l4-4z"/>',
    shoe:'<path d="M3 17h18v3H3zM3 17l2-6h5l3 3h8v3"/>',
    hash:'<path d="M9 4v16M15 4v16M4 9h16M4 15h16"/>',
    bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2zM10 20a2 2 0 0 0 4 0"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    chat:'<path d="M4 5h16v11H9l-5 4V5z"/>',
    sparkle:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    heart:'<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
    eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    question:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"/>',
    idcard:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c0-1.5 1.5-2.5 3-2.5s3 1 3 2.5M14 10h4M14 14h4"/>',
    dot:'<circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/>',
    circledot:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>',
    scale:'<path d="M12 3v18M4 21h16M3 9l4-6 4 6H3zM13 9l4-6 4 6h-8"/><path d="M3 9a4 4 0 0 0 8 0M13 9a4 4 0 0 0 8 0"/>',
    book:'<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4V4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7V4z"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    bed:'<path d="M3 18v-8h18v8M3 14h18M6 10V7h5v3"/>',
    briefcase:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 12h18"/>',
    arrowr:'<path d="M5 12h14M13 6l6 6-6 6"/>',
    bulb:'<path d="M9 18h6M10 21h4M8 13a5 5 0 1 1 8 0c-1 1-1.5 2-1.5 3h-5c0-1-.5-2-1.5-3z"/>',
    hand:'<path d="M7 11V6a1.5 1.5 0 0 1 3 0v5M10 10V4a1.5 1.5 0 0 1 3 0v6M13 10V5a1.5 1.5 0 0 1 3 0v6M16 12V8a1.5 1.5 0 0 1 3 0v6a6 6 0 0 1-6 6h-1.5A5.5 5.5 0 0 1 7 15.5V11"/>',
    handshake:'<path d="M4 11l4-4h4l3 3-3 3-2-2M20 11l-4-4M8 14l2 2M11 17l2 2M14 15l2 2"/><path d="M4 11l4 4 3 3a2 2 0 0 0 3 0l4-4 2-3"/>'
  };
  // 이모지 → 아이콘 이름 (변형 선택자 FE0F 는 떼고 비교)
  var M={
    '✓':'check','✔':'check','☑':'checksq','☐':'square','⬜':'square','✅':'checkc',
    '✗':'x','✕':'x','✖':'x','❌':'xc','⚠':'warn','⛔':'ban','🚫':'ban','🔞':'ban',
    '↩':'undo','↪':'redo','🔄':'refresh','🔁':'refresh',
    '📍':'pin','📌':'pushpin','👥':'users','🚻':'users','🤝':'handshake','👤':'user','🏃':'user','🙋':'hand','✋':'hand','🙈':'user','🙍':'user','♿':'user','🤾':'user',
    '👨‍👧':'family','👨‍👩‍👧':'family','🧒':'family','👧':'family','🧸':'family',
    '📎':'clip','⏳':'hourglass','✏':'edit','✍':'edit','🖊':'edit','📝':'edit',
    '📄':'doc','📋':'doc','🧾':'doc','📜':'doc','📒':'doc','📘':'doc','📚':'book',
    '🏫':'school','🏛':'school','🏢':'school','🏦':'school',
    '💾':'save','🔗':'link','☰':'menu','🎓':'grad',
    '🎖':'medal','🏅':'medal','🥇':'medal','🥈':'medal','🥉':'medal','🏆':'trophy',
    '🔒':'lock','🔓':'unlock','🔑':'key',
    '▶':'play','◀':'left','🔜':'arrowr','↔':'arrows',
    '🔍':'search','🔎':'search','👑':'crown','🛡':'shield','🦺':'shield',
    '📅':'calendar','🗓':'calendar','🗑':'trash','⬇':'download','📥':'download',
    '🌱':'sprout','📱':'mobile','📞':'phone','☎':'phone','🎯':'target',
    '📢':'megaphone','📣':'megaphone','🪧':'megaphone',
    '💳':'card','💰':'coin','📦':'box','🍱':'box','🏟':'stadium','🏁':'flag','🚩':'flag','🏳':'flag',
    '🧑‍🏫':'teacher','⚡':'bolt','🔥':'bolt',
    '📧':'mail','✉':'mail','📨':'mail','📩':'mail','📮':'mail',
    '🧩':'puzzle','★':'star','✦':'star','🎁':'gift','🥏':'disc','⛳':'disc','🎲':'disc',
    '🚪':'door','📂':'folder','📁':'folder','🗂':'folder','🗄':'folder',
    '🏷':'tag','🔖':'tag','🧪':'flask','🎂':'cake','🖨':'print',
    '📷':'camera','🖼':'camera','📼':'camera','⚔':'swords','🎪':'tent','🏠':'home','📊':'chart',
    '🗺':'map','🧭':'map','🌏':'map','⏰':'clock','⏱':'clock','🕓':'clock','🕐':'clock','🕘':'clock',
    '🚚':'truck','🚌':'truck','⚙':'gear','🛠':'gear','🔧':'gear','🧰':'gear','⏸':'pause',
    '👟':'shoe','👕':'shirt','🥋':'shirt','🎒':'shirt','🔢':'hash','🔔':'bell','🚨':'bell',
    '➕':'plus','✚':'plus','💬':'chat','🎉':'sparkle','💙':'heart','👁':'eye','👀':'eye','❓':'question',
    '📇':'idcard','🪪':'idcard','🆔':'idcard','🚦':'circledot','🟢':'dot','⚫':'dot','🔴':'dot',
    '🧑‍⚖':'scale','⚖':'scale','ℹ':'info','🛏':'bed','💼':'briefcase','💡':'bulb'
  };
  var RE=/(?:\p{Extended_Pictographic}|[←-⇿☀-➿⬀-⯿★☰])️?(?:‍(?:\p{Extended_Pictographic}|[☀-➿])️?)*/gu;
  var SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1,OPTION:1,TITLE:1,NOSCRIPT:1,svg:1,SVG:1,CANVAS:1};
  function norm(s){return s.replace(/️/g,'')}
  function stripMapped(s){RE.lastIndex=0;return s.replace(RE,function(m){return M[norm(m)]?'':m}).replace(/^\s+/,'')}
  function svg(name,opt){
    opt=opt||{};var p=P[name];if(!p)return '';
    return '<svg class="ki'+(opt.cls?' '+opt.cls:'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+(opt.stroke||2.1)+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'+(opt.size?' style="width:'+opt.size+'px;height:'+opt.size+'px"':'')+'>'+p+'</svg>';
  }
  function makeEl(name){var w=document.createElement('span');w.innerHTML=svg(name);return w.firstChild}
  function fixText(node){
    var s=node.nodeValue;if(!s||!RE.test(s))return;RE.lastIndex=0;
    var parent=node.parentNode;if(!parent||SKIP[parent.nodeName])return;
    var frag=document.createDocumentFragment(),last=0,m,changed=false;
    RE.lastIndex=0;
    while((m=RE.exec(s))){
      var key=norm(m[0]);var nm=M[key];
      if(!nm){continue}
      changed=true;
      if(m.index>last)frag.appendChild(document.createTextNode(s.slice(last,m.index)));
      frag.appendChild(makeEl(nm));
      last=m.index+m[0].length;
    }
    if(!changed)return;
    if(last<s.length)frag.appendChild(document.createTextNode(s.slice(last)));
    parent.replaceChild(frag,node);
  }
  function fixAttr(el){
    try{
      if(el.placeholder){RE.lastIndex=0;if(RE.test(el.placeholder)){var p2=stripMapped(el.placeholder);if(p2!==el.placeholder)el.placeholder=p2}}
      if(el.nodeName==='OPTION'&&el.firstChild){RE.lastIndex=0;if(RE.test(el.textContent)){var t2=stripMapped(el.textContent);if(t2!==el.textContent)el.textContent=t2}}
      RE.lastIndex=0;
    }catch(e){}
  }
  function replace(root){
    if(!root)return;
    if(root.nodeType===3){fixText(root);return}
    if(root.nodeType!==1&&root.nodeType!==11)return;
    if(root.nodeType===1){if(SKIP[root.nodeName])return;fixAttr(root)}
    var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT,null);
    var texts=[],n;
    while((n=walker.nextNode())){
      if(n.nodeType===1){fixAttr(n);continue}
      if(n.parentNode&&!SKIP[n.parentNode.nodeName]&&n.nodeValue&&RE.test(n.nodeValue))texts.push(n);
      RE.lastIndex=0;
    }
    texts.forEach(fixText);
  }
  var started=false;
  function start(){
    if(started)return;started=true;
    if(!document.getElementById('kiCss')){var st=document.createElement('style');st.id='kiCss';
      st.textContent='.ki{width:1.05em;height:1.05em;display:inline-block;vertical-align:-.18em;flex:none;margin-right:.12em}button>.ki:only-child,a>.ki:only-child{margin-right:0}';
      document.head.appendChild(st);}
    replace(document.body);
    try{
      var mo=new MutationObserver(function(muts){
        for(var i=0;i<muts.length;i++){var mu=muts[i];
          if(mu.type==='characterData'){fixText(mu.target);continue}
          for(var j=0;j<mu.addedNodes.length;j++)replace(mu.addedNodes[j]);
        }
      });
      mo.observe(document.body,{childList:true,subtree:true,characterData:true});
    }catch(e){}
  }
  window.KFDF_ICONS={svg:svg,replace:replace,start:start,MAP:M,PATHS:P};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
