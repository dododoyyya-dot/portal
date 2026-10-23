/* ══════════ 원반 놀이터 (play.html · 2026-10-20) ══════════
   A 배지 도감(#dex)  B 명예의 전당(#hall)  C 원반 골프 챌린지(#game)  D 룰 퀴즈(#quiz)  E 포지션 테스트(#type)  F 오늘의 원반 운세(#luck)  G 랭킹·승부 예측(#rank)
   자료: staffCareer(본인)·CAREER.loadExtra → 배지 / liveMatches·compStats(공개) → 명예의 전당·예측 대상
   쓰기(보안 규칙 v58): users.badgeShow(대표 배지 3) · playScores/{uid}{name,best,games,badges,at}(점수는 올리기만) · matchPicks/{경기ID_uid}{uid,name,slotId,matchId,pick,badges,at}(경기 「예정」일 때만)
   공개 목록의 회원 이름은 가운데를 가림(김*수). 선수 이름은 대회 결과 화면과 같은 설정(siteContent/results.nameMode)을 따름 */
KFDF.initApp();
const DB=firebase.firestore(),AUTH=firebase.auth(),FV=firebase.firestore.FieldValue;
const C=window.CAREER,MR=window.KFDF_MR;
const SLOT='DTxbzDpc1D0m1hiEi0lA';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const I=(n,o)=>C.svg(n,Object.assign({size:20,stroke:2},o||{}));
function mask(n){n=String(n||'').trim();if(!n)return '익명';if(n.length<2)return n;return n[0]+'*'.repeat(Math.max(1,n.length-2))+(n.length>2?n[n.length-1]:'')}
function myName(){return mask((MYD&&MYD.name)||(ME&&ME.displayName)||'')}
function myBadges(){return ((MYD&&MYD.badgeShow)||[]).slice(0,3)}
function badgeMini(ids,sz){return (ids||[]).map(id=>{const b=C.BADGES.find(x=>x.id===id);return b?'<span title="'+esc(b.name)+'" style="display:inline-flex">'+C.medal({icon:b.icon,rarity:b.rarity,size:sz||22})+'</span>':''}).join('')}
function rnd(seed){let h=2166136261;for(let i=0;i<seed.length;i++){h^=seed.charCodeAt(i);h=Math.imul(h,16777619)}return function(){h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
function say(msg){let t=document.getElementById('pgToast');if(!t){t=document.createElement('div');t.id='pgToast';t.style.cssText='position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:10070;background:#13306b;color:#fff;padding:11px 18px;border-radius:14px;font:800 14px Pretendard;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:calc(100% - 32px);text-align:center';document.body.appendChild(t)}t.textContent=msg;t.style.opacity='1';clearTimeout(t._h);t._h=setTimeout(()=>{t.style.opacity='0'},2600)}
function modal(html){closeModal();const o=document.createElement('div');o.className='pg-ov';o.id='pgOv';o.innerHTML='<div class="pg-mo"><button class="x" onclick="closeModal()" aria-label="닫기">✕</button>'+html+'</div>';o.addEventListener('click',e=>{if(e.target===o)closeModal()});document.body.appendChild(o)}
function closeModal(){const o=document.getElementById('pgOv');if(o)o.remove()}
const today=()=>{const d=new Date(Date.now()+9*3600e3);return d.toISOString().slice(0,10)};

/* ── 귀여운 원반 캐릭터(직접 그림) — acc: glasses·band·shield·mega·crown·hat·none ── */
function mascot(o){o=o||{};const c1=o.c1||'#ffe066',c2=o.c2||'#ffb000',sz=o.size||120,id='ms'+Math.random().toString(36).slice(2,7);let acc='';
  if(o.acc==='glasses')acc='<g fill="none" stroke="#13306b" stroke-width="3"><circle cx="-16" cy="-4" r="10"/><circle cx="16" cy="-4" r="10"/><path d="M-6 -4h12"/></g>';
  if(o.acc==='band')acc='<path d="M-56 -12 Q0 -26 56 -12 L54 -4 Q0 -18 -54 -4Z" fill="#ff6b6b"/><path d="M54 -8l14-6M54 -6l16 2" stroke="#ff6b6b" stroke-width="4" stroke-linecap="round"/><g stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"><path d="M-96 -2h26"/><path d="M-90 12h20"/></g>';
  if(o.acc==='shield')acc='<path d="M48 6l22-6v14c0 12-8 19-22 24-14-5-22-12-22-24V0z" transform="translate(16 -6)" fill="#2ec4a0" stroke="#fff" stroke-width="3"/><path d="M-78 -4l14 6-14 6" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>';
  if(o.acc==='mega')acc='<path d="M52 -6l26-14v34l-26-14z" fill="#8b7cf6" stroke="#fff" stroke-width="2.5"/><path d="M-72 -26c-6-8 6-14 8-4 2-10 14-4 8 4l-8 8z" fill="#ff6b6b"/><path d="M84 -26c-4-6 4-10 6-3 1-7 10-3 6 3l-6 6z" fill="#ff8fa3"/>';
  if(o.acc==='crown')acc='<path d="M-22 -22l8-16 8 10 6-14 6 14 8-10 8 16z" fill="#ffd23f" stroke="#e09a00" stroke-width="2"/>';
  if(o.acc==='hat')acc='<path d="M-26 -18 L0 -62 L26 -18Z" fill="#8b7cf6"/><circle cx="0" cy="-62" r="5" fill="#ffd23f"/><ellipse cx="0" cy="-18" rx="34" ry="6" fill="#6d5ce0"/><path d="M-8 -40l3 4 5 1-4 3 1 5-5-3-4 3 1-5-4-3 5-1z" fill="#ffd23f"/>';
  return '<svg width="'+sz+'" height="'+sz+'" viewBox="-100 -80 200 160" aria-hidden="true"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+c1+'"/><stop offset="1" stop-color="'+c2+'"/></linearGradient></defs>'
    +'<ellipse cx="0" cy="44" rx="48" ry="8" fill="rgba(19,48,107,.12)"/>'+(o.acc==='shield'||o.acc==='band'?acc:'')
    +'<ellipse cx="0" cy="10" rx="62" ry="24" fill="'+c2+'"/><ellipse cx="0" cy="2" rx="62" ry="24" fill="url(#'+id+')"/><ellipse cx="0" cy="0" rx="42" ry="14" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/>'
    +'<ellipse cx="-16" cy="-4" rx="5" ry="6.5" fill="#13306b"/><ellipse cx="16" cy="-4" rx="5" ry="6.5" fill="#13306b"/><circle cx="-14" cy="-6.5" r="2" fill="#fff"/><circle cx="18" cy="-6.5" r="2" fill="#fff"/>'
    +'<path d="M-9 7 Q0 15 9 7" fill="none" stroke="#13306b" stroke-width="3" stroke-linecap="round"/><ellipse cx="-31" cy="5" rx="7" ry="4" fill="#ff8a80" opacity=".75"/><ellipse cx="31" cy="5" rx="7" ry="4" fill="#ff8a80" opacity=".75"/>'
    +(o.acc==='shield'||o.acc==='band'?'':acc)+'</svg>'}

/* ── 공유 카드 이미지(1080×1350) — 배지·퀴즈·성향·운세 공용 ── */
function svgImg(svg){return new Promise((ok,no)=>{const s=svg.replace(/^<svg /,'<svg xmlns="http://www.w3.org/2000/svg" ');const im=new Image();im.onload=()=>ok(im);im.onerror=no;im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s)})}
function wrapText(g,t,x,y,maxW,lh){const words=String(t||'').split(' ');let line='',yy=y;words.forEach((w,i)=>{const test=line?line+' '+w:w;if(g.measureText(test).width>maxW&&line){g.fillText(line,x,yy);line=w;yy+=lh}else line=test});if(line)g.fillText(line,x,yy);return yy}
async function makeCard(o){
  try{await document.fonts.ready}catch(e){}
  const cv=document.createElement('canvas');cv.width=1080;cv.height=1350;const g=cv.getContext('2d');
  const bg=g.createLinearGradient(0,0,1080,1350);bg.addColorStop(0,o.c1||'#1f4e9c');bg.addColorStop(1,o.c2||'#0b1a3a');g.fillStyle=bg;g.fillRect(0,0,1080,1350);
  const r=rnd(o.kicker+o.title);for(let i=0;i<70;i++){g.globalAlpha=.18+r()*.35;g.fillStyle=['#ffd23f','#ffffff','#6ec6ff','#ff8fa3','#2ec4a0'][i%5];const x=r()*1080,y=r()*1350,s=4+r()*12;if(i%3)g.fillRect(x,y,s,s*.5);else{g.beginPath();g.arc(x,y,s/2,0,7);g.fill()}}g.globalAlpha=1;
  const glow=g.createRadialGradient(540,500,40,540,500,420);glow.addColorStop(0,'rgba(255,255,255,.35)');glow.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=glow;g.fillRect(0,0,1080,1000);
  g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=4;g.beginPath();g.roundRect?g.roundRect(40,40,1000,1270,48):g.rect(40,40,1000,1270);g.stroke();
  if(o.art){try{const im=await svgImg(o.art);g.drawImage(im,540-280,220,560,560)}catch(e){}}
  g.textAlign='center';g.fillStyle='rgba(255,255,255,.85)';g.font='900 34px Pretendard, sans-serif';g.fillText(o.kicker||'',540,150);
  g.fillStyle='#fff';g.font='400 92px Jua, Pretendard, sans-serif';g.fillText(o.title||'',540,880);
  if(o.pill){g.font='900 34px Pretendard, sans-serif';const w=g.measureText(o.pill).width+60;g.fillStyle=o.pillBg||'#ffd23f';g.beginPath();g.roundRect?g.roundRect(540-w/2,915,w,60,30):g.rect(540-w/2,915,w,60);g.fill();g.fillStyle=o.pillFg||'#13306b';g.fillText(o.pill,540,957)}
  g.fillStyle='rgba(255,255,255,.92)';g.font='700 38px Pretendard, sans-serif';let y=1050;(o.lines||[]).forEach(t=>{y=wrapText(g,t,540,y,880,52)+58});
  g.fillStyle='rgba(255,255,255,.7)';g.font='800 28px Pretendard, sans-serif';g.fillText((o.who?o.who+' · ':'')+today().replace(/-/g,'.'),540,1240);g.fillText('대한민국플라잉디스크연맹 · 원반 놀이터',540,1282);
  return cv}
async function shareCard(o,name){const cv=await makeCard(o);const url=cv.toDataURL('image/png');
  modal('<h3 class="pg-h" style="margin-top:4px">카드가 만들어졌어요!</h3><img class="card" src="'+url+'" alt="공유 카드"><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="pg-btn sun" id="pgSave">이미지 저장</button>'+(navigator.canShare?'<button class="pg-btn ghost" id="pgShare">공유하기</button>':'')+'</div><p class="pg-sub" style="margin:10px 0 0">휴대폰은 이미지를 길게 눌러 저장할 수도 있어요.</p>');
  document.getElementById('pgSave').onclick=()=>{const a=document.createElement('a');a.href=url;a.download=(name||'KFDF_카드')+'.png';document.body.appendChild(a);a.click();a.remove()};
  const sh=document.getElementById('pgShare');if(sh)sh.onclick=()=>cv.toBlob(b=>{const f=new File([b],(name||'KFDF_카드')+'.png',{type:'image/png'});if(navigator.canShare({files:[f]}))navigator.share({files:[f],title:o.title}).catch(()=>{});else say('이 기기는 바로 공유가 안 돼요 — 이미지를 저장해 주세요')})}

/* ── 상태·탭 ── */
let ME=null,MYD=null,BD=null,BST=null,BLOAD=false,TAB='dex';
const TABS=[['dex','배지 도감','medal','모으기'],['hall','명예의 전당','trophy','대회 기록'],['game','원반 골프','target','미니게임'],['quiz','룰 퀴즈','book','10문제'],['type','포지션 테스트','users','성향'],['luck','오늘의 운세','sparkle','하루 1번'],['rank','랭킹·예측','trend','함께 겨루기']];
function tabsHtml(){document.getElementById('pgTabs').innerHTML=TABS.map(t=>'<button class="'+(TAB===t[0]?'on':'')+'" onclick="go(\''+t[0]+'\')"><i>'+I(t[2],{size:22,color:TAB===t[0]?'#ffd23f':'#13306b'})+'</i>'+t[1]+'<small>'+t[3]+'</small></button>').join('')}
function go(t){if(!TABS.some(x=>x[0]===t))t='dex';if(TAB==='game'&&t!=='game')gmStop();TAB=t;try{history.replaceState(null,'','#'+t)}catch(e){}tabsHtml();render();try{const el=document.querySelector('.pg-tabs button.on');if(el&&el.scrollIntoView)el.scrollIntoView({block:'nearest',inline:'center'})}catch(e){}}
function render(){const el=document.getElementById('pgMain');if(!el)return;const fn=window[{dex:'dexRender',hall:'hallRender',game:'gameRender',quiz:'quizRender',type:'typeRender',luck:'luckRender',rank:'rankRender'}[TAB]||'dexRender'];
  if(typeof fn!=='function'){clearTimeout(render._t);render._t=setTimeout(render,120);return}   // play_fun.js 가 아직 안 올라왔으면 잠시 뒤
  if(TAB==='game'&&GM&&document.getElementById('gmCv'))return;   // 게임 중 로그인 상태 갱신으로 판이 다시 그려지지 않게
  fn(el)}
function whoHtml(){const w=document.getElementById('pgWho');if(!w)return;
  w.innerHTML=ME?(mascot({size:26})+'<span><b>'+esc((MYD&&MYD.name)||'회원')+'</b>님, 반가워요! '+badgeMini(myBadges(),20)+'</span>'):(mascot({size:26})+'<span>로그인하면 내 배지가 칠해지고 랭킹·예측에 참여해요 · <a href="login.html?next=play.html">로그인</a></span>')}
AUTH.onAuthStateChanged(async u=>{ME=u;MYD=null;BD=null;BST=null;
  if(u){try{const d=await DB.collection('users').doc(u.uid).get();MYD=d.exists?d.data():{}}catch(e){MYD={}}}
  whoHtml();render();if(u)loadBadges()});
document.addEventListener('DOMContentLoaded',()=>{TAB=(location.hash||'#dex').slice(1);if(!TABS.some(x=>x[0]===TAB))TAB='dex';tabsHtml();render()});

/* ══ A. 배지 도감 ══ */
let DX={cat:'all'};
async function loadBadges(){if(!ME||BLOAD)return;BLOAD=true;
  try{const q=await DB.collection('staffCareer').where('uid','==',ME.uid).limit(500).get();const recs=q.docs.map(d=>d.data());const x=await C.loadExtra(DB,ME.uid,MYD||{});BST=C.stats(recs,x);BD=C.badges(BST)}
  catch(e){console.warn('badges',e);BST=C.stats([],{});BD=C.badges(BST)}
  BLOAD=false;if(TAB==='dex')render()}
function dexRender(el){
  const bd=BD||C.badges(C.stats([],{}));const RC=C.RARITY;const done=bd.filter(b=>b.done);const pct=Math.round(done.length/bd.length*100);
  const cats=[['all','전체'],['','대회 경력'],['심판','심판'],['지도','선생님·지도'],['사진','사진'],['계정','자격·계정'],['숨은','숨은 배지']];
  const L=bd.filter(b=>DX.cat==='all'||(DX.cat==='숨은'?b.hidden:b.cat===DX.cat));
  const order={legendary:0,epic:1,rare:2,uncommon:3,fun:4,common:5};
  const sorted=L.slice().sort((a,b)=>(a.done===b.done?0:a.done?-1:1)||(order[a.rarity]-order[b.rarity]));
  const shown=myBadges();const R=48,CIRC=2*Math.PI*R;
  el.innerHTML='<div class="pg-card"><div class="dx-top"><div class="dx-ring"><svg width="118" height="118" viewBox="0 0 118 118"><circle cx="59" cy="59" r="'+R+'" fill="none" stroke="#eef1f5" stroke-width="12"/><circle cx="59" cy="59" r="'+R+'" fill="none" stroke="url(#dxg)" stroke-width="12" stroke-linecap="round" stroke-dasharray="'+(CIRC*pct/100)+' '+CIRC+'" transform="rotate(-90 59 59)"/><defs><linearGradient id="dxg"><stop offset="0" stop-color="#2ec4a0"/><stop offset="1" stop-color="#6ec6ff"/></linearGradient></defs></svg><b>'+done.length+'<small>/ '+bd.length+'</small></b></div>'
    +'<div><h2 class="pg-h">배지 도감</h2><p class="pg-sub" style="margin:0">'+(ME?(BD?'모은 배지는 색이 칠해져요. 눌러서 <b>카드 이미지</b>를 만들고 <b>대표 배지</b>로 걸어 보세요. 숨은 배지는 받기 전엔 「???」예요.':'내 기록을 불러오는 중이에요…'):'로그인하면 내가 모은 배지에 색이 칠해져요. 지금은 전체 배지를 구경할 수 있어요.')+'</p>'
    +'<div class="dx-rar">'+Object.keys(order).map(r=>{const n=bd.filter(b=>b.rarity===r).length,d=bd.filter(b=>b.rarity===r&&b.done).length;return '<span><i style="background:linear-gradient(135deg,'+RC[r][0]+','+RC[r][1]+')"></i>'+C.RARITY_LABEL[r]+' '+d+'/'+n+'</span>'}).join('')+'</div></div></div></div>'
    +'<div class="pg-card" style="margin-top:14px">'+(ME?'<div class="dx-show">대표 배지 '+(shown.length?badgeMini(shown,30):'<span style="color:var(--ink2);font-weight:700">아직 없어요 — 모은 배지를 눌러 걸어 보세요</span>')+'</div>':'')
    +'<div class="pg-chips">'+cats.map(c=>'<button class="'+(DX.cat===c[0]?'on':'')+'" onclick="DX.cat=\''+c[0]+'\';render()">'+c[1]+'</button>').join('')+'</div>'
    +'<div class="dx-grid">'+sorted.map(b0=>{const sec=b0.hidden&&!b0.done;const b=sec?Object.assign({},b0,{name:'???',icon:'question'}):b0;const rc=RC[b.rarity]||RC.common;
      return '<div class="dx-t'+(b.done?' on':'')+'" style="--rc:'+rc[0]+';--rc2:'+rc[1]+'" onclick="dexCard(\''+b0.id+'\')">'+(shown.indexOf(b0.id)>=0?'<span class="st">★</span>':'')+'<div class="m">'+C.medal({icon:b.icon,rarity:b.rarity,size:64,locked:!b.done})+'</div><b>'+esc(b.name)+'</b><small>'+esc(b.rarityLabel)+'</small>'+(b.done||sec?'':'<div class="bar"><i style="width:'+b.pct+'%"></i></div>')+'</div>'}).join('')+'</div></div>'}
function dexCard(id){const bd=BD||C.badges(C.stats([],{}));const b=bd.find(x=>x.id===id);if(!b)return;const sec=b.hidden&&!b.done;const rc=C.RARITY[b.rarity]||C.RARITY.common;const on=myBadges().indexOf(id)>=0;
  modal('<div style="display:flex;justify-content:center;margin-top:6px'+(b.done?';animation:pgBob 2.4s ease-in-out infinite':'')+'">'+C.medal({icon:sec?'question':b.icon,rarity:b.rarity,size:150,locked:!b.done})+'</div>'
    +'<div style="display:inline-block;margin-top:10px;padding:4px 12px;border-radius:999px;font:900 12px Pretendard;color:#fff;background:linear-gradient(135deg,'+rc[0]+','+rc[1]+')">'+esc(b.rarityLabel)+(b.done?' · 획득!':'')+'</div>'
    +'<h3 class="pg-h" style="font-size:28px;margin:8px 0 4px">'+esc(sec?'???':b.name)+'</h3><p class="pg-sub">'+esc(sec?'숨은 배지예요. 조건은 비밀 — 활동하다 보면 깜짝 선물처럼 열려요!':b.desc)+'</p>'
    +(b.done||sec?'':'<div class="hl-prog" style="margin:0 20px"><i style="width:'+b.pct+'%;background:linear-gradient(90deg,'+rc[0]+','+rc[1]+')"></i></div><p class="pg-sub" style="margin-top:6px">'+b.cur+' / '+b.need+'</p>')
    +(b.done?'<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:6px"><button class="pg-btn sun" onclick="dexShare(\''+id+'\')">카드 이미지 만들기</button>'+(ME?'<button class="pg-btn ghost" onclick="dexShow(\''+id+'\')">'+(on?'★ 대표 배지 빼기':'☆ 대표 배지로 걸기')+'</button>':'')+'</div>':''))}
function dexShare(id){const b=(BD||[]).find(x=>x.id===id);if(!b)return;const rc=C.RARITY[b.rarity]||C.RARITY.common;
  shareCard({kicker:'NEW BADGE · 배지 획득',title:b.name,pill:b.rarityLabel+' 배지',pillBg:'#fff',pillFg:rc[1],lines:[b.desc],c1:rc[0],c2:'#0b1a3a',art:C.medal({icon:b.icon,rarity:b.rarity,size:560}),who:myName()},'KFDF_배지_'+b.name)}
async function dexShow(id){if(!ME)return;const cur=myBadges();const i=cur.indexOf(id);if(i>=0)cur.splice(i,1);else{if(cur.length>=3){say('대표 배지는 3개까지예요 — 다른 배지를 먼저 빼 주세요');return}cur.push(id)}
  try{await DB.collection('users').doc(ME.uid).update({badgeShow:cur});MYD.badgeShow=cur;closeModal();whoHtml();render();say('대표 배지를 바꿨어요')}catch(e){say('저장하지 못했어요 — 보안 규칙 v58 게시 후 쓸 수 있어요')}}

/* ══ B. 명예의 전당 ══ */
let HL={slot:SLOT,list:null,data:{},nameMode:'masked'};
function recName(n){return HL.nameMode==='hidden'?'비공개':(HL.nameMode==='full'?String(n||''):mask(n))}   /* [2026-10-24] 공개 화면 — 학생 이름 가림(김*수) */
async function hallRender(el){
  if(!HL.list){el.innerHTML='<div class="pg-card"><div class="pg-empty">대회 기록을 모으는 중…</div></div>';
    try{const s=await DB.collection('siteContent').doc('results').get();if(s.exists&&s.data().nameMode)HL.nameMode=s.data().nameMode}catch(e){}
    try{const q=await DB.collection('compStats').limit(200).get();HL.list=q.docs.map(d=>Object.assign({id:d.id},d.data())).filter(x=>x.slotId&&!x.test&&!/^\[연습\]|테스트/.test(x.title||'')&&x.slotId!=='8pDAnnbpsMnfanCVNO6S').sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))}catch(e){HL.list=[]}
    if(!HL.list.some(x=>x.slotId===HL.slot)&&HL.list.length)HL.slot=HL.list[0].slotId}
  if(!HL.data[HL.slot]){el.innerHTML='<div class="pg-card"><div class="pg-empty">경기 기록을 정리하는 중…</div></div>';
    try{const q=await DB.collection('liveMatches').where('slotId','==',HL.slot).get();HL.data[HL.slot]=hallCalc(q.docs.map(d=>Object.assign({id:d.id},d.data())).filter(m=>!m.golf&&!m.test))}catch(e){HL.data[HL.slot]={err:e.message}}
    if(TAB!=='hall')return}
  const D=HL.data[HL.slot];const cur=(HL.list||[]).find(x=>x.slotId===HL.slot)||{};
  let h='<div class="pg-card"><h2 class="pg-h">명예의 전당</h2><p class="pg-sub">대회 경기 기록으로 자동으로 만들어져요. 경기가 끝날 때마다 바로 바뀝니다.</p>'
    +'<div class="hl-sel"><select onchange="HL.slot=this.value;render()">'+(HL.list||[]).map(x=>'<option value="'+esc(x.slotId)+'"'+(x.slotId===HL.slot?' selected':'')+'>'+esc((x.date?String(x.date).slice(0,10)+' · ':'')+(x.title||x.slotId))+'</option>').join('')+'</select><a class="pg-btn ghost" style="padding:9px 14px" href="results.html?id=slot_'+esc(HL.slot)+'">경기 결과 전체 →</a></div>';
  if(D.err){el.innerHTML=h+'<div class="pg-empty">불러오지 못했어요: '+esc(D.err)+'</div></div>';return}
  h+='<div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:800;color:var(--ink2)"><span>'+esc(cur.title||'')+'</span><span>경기 '+D.fin+' / '+D.total+' 종료</span></div><div class="hl-prog"><i style="width:'+(D.total?Math.round(D.fin/D.total*100):0)+'%"></i></div></div>';
  if(!D.total){el.innerHTML=h+'<div class="pg-card" style="margin-top:14px;text-align:center">'+mascot({acc:'glasses',size:130})+'<h3 class="pg-h">이 대회는 경기별 기록이 없어요</h3><p class="pg-sub">경기 기록 화면을 쓰지 않은 대회예요. 입상 결과는 <a href="results.html" style="font-weight:900;color:var(--pn)">대회 결과</a>에서 볼 수 있어요.</p></div>';return}
  if(!D.fin){const t=Date.parse('2026-10-24T09:00:00+09:00')-Date.now();
    el.innerHTML=h+'<div class="pg-card" style="margin-top:14px;text-align:center">'+mascot({acc:'crown',size:150})+'<h3 class="pg-h">아직 끝난 경기가 없어요</h3><p class="pg-sub">'+(HL.slot===SLOT&&t>0?'제19회 전국학교스포츠클럽축전까지 <b style="color:var(--coral)">'+Math.ceil(t/86400000)+'일</b> 남았어요! ':'')+'경기가 끝나면 우승 학교·득점왕·도움왕·최우수선수가 여기에 차례로 올라와요.</p></div>';return}
  const pod=(L,unit)=>{if(!L.length)return '<div class="pg-empty" style="padding:18px">아직 기록이 없어요</div>';const t=[L[1],L[0],L[2]];
    return '<div class="pod">'+t.map((p,i)=>p?'<div class="p'+(i===1?1:i===0?2:3)+'"><b>'+esc(recName(p.name))+'</b><small>'+esc(p.team)+'</small><div class="blk">'+p.v+'</div></div>':'<div></div>').join('')+'</div>'
      +'<ul class="hl-l">'+L.slice(3,10).map((p,i)=>'<li><em>'+(i+4)+'</em><span><b>'+esc(recName(p.name))+'</b> <small style="color:var(--ink2)">'+esc(p.team)+' · '+esc(p.div)+'</small></span><b class="n">'+p.v+unit+'</b></li>').join('')+'</ul>'};
  h+='<div class="hl-grid">'
    +'<div class="pg-card" style="grid-column:1/-1"><h3 class="pg-h" style="font-size:20px">'+I('crown',{color:'#e6a700'})+' 부문 우승</h3>'+(D.champs.length?'<div class="hl-champ">'+D.champs.map(c=>'<div class="hl-c">'+mascot({acc:'crown',size:58})+'<div><small>'+esc(c.div)+'</small><b>'+esc(c.team)+'</b><small style="color:#6a7290">결승 '+c.sa+' : '+c.sb+' '+esc(c.other)+'</small></div></div>').join('')+'</div>':'<div class="pg-empty" style="padding:14px">결승이 끝나면 우승 학교가 여기에 올라와요</div>')+'</div>'
    +'<div class="pg-card"><h3 class="pg-h" style="font-size:20px">'+I('disc',{color:'#ff6b6b'})+' 득점왕</h3>'+pod(D.scorers,'골')+'</div>'
    +'<div class="pg-card"><h3 class="pg-h" style="font-size:20px">'+I('handshake',{color:'#2ec4a0'})+' 도움왕</h3>'+pod(D.assists,'도움')+'</div>'
    +'<div class="pg-card"><h3 class="pg-h" style="font-size:20px">'+I('star',{color:'#8b7cf6'})+' 최우수선수 모음</h3>'+(D.mvps.length?'<div class="mvp">'+D.mvps.slice(0,40).map(p=>'<span>★ '+esc(recName(p.name))+' <small style="font-weight:700;opacity:.8">'+esc(p.team)+'</small></span>').join('')+'</div>':'<div class="pg-empty" style="padding:14px">아직 없어요</div>')+'</div>'
    +'<div class="pg-card"><h3 class="pg-h" style="font-size:20px">'+I('fire',{color:'#ff8a3d'})+' 화력 최강 학교</h3><ul class="hl-l">'+D.teams.slice(0,8).map((t,i)=>'<li><em>'+(i+1)+'</em><span><b>'+esc(t.team)+'</b> <small style="color:var(--ink2)">'+esc(t.div)+' · '+t.n+'경기</small></span><b class="n">'+t.g+'골</b></li>').join('')+'</ul></div>'
    +'<div class="pg-card"><h3 class="pg-h" style="font-size:20px">'+I('pulse',{color:'#ff6b6b'})+' 명승부</h3><ul class="hl-l">'
      +(D.best?'<li><em>'+I('bolt',{size:16,color:'#e6a700'})+'</em><span>최다 득점 경기<br><b>'+esc(D.best.a)+' '+D.best.sa+' : '+D.best.sb+' '+esc(D.best.b)+'</b></span></li>':'')
      +'<li><em>'+I('scale',{size:16,color:'#13306b'})+'</em><span>1점 차 승부</span><b class="n">'+D.close+'경기</b></li><li><em>'+I('swap',{size:16,color:'#8b7cf6'})+'</em><span>역전승</span><b class="n">'+D.comeback+'경기</b></li><li><em>'+I('wall',{size:16,color:'#2ec4a0'})+'</em><span>무실점 승리</span><b class="n">'+D.shutout+'경기</b></li></ul></div>'
    +'<div class="pg-card"><h3 class="pg-h" style="font-size:20px">'+I('whistle',{color:'#b8860b'})+' 최다 출장 주심</h3><ul class="hl-l">'+(D.refs.length?D.refs.slice(0,6).map((r,i)=>'<li><em>'+(i+1)+'</em><span><b>'+esc(mask(r.name))+'</b> 심판</span><b class="n">'+r.n+'경기</b></li>').join(''):'<li><span style="color:var(--ink2)">배정 기록이 아직 없어요</span></li>')+'</ul></div>'
    +'</div>';
  el.innerHTML=h}
