/* ═══════════════════════════════════════════════════════════════════════
   KFDF 페이지 편집 모듈 (cms.js)
   ───────────────────────────────────────────────────────────────────────
   소개 페이지(연맹소개·종목소개·사업안내·후원안내)의 글과 배치를 관리자가
   홈페이지 화면에서 직접 고칠 수 있게 합니다. 코드 수정·배포 없이 즉시 반영됩니다.

   페이지에서 할 일: 스크립트 한 줄 + 표식(data-*) 붙이기
     <script src="cms.js?v=..."></script>
     · data-cms="키"            : 이 요소의 글을 편집 (문단·제목·카드 본문 등)
     · data-cms-list="키"       : 짧은 항목 목록 (시도연맹 이름표 등) — 한 줄에 하나씩
     · data-cms-org             : 조직도 — 드래그로 옮기고, 클릭해 이름·설명·색을 고침
     · data-cms-sections="키"   : 제목+본문 카드 목록 (종목소개·후원안내) — 카드별 수정·순서·추가·삭제
   저장 위치: Firestore siteContent/{페이지} (blocks · lists · org · sections)
   원문(정적 HTML)은 그대로 두어 저장본이 없으면 원문이, 있으면 저장본이 보입니다. [원래대로]로 되돌립니다.

   권한: 보안 규칙상 siteContent 쓰기는 중앙 관리자(admin/owner)만 가능합니다. 이 모듈은 그 안에서만 편집 UI를 켭니다.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
  var PAGE=(location.pathname.split('/').pop()||'index.html').replace(/\.html?$/,'')||'index';
  var CFG={apiKey:"AIzaSyB-YuoXtSnuodHEbbjwHRyEjdShgNu4iLg",authDomain:"koreaflyingdiscfederation.firebaseapp.com",projectId:"koreaflyingdiscfederation",appId:"1:1081847355343:web:ca40ed9a52e13f607f64ba"};   // auth_ui.js 와 동일한 설정
  var SDK='https://www.gstatic.com/firebasejs/10.12.0/';
  var DB=null, ADMIN=false, EDIT=false, DATA={}, DEFAULTS={}, ORG=null, ORG_DIRTY=false;

  /* ── 유틸 ── */
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  // 저장 글 → 화면: 줄바꿈 유지, **굵게**, [글자](주소) 링크만 허용 (그 외 태그는 글자로 표시 = 안전)
  function toHtml(t){
    var h=esc(t);
    h=h.replace(/\*\*([^*\n]+)\*\*/g,'<b>$1</b>');
    h=h.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|[a-z0-9_\-]+\.html[^\s)]*)\)/g,'<a href="$2" style="color:var(--red,#C41E2F);font-weight:800">$1</a>');
    return h.replace(/\n/g,'<br>');
  }
  // 화면(원문 HTML) → 편집용 글: <br>·<p> 줄바꿈, <b> → **굵게**, <a> → [글자](주소), 나머지 태그 제거
  function toText(el){
    var h=el.innerHTML;
    h=h.replace(/\s*\n\s*/g,' ');                       // 원문의 들여쓰기 줄바꿈은 글의 줄바꿈이 아니므로 공백 하나로
    h=h.replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>\s*<p[^>]*>/gi,'\n\n').replace(/<\/?p[^>]*>/gi,'');
    h=h.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi,'**$1**').replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi,'**$1**');
    h=h.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,'[$2]($1)');
    h=h.replace(/<[^>]+>/g,'');
    var d=document.createElement('textarea');d.innerHTML=h;
    return d.value.replace(/[ \t]+\n/g,'\n').replace(/\n[ \t]+/g,'\n').replace(/^\s+|\s+$/g,'');
  }
  function toast(msg,bad){
    var t=document.createElement('div');t.textContent=msg;
    t.style.cssText='position:fixed;left:50%;bottom:86px;transform:translateX(-50%);background:'+(bad?'#C41E2F':'#153A77')+';color:#fff;font-weight:800;font-size:13.5px;padding:10px 18px;border-radius:999px;z-index:10001;box-shadow:0 6px 20px rgba(0,0,0,.25)';
    document.body.appendChild(t);setTimeout(function(){t.remove()},2200);
  }
  function loadScript(src){return new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
  async function ensureSDK(){
    if(!window.firebase||!firebase.initializeApp)await loadScript(SDK+'firebase-app-compat.js');
    if(!firebase.auth)await loadScript(SDK+'firebase-auth-compat.js');
    if(!firebase.firestore)await loadScript(SDK+'firebase-firestore-compat.js');
    if(!firebase.apps.length)firebase.initializeApp(CFG);
    DB=firebase.firestore();
  }
  function ref(){return DB.collection('siteContent').doc(PAGE)}
  async function save(patch){
    patch.updatedAt=firebase.firestore.FieldValue.serverTimestamp();
    patch.by=(firebase.auth().currentUser||{}).email||'';
    await ref().set(patch,{merge:true});
  }
  async function unset(field){
    var p={};p[field]=firebase.firestore.FieldValue.delete();
    await ref().update(p);
  }

  /* ── 편집창 (글) ── */
  function openEditor(opt){
    var old=document.getElementById('cmsModal');if(old)old.remove();
    var m=document.createElement('div');m.id='cmsModal';
    m.style.cssText='position:fixed;inset:0;background:rgba(10,15,30,.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px';
    m.innerHTML='<div style="background:#fff;border-radius:16px;max-width:640px;width:100%;padding:22px 24px;font-family:inherit">'
      +'<b style="font-size:16px;color:#153A77">✏️ '+esc(opt.title||'내용 수정')+'</b>'
      +(opt.fields||[{k:'v',label:'',rows:8}]).map(function(f){
        return '<label style="display:block;font-size:12.5px;font-weight:800;margin-top:12px;color:#4b5563">'+esc(f.label||'')+'</label>'
          +(f.type==='select'
            ?'<select data-k="'+f.k+'" style="width:100%;padding:9px 12px;border:1.5px solid #dfe5ee;border-radius:9px;font-family:inherit;font-size:14px">'+(f.options||[]).map(function(o){return '<option value="'+esc(o.v)+'"'+(o.v===f.value?' selected':'')+'>'+esc(o.t)+'</option>'}).join('')+'</select>'
            :(f.rows===1
              ?'<input data-k="'+f.k+'" value="'+esc(f.value||'')+'" style="width:100%;padding:9px 12px;border:1.5px solid #dfe5ee;border-radius:9px;font-family:inherit;font-size:14px">'
              :'<textarea data-k="'+f.k+'" rows="'+(f.rows||8)+'" style="width:100%;padding:10px 12px;border:1.5px solid #dfe5ee;border-radius:9px;font-family:inherit;font-size:14px;line-height:1.7">'+esc(f.value||'')+'</textarea>'));
      }).join('')
      +'<div style="font-size:11.5px;color:#8a919d;margin-top:6px;line-height:1.6">줄바꿈은 그대로 표시됩니다 · <b>**굵게**</b> · 링크는 [글자](주소) 로 적습니다</div>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap">'
      +(opt.onReset?'<button id="cmsReset" style="border:1.5px solid #C41E2F;background:#fff;color:#C41E2F;border-radius:9px;padding:8px 14px;font-weight:800;cursor:pointer;font-family:inherit;margin-right:auto">↩ 원래대로</button>':'')
      +'<button id="cmsCancel" style="border:none;background:#eceff4;color:#555;border-radius:9px;padding:8px 16px;font-weight:800;cursor:pointer;font-family:inherit">취소</button>'
      +'<button id="cmsOk" style="border:none;background:#153A77;color:#fff;border-radius:9px;padding:8px 18px;font-weight:800;cursor:pointer;font-family:inherit">저장</button></div></div>';
    document.body.appendChild(m);
    var first=m.querySelector('textarea,input');if(first)first.focus();
    m.querySelector('#cmsCancel').onclick=function(){m.remove()};
    if(opt.onReset)m.querySelector('#cmsReset').onclick=function(){if(confirm('저장한 내용을 지우고 원래 글로 되돌릴까요?')){m.remove();opt.onReset()}};
    m.querySelector('#cmsOk').onclick=function(){
      var out={};[].forEach.call(m.querySelectorAll('[data-k]'),function(e){out[e.dataset.k]=e.value});
      m.remove();opt.onSave(out);
    };
  }
  function pencil(label){
    var b=document.createElement('button');b.type='button';b.className='cms-pen';b.textContent='✏️ '+(label||'수정');
    b.style.cssText='border:1.5px solid #153A77;background:#fff;color:#153A77;border-radius:999px;padding:3px 11px;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit;margin:0 0 6px 0;display:inline-block;vertical-align:middle';
    return b;
  }

  /* ── ① 글 블록 (data-cms) ── */
  function applyBlocks(){
    var blocks=(DATA.blocks||{});
    [].forEach.call(document.querySelectorAll('[data-cms]'),function(el){
      var k=el.dataset.cms;
      if(!(k in DEFAULTS))DEFAULTS[k]=el.innerHTML;          // 원문 보관 (되돌리기용)
      if(blocks[k]!=null)el.innerHTML=toHtml(blocks[k]);
      else el.innerHTML=DEFAULTS[k];
    });
  }
  function decorateBlocks(){
    [].forEach.call(document.querySelectorAll('[data-cms]'),function(el){
      var k=el.dataset.cms;
      var b=pencil();b.style.marginLeft='8px';
      b.onclick=function(){
        var cur=(DATA.blocks&&DATA.blocks[k]!=null)?DATA.blocks[k]:toText(el);
        openEditor({title:'글 수정 — '+k,fields:[{k:'v',value:cur,rows:Math.min(16,Math.max(3,cur.split('\n').length+2))}],
          onSave:async function(o){
            try{var p={};p['blocks.'+k]=o.v;await save(p);DATA.blocks=DATA.blocks||{};DATA.blocks[k]=o.v;applyBlocks();decorateBlocks();toast('저장했습니다')}
            catch(e){toast('저장 실패: '+e.message,true)}
          },
          onReset:(DATA.blocks&&DATA.blocks[k]!=null)?async function(){
            try{await unset('blocks.'+k);delete DATA.blocks[k];applyBlocks();decorateBlocks();toast('원래 글로 되돌렸습니다')}catch(e){toast('실패: '+e.message,true)}
          }:null});
      };
      var oldPen=el.parentNode.querySelector(':scope > .cms-pen[data-for="'+k+'"]');if(oldPen)oldPen.remove();
      b.dataset.for=k;
      if(el.tagName==='P'||el.tagName==='DIV'||el.tagName==='LI'){el.parentNode.insertBefore(b,el)}else{el.parentNode.insertBefore(b,el.nextSibling)}
    });
  }
  function undecorate(){[].forEach.call(document.querySelectorAll('.cms-pen,.cms-bar'),function(e){e.remove()})}

  /* ── ② 짧은 목록 (data-cms-list) — 항목 하나가 한 요소 ── */
  function applyLists(){
    var lists=(DATA.lists||{});
    [].forEach.call(document.querySelectorAll('[data-cms-list]'),function(box){
      var k=box.dataset.cmsList;
      if(!(k in DEFAULTS))DEFAULTS[k]={html:box.innerHTML,tpl:(box.firstElementChild?box.firstElementChild.outerHTML:'<div>{{t}}</div>')};
      if(lists[k]){
        var tpl=DEFAULTS[k].tpl.replace(/>[^<]*</,'>{{t}}<').replace(/ style="[^"]*"/,'');
        box.innerHTML=lists[k].map(function(t){return tpl.replace('{{t}}',esc(t))}).join('');
      }else box.innerHTML=DEFAULTS[k].html;
    });
  }
  function decorateLists(){
    [].forEach.call(document.querySelectorAll('[data-cms-list]'),function(box){
      var k=box.dataset.cmsList;
      var b=pencil('목록 수정');
      b.onclick=function(){
        var cur=(DATA.lists&&DATA.lists[k])||[].map.call(box.children,function(c){return c.textContent.trim()});
        openEditor({title:'목록 수정 — 한 줄에 하나씩',fields:[{k:'v',value:cur.join('\n'),rows:Math.min(18,cur.length+3)}],
          onSave:async function(o){
            var arr=o.v.split('\n').map(function(s){return s.trim()}).filter(Boolean);
            try{var p={};p['lists.'+k]=arr;await save(p);DATA.lists=DATA.lists||{};DATA.lists[k]=arr;applyLists();decorateLists();toast('저장했습니다')}
            catch(e){toast('저장 실패: '+e.message,true)}
          },
          onReset:(DATA.lists&&DATA.lists[k])?async function(){try{await unset('lists.'+k);delete DATA.lists[k];applyLists();decorateLists();toast('원래대로 되돌렸습니다')}catch(e){toast('실패: '+e.message,true)}}:null});
      };
      var prev=box.previousElementSibling;if(prev&&prev.classList.contains('cms-pen'))prev.remove();
      box.parentNode.insertBefore(b,box);
    });
  }

  /* ── ③ 조직도 (data-cms-org) — 드래그로 옮기기 ── */
  //  자료 형태: {tiers:[{nodes:[{t:'회장',s:'설명',c:'top|red|blue|'}],wide:false,line:'v'|'none'}]}
  //  wide: 가로선으로 묶인 위원회 줄(hwrap). line: 이 줄 위에 오는 세로 연결선('v' 기본 / 'none' 없음).
  //  선은 style.css 의 .vline·.hwrap::before 가 그립니다 — 줄(tier)의 크기를 편집 모드에서 바꾸지 않아야 선이 어긋나지 않습니다.
  function orgFromDom(box){
    var tiers=[],prevLine=false;
    [].forEach.call(box.children,function(ch){
      if(ch.classList.contains('vline')){prevLine=true;return}
      var wide=ch.classList.contains('hwrap');
      var tier=wide?ch.querySelector('.tier'):(ch.classList.contains('tier')?ch:null);
      if(!tier)return;
      var line=(tiers.length===0||wide)?'v':(prevLine?'v':'none');prevLine=false;
      tiers.push({wide:wide,line:line,nodes:[].map.call(tier.querySelectorAll('.node'),function(n){
        var s=n.querySelector('span');
        return {t:(s?n.childNodes[0].textContent:n.textContent).trim(),s:s?s.textContent.trim():'',
          c:n.classList.contains('n-top')?'top':(n.classList.contains('n-red')?'red':(n.classList.contains('n-blue')?'blue':''))};
      })});
    });
    return {tiers:tiers};
  }
  function orgRender(box,org){
    box.innerHTML=org.tiers.map(function(tier,ti){
      var inner='<div class="tier" data-ti="'+ti+'">'+tier.nodes.map(function(n,ni){
        return '<div class="node'+(n.c==='top'?' n-top':n.c==='red'?' n-red':n.c==='blue'?' n-blue':'')+'" data-ti="'+ti+'" data-ni="'+ni+'">'+esc(n.t)+(n.s?'<span>'+esc(n.s)+'</span>':'')+'</div>';
      }).join('')+'</div>';
      var block=tier.wide?'<div class="hwrap">'+inner+'</div>':inner;
      var showV=(ti>0&&!tier.wide&&tier.line!=='none');
      return (showV?'<div class="vline"></div>':'')+block;
    }).join('');
  }
  function applyOrg(){
    var box=document.querySelector('[data-cms-org]');if(!box)return;
    if(!DEFAULTS.__org)DEFAULTS.__org={html:box.innerHTML,data:orgFromDom(box)};
    ORG=(DATA.org&&DATA.org.tiers&&DATA.org.tiers.length)?JSON.parse(JSON.stringify(DATA.org)):JSON.parse(JSON.stringify(DEFAULTS.__org.data));
    if(DATA.org&&DATA.org.tiers&&DATA.org.tiers.length)orgRender(box,ORG); else box.innerHTML=DEFAULTS.__org.html;
    ORG_DIRTY=false;
  }
  function decorateOrg(){
    var box=document.querySelector('[data-cms-org]');if(!box)return;
    orgRender(box,ORG);
    box.style.outline='2px dashed #1F4E9C';box.style.outlineOffset='10px';box.style.borderRadius='12px';
    // 노드: 드래그 + 클릭 편집
    [].forEach.call(box.querySelectorAll('.node'),function(n){
      n.draggable=true;n.style.cursor='grab';n.title='드래그해서 옮기기 · 클릭해서 이름·설명·색 수정';
      n.addEventListener('dragstart',function(e){e.dataTransfer.setData('text/plain',n.dataset.ti+':'+n.dataset.ni);n.style.opacity='.5'});
      n.addEventListener('dragend',function(){n.style.opacity=''});
      n.onclick=function(){
        var t=ORG.tiers[+n.dataset.ti],nd=t.nodes[+n.dataset.ni];
        openEditor({title:'조직 상자 수정',fields:[
          {k:'t',label:'이름',value:nd.t,rows:1},{k:'s',label:'설명 (선택)',value:nd.s,rows:2},
          {k:'c',label:'색',type:'select',value:nd.c,options:[{v:'',t:'기본(흰색)'},{v:'top',t:'진한색 (회장·총회)'},{v:'red',t:'빨강 테두리 (감사·공정위·권역)'},{v:'blue',t:'파랑 테두리 (이사회·시도연맹)'}]},
          {k:'del',label:'삭제',type:'select',value:'',options:[{v:'',t:'유지'},{v:'1',t:'이 상자 삭제'}]}],
          onSave:function(o){
            if(o.del==='1'){t.nodes.splice(+n.dataset.ni,1);if(!t.nodes.length)ORG.tiers.splice(+n.dataset.ti,1);}
            else{nd.t=o.t.trim()||nd.t;nd.s=o.s.trim();nd.c=o.c}
            ORG_DIRTY=true;decorateOrg();
          }});
      };
    });
    // 줄(tier): 드롭 대상 + 상자 추가 + 줄 설정
    //   ※ 줄에 padding·border 를 주면 세로선·가로선 기준이 틀어져 선이 삐뚤어집니다. 크기는 그대로 두고 outline 만 씁니다.
    [].forEach.call(box.querySelectorAll('.tier'),function(t){
      t.style.position='relative';t.style.minHeight='40px';t.style.outline='1px dashed transparent';t.style.outlineOffset='6px';t.style.borderRadius='10px';
      t.addEventListener('dragover',function(e){e.preventDefault();t.style.outlineColor='#1F4E9C';t.style.background='#eef3fa'});
      t.addEventListener('dragleave',function(){t.style.outlineColor='transparent';t.style.background=''});
      t.addEventListener('drop',function(e){
        e.preventDefault();t.style.outlineColor='transparent';t.style.background='';
        var p=(e.dataTransfer.getData('text/plain')||'').split(':');var fi=+p[0],ni=+p[1];if(isNaN(fi))return;
        var node=ORG.tiers[fi].nodes.splice(ni,1)[0];
        var ti=+t.dataset.ti;
        // 놓은 위치: 마우스 x 기준으로 앞/뒤 결정
        var kids=[].slice.call(t.querySelectorAll('.node'));var idx=kids.length;
        for(var i=0;i<kids.length;i++){var r=kids[i].getBoundingClientRect();if(e.clientX<r.left+r.width/2){idx=i;break}}
        if(fi===ti&&ni<idx)idx--;
        ORG.tiers[ti].nodes.splice(idx,0,node);
        if(!ORG.tiers[fi].nodes.length){ORG.tiers.splice(fi,1)}
        ORG_DIRTY=true;decorateOrg();
      });
      // 도구 버튼은 줄 바깥(오른쪽)에 띄워 줄 너비·선 위치에 영향을 주지 않게 합니다.
      var tools=document.createElement('div');
      tools.style.cssText='position:absolute;left:100%;top:50%;transform:translateY(-50%);margin-left:12px;display:flex;flex-direction:column;gap:4px;z-index:2';
      var add=document.createElement('button');add.type='button';add.textContent='+';add.title='이 줄에 상자 추가';
      add.style.cssText='border:1.5px dashed #1F4E9C;background:#fff;color:#1F4E9C;border-radius:10px;width:32px;height:30px;font-weight:900;cursor:pointer;font-family:inherit';
      add.onclick=function(){ORG.tiers[+t.dataset.ti].nodes.push({t:'새 조직',s:'',c:''});ORG_DIRTY=true;decorateOrg()};
      var cfg=document.createElement('button');cfg.type='button';cfg.textContent='⚙';cfg.title='줄 설정 — 연결선 · 가로선 · 순서';
      cfg.style.cssText='border:1.5px solid #dfe5ee;background:#fff;color:#4b5563;border-radius:10px;width:32px;height:30px;font-weight:900;cursor:pointer;font-family:inherit';
      cfg.onclick=function(){orgTierSettings(+t.dataset.ti)};
      tools.appendChild(add);tools.appendChild(cfg);
      t.appendChild(tools);
    });
    // 하단 도구줄
    var bar=document.createElement('div');bar.className='cms-bar';
    bar.style.cssText='display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:18px';
    var mk=function(txt,bg,fn){var b=document.createElement('button');b.type='button';b.textContent=txt;b.onclick=fn;b.style.cssText='border:none;background:'+bg+';color:#fff;border-radius:9px;padding:9px 16px;font-weight:800;cursor:pointer;font-family:inherit';return b};
    var hint=document.createElement('div');hint.style.cssText='flex-basis:100%;text-align:center;font-size:12px;color:#6b7280;margin-bottom:2px';
    hint.textContent='상자는 끌어서 옮기고 눌러서 고칩니다 · 줄 오른쪽 [+]는 상자 추가, [⚙]는 연결선·가로선·줄 순서 설정';
    bar.appendChild(hint);
    bar.appendChild(mk('+ 줄 추가','#8a919d',function(){ORG.tiers.push({wide:false,line:'v',nodes:[{t:'새 조직',s:'',c:''}]});ORG_DIRTY=true;decorateOrg()}));
    bar.appendChild(mk('+ 위원회 줄 추가 (가로선)','#8a919d',function(){ORG.tiers.push({wide:true,nodes:[{t:'새 위원회',s:'',c:''}]});ORG_DIRTY=true;decorateOrg()}));
    bar.appendChild(mk('💾 조직도 저장','#153A77',async function(){
      try{await save({org:ORG});DATA.org=JSON.parse(JSON.stringify(ORG));ORG_DIRTY=false;toast('조직도를 저장했습니다')}catch(e){toast('저장 실패: '+e.message,true)}
    }));
    bar.appendChild(mk('↩ 원래 조직도로','#C41E2F',async function(){
      if(!confirm('저장한 조직도를 지우고 원래 조직도로 되돌릴까요?'))return;
      try{await unset('org');delete DATA.org;applyOrg();decorateOrg();toast('원래 조직도로 되돌렸습니다')}catch(e){toast('실패: '+e.message,true)}
    }));
    var oldBar=box.parentNode.querySelector('.cms-bar');if(oldBar)oldBar.remove();
    box.parentNode.insertBefore(bar,box.nextSibling);
  }

  // 줄 설정 — 위 연결선(세로선) 유무, 가로 묶음선(위원회 줄), 줄 순서 이동, 줄 삭제
  function orgTierSettings(ti){
    var tier=ORG.tiers[ti];if(!tier)return;
    openEditor({title:'줄 설정 — '+(ti+1)+'번째 줄 ('+tier.nodes.map(function(n){return n.t}).join(' · ')+')',fields:[
      {k:'line',label:'이 줄 위의 세로 연결선',type:'select',value:(tier.line==='none'?'none':'v'),options:[{v:'v',t:'세로선 표시 (기본)'},{v:'none',t:'선 없음'}]},
      {k:'wide',label:'가로 묶음선 (위원회처럼 여러 상자를 한 선으로 묶음)',type:'select',value:tier.wide?'1':'',options:[{v:'',t:'끔'},{v:'1',t:'켬'}]},
      {k:'move',label:'줄 순서',type:'select',value:'',options:[{v:'',t:'그대로'},{v:'up',t:'한 줄 위로'},{v:'down',t:'한 줄 아래로'}]},
      {k:'del',label:'줄 삭제',type:'select',value:'',options:[{v:'',t:'유지'},{v:'1',t:'이 줄과 상자 모두 삭제'}]}],
      onSave:function(o){
        if(o.del==='1'){ORG.tiers.splice(ti,1);}
        else{
          tier.line=(o.line==='none')?'none':'v';tier.wide=(o.wide==='1');
          if(o.move==='up'&&ti>0){ORG.tiers.splice(ti,1);ORG.tiers.splice(ti-1,0,tier)}
          if(o.move==='down'&&ti<ORG.tiers.length-1){ORG.tiers.splice(ti,1);ORG.tiers.splice(ti+1,0,tier)}
        }
        ORG_DIRTY=true;decorateOrg();
      }});
  }

  /* ── ④ 제목+본문 카드 목록 (data-cms-sections) — 종목소개·후원안내 ── */
  //  페이지가 window.CMS_SECTION_DEFAULTS[키] 로 기본 카드를 넘겨줍니다. 저장 형태는 예전 관리자 편집기와 같은 sections:[{h,body}].
  function secRender(box,secs){
    box.innerHTML=secs.map(function(s,i){
      return '<div class="seccard" data-si="'+i+'"><h3>'+esc(s.h)+'</h3><div class="body">'+toHtml(s.body||'')+'</div></div>';
    }).join('');
  }
  function applySections(){
    [].forEach.call(document.querySelectorAll('[data-cms-sections]'),function(box){
      var k=box.dataset.cmsSections;
      var secs=(DATA.sections&&DATA.sections.length)?DATA.sections:((window.CMS_SECTION_DEFAULTS||{})[k]||[]);
      secRender(box,secs);
    });
  }
  function decorateSections(){
    [].forEach.call(document.querySelectorAll('[data-cms-sections]'),function(box){
      var k=box.dataset.cmsSections;
      var secs=JSON.parse(JSON.stringify((DATA.sections&&DATA.sections.length)?DATA.sections:((window.CMS_SECTION_DEFAULTS||{})[k]||[])));
      var commit=async function(next,msg){
        try{await save({sections:next});DATA.sections=next;applySections();decorateSections();toast(msg||'저장했습니다')}catch(e){toast('저장 실패: '+e.message,true)}
      };
      [].forEach.call(box.querySelectorAll('.seccard'),function(card){
        var i=+card.dataset.si;var s=secs[i];
        var tools=document.createElement('div');tools.className='cms-bar';tools.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px';
        var mk=function(txt,fn,color){var b=document.createElement('button');b.type='button';b.textContent=txt;b.onclick=fn;b.style.cssText='border:1.5px solid '+(color||'#153A77')+';background:#fff;color:'+(color||'#153A77')+';border-radius:999px;padding:3px 11px;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit';return b};
        tools.appendChild(mk('✏️ 수정',function(){
          openEditor({title:'카드 수정',fields:[{k:'h',label:'제목',value:s.h,rows:1},{k:'body',label:'내용',value:s.body,rows:12}],
            onSave:function(o){var n=secs.slice();n[i]={h:o.h.trim(),body:o.body};commit(n)}});
        }));
        if(i>0)tools.appendChild(mk('▲ 위로',function(){var n=secs.slice();var x=n.splice(i,1)[0];n.splice(i-1,0,x);commit(n,'순서를 바꿨습니다')},'#0f766e'));
        if(i<secs.length-1)tools.appendChild(mk('▼ 아래로',function(){var n=secs.slice();var x=n.splice(i,1)[0];n.splice(i+1,0,x);commit(n,'순서를 바꿨습니다')},'#0f766e'));
        tools.appendChild(mk('🗑 삭제',function(){if(!confirm('['+s.h+'] 카드를 삭제할까요?'))return;var n=secs.slice();n.splice(i,1);commit(n,'삭제했습니다')},'#C41E2F'));
        card.insertBefore(tools,card.firstChild);
      });
      var bar=document.createElement('div');bar.className='cms-bar';bar.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 16px';
      var add=document.createElement('button');add.type='button';add.textContent='+ 카드 추가';add.style.cssText='border:none;background:#153A77;color:#fff;border-radius:9px;padding:9px 16px;font-weight:800;cursor:pointer;font-family:inherit';
      add.onclick=function(){openEditor({title:'카드 추가',fields:[{k:'h',label:'제목',value:'',rows:1},{k:'body',label:'내용',value:'',rows:10}],onSave:function(o){if(!o.h.trim())return;commit(secs.concat([{h:o.h.trim(),body:o.body}]),'추가했습니다')}})};
      bar.appendChild(add);
      if(DATA.sections&&DATA.sections.length){
        var rs=document.createElement('button');rs.type='button';rs.textContent='↩ 기본 내용으로';rs.style.cssText='border:1.5px solid #C41E2F;background:#fff;color:#C41E2F;border-radius:9px;padding:9px 14px;font-weight:800;cursor:pointer;font-family:inherit';
        rs.onclick=async function(){if(!confirm('저장한 카드를 모두 지우고 기본 내용으로 되돌릴까요?'))return;try{await unset('sections');delete DATA.sections;applySections();decorateSections();toast('기본 내용으로 되돌렸습니다')}catch(e){toast('실패: '+e.message,true)}};
        bar.appendChild(rs);
      }
      box.appendChild(bar);
    });
  }

  /* ── 편집 스위치 ── */
  function applyAll(){applyBlocks();applyLists();applyOrg();applySections()}
  function setEdit(on){
    EDIT=on;
    if(on){decorateBlocks();decorateLists();decorateOrg();decorateSections()}
    else{if(ORG_DIRTY&&!confirm('조직도에 저장하지 않은 변경이 있습니다. 버릴까요?')){EDIT=true;return}undecorate();applyAll()}
    var sw=document.getElementById('cmsSwitch');if(sw){sw.textContent=on?'✅ 편집 끝내기':'✏️ 페이지 편집';sw.style.background=on?'#0f766e':'#153A77'}
  }
  function mountSwitch(){
    if(document.getElementById('cmsSwitch'))return;
    var b=document.createElement('button');b.id='cmsSwitch';b.type='button';b.textContent='✏️ 페이지 편집';
    b.style.cssText='position:fixed;right:18px;bottom:22px;z-index:9999;border:none;background:#153A77;color:#fff;border-radius:999px;padding:12px 18px;font-weight:900;font-size:14px;cursor:pointer;font-family:inherit;box-shadow:0 8px 24px rgba(21,58,119,.35)';
    b.onclick=function(){setEdit(!EDIT)};
    document.body.appendChild(b);
    window.addEventListener('beforeunload',function(e){if(EDIT&&ORG_DIRTY){e.preventDefault();e.returnValue=''}});
  }

  /* ── 시작 ── */
  async function start(){
    try{await ensureSDK()}catch(e){return}
    if(!document.querySelector('[data-cms],[data-cms-list],[data-cms-org],[data-cms-sections]'))return;
    try{var d=await ref().get();DATA=d.exists?(d.data()||{}):{}}catch(e){DATA={}}
    applyAll();
    firebase.auth().onAuthStateChanged(async function(u){
      ADMIN=false;
      if(u){try{var me=await DB.collection('users').doc(u.uid).get();var v=me.data()||{};ADMIN=!!(v.owner===true||v.role==='admin'||(Array.isArray(v.roles)&&v.roles.indexOf('admin')>=0))}catch(e){}}
      if(ADMIN)mountSwitch(); else {var sw=document.getElementById('cmsSwitch');if(sw)sw.remove();if(EDIT)setEdit(false)}
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start); else start();
  window.KFDF_CMS={reload:async function(){var d=await ref().get();DATA=d.exists?(d.data()||{}):{};applyAll();if(EDIT)setEdit(true)}};
})();