function hallCalc(ms){const live=e=>e&&!e.void;const S={},A={},T={},R={};let fin=0,close=0,comeback=0,shutout=0,best=null;const mvps=[],champs=[];
  ms.forEach(m=>{const done=m.status==='종료';if(done)fin++;
    let a=0,b=0,tr={a:false,b:false};(m.events||[]).forEach(e=>{if(!live(e))return;const d=e.type==='goal'?1:(e.type==null&&typeof e.d==='number'?e.d:0);if(!d)return;if(e.side==='a')a+=d;else if(e.side==='b')b+=d;if(a<b)tr.a=true;if(b<a)tr.b=true;
      if(e.type==='goal'){const tm=(m[e.side]||{}).name||'';if(e.scorer&&e.scorer.name){const k=tm+'|'+e.scorer.no+'|'+e.scorer.name;S[k]=S[k]||{name:e.scorer.name,team:tm,div:m.div||'',v:0};S[k].v++}if(e.assist&&e.assist.name){const k=tm+'|'+e.assist.no+'|'+e.assist.name;A[k]=A[k]||{name:e.assist.name,team:tm,div:m.div||'',v:0};A[k].v++}}});
    a=Math.max(0,a);b=Math.max(0,b);
    ['a','b'].forEach(sd=>{const t=(m[sd]||{}).name;if(!t||/^\(.*\)$/.test(t))return;const k=(m.div||'')+'|'+t;T[k]=T[k]||{team:t,div:m.div||'',g:0,n:0};T[k].g+=sd==='a'?a:b;if(done)T[k].n++});
    if(done){if(Math.abs(a-b)===1)close++;if((a>b&&tr.a)||(b>a&&tr.b))comeback++;if((a>b&&b===0)||(b>a&&a===0))shutout++;if(!best||a+b>best.sa+best.sb)best={a:(m.a||{}).name||'',b:(m.b||{}).name||'',sa:a,sb:b};
      (m.mvps&&m.mvps.length?m.mvps:(m.mvp?[m.mvp]:[])).forEach(p=>{if(p&&p.name)mvps.push({name:p.name,team:p.team||''})});
      const rd=[m.round,m.stage,m.title].join(' ');if(/결승/.test(rd)&&!/준결승/.test(rd)&&a!==b){const w=a>b?'a':'b',l=a>b?'b':'a';champs.push({div:m.div||'',team:(m[w]||{}).name||'',other:(m[l]||{}).name||'',sa:Math.max(a,b),sb:Math.min(a,b)})}}
    ((m.officials||{}).list||[]).forEach(o=>{if(o&&o.name&&/주심/.test(o.role||'')){R[o.name]=(R[o.name]||0)+1}})});
  const srt=o=>Object.values(o).sort((x,y)=>y.v-x.v);
  return {total:ms.length,fin:fin,close:close,comeback:comeback,shutout:shutout,best:best,mvps:mvps,champs:champs,scorers:srt(S),assists:srt(A),teams:Object.values(T).sort((x,y)=>y.g-x.g),refs:Object.keys(R).map(n=>({name:n,n:R[n]})).sort((x,y)=>y.n-x.n)}}
