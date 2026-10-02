// intranet.js v20261002g · 연맹 인트라넷(그룹웨어) — 중앙 · 시도연맹 · 구군연맹 임원용 전자결재 · 문서함 · 직인 · 조직도
//   · 홈페이지와 별도 창에서 열리며, 들어올 때마다 아이디·비밀번호를 다시 입력해 인증합니다(창마다 · 30분 동안 쓰지 않으면 잠김).
//   · 기관(orgKey): central | sido_{시도} | gugun_{시도}_{구군} — 회원 등급(admin·owner / sidoOfficer+sido / gugunOfficer+sido+gugun)에서 정해집니다.
//   · 저장(보안 규칙 v46): intraDocs · intraMembers · intraOrgs · intraSeals(직인 관리자만) · intraCounters / 첨부: storage intranet/{문서ID}/ (스토리지 규칙 v9)
//   · 열람 범위: 기안자 · 결재선(readers) · 발신 기관과 수신 기관 임원(readOrgs). 수신 기관에는 결재가 끝난 뒤에 보입니다.
(function(){
'use strict';
var DB,AUTH;
var ME=null,MY=null,ORGS=[],ORG=null,MEMBERS=[],ORGDIR={},DOCS={},UNSUB=[],CP=null,STAMP=null,OPEN_ID='',LAST=Date.now(),TICK=null,HIDE=[];
var TEMPS={},PREFS={lines:[],forms:[]},EXT={};   // 임시보관 · 개인 설정(저장한 결재선·서식) · 확장 모듈(intranet2.js)
var V={mod:'home',folder:'a_wait',q:'',from:'',to:'',kind:'',page:1,size:15,sel:{}};
var IDLE_MS=30*60*1000;
var KIND={draft:'내부결재',coop:'협조문',official:'일반공문',seal:'직인',notice:'공람',ext:'접수'};
var KINDL={draft:'내부결재 문서',coop:'협조문 (연맹 간)',official:'일반기안 (일반공문)',seal:'직인 날인 요청',notice:'공람 · 공지',ext:'외부 문서 접수'};
var MODS=[['mail','쪽지'],['board','게시판'],['appr','결재'],['docs','문서함'],['task','업무요청'],['poll','설문'],['org','조직도'],['seal','직인'],['set','환경설정']];
var TREE={
  appr:[['기안',[['f_all','서식함'],['p_temp','임시보관']]],
    ['결재',[['a_wait','결재대기'],['a_prog','결재진행'],['a_mine','기안한 문서'],['a_done','결재완료'],['a_rej','반려·회수']]],
    ['공람',[['n_wait','공람대기'],['n_done','공람완료']]],
    ['발송',[['s_wait','발송대기'],['s_out','발송완료'],['s_back','수신반송']]],
    ['접수',[['r_wait','접수대기'],['r_me','개인접수'],['r_done','접수완료']]]],
  docs:[['대장',[['reg','문서 등록대장'],['x_reg','접수 대장'],['all','전체 문서']]],['수발신',[['d_out','발신함'],['r_all','수신함']]]],
  seal:[['직인',[['k_wait','직인대기'],['k_reg','직인 대장']]]]
};
// 기본 서식 — 서식함에서 고르면 종류·제목·본문 틀이 채워집니다(수신 기관은 등록된 기관만)
var FORMS=[
  {id:'b_lic',name:'자격연수 개최 승인 요청',kind:'coop',to:['central'],title:'[지도자·심판 자격연수] 개최 승인 요청',body:'1. 관련: 연맹 자격 관리 규정\n2. 아래와 같이 지도자·심판 자격연수를 개최하고자 하오니 승인하여 주시기 바랍니다.\n\n  가. 연수명: \n  나. 일시: \n  다. 장소: \n  라. 대상·인원: \n  마. 강사: \n  바. 수수료: \n\n붙임  1. 연수 계획서 1부.\n      2. 강사 명단 1부.  끝.'},
  {id:'b_comp',name:'대회 개최 승인 요청',kind:'coop',to:['central'],title:'[대회] 개최 승인 요청',body:'1. 관련: \n2. 아래와 같이 대회를 개최하고자 하오니 승인하여 주시기 바랍니다.\n\n  가. 대회명: \n  나. 일시: \n  다. 장소: \n  라. 종목·참가 규모: \n  마. 주최·주관: \n\n붙임  대회 요강 1부.  끝.'},
  {id:'b_rep',name:'행사 결과 보고',kind:'coop',to:['central'],title:'[결과 보고] ',body:'1. 관련: \n2. 위 호와 관련하여 행사 결과를 아래와 같이 보고합니다.\n\n  가. 행사명: \n  나. 일시·장소: \n  다. 참가 인원: \n  라. 주요 결과: \n  마. 특이사항: \n\n붙임  결과 자료 1부.  끝.'},
  {id:'b_coop',name:'협조 요청',kind:'coop',to:[],title:'[협조 요청] ',body:'1. 귀 연맹의 무궁한 발전을 기원합니다.\n2. 아래 사항에 대하여 협조를 요청드립니다.\n\n  가. 요청 내용: \n  나. 회신 기한: \n  다. 담당자: \n\n끝.'},
  {id:'b_seal',name:'직인 사용 신청',kind:'seal',to:[],title:'[직인 사용 신청] ',body:'1. 아래 문서에 직인 날인을 신청합니다.\n\n  가. 문서명: \n  나. 제출처: \n  다. 부수: \n  라. 사유: \n\n끝.'},
  {id:'b_off',name:'일반공문 (외부 발송)',kind:'official',to:[],title:'',body:'1. 귀 기관의 무궁한 발전을 기원합니다.\n2. 관련: \n3. 위 호와 관련하여 아래와 같이 알려드리오니 협조하여 주시기 바랍니다.\n\n  가. \n  나. \n\n붙임  1부.  끝.'},
  {id:'b_in',name:'내부결재',kind:'draft',to:[],title:'',body:'1. 관련: \n2. 위 호와 관련하여 아래와 같이 시행하고자 합니다.\n\n  가. \n  나. \n\n붙임  1부.  끝.'}
];
var FNAME={};Object.keys(TREE).forEach(function(m){TREE[m].forEach(function(g){g[1].forEach(function(f){FNAME[f[0]]=f[1]})})});
var IC={
  appr:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 14l2 2 4-4"/>',
  docs:'<path d="M3 6h7l2 2h9v11H3z"/>',
  seal:'<path d="M9 3h6v6l3 3v4H6v-4l3-3z"/><path d="M5 20h14"/>',
  org:'<rect x="9" y="3" width="6" height="5"/><rect x="3" y="16" width="6" height="5"/><rect x="15" y="16" width="6" height="5"/><path d="M12 8v4M6 16v-4h12v4"/>',
  set:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  mail:'<rect x="3" y="5" width="18" height="14"/><path d="M3 6l9 7 9-7"/>',board:'<rect x="4" y="3" width="16" height="18"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  task:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',poll:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  pen:'<path d="M4 20l4-1L19 8l-3-3L5 16z"/>',clip:'<path d="M8 12l6-6a3 3 0 014 4l-8 8a5 5 0 01-7-7l7-7"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',lock:'<rect x="5" y="11" width="14" height="9"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  fold:'<path d="M3 6h6l2 2h10v10H3z"/>',file:'<path d="M6 3h9l4 4v14H6z"/>',ref:'<path d="M20 12a8 8 0 10-3 6"/><path d="M20 5v5h-5"/>'
};
function ic(k,s){return '<svg class="gw-ic" viewBox="0 0 24 24" width="'+(s||16)+'" height="'+(s||16)+'" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+IC[k]+'</svg>'}
function $(id){return document.getElementById(id)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function nl(s){return esc(s).replace(/\n/g,'<br>')}
function now(){return new Date().toISOString()}
function loc(s){s=String(s||'');if(!s)return '';var d=new Date(s);if(isNaN(d))return s.slice(0,16);var p=function(n){return String(n).padStart(2,'0')};return d.getFullYear()+'.'+p(d.getMonth()+1)+'.'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes())}
function locd(s){return loc(s).slice(0,10)}
function roleSet(md){return [md.role].concat(md.roles||[]).filter(Boolean)}
// ── 순수 함수(시험 대상) ──
function myOrgsOf(md,noCentral){var r=roleSet(md||{}),o=[];md=md||{};
  if(!noCentral&&(md.owner===true||r.indexOf('admin')>=0))o.push({key:'central',name:'대한민국플라잉디스크연맹',level:0,sido:'',gugun:''});
  if(r.indexOf('sidoOfficer')>=0&&md.sido)o.push({key:'sido_'+md.sido,name:md.sido+'플라잉디스크연맹',level:1,sido:md.sido,gugun:''});
  if(r.indexOf('gugunOfficer')>=0&&md.sido&&md.gugun)o.push({key:'gugun_'+md.sido+'_'+md.gugun,name:md.sido+' '+md.gugun+'플라잉디스크연맹',level:2,sido:md.sido,gugun:md.gugun});
  return o}
function curStep(d){var l=d.line||[];for(var i=0;i<l.length;i++){if(l[i].status!=='승인')return i}return -1}
function isMyTurn(d,uid){if(d.status!=='진행')return false;var i=curStep(d);return i>=0&&d.line[i].uid===uid}
function sealPending(d){return !!(d.seal&&d.seal.status==='요청'&&d.status==='완료')}
function isKeeper(orgKey,uid,dir){var o=(dir||{})[orgKey];return !!(o&&(o.sealKeepers||[]).indexOf(uid)>=0)}
// [발송 2026-10-02] 수신처가 있는 문서는 만들 때 send {auto} 를 정합니다. auto 면 결재가 끝나는 즉시 수신 기관에 보이고,
//   아니면 「발송대기」에 머물다 발신 기관이 [발송]을 눌러야 보입니다(send.status='발송'). 예전 문서(send 없음)는 발송된 것으로 봅니다.
function sentOf(d){return d.status==='완료'&&(!d.send||d.send.auto===true||d.send.status==='발송')}
function sendPending(d){return d.status==='완료'&&!!d.send&&d.send.auto!==true&&d.send.status!=='발송'}
function needRecv(d,orgKey){return sentOf(d)&&(d.toOrgs||[]).indexOf(orgKey)>=0&&!((d.recv||{})[orgKey])}
function myRecvJob(d,c){var r=(d.recv||{})[c.orgKey];return !!(r&&r.assignee&&r.assignee.uid===c.uid&&(r.status==='접수'||r.status==='처리중'))}
function foldersOf(d,c){var f=['all'],uid=c.uid,ok=c.orgKey,mine=d.authorUid===uid,inLine=(d.line||[]).some(function(x){return x.uid===uid}),toMe=(d.toOrgs||[]).indexOf(ok)>=0,r=(d.recv||{})[ok],got=!!r,sent=sentOf(d),ext=d.kind==='ext',hasTo=(d.toOrgs||[]).length>0||d.kind==='official';
  if(isMyTurn(d,uid))f.push('a_wait');
  if(d.status==='진행'&&(mine||inLine)&&!isMyTurn(d,uid))f.push('a_prog');
  if(mine&&!ext)f.push('a_mine');
  if(d.status==='완료'&&(mine||inLine)&&!ext)f.push('a_done');
  if(mine&&(d.status==='반려'||d.status==='회수'))f.push('a_rej');
  if(sent&&toMe){f.push('r_all');if(d.kind==='notice')f.push(got?'n_done':'n_wait');else if(!got)f.push('r_wait');else if(r.status!=='반송')f.push('r_done')}
  if(myRecvJob(d,c))f.push('r_me');
  if(d.org===ok&&hasTo){if(sendPending(d))f.push('s_wait');if(sent){f.push('s_out');f.push('d_out')}
    var rv=d.recv||{};if(Object.keys(rv).some(function(k){return rv[k]&&rv[k].status==='반송'}))f.push('s_back')}
  if(sealPending(d)&&(isKeeper(d.seal.orgKey,uid,c.dir)||d.org===ok))f.push('k_wait');
  if(d.seal&&(d.seal.orgKey===ok||d.org===ok))f.push('k_reg');
  if(d.org===ok&&d.docNo&&!ext)f.push('reg');
  if((ext&&d.org===ok)||(sent&&toMe&&got&&r.status!=='반송'&&d.kind!=='notice'))f.push('x_reg');
  // [중앙 전체 열람] 중앙이 결재선·수신처가 아닌데도 볼 수 있는 다른 기관 문서(읽기 전용)
  if(ok==='central'&&d.org!=='central'&&!mine&&!inLine&&!toMe)f.push('z_org');
  var cb=(d.cab||{})[ok];if(cb)f.push('c_'+cb);
  return f}
function todoOf(d,c){return isMyTurn(d,c.uid)||needRecv(d,c.orgKey)||myRecvJob(d,c)||(sendPending(d)&&d.authorUid===c.uid)||(sealPending(d)&&isKeeper(d.seal.orgKey,c.uid,c.dir))}
function defPrefix(o){if(!o)return '문서';if(o.key==='central')return '대플연';if(o.level===1)return o.sido+'플연';return (o.gugun||'')+'플연'}
function docNoOf(prefix,year,n){return prefix+' '+year+'-'+String(n).padStart(3,'0')}
function readersOf(uid,line){var r=[uid];(line||[]).forEach(function(x){if(x.uid&&r.indexOf(x.uid)<0)r.push(x.uid)});return r}
function readOrgsOf(d,done){var r=[d.org];if(d.seal&&d.seal.orgKey&&r.indexOf(d.seal.orgKey)<0)r.push(d.seal.orgKey);if(done)(d.toOrgs||[]).forEach(function(k){if(r.indexOf(k)<0)r.push(k)});return r}
function stateOf(d,c){
  if(d.status==='진행'){var i=curStep(d);return i>=0?((d.line[i].type||'결재')+'대기'):'진행'}
  if(d.kind==='ext'){var er=(d.recv||{})[d.org];return er&&er.status!=='접수'?er.status:'접수 등록'}
  if(d.status==='완료'&&sealPending(d))return '직인대기';
  if(sendPending(d))return '발송대기';
  if(d.status==='완료'&&needRecv(d,c.orgKey))return d.kind==='notice'?'공람대기':'접수대기';
  if(d.status==='완료'&&(d.toOrgs||[]).indexOf(c.orgKey)>=0){var r=(d.recv||{})[c.orgKey];return r?r.status:'완료'}
  if(d.status==='완료'&&d.kind==='coop'&&(d.toOrgs||[]).length){var rv=d.recv||{},n=Object.keys(rv).filter(function(k){return rv[k].status==='완료'}).length;return '회신 '+n+'/'+d.toOrgs.length}
  if(d.status==='완료'&&d.kind==='official')return '발송완료';
  return d.status==='완료'?'시행완료':d.status}
// 부재 여부(오늘 기준) — intraMembers.absent {on, from, to, deputy:{uid,name,title}, note}
function isAbsent(m,day){var a=m&&m.absent;if(!a||!a.on)return false;return (!a.from||day>=a.from)&&(!a.to||day<=a.to)}
// 중앙 조직도 제외 목록에 있는지 — 있으면 인트라넷에서는 중앙 소속이 아님
function hiddenIn(list,uid){return (list||[]).some(function(x){return x&&x.uid===uid})}
// [결재 방식 2026-10-02] 기안자를 포함해 서명해야 하는 사람 수 — 1 = 기안자 전결(1인), 2 = 결재자 1명 이상, 3 = 결재자 2명 이상
//   중앙 사무국이 환경설정에서 정합니다(intraOrgs/central.apprPolicy {def, by:{기관 키:n}}). 지정이 없으면 1인 전결.
function apprMinOf(orgKey,dir){var p=((dir||{}).central||{}).apprPolicy||{};var n=+((p.by||{})[orgKey])||+p.def||1;return n>=1&&n<=3?n:1}
function gateOk(g,uid,t){return !!(g&&g.uid===uid&&(t-g.at)<12*3600*1000&&(t-(g.act||g.at))<IDLE_MS)}
window.KFDF_INTRA_CORE={sentOf:sentOf,sendPending:sendPending,isAbsent:isAbsent,apprMinOf:apprMinOf,hiddenIn:hiddenIn,myOrgsOf:myOrgsOf,curStep:curStep,isMyTurn:isMyTurn,foldersOf:foldersOf,todoOf:todoOf,needRecv:needRecv,sealPending:sealPending,isKeeper:isKeeper,defPrefix:defPrefix,docNoOf:docNoOf,readersOf:readersOf,readOrgsOf:readOrgsOf,stateOf:stateOf,gateOk:gateOk};
if(typeof document==='undefined'||!window.firebase)return;

function ctx(){return {uid:ME.uid,orgKey:ORG.key,dir:ORGDIR}}
function orgName(k){return (ORGDIR[k]&&ORGDIR[k].name)||(k==='central'?'대한민국플라잉디스크연맹':String(k||'').replace(/^sido_/,'').replace(/^gugun_/,'').replace(/_/g,' ')+'플라잉디스크연맹')}
function myTitle(){var m=MEMBERS.find(function(x){return x.uid===ME.uid&&x.orgKey===ORG.key});return (m&&m.title)||''}
function notifyOrg(k,t){MEMBERS.filter(function(m){return m.orgKey===k&&m.uid!==ME.uid}).forEach(function(m){try{KFDF.notify(m.uid,t,'intranet.html')}catch(e){}})}
function logOf(act){return {at:now(),uid:ME.uid,name:MY.name||'',org:ORG.name,act:act}}
function say(t,bad){var m=$('gwMsg');if(!m)return;m.textContent=t||'';m.className='gw-say'+(bad?' bad':'');if(t)setTimeout(function(){if(m.textContent===t)m.textContent=''},5000)}

// ══ 로그인(재인증) ══
var IDL={norm:function(id){return String(id||'').trim().toLowerCase()},
  unb64:function(s){var b=atob(s),a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a},
  key:function(id,pw){var te=new TextEncoder();return crypto.subtle.importKey('raw',te.encode(String(pw)),'PBKDF2',false,['deriveKey']).then(function(base){return crypto.subtle.deriveKey({name:'PBKDF2',salt:te.encode('kfdf-loginid:'+id),iterations:120000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])})},
  dec:function(id,pw,blob){var p=String(blob||'').split('.');return IDL.key(id,pw).then(function(k){return crypto.subtle.decrypt({name:'AES-GCM',iv:IDL.unb64(p[0])},k,IDL.unb64(p[1]))}).then(function(pt){return new TextDecoder().decode(pt)})},
  lookup:function(id,pw){id=IDL.norm(id);return DB.collection('loginIds').doc(id).get().then(function(d){if(!d.exists)return {email:id+'@kids.kfdf.local',data:null};var x=d.data()||{};if(x.enc)return IDL.dec(id,pw,x.enc).then(function(e){return {email:e,data:x}}).catch(function(){return {email:null,data:x}});return {email:x.email||(id+'@member.kfdf.local'),data:x}})}};
function gateGet(){try{return JSON.parse(sessionStorage.getItem('kfdfIntraGate')||'null')}catch(e){return null}}
function gateSet(uid){try{sessionStorage.setItem('kfdfIntraGate',JSON.stringify({uid:uid,at:(gateGet()&&gateGet().uid===uid?gateGet().at:Date.now()),act:Date.now()}))}catch(e){}}
function gateClear(){try{sessionStorage.removeItem('kfdfIntraGate')}catch(e){}}
// [로그인 배경 2026-10-02] 홈페이지 앨범의 가장 최근 사진(공개 자료)을 흐리게 깔아 줍니다. 못 불러오면 기본 배경 그대로.
var BG_DONE=false;
function loginBg(){if(BG_DONE)return;BG_DONE=true;
  DB.collection('gallery').where('status','==','published').limit(40).get().then(function(s){
    var a=s.docs.map(function(d){return d.data()}).filter(function(x){return x.cover&&/^(https:\/\/|data:image\/)/.test(x.cover)}).sort(function(x,y){return String(y.date||'').localeCompare(String(x.date||''))});
    if(!a.length)return;var im=new Image();im.onload=function(){var b=$('gwLgBg');if(b){b.style.backgroundImage='url("'+a[0].cover.replace(/"/g,'%22')+'")';b.className='gw-lgbg on'}};im.src=a[0].cover}).catch(function(){BG_DONE=false})}
function home(){V.mod='home';V.page=1;V.sel={};renderAll();var m=$('gwMain');if(m)m.scrollTop=0}
function showLogin(msg){
  loginBg();
  UNSUB.forEach(function(f){try{f()}catch(e){}});UNSUB=[];if(TICK){clearInterval(TICK);TICK=null}
  [].slice.call(document.querySelectorAll('.gw-win')).forEach(function(x){x.remove()});
  $('gwApp').style.display='none';var g=$('gwLogin');g.style.display='flex';
  $('lgErr').textContent=msg||'';$('lgPw').value='';setTimeout(function(){try{($('lgId').value?$('lgPw'):$('lgId')).focus()}catch(e){}},50)}
async function login(){
  var id=($('lgId').value||'').trim(),pw=$('lgPw').value||'',err=$('lgErr'),b=$('lgGo');
  if(!id){err.textContent='아이디를 입력하세요';return}if(!pw){err.textContent='비밀번호를 입력하세요';return}
  b.disabled=true;err.textContent='';err.className='gw-lgerr';
  try{
    var email=id,nx=null;
    if(id.indexOf('@')<0){var r=await IDL.lookup(id,pw);if(!r.email)throw {code:'auth/wrong-password'};email=r.email;if(r.data&&r.data.encNext){try{nx=await IDL.dec(IDL.norm(id),pw,r.data.encNext)}catch(e){nx=null}}}
    var cred;
    try{cred=await AUTH.signInWithEmailAndPassword(email,pw)}catch(e0){if(!nx)throw e0;cred=await AUTH.signInWithEmailAndPassword(nx,pw)}
    gateClear();gateSet(cred.user.uid);await enter(cred.user);
  }catch(e){var c=String((e&&e.code)||'');err.textContent=/too-many/.test(c)?'로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요.':/network/.test(c)?'네트워크 연결을 확인하세요.':'아이디 또는 비밀번호가 올바르지 않습니다.'}
  b.disabled=false;
}
function lock(msg){gateClear();showLogin(msg||'잠금 상태입니다. 다시 로그인하세요.')}
function logout(){if(!confirm('인트라넷에서 로그아웃할까요?\n홈페이지 로그인도 함께 해제됩니다.'))return;gateClear();AUTH.signOut().then(function(){showLogin('로그아웃했습니다.')})}
function touch(){LAST=Date.now()}
// ── 들어가기 ──
async function enter(u){
  ME=u;var d;try{d=await DB.collection('users').doc(u.uid).get();MY=d.exists?(d.data()||{}):{}}catch(e){showLogin('회원 정보를 확인하지 못했습니다.');return}
  HIDE=[];try{var hc=await DB.collection('intraOrgs').doc('central').get();HIDE=(hc.exists&&hc.data().hideCentral)||[]}catch(e){HIDE=[]}
  var noC=hiddenIn(HIDE,u.uid);ORGS=myOrgsOf(MY,noC);
  if(!ORGS.length&&noC){gateClear();showLogin('인트라넷에서 중앙 소속으로 표시하지 않도록 지정된 계정인데, 시도·구군 임원 지정이 없어 들어갈 소속이 없습니다. 사무국에 문의하세요.');return}
  if(!ORGS.length||MY.status!=='approved'){gateClear();showLogin('인트라넷은 중앙 사무국 · 시도연맹 임원 · 구군연맹 임원만 이용할 수 있습니다.');return}
  if(noC){try{var st=await DB.collection('intraMembers').doc(u.uid+'__central').get();if(st.exists)await st.ref.delete()}catch(e){}}   // 예전에 등록된 중앙 명부 정리
  var saved='';try{saved=localStorage.getItem('kfdfIntraOrg')||''}catch(e){}
  ORG=ORGS.find(function(o){return o.key===saved})||ORGS[0];
  PREFS={lines:[],forms:[]};try{var pf=await DB.collection('intraPrefs').doc(u.uid).get();if(pf.exists){PREFS.lines=pf.data().lines||[];PREFS.forms=pf.data().forms||[]}}catch(e){}
  try{await register();await loadDir()}catch(e){showLogin('인트라넷을 열지 못했습니다 ('+(e.code||e.message||e)+'). 보안 규칙 v46 게시 여부를 확인하세요.');return}
  $('gwLogin').style.display='none';$('gwApp').style.display='flex';LAST=Date.now();
  if(!TICK)TICK=setInterval(function(){if(Date.now()-LAST>IDLE_MS)lock('30분 동안 사용하지 않아 잠겼습니다. 다시 로그인하세요.');else{var g=gateGet();if(g){g.act=LAST;try{sessionStorage.setItem('kfdfIntraGate',JSON.stringify(g))}catch(e){}}}},20000);
  listen();renderAll();
}
async function register(){
  for(var i=0;i<ORGS.length;i++){var o=ORGS[i];
    var mref=DB.collection('intraMembers').doc(ME.uid+'__'+o.key);var g=await mref.get();
    var base={uid:ME.uid,name:MY.name||'',orgKey:o.key,orgName:o.name,level:o.level,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
    if(!g.exists)await mref.set(Object.assign({title:''},base));else if((g.data()||{}).name!==base.name)await mref.update({name:base.name,updatedAt:base.updatedAt,uid:ME.uid,orgKey:o.key});
    try{await mref.update({seen:now(),uid:ME.uid,orgKey:o.key})}catch(e){}   // 최근 접속(규칙 v48)
    var oref=DB.collection('intraOrgs').doc(o.key);var og=await oref.get();
    if(!og.exists)await oref.set({key:o.key,name:o.name,level:o.level,sido:o.sido,gugun:o.gugun,docPrefix:defPrefix(o),sealKeepers:[],createdAt:firebase.firestore.FieldValue.serverTimestamp(),createdBy:ME.uid});
  }
}
async function loadDir(){
  var a=await Promise.all([DB.collection('intraMembers').get(),DB.collection('intraOrgs').get()]);
  ORGDIR={};a[1].docs.forEach(function(d){ORGDIR[d.id]=d.data()});HIDE=((ORGDIR.central||{}).hideCentral)||HIDE||[];
  MEMBERS=a[0].docs.map(function(d){return Object.assign({_id:d.id},d.data())}).filter(function(m){return !(m.orgKey==='central'&&hiddenIn(HIDE,m.uid))});
  ORGS.forEach(function(o){if(ORGDIR[o.key]&&ORGDIR[o.key].name)o.name=ORGDIR[o.key].name});
}
function listen(){
  UNSUB.forEach(function(f){try{f()}catch(e){}});UNSUB=[];DOCS={};
  var on=function(q){UNSUB.push(q.onSnapshot(function(s){s.docChanges().forEach(function(c){if(c.type==='removed')delete DOCS[c.doc.id];else DOCS[c.doc.id]=Object.assign({_id:c.doc.id},c.doc.data())});renderLeft();renderMain();if(OPEN_ID&&DOCS[OPEN_ID]&&$('gwDoc'))openDoc(OPEN_ID,true)},function(e){say('문서를 불러오지 못했습니다: '+(e.code||e.message),true)}))};
  on(DB.collection('intraDocs').where('readers','array-contains',ME.uid).limit(500));
  on(DB.collection('intraDocs').where('readOrgs','array-contains',ORG.key).limit(500));
  // [중앙 전체 열람 · 규칙 v49] 중앙 소속으로 들어오면 모든 기관 문서를 함께 불러옵니다(게시 전에는 조용히 건너뜀)
  if(ORG.key==='central')UNSUB.push(DB.collection('intraDocs').limit(2000).onSnapshot(function(s){s.docChanges().forEach(function(c){if(c.type==='removed')delete DOCS[c.doc.id];else DOCS[c.doc.id]=Object.assign({_id:c.doc.id},c.doc.data())});renderLeft();renderMain()},function(){}));
  TEMPS={};UNSUB.push(DB.collection('intraTemp').where('uid','==',ME.uid).limit(100).onSnapshot(function(s){TEMPS={};s.forEach(function(d){TEMPS[d.id]=Object.assign({_id:d.id},d.data())});renderLeft();if(V.folder==='p_temp')renderMain()},function(){}));
  Object.keys(EXT).forEach(function(k){try{if(EXT[k].start)EXT[k].start()}catch(e){}});
}
function treeOf(m){if(m!=='docs')return TREE[m];var cs=((ORGDIR[(ORG||{}).key]||{}).cabinets)||[];var t=TREE.docs;if(ORG&&ORG.key==='central')t=t.concat([['중앙 열람',[['z_org','다른 기관 문서']]]]);return cs.length?t.concat([['기록물철',cs.map(function(c){return ['c_'+c.id,c.name]})]]):t}
function fname(f){if(FNAME[f])return FNAME[f];if(f==='z_org')return '다른 기관 문서 (중앙 열람)';var cs=((ORGDIR[(ORG||{}).key]||{}).cabinets)||[];var c=cs.find(function(x){return 'c_'+x.id===f});return c?c.name:''}
function setOrg(k){ORG=ORGS.find(function(o){return o.key===k})||ORG;try{localStorage.setItem('kfdfIntraOrg',ORG.key)}catch(e){}V.page=1;V.sel={};listen();renderAll()}
function setMod(m){V.mod=m;if(m==='appr')V.folder='a_wait';else if(TREE[m])V.folder=TREE[m][0][1][0][0];V.page=1;V.sel={};V.q='';renderAll()}
function setFolder(f){V.folder=f;var m=Object.keys(TREE).find(function(k){return treeOf(k).some(function(g){return g[1].some(function(x){return x[0]===f})})});if(m)V.mod=m;V.page=1;V.sel={};renderAll()}
function all(){return Object.keys(DOCS).map(function(k){return DOCS[k]})}
function inFolder(f){var c=ctx();return all().filter(function(d){return foldersOf(d,c).indexOf(f)>=0})}
function count(f){return f==='p_temp'?Object.keys(TEMPS).length:f==='f_all'?0:inFolder(f).length}
function modCount(m){if(m==='appr')return count('a_wait')+count('r_wait')+count('n_wait')+count('r_me')+count('s_wait');if(m==='seal')return ORG&&isKeeper(ORG.key,ME.uid,ORGDIR)?count('k_wait'):0;if(EXT[m]&&EXT[m].count){try{return EXT[m].count()||0}catch(e){return 0}}return 0}
// ══ 화면 ══
function renderAll(){renderLeft();renderMain();renderRight()}
function renderTop(){
  $('gwNav').innerHTML=MODS.filter(function(m){return TREE[m[0]]||m[0]==='org'||m[0]==='set'||EXT[m[0]]}).map(function(m){var n=modCount(m[0]);return '<button class="'+(V.mod===m[0]?'on':'')+'" onclick="INTRA.setMod(\''+m[0]+'\')"><span class="ni">'+ic(m[0],22)+(n?'<em>'+(n>99?'99+':n)+'</em>':'')+'</span><span>'+m[1]+'</span></button>'}).join('');
  $('gwUser').innerHTML='<span class="av">'+ic('user',22)+'</span><span class="nm"><b>'+esc(ORG.name)+'</b><i>'+esc(MY.name||'')+(myTitle()?' ('+esc(myTitle())+')':'')+'</i></span>'
    +'<button title="잠금" onclick="INTRA.lock()">'+ic('lock',15)+'</button><button class="tx" onclick="INTRA.logout()">로그아웃</button>';
}
function renderLeft(){
  if(!ORG)return;
  renderTop();
  if(V.mod==='home'){
    var G=[['결재',[['a_wait','결재대기'],['a_prog','결재진행'],['a_rej','반려·회수']]],['발송',[['s_wait','발송대기'],['s_back','수신반송']]],['접수',[['r_wait','접수대기'],['r_me','개인접수'],['n_wait','공람대기']]],['직인',[['k_wait','직인대기']]]];
    var ex=Object.keys(EXT).map(function(k){try{return EXT[k].alarm?EXT[k].alarm():null}catch(e){return null}}).filter(Boolean);
    $('gwLeft').innerHTML='<div class="gw-alarm"><h3>업무알림</h3>'+G.map(function(g){return '<div class="ag"><b>'+g[0]+'</b><div>'+g[1].map(function(f){var n=count(f[0]);return '<a onclick="INTRA.setFolder(\''+f[0]+'\')"><span>'+f[1]+'</span><em>'+(n||'')+'</em></a>'}).join('')+'</div></div>'}).join('')
      +ex.map(function(g){return '<div class="ag"><b>'+esc(g[0])+'</b><div>'+g[1].map(function(x){return '<a onclick="'+x[2]+'"><span>'+esc(x[0])+'</span><em>'+(x[1]||'')+'</em></a>'}).join('')+'</div></div>'}).join('')+'</div>'
      +'<div class="gw-new" style="margin-top:14px"><button class="main" onclick="INTRA.compose(\'draft\')">'+ic('pen',14)+' 기안하기</button></div>';
    return}
  if(EXT[V.mod]&&EXT[V.mod].left){$('gwLeft').innerHTML=EXT[V.mod].left();return}
  var q=[['a_wait','결재대기'],['r_wait','접수대기'],['r_me','개인접수'],['s_wait','발송대기']];
  var h='<div class="gw-new"><button class="main" onclick="INTRA.compose(\'draft\')">'+ic('pen',14)+' 기안하기</button><button class="dd" onclick="INTRA.newMenu(event)" title="문서 종류 선택">▾</button>'
    +'<div class="menu" id="gwNewMenu"><a onclick="INTRA.compose(\'draft\')">내부결재</a><a onclick="INTRA.compose(\'coop\')">협조문 (연맹 간)</a><a onclick="INTRA.compose(\'official\')">일반기안 (일반공문)</a><a onclick="INTRA.compose(\'seal\')">직인 날인 요청</a><a onclick="INTRA.compose(\'notice\')">공람 · 공지</a><a onclick="INTRA.compose(\'ext\')">외부 문서 접수 등록</a><a onclick="INTRA.setFolder(\'f_all\')">서식함에서 고르기</a></div></div>'
    +'<div class="gw-quick">'+q.map(function(x){var n=count(x[0]);return '<button onclick="INTRA.setFolder(\''+x[0]+'\')"><span class="c'+(n?' on':'')+'">'+ic('file',18)+(n?'<em>'+(n>99?'99+':n)+'</em>':'')+'</span><i>'+x[1]+'</i></button>'}).join('')+'</div>'
    +'<div class="gw-tree">';
  var tm=TREE[V.mod]?V.mod:'appr';
  treeOf(tm).forEach(function(g){h+='<div class="grp">'+ic('fold',14)+' '+g[0]+'</div>'+g[1].map(function(f){var n=count(f[0]);var hot=(/_wait$|^r_me$|^s_back$/.test(f[0]))&&n;return '<a class="'+(V.folder===f[0]&&TREE[V.mod]?'on':'')+'" onclick="INTRA.setFolder(\''+f[0]+'\')">'+ic('fold',13)+' '+esc(f[1])+(n?' <b'+(hot?' class="hot"':'')+'>'+n+'</b>':'')+'</a>'}).join('')});
  $('gwLeft').innerHTML=h+'</div>';
}
function newMenu(e){e.stopPropagation();var m=$('gwNewMenu');m.style.display=m.style.display==='block'?'none':'block'}
function filtered(){var q=V.q.trim().toLowerCase(),c=ctx();
  return inFolder(V.folder).filter(function(d){var t=String(d.createdAt||'').slice(0,10);
    return (!q||[d.title,d.docNo,d.authorName,d.orgName,(d.toNames||[]).join(' ')].join(' ').toLowerCase().indexOf(q)>=0)&&(!V.from||t>=V.from)&&(!V.to||t<=V.to)&&(!V.kind||d.kind===V.kind)})
    .sort(function(a,b){return String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''))})}
function renderMain(){
  if(!ORG)return;var m=$('gwMain');
  if(V.mod==='home'){m.innerHTML=homeHtml();return}
  if(EXT[V.mod]&&EXT[V.mod].main){EXT[V.mod].main(m);return}
  if(V.mod==='appr'&&V.folder==='p_temp'){m.innerHTML=tempHtml();return}
  if(V.mod==='appr'&&V.folder==='f_all'){m.innerHTML=formsHtml();return}
  if(V.mod==='org'){m.innerHTML=orgHtml();return}
  if(V.mod==='set'){settings();return}
  var L=filtered(),pages=Math.max(1,Math.ceil(L.length/V.size));if(V.page>pages)V.page=pages;var P=L.slice((V.page-1)*V.size,V.page*V.size),c=ctx();
  var keep={q:document.activeElement&&document.activeElement.id==='gwQ'};
  m.innerHTML='<div class="gw-bar"><h2>'+esc(fname(V.folder))+' <span>('+L.length+')</span></h2><span class="sp"></span>'
      +'<label>부서</label>'+(ORGS.length>1?'<select onchange="INTRA.setOrg(this.value)">'+ORGS.map(function(o){return '<option value="'+esc(o.key)+'"'+(o.key===ORG.key?' selected':'')+'>'+esc(o.name)+'</option>'}).join('')+'</select>':'<select disabled><option>'+esc(ORG.name)+'</option></select>')
      +'<label>구분</label><select onchange="INTRA.setV(\'kind\',this.value)"><option value="">전체</option>'+Object.keys(KIND).map(function(k){return '<option value="'+k+'"'+(V.kind===k?' selected':'')+'>'+KIND[k]+'</option>'}).join('')+'</select></div>'
    +'<div class="gw-search"><label>제목</label><input id="gwQ" value="'+esc(V.q)+'" onkeydown="if(event.key===\'Enter\')INTRA.setV(\'q\',this.value)"><label>기안일자</label><input type="date" id="gwFrom" value="'+esc(V.from)+'"><span>~</span><input type="date" id="gwTo" value="'+esc(V.to)+'">'
      +'<button class="gw-b" onclick="INTRA.search()">검색</button><button class="gw-b" onclick="INTRA.resetSearch()">초기화</button><span id="gwMsg" class="gw-say"></span></div>'
    +'<div class="gw-tool"><button class="gw-b" onclick="INTRA.openSel()">문서정보</button><button class="gw-b" onclick="INTRA.recvSel(\'접수\')">접수</button><button class="gw-b" onclick="INTRA.recvSel(\'확인\')">공람확인</button><button class="gw-b" onclick="INTRA.sendSel()">발송</button><button class="gw-b" onclick="INTRA.compose(\'draft\')">기안</button>'
      +'<span class="sp"></span><select onchange="INTRA.setV(\'size\',+this.value)">'+[15,30,50].map(function(n){return '<option'+(V.size===n?' selected':'')+'>'+n+'</option>'}).join('')+'</select><button class="gw-b" title="새로 고침" onclick="INTRA.refresh()">'+ic('ref',13)+'</button></div>'
    +'<div class="gw-tblw"><table class="gw-tbl"><colgroup><col style="width:34px"><col style="width:58px"><col><col style="width:132px"><col style="width:84px"><col style="width:150px"><col style="width:118px"><col style="width:118px"><col style="width:84px"></colgroup>'
      +'<thead><tr><th><input type="checkbox" onclick="INTRA.selAll(this.checked)"></th><th>구분</th><th>제목</th><th>문서번호</th><th>기안자</th><th>기안부서</th><th>기안일시</th><th>처리일시</th><th>처리현황</th></tr></thead><tbody>'
      +(P.length?P.map(function(d){var todo=todoOf(d,c);return '<tr class="'+(todo?'todo':'')+'"><td class="c"><input type="checkbox" '+(V.sel[d._id]?'checked ':'')+'onclick="INTRA.sel(\''+d._id+'\',this.checked)"></td><td class="c">'+esc(KIND[d.kind]||'')+'</td>'
          +'<td class="t">'+(d.urgent?'<b style="color:#c0392b">[긴급]</b> ':'')+'<a onclick="INTRA.openDoc(\''+d._id+'\')">'+esc(d.title||'(제목 없음)')+'</a>'+((d.files||[]).length?' <span class="clip" title="붙임 '+d.files.length+'개">'+ic('clip',12)+'</span>':'')+'</td>'
          +'<td>'+esc(d.docNo||'')+'</td><td class="c">'+esc(d.authorName||'')+'</td><td>'+esc(d.orgName||'')+'</td><td class="c">'+esc(loc(d.createdAt))+'</td><td class="c">'+esc(loc(d.doneAt||d.updatedAt))+'</td><td class="c st">'+esc(stateOf(d,c))+'</td></tr>'}).join('')
        :'<tr><td colspan="9" class="empty">문서가 없습니다.</td></tr>')+'</tbody></table></div>'
    +'<div class="gw-page">'+pager(pages)+'<span class="of">'+V.page+' / '+pages+'</span></div>';
  if(keep.q){var i=$('gwQ');i.focus();i.setSelectionRange(i.value.length,i.value.length)}
}
function pager(pages){var s=Math.max(1,Math.min(V.page-4,pages-9)),e=Math.min(pages,s+9),h='<button onclick="INTRA.go(1)"'+(V.page<=1?' disabled':'')+'>«</button><button onclick="INTRA.go('+(V.page-1)+')"'+(V.page<=1?' disabled':'')+'>‹</button>';
  for(var i=s;i<=e;i++)h+='<button class="'+(i===V.page?'on':'')+'" onclick="INTRA.go('+i+')">'+i+'</button>';
  return h+'<button onclick="INTRA.go('+(V.page+1)+')"'+(V.page>=pages?' disabled':'')+'>›</button><button onclick="INTRA.go('+pages+')"'+(V.page>=pages?' disabled':'')+'>»</button>'}
function go(p){V.page=Math.max(1,p);renderMain()}
function setV(k,v){V[k]=v;V.page=1;renderMain()}
function search(){V.q=$('gwQ').value;V.from=$('gwFrom').value;V.to=$('gwTo').value;V.page=1;renderMain()}
function resetSearch(){V.q='';V.from='';V.to='';V.kind='';V.page=1;renderMain()}
function refresh(){loadDir().then(function(){listen();renderAll();say('새로 고쳤습니다')})}
function sel(id,on){if(on)V.sel[id]=1;else delete V.sel[id]}
function selAll(on){V.sel={};if(on)filtered().slice((V.page-1)*V.size,V.page*V.size).forEach(function(d){V.sel[d._id]=1});renderMain()}
function selIds(){return Object.keys(V.sel).filter(function(k){return DOCS[k]})}
function openSel(){var s=selIds();if(!s.length){alert('문서를 선택하세요.');return}openDoc(s[0])}
async function sendSel(){var s=selIds().filter(function(id){var d=DOCS[id];return sendPending(d)&&d.org===ORG.key});if(!s.length){alert('발송대기 문서를 선택하세요.');return}
  if(!confirm(s.length+'건을 발송할까요?'))return;var n=0;for(var i=0;i<s.length;i++){try{await sendDo(s[i],'');n++}catch(e){alert('발송 실패: '+(e.code||e.message)+(/permission/i.test(String(e.code||e.message))?'\n(보안 규칙 v48 게시가 필요합니다)':''));break}}V.sel={};say(n+'건 발송했습니다')}
function tempHtml(){var L=Object.keys(TEMPS).map(function(k){return TEMPS[k]}).filter(function(t){return t.org===ORG.key}).sort(function(a,b){return String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))});
  return '<div class="gw-bar"><h2>임시보관 <span>('+L.length+')</span></h2><span class="sp"></span><span id="gwMsg" class="gw-say"></span></div><div class="gw-note">작성하다 [임시저장]한 문서입니다. 붙임 파일은 저장되지 않으니 상신할 때 다시 붙여 주세요.</div>'
    +'<div class="gw-tblw"><table class="gw-tbl"><colgroup><col style="width:90px"><col><col style="width:150px"><col style="width:140px"></colgroup><thead><tr><th>구분</th><th>제목</th><th>저장일시</th><th></th></tr></thead><tbody>'
    +(L.length?L.map(function(t){return '<tr><td class="c">'+esc(KIND[t.kind]||'')+'</td><td class="t"><a onclick="INTRA.tempOpen(\''+t._id+'\')">'+esc(t.title||'(제목 없음)')+'</a></td><td class="c">'+esc(loc(t.updatedAt))+'</td><td class="c"><button class="gw-b" onclick="INTRA.tempOpen(\''+t._id+'\')">이어 쓰기</button> <button class="gw-b" onclick="INTRA.tempDel(\''+t._id+'\')">삭제</button></td></tr>'}).join(''):'<tr><td colspan="4" class="empty">임시보관한 문서가 없습니다.</td></tr>')+'</tbody></table></div>'}
function formsHtml(){var mine=PREFS.forms||[];
  var row=function(f,i,my){return '<tr><td class="c">'+(my?'내 서식':'기본')+'</td><td class="c">'+esc(KIND[f.kind]||'')+'</td><td class="t"><a onclick="INTRA.formUse(\''+(my?'m'+i:f.id)+'\')">'+esc(f.name)+'</a></td><td>'+esc(String(f.title||''))+'</td><td class="c"><button class="gw-b pri" onclick="INTRA.formUse(\''+(my?'m'+i:f.id)+'\')">이 서식으로 기안</button>'+(my?' <button class="gw-b" onclick="INTRA.formDel('+i+')">삭제</button>':'')+'</td></tr>'};
  return '<div class="gw-bar"><h2>서식함 <span>('+(FORMS.length+mine.length)+')</span></h2><span class="sp"></span><span id="gwMsg" class="gw-say"></span></div><div class="gw-note">서식을 고르면 문서 종류·제목·본문 틀이 채워진 기안 창이 열립니다. 기안 창의 [서식으로 저장]으로 내 서식을 만들 수 있습니다.</div>'
    +'<div class="gw-tblw"><table class="gw-tbl"><colgroup><col style="width:70px"><col style="width:90px"><col style="width:240px"><col><col style="width:210px"></colgroup><thead><tr><th>구분</th><th>문서 종류</th><th>서식 이름</th><th>제목 틀</th><th></th></tr></thead><tbody>'
    +FORMS.map(function(f){return row(f,0,false)}).join('')+mine.map(function(f,i){return row(f,i,true)}).join('')+'</tbody></table></div>'}
function formUse(id){var f=/^m\d+$/.test(id)?(PREFS.forms||[])[+id.slice(1)]:FORMS.find(function(x){return x.id===id});if(!f)return;compose(f.kind,'',{form:f})}
async function prefsSave(){await DB.collection('intraPrefs').doc(ME.uid).set({uid:ME.uid,lines:PREFS.lines||[],forms:PREFS.forms||[],updatedAt:now()})}
async function formDel(i){if(!confirm('이 서식을 삭제할까요?'))return;var bk=PREFS.forms.slice();PREFS.forms.splice(i,1);try{await prefsSave();renderMain()}catch(e){PREFS.forms=bk;alert('삭제 실패: '+(e.code||e.message))}}
function tempOpen(id){var t=TEMPS[id];if(!t)return;compose(t.kind,'',{temp:t})}
async function tempDel(id){if(!confirm('임시보관 문서를 삭제할까요?'))return;try{await DB.collection('intraTemp').doc(id).delete()}catch(e){alert('삭제 실패: '+(e.code||e.message))}}
async function recvSel(st){var c=ctx(),s=selIds().filter(function(id){var d=DOCS[id];return needRecv(d,c.orgKey)&&((st==='확인')===(d.kind==='notice'))});
  if(!s.length){alert(st==='확인'?'공람 확인할 문서를 선택하세요.':'접수할 문서를 선택하세요.');return}
  if(!confirm(s.length+'건을 '+st+' 처리할까요?'))return;var n=0;for(var i=0;i<s.length;i++){try{await recvDo(s[i],st,'',st==='접수'?{uid:ME.uid,name:MY.name||''}:null);n++}catch(e){}}V.sel={};say(n+'건 '+st+' 처리했습니다')}
function renderRight(){
  var adm=MY.owner===true||roleSet(MY).indexOf('admin')>=0,sd=roleSet(MY).indexOf('sidoOfficer')>=0;
  var links=[['홈페이지','index.html'],['마이페이지','mypage.html']].concat(adm||sd?[['관리자 페이지','admin.html']]:[]).concat(adm?[['권한 관리 센터','perm.html'],['학교별 운영일지','schoollogs.html']]:[]).concat([['선정학교 현황','selected.html'],['대회 · 공고 관리','competition.html?view=manage'],['심판 · 운영요원 모집','staff.html'],['자격 업무','license.html'],['연맹 일정','calendar.html']]);
  var mine=MEMBERS.filter(function(m){return m.orgKey===ORG.key}).sort(function(a,b){return String(a.name).localeCompare(String(b.name),'ko')});
  $('gwRight').innerHTML='<div class="box"><h3>바로가기</h3>'+links.map(function(l){return '<a href="'+l[1]+'" target="_blank" rel="noopener">'+esc(l[0])+'<span>▸</span></a>'}).join('')+'</div>'
    +'<div class="box"><h3>조직도</h3><div class="org">'+ic('fold',13)+' '+esc(ORG.name)+'</div>'+(mine.map(function(m){return '<div class="mem"><span class="av">'+ic('user',20)+'</span><span>성명 : '+esc(m.name)+'<br>직위 : '+esc(m.title||'-')+'</span></div>'}).join('')||'<div class="mem">등록된 임원이 없습니다.</div>')+'</div>';
}
// ══ 첫 화면 ══
function homeList(f,n,who){var c=ctx(),L=inFolder(f).sort(function(a,b){return String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''))}).slice(0,n);
  return L.length?L.map(function(d){return '<a class="hr" onclick="INTRA.openDoc(\''+d._id+'\')"><span class="t">'+(todoOf(d,c)?'<i class="nw">N</i>':'')+esc(d.title||'(제목 없음)')+'</span><span class="w">'+esc(who==='org'?(d.orgName||''):(d.authorName||''))+'</span><span class="d">'+esc(loc(d.updatedAt||d.createdAt))+'</span></a>'}).join(''):'<div class="he">조회 결과가 없습니다.</div>'}
function homeCard(cls,title,f,n,who){return '<section class="gw-card '+cls+'"><h3>'+ic('pen',14)+' '+title+'<button title="전체 보기" onclick="INTRA.setFolder(\''+f+'\')">＋</button></h3><div class="hl">'+homeList(f,n,who)+'</div></section>'}
function homeHtml(){
  var n=apprMinOf(ORG.key,ORGDIR);
  var tiles=[['내부결재','draft','pen'],['협조문','coop','org'],['일반공문','official','file'],['서식함','','fold']];
  var links=[['임시보관','p_temp'],['기안한 문서','a_mine'],['결재완료','a_done'],['문서 등록대장','reg'],['접수 대장','x_reg']];
  var ex=function(k,fn){try{return EXT[k]&&EXT[k][fn]?EXT[k][fn]():''}catch(e){return ''}};
  return '<div class="gw-home"><div class="gw-banner"><b>'+esc(ORG.name)+'</b><span>'+esc(MY.name||'')+(myTitle()?' '+esc(myTitle()):'')+' 님 · 결재 방식 '+(n<=1?'1인 전결':n+'인 이상 결재')+'</span>'
      +(ORGS.length>1?'<select onchange="INTRA.setOrg(this.value)" title="소속 전환">'+ORGS.map(function(o){return '<option value="'+esc(o.key)+'"'+(o.key===ORG.key?' selected':'')+'>'+esc(o.name)+'</option>'}).join('')+'</select>':'')+'<span id="gwMsg" class="gw-say"></span></div>'
    +'<div class="gw-grid">'+homeCard('c1','결재대기','a_wait',6)
    +'<section class="gw-card c2"><h3>'+ic('file',14)+' 바로가기 메뉴</h3><div class="gw-tiles"><div class="tl">'+tiles.map(function(t,i){return '<button class="'+(i?'':'y')+'" onclick="'+(t[1]?'INTRA.compose(\''+t[1]+'\')':'INTRA.setFolder(\'f_all\')')+'">'+ic(t[2],26)+'<span>'+t[0]+'</span></button>'}).join('')+'</div>'
      +'<div class="lk">'+links.map(function(l){return '<a onclick="INTRA.setFolder(\''+l[1]+'\')">'+ic('fold',13)+' '+l[0]+'<em>'+(count(l[1])||'')+'</em></a>'}).join('')+'</div></div></section>'
    +homeCard('c3','결재진행','a_prog',6)+(ex('board','home')||homeCard('c4','최근 수신 문서','r_all',6,'org'))
    +(EXT.board?homeCard('c1','접수대기 · 최근 수신 문서','r_all',6,'org'):'')+ex('task','home')+'</div></div>'}
function orgHtml(){var day=now().slice(0,10);
  var ks=Object.keys(ORGDIR).sort(function(a,b){var A=ORGDIR[a],B=ORGDIR[b];return String(A.level?A.sido:'').localeCompare(String(B.level?B.sido:''),'ko')||(A.level-B.level)||String(A.name).localeCompare(String(B.name),'ko')});
  var abs=MEMBERS.filter(function(m){return isAbsent(m,day)}).length;
  return '<div class="gw-bar"><h2>조직도 <span>('+MEMBERS.length+'명 · '+ks.length+'개 기관'+(abs?' · 부재 '+abs+'명':'')+')</span></h2></div><div class="gw-note">임원이 인트라넷에 처음 로그인하면 명부에 올라옵니다. 직위·부재(대결자)는 환경설정에서 본인이 입력합니다.</div>'
    +'<div class="gw-tblw"><table class="gw-tbl"><colgroup><col style="width:60px"><col style="width:250px"><col style="width:100px"><col style="width:130px"><col style="width:170px"><col style="width:130px"><col></colgroup><thead><tr><th>구분</th><th>기관</th><th>성명</th><th>직위</th><th>상태</th><th>최근 접속</th><th>비고</th></tr></thead><tbody>'
    +ks.map(function(k){var o=ORGDIR[k],ms=MEMBERS.filter(function(m){return m.orgKey===k});var n=apprMinOf(k,ORGDIR);
      return (ms.length?ms:[null]).map(function(m,i){var a=m&&isAbsent(m,day)?m.absent:null;
        return '<tr>'+(i?'':'<td class="c" rowspan="'+Math.max(1,ms.length)+'">'+['중앙','시도','구군'][o.level]+'</td><td rowspan="'+Math.max(1,ms.length)+'">'+(o.level===2?'└ ':'')+esc(o.name)+'<br><small style="color:#777">'+(n<=1?'1인 전결':n+'인 이상 결재')+'</small></td>')
          +'<td class="c">'+(m?esc(m.name):'-')+'</td><td class="c">'+(m?esc(m.title||''):'')+'</td>'
          +'<td class="c">'+(a?'<b style="color:#c0392b">부재</b> '+esc((a.from||'').slice(5))+'~'+esc((a.to||'').slice(5))+(a.deputy&&a.deputy.name?'<br><small>대결 '+esc(a.deputy.name)+'</small>':''):(m?'근무':''))+'</td>'
          +'<td class="c">'+(m&&m.seen?esc(loc(m.seen)):'')+'</td><td>'+(m&&(o.sealKeepers||[]).indexOf(m.uid)>=0?'직인 관리자':'')+'</td></tr>'}).join('')}).join('')+'</tbody></table></div>'}
// ══ 창(문서 보기 · 작성) ══
function win(id,title,body,w){var o=$(id);if(o)o.remove();o=document.createElement('div');o.id=id;o.className='gw-win';o.innerHTML='<div class="gw-wbox" style="max-width:'+(w||900)+'px"><div class="gw-wtit"><b>'+esc(title)+'</b><button onclick="INTRA.closeW(\''+id+'\')">✕</button></div><div class="gw-wbody">'+body+'</div></div>';document.body.appendChild(o);return o}
function closeW(id){var o=$(id);if(o)o.remove();if(id==='gwDoc')OPEN_ID=''}
// 수신 표기: 수신자표기를 따로 적었으면 그것, 아니면 수신 기관 + 수기 입력 수신처
var MOTTO='「원반 하나로 잇는 건강한 대한민국」';   // 공문 머리 문구
function recvText(d){if(d.toLabel)return d.toLabel;var a=(d.toNames||[]).slice();if(d.extTo)a.push(d.extTo);return a.length?a.join(', '):'내부결재'}
function senderOf(d){return d.sender||((d.orgName||'')+'회장')}
// 공문 용지(보기) — 머리(로고 · 기관명) / 수신 · (경유) · 제목 / 본문 / 발신명의
function paperHtml(d){var fl=(d.files||[]).map(function(x){return x.name});
  return '<div class="gw-paper view"><div class="pm">'+MOTTO+'</div><div class="ph"><img src="kfdf_logo.png" alt=""><b>'+esc(d.orgName||'')+'</b><span></span></div>'
    +'<table class="pk"><tr><th>수 신</th><td>'+esc(d.kind==='ext'?(d.orgName||''):recvText(d))+'</td></tr><tr><th>(경유)</th><td></td></tr><tr><th>제 목</th><td><b>'+esc(d.title||'')+'</b></td></tr></table>'
    +'<div class="pb">'+nl(d.body||'')+'</div>'
    +(d.kind==='ext'?'':'<div class="pf">'+esc(senderOf(d))+'</div>')+'</div>'}
function apprBox(d){var l=d.line||[];var cols=[{t:l.length?'기안':'기안 · 전결',n:d.authorName,p:d.authorTitle,s:'',d:locd(d.createdAt),cur:false,rej:false,fin:!l.length&&d.status==='완료'}].concat(l.map(function(x,i){return {t:x.type||'결재',n:x.name,p:x.title,s:x.status==='승인'?x.sign:'',d:x.status==='승인'?locd(x.at):(x.status==='반려'?'반려':''),cur:d.status==='진행'&&curStep(d)===i,rej:x.status==='반려',ok:x.status==='승인'}}));
  return '<table class="gw-appr"><tr>'+cols.map(function(c){return '<th>'+esc(c.t)+'</th>'}).join('')+'</tr><tr>'+cols.map(function(c){return '<td class="sg'+(c.cur?' cur':'')+(c.rej?' rej':'')+'">'+(c.s?'<img src="'+esc(c.s)+'" alt="">':(c.fin?'<em>전결</em>':c.ok?'<em>승인</em>':c.rej?'<em>반려</em>':c.cur?'<em>대기</em>':''))+'</td>'}).join('')+'</tr><tr>'+cols.map(function(c){return '<td>'+esc(c.n||'')+(c.p?'<br><small>'+esc(c.p)+'</small>':'')+'</td>'}).join('')+'</tr><tr>'+cols.map(function(c){return '<td class="dt">'+esc(c.d||'')+'</td>'}).join('')+'</tr></table>'}
function openDoc(id,keep){
  var d=DOCS[id];if(!d)return;OPEN_ID=id;var c=ctx(),mine=d.authorUid===ME.uid,turn=isMyTurn(d,ME.uid);
  var acted=(d.line||[]).some(function(x){return x.status==='승인'||x.status==='반려'}),a=[];
  if(turn)a.push('<button class="gw-b pri" onclick="INTRA.approve(\''+id+'\',true)">'+esc(d.line[curStep(d)].type||'결재')+'</button><button class="gw-b" onclick="INTRA.approve(\''+id+'\',false)">반려</button>');
  if(mine&&d.status==='진행'&&!acted)a.push('<button class="gw-b" onclick="INTRA.withdraw(\''+id+'\')">회수</button>');
  if(mine&&(d.status==='반려'||d.status==='회수'))a.push('<button class="gw-b pri" onclick="INTRA.compose(\''+d.kind+'\',\''+id+'\')">재기안</button><button class="gw-b" onclick="INTRA.del(\''+id+'\')">삭제</button>');
  if(sendPending(d)&&(mine||d.org===c.orgKey))a.push('<button class="gw-b pri" onclick="INTRA.sendDoc(\''+id+'\')">발송</button>');
  if(needRecv(d,c.orgKey))a.push(d.kind==='notice'?'<button class="gw-b pri" onclick="INTRA.recv(\''+id+'\',\'확인\')">공람확인</button>':'<button class="gw-b pri" onclick="INTRA.recvOpen(\''+id+'\')">접수 · 담당자 지정</button><button class="gw-b" onclick="INTRA.recvBack(\''+id+'\')">반송</button>');
  var myRecv=(d.recv||{})[c.orgKey];
  if(myRecv&&(myRecv.status==='접수'||myRecv.status==='처리중')&&d.kind!=='notice')a.push('<button class="gw-b" onclick="INTRA.recvOpen(\''+id+'\')">담당자 변경</button>');
  if(d.kind==='ext'&&myRecv&&myRecv.status!=='완료')a.push('<button class="gw-b pri" onclick="INTRA.recv(\''+id+'\',\'완료\')">처리완료</button>');
  if(d.kind==='coop'&&myRecv&&(myRecv.status==='접수'||myRecv.status==='처리중'))a.push('<button class="gw-b" onclick="INTRA.recv(\''+id+'\',\'처리중\')">처리중</button><button class="gw-b pri" onclick="INTRA.recv(\''+id+'\',\'완료\')">처리완료 회신</button><button class="gw-b" onclick="INTRA.recv(\''+id+'\',\'불가\')">협조불가</button>');
  if(sealPending(d)&&isKeeper(d.seal.orgKey,ME.uid,ORGDIR))a.push('<button class="gw-b pri" onclick="INTRA.sealOpen(\''+id+'\')">직인 날인</button><button class="gw-b" onclick="INTRA.sealReject(\''+id+'\')">직인 반려</button>');
  if(d.status==='완료'&&d.kind!=='seal'&&d.kind!=='ext')a.push('<button class="gw-b" onclick="INTRA.print(\''+id+'\')">시행문 인쇄</button>');
  // 지금 할 수 있는 일 — 회수·반려·발송 규칙을 문서마다 알려 줍니다
  var hint=d.status==='진행'?(turn?'내 결재 차례입니다. [결재] 또는 [반려]를 눌러 주세요.':mine?(acted?'결재가 시작되어 회수할 수 없습니다. 내용을 고치려면 결재자에게 [반려]를 요청하세요 — 반려되면 [재기안]으로 붙임을 바꿔 다시 올릴 수 있습니다.':'아직 결재 전입니다. 붙임을 잘못 올렸으면 [회수] → 반려·회수함에서 [재기안]으로 고쳐 다시 올리세요.'):'결재 진행 중입니다.')
    :(d.status==='반려'||d.status==='회수')?(mine?'[재기안]을 누르면 내용·붙임을 고쳐 새 문서로 다시 올립니다. 필요 없으면 [삭제]하세요.':'')
    :sendPending(d)?((mine||d.org===c.orgKey)?(d.kind==='official'?'결재가 끝났습니다. [시행문 인쇄]로 출력해 보낸 뒤 [발송]을 눌러 발송 기록을 남기세요.':'결재가 끝났습니다. [발송]을 눌러야 수신 기관에 보입니다.'+(d.seal&&d.seal.status==='요청'?' (직인 날인 대기 중 — 날인 후 발송을 권합니다)':'')):'')
    :needRecv(d,c.orgKey)?(d.kind==='notice'?'[공람확인]을 눌러 확인해 주세요.':'[접수 · 담당자 지정]으로 접수하거나, 잘못 온 문서면 [반송]하세요.'):'';
  var cabs=((ORGDIR[c.orgKey]||{}).cabinets)||[];var showCab=cabs.length&&d.status==='완료'&&(d.org===c.orgKey||(d.toOrgs||[]).indexOf(c.orgKey)>=0);
  var cabRow=showCab?'<tr><th>기록물철</th><td colspan="3"><select onchange="INTRA.setCab(\''+id+'\',this.value)" style="width:240px"><option value="">(분류 안 함)</option>'+cabs.map(function(x){return '<option value="'+esc(x.id)+'"'+((d.cab||{})[c.orgKey]===x.id?' selected':'')+'>'+esc(x.name)+'</option>'}).join('')+'</select> <small>우리 기관 문서함의 기록물철로 분류합니다.</small></td></tr>':'';
  a.push('<button class="gw-b" onclick="INTRA.closeW(\'gwDoc\')">닫기</button>');
  var cm=(d.line||[]).filter(function(x){return x.comment}).map(function(x){return '<tr><th>'+esc(x.name)+'<br><small>'+esc(x.type||'')+(x.status==='반려'?' 반려':'')+'</small></th><td>'+nl(x.comment)+'</td></tr>'}).join('');
  var files=(d.files||[]).map(function(x,i){return '<a class="gw-file" onclick="INTRA.openFile(\''+id+'\','+i+')">'+ic('clip',12)+' '+esc(x.name)+' <small>('+Math.max(1,Math.round((x.size||0)/1024))+'KB)</small></a>'}).join('');
  var seal=d.seal?('<tr><th>직인</th><td>'+esc(d.seal.orgName||orgName(d.seal.orgKey))+' · '+(d.seal.mode==='file'?'붙임 문서 날인':'시행문 날인')+' · '+esc(d.seal.purpose||'-')+' · <b>'+esc(d.seal.status)+'</b>'+(d.seal.byName?' ('+esc(d.seal.byName)+' '+esc(loc(d.seal.at))+')':'')+(d.seal.note?'<br>'+nl(d.seal.note):'')+(d.seal.stamped?'<br><a class="gw-file" onclick="INTRA.openStamped(\''+id+'\')">'+ic('clip',12)+' 날인본 '+esc(d.seal.stamped.name)+'</a>':'')+'</td></tr>'):'';
  var recv=(d.toOrgs||[]).length?('<h4>수신 현황</h4><table class="gw-tbl sm"><thead><tr><th>수신 기관</th><th>처리현황</th><th>처리자</th><th>처리일시</th><th>회신 내용</th></tr></thead><tbody>'+d.toOrgs.map(function(o,i){var r=(d.recv||{})[o];return '<tr><td>'+esc((d.toNames||[])[i]||orgName(o))+'</td><td class="c">'+(r?esc(r.status):(sentOf(d)?'미접수':(d.status==='완료'?'발송대기':'결재 후 발송')))+'</td><td class="c">'+esc(r?r.byName:'')+(r&&r.assignee?'<br><small>담당 '+esc(r.assignee.name)+'</small>':'')+'</td><td class="c">'+esc(r?loc(r.at):'')+'</td><td>'+(r&&r.note?nl(r.note):'')+'</td></tr>'}).join('')+'</tbody></table>'):'';
  var rep='<h4>의견 ('+((d.replies||[]).length)+')</h4>'+((d.replies||[]).length?'<table class="gw-tbl sm"><tbody>'+d.replies.map(function(r){return '<tr><td style="width:170px">'+esc(r.name)+'<br><small>'+esc(r.orgName||'')+'</small></td><td>'+nl(r.text)+'</td><td class="c" style="width:120px">'+esc(loc(r.at))+'</td></tr>'}).join('')+'</tbody></table>':'')
    +'<div class="gw-rep"><input id="gwRep" maxlength="500" placeholder="의견을 입력하세요" onkeydown="if(event.key===\'Enter\')INTRA.reply(\''+id+'\')"><button class="gw-b" onclick="INTRA.reply(\''+id+'\')">등록</button></div>';
  var h='<div class="gw-wtool">'+a.join('')+'<span id="gwDocMsg" class="gw-say"></span></div>'+(hint?'<div class="gw-hint">'+esc(hint)+'</div>':'')
    +'<div class="gw-dochd"><div class="ttl"><small>'+esc(KINDL[d.kind]||'')+(d.urgent?' · <b style="color:#c0392b">긴급</b>':'')+'</small><h3>'+esc(d.title||'')+'</h3></div>'+apprBox(d)+'</div>'
    +'<table class="gw-form"><tr><th>문서번호</th><td>'+esc(d.docNo||'(결재 완료 시 부여)')+'</td><th>처리현황</th><td>'+esc(stateOf(d,c))+'</td></tr>'
    +'<tr><th>기안부서</th><td>'+esc(d.orgName||'')+'</td><th>기안자</th><td>'+esc(d.authorName||'')+' '+esc(d.authorTitle||'')+'</td></tr>'
    +'<tr><th>기안일시</th><td>'+esc(loc(d.createdAt))+'</td><th>시행일시</th><td>'+esc(loc(d.doneAt))+'</td></tr>'
    +(d.kind==='ext'?'<tr><th>발신처</th><td>'+esc(d.extFrom||'')+'</td><th>발신 문서</th><td>'+esc(d.extNo||'')+(d.extDate?' ('+esc(d.extDate)+')':'')+'</td></tr><tr><th>담당자</th><td colspan="3">'+esc(((myRecv||{}).assignee||{}).name||'')+' · '+esc((myRecv||{}).status||'')+((myRecv||{}).note?' — '+esc(myRecv.note):'')+'</td></tr>'
      :'<tr><th>수신</th><td colspan="3">'+esc(recvText(d))+(d.send&&d.send.status==='발송'?' <small>· 발송 '+esc(loc(d.send.at))+' '+esc(d.send.byName||'')+(d.send.method?' ('+esc(d.send.method)+')':'')+'</small>':'')+'</td></tr>')
    +(files?'<tr><th>붙임</th><td colspan="3">'+files+'</td></tr>':'')+seal+cabRow+'</table>'+paperHtml(d)
    +(cm?'<h4>결재 의견</h4><table class="gw-form">'+cm+'</table>':'')+recv+rep
    +'<details class="gw-log"><summary>처리 기록 '+((d.log||[]).length)+'건</summary>'+((d.log||[]).map(function(x){return '<div>'+esc(loc(x.at))+' · '+esc(x.name)+' ('+esc(x.org||'')+') · '+esc(x.act)+'</div>'}).join(''))+'</details>';
  var kv=keep&&$('gwRep')?$('gwRep').value:'';win('gwDoc','문서정보',h,960);if(kv)$('gwRep').value=kv;
  if(foldersOf(d,c).indexOf('z_org')>=0){var rp=document.querySelector('#gwDoc .gw-rep');if(rp)rp.outerHTML='<div class="gw-note" style="padding:6px 0">중앙 사무국 열람용으로 보이는 문서입니다(결재선·수신처가 아니라 읽기만 가능).</div>'}
}
async function openFile(id,i){var f=((DOCS[id]||{}).files||[])[i];if(!f)return;var w=window.open('','_blank');try{var u=await firebase.storage().ref(f.path).getDownloadURL();if(w)w.location.href=u;else location.href=u}catch(e){if(w)w.close();alert('파일을 열 수 없습니다: '+(e.code||e.message)+'\n(스토리지 규칙 v9 게시 여부 확인)')}}
async function openStamped(id){var s=((DOCS[id]||{}).seal||{}).stamped;if(!s)return;var w=window.open('','_blank');try{var u=await firebase.storage().ref(s.path).getDownloadURL();if(w)w.location.href=u;else location.href=u}catch(e){if(w)w.close();alert('파일을 열 수 없습니다: '+(e.code||e.message))}}
// ── 문서 작성 ──
function clone(o){return JSON.parse(JSON.stringify(o))}
function orgKeysSorted(){return Object.keys(ORGDIR).sort(function(a,b){var A=ORGDIR[a],B=ORGDIR[b];return String(A.level?A.sido:'').localeCompare(String(B.level?B.sido:''),'ko')||(A.level-B.level)||String(A.name).localeCompare(String(B.name),'ko')})}
function compose(kind,fromId,opt){
  if(kind==='ext')return composeExt();
  opt=opt||{};var src=fromId?DOCS[fromId]:(opt.temp||opt.form||null);closeW('gwDoc');var nm=$('gwNewMenu');if(nm)nm.style.display='none';
  var ss=(src&&src.seal)||{};
  CP={kind:kind,line:(src&&src.line?src.line:[]).map(function(x){return {uid:x.uid,name:x.name,orgName:x.orgName,title:x.title,type:x.type}}),
    to:(src?(src.toOrgs||src.to||[]):[]).filter(function(k){return ORGDIR[k]&&k!==ORG.key}),files:[],keep:fromId?(src.files||[]).slice():[],from:fromId||'',tempId:opt.temp?opt.temp._id:'',
    extTo:src?(src.extTo||''):'',auto:!(src&&((src.send&&src.send.auto===false)||src.auto===false)),urgent:!!(src&&src.urgent),cab:src?((src.cab||{})[ORG.key]||src.cabId||''):'',
    sender:(src&&src.sender&&src.org===ORG.key)?src.sender:ORG.name+'회장',toLabel:src?(src.toLabel||''):'',
    seal:{on:kind==='seal'||!!(src&&src.seal&&src.seal.orgKey),org:ss.orgKey||ss.org||ORG.key,mode:ss.mode||(kind==='seal'?'file':'doc'),purpose:ss.purpose||''}};
  if(kind==='draft')CP.to=[];
  // 먼저 결재정보(제목 · 수신자 · 결재선)를 정하고, [확인]하면 본문 작성 창(cpEditor)이 열립니다
  CP.title=src?(src.title||''):'';CP.body=src?(src.body||''):'';CP.first=true;closeW('gwCp');ciOpen('doc');
}
function cpEditor(){
  var h='<div class="gw-wtool"><button class="gw-b" onclick="INTRA.closeW(\'gwCp\')">닫기</button><button class="gw-b" onclick="INTRA.ciOpen(\'doc\')">'+ic('file',13)+' 결재정보</button><button class="gw-b pri" id="cpGo" onclick="INTRA.submit()">'+ic('pen',13)+' 기안 (결재상신)</button>'
      +'<button class="gw-b" onclick="INTRA.saveTemp()">임시저장</button><button class="gw-b" onclick="INTRA.cpSaveForm()">서식으로 저장</button><label class="gw-b" style="cursor:pointer">'+ic('clip',13)+' 붙임문서<input type="file" id="cpFiles" multiple style="display:none" onchange="INTRA.cpFiles(this)"></label><span id="cpMsg" class="gw-say"></span></div>'
    +'<div id="cpSum" class="gw-cpsum"></div>'
    +'<div class="gw-cpwrap"><div class="gw-paper"><div class="pm">'+MOTTO+'</div><div class="ph"><img src="kfdf_logo.png" alt=""><b>'+esc(ORG.name)+'</b><span></span></div>'
      +'<table class="pk"><tr><th>수 신</th><td><a id="cpToTxt" title="수신자 지정" onclick="INTRA.ciOpen(\'to\')"></a></td></tr><tr><th>(경유)</th><td></td></tr>'
      +'<tr><th>제 목</th><td><input id="cpTitle" maxlength="120" value="'+esc(CP.title||'')+'" placeholder="제목을 입력하세요"></td></tr></table>'
      +'<textarea id="cpBody" maxlength="6000" placeholder="1. 귀 기관의 무궁한 발전을 기원합니다.&#10;&#10;2. 관련: &#10;&#10;3. 위 호와 관련하여 아래와 같이 …&#10;&#10;  가. &#10;  나. &#10;&#10;붙임  1부.  끝.">'+esc(CP.body||'')+'</textarea>'
      +'<div class="pf" id="cpSender"></div></div>'
    +'<aside class="gw-cpatt"><b>붙임목록</b><div id="cpFileList" class="gw-chips"></div><small>PDF · 이미지 · 한글 · 워드 · 엑셀<br>파일당 20MB, 10개까지</small></aside></div>';
  win('gwCp','기안하기',h,1120);cpDraw();setTimeout(function(){try{$('cpBody').focus()}catch(e){}},60);
}
// 외부에서 받은 문서의 접수 등록(결재 없음)
function composeExt(){closeW('gwDoc');var nm=$('gwNewMenu');if(nm)nm.style.display='none';
  CP={kind:'ext',line:[],to:[],files:[],keep:[],from:'',tempId:'',extTo:'',auto:true,seal:{on:false}};
  var mem=MEMBERS.filter(function(m){return m.orgKey===ORG.key});
  var h='<div class="gw-wtool"><button class="gw-b pri" id="cpGo" onclick="INTRA.submit()">접수 등록</button><button class="gw-b" onclick="INTRA.closeW(\'gwCp\')">취소</button><span id="cpMsg" class="gw-say"></span></div>'
    +'<table class="gw-form"><tr><th>문서 구분</th><td>'+esc(KINDL.ext)+'</td><th>등록일</th><td>'+esc(locd(now()))+'</td></tr>'
    +'<tr><th>접수 기관</th><td>'+esc(ORG.name)+'</td><th>등록자</th><td>'+esc(MY.name||'')+' '+esc(myTitle())+'</td></tr>'
    +'<tr><th>발신처 <em>*</em></th><td><input id="cpExtFrom" maxlength="80" placeholder="예: ○○교육지원청" style="width:100%"></td><th>발신 문서번호</th><td><input id="cpExtNo" maxlength="60" placeholder="예: 체육건강과-1234" style="width:100%"></td></tr>'
    +'<tr><th>시행일</th><td><input type="date" id="cpExtDate"></td><th>담당자</th><td><select id="cpAssign" style="width:100%">'+mem.map(function(m){return '<option value="'+esc(m.uid)+'"'+(m.uid===ME.uid?' selected':'')+'>'+esc(m.name)+' '+esc(m.title||'')+'</option>'}).join('')+'</select></td></tr>'
    +'<tr><th>제목 <em>*</em></th><td colspan="3"><input id="cpTitle" maxlength="120"></td></tr>'
    +'<tr><th>요지 <em>*</em></th><td colspan="3"><textarea id="cpBody" rows="5" maxlength="6000" placeholder="받은 문서의 주요 내용 · 처리할 일"></textarea></td></tr>'
    +'<tr><th>붙임</th><td colspan="3"><input type="file" id="cpFiles" multiple onchange="INTRA.cpFiles(this)"><div id="cpFileList" class="gw-chips"></div><small>받은 공문 스캔본을 붙이세요 (파일당 20MB, 10개까지)</small></td></tr></table>';
  win('gwCp','외부 문서 접수 등록',h,900);cpDraw();
}
function cpDraw(){
  var f=$('cpFileList');if(f)f.innerHTML=(CP.keep.map(function(x,i){return '<span>'+esc(x.name)+' <a onclick="INTRA.cpDelKeep('+i+')">✕</a></span>'}).concat(CP.files.map(function(x,i){return '<span>'+esc(x.name)+' <small>'+Math.round(x.size/1024)+'KB</small> <a onclick="INTRA.cpDelFile('+i+')">✕</a></span>'})).join(''))||(CP.kind==='ext'?'':'<small>붙임 없음</small>');
  var t=$('cpToTxt');if(t)t.textContent=recvText({toNames:CP.to.map(orgName),extTo:CP.kind==='official'?CP.extTo:'',toLabel:CP.toLabel})+(CP.kind==='draft'?'':'  ✎');
  var sd=$('cpSender');if(sd)sd.textContent=CP.sender||'';
  var sm=$('cpSum');if(sm){var need=apprMinOf(ORG.key,ORGDIR);var cb=(((ORGDIR[ORG.key]||{}).cabinets)||[]).find(function(c){return c.id===CP.cab});
    sm.innerHTML='<a onclick="INTRA.ciOpen(\'doc\')"><b>발송종류</b> '+esc(KINDL[CP.kind]||'')+(CP.urgent?' · <b style="color:#c0392b">긴급</b>':'')+(cb?' · 기록물철 '+esc(cb.name):'')+'</a>'
      +'<a onclick="INTRA.ciOpen(\'line\')"><b>결재선</b> 기안 '+esc(MY.name||'')+(CP.line.length?CP.line.map(function(x){return ' → '+esc(x.name)+'('+esc(x.type)+')'}).join(''):(need<=1?' (전결 · 1인 결재)':' <span style="color:#c0392b">→ 결재자 '+(need-1)+'명 이상 지정 필요</span>'))+'</a>'
      +'<a onclick="INTRA.ciOpen(\'send\')"><b>발송</b> '+(CP.kind==='draft'?'없음(내부결재)':CP.kind==='official'?'결재 후 인쇄·발송 기록':(CP.auto?'결재 후 바로 발송':'발송대기 후 수동 발송'))+(CP.seal&&CP.seal.on?' · 직인 날인 요청':'')+'</a>'}
}
// ══ 결재정보 창 — 문서정보 · 결재선 · 수신자 · 발송정보 ══
var CI=null;
function ciOpen(tab){if(!CP||CP.kind==='ext')return;
  CI={tab:tab||'doc',first:!!CP.first,kind:CP.kind,fixed:CP.kind==='seal'||CP.kind==='notice',title:$('cpTitle')?$('cpTitle').value:(CP.title||''),urgent:!!CP.urgent,cab:CP.cab||'',line:clone(CP.line),to:CP.to.slice(),
    ext:String(CP.extTo||'').split(',').map(function(x){return x.trim()}).filter(Boolean),auto:CP.auto!==false,seal:clone(CP.seal),sender:CP.sender,toLabel:CP.toLabel||'',toLabelOn:!!CP.toLabel,selM:'',selL:-1,selO:'',selT:-1,sub:'org',type:'결재'};
  win('gwCi',CI.first?'기안하기 — 결재정보':'결재정보','<div id="ciBody"></div>',860);ciDraw();if(CI.first)setTimeout(function(){try{$('ciTitle').focus()}catch(e){}},60)}
function ciSet(k,v){if(!CI)return;if(k.indexOf('seal.')===0)CI.seal[k.slice(5)]=v;else CI[k]=v}
function ciTab(t){CI.tab=t;ciDraw()}
function ciKind(k){CI.kind=k;ciDraw()}
function ciPick(w,v){if(w==='m')CI.selM=v;else if(w==='o')CI.selO=v;else if(w==='l')CI.selL=+v;else if(w==='t')CI.selT=+v;else if(w==='sub'){CI.sub=v;CI.selO=''}ciDraw()}
function ciDraw(){var b=$('ciBody');if(!b||!CI)return;var day=now().slice(0,10),keys=orgKeysSorted();
  var tabs=[['doc','① 문서정보 · 제목'],['to','② 수신자'],['line','③ 결재선'],['send','④ 발송정보']];
  var h='<div class="gw-tabs">'+tabs.map(function(t){return '<a class="'+(CI.tab===t[0]?'on':'')+'" onclick="INTRA.ciTab(\''+t[0]+'\')">'+t[1]+'</a>'}).join('')+'</div><div class="gw-tabp">';
  if(CI.tab==='doc'){var cabs=((ORGDIR[ORG.key]||{}).cabinets)||[];
    h+='<table class="gw-form"><tr><th>발송종류</th><td>'+(CI.fixed?esc(KINDL[CI.kind]):[['official','일반기안'],['coop','협조문'],['draft','내부결재']].map(function(k){return '<label class="ck" style="margin-right:22px"><input type="radio" name="ciKind"'+(CI.kind===k[0]?' checked':'')+' onchange="INTRA.ciKind(\''+k[0]+'\')"> '+k[1]+'</label>'}).join(''))
        +' <label class="ck" style="margin-left:14px"><input type="checkbox"'+(CI.urgent?' checked':'')+' onchange="INTRA.ciSet(\'urgent\',this.checked)"> 긴급결재</label>'
        +'<br><small>'+(CI.kind==='official'?'일반기안: 외부 기관(수기 입력)이나 다른 연맹으로 나가는 일반공문 — 결재 후 시행문을 인쇄해 보내고 [발송]으로 기록합니다.':CI.kind==='coop'?'협조문: 중앙 · 시도 · 구군 연맹끼리 주고받는 문서 — 수신 기관이 인트라넷에서 접수합니다.':CI.kind==='draft'?'내부결재: 수신자 없이 기관 안에서 결재하고 보관합니다.':'')+'</small></td></tr>'
      +'<tr><th>제 목</th><td><input id="ciTitle" maxlength="120" value="'+esc(CI.title)+'" placeholder="제목을 먼저 입력하세요" oninput="INTRA.ciSet(\'title\',this.value)" style="width:100%"></td></tr>'
      +'<tr><th>문서번호</th><td>'+esc(((ORGDIR[ORG.key]||{}).docPrefix)||defPrefix(ORG))+' '+new Date().getFullYear()+'-@N <small>(결재가 끝나면 자동으로 붙습니다)</small></td></tr>'
      +'<tr><th>기록물철</th><td><select onchange="INTRA.ciSet(\'cab\',this.value)" style="width:320px"><option value="">(분류 안 함)</option>'+cabs.map(function(c){return '<option value="'+esc(c.id)+'"'+(CI.cab===c.id?' selected':'')+'>'+esc(c.name)+'</option>'}).join('')+'</select> <small>환경설정에서 기록물철을 만듭니다</small></td></tr>'
      +'<tr><th>열람범위</th><td>기안자 · 결재선 · 발신/수신 기관 임원 <small>(중앙 사무국은 전체 열람)</small></td></tr></table>'}
  else if(CI.tab==='line'){var need=apprMinOf(ORG.key,ORGDIR);var sm=MEMBERS.find(function(m){return m._id===CI.selM});
    h+='<div class="gw-ci3"><div class="tr"><div class="hd">조직도</div><div class="sc">'+keys.map(function(k){var ms=MEMBERS.filter(function(m){return m.orgKey===k&&m.uid!==ME.uid});
        return '<div class="tg'+(ORGDIR[k].level===2?' l2':'')+'">'+ic('fold',13)+' '+esc(ORGDIR[k].name)+'</div>'+ms.map(function(m){return '<a class="tm'+(CI.selM===m._id?' on':'')+'" onclick="INTRA.ciPick(\'m\',\''+esc(m._id)+'\')" ondblclick="INTRA.ciAddLine()">'+ic('user',13)+' '+esc(m.name)+' '+esc(m.title||'')+(isAbsent(m,day)?' <b style="color:#c0392b">(부재)</b>':'')+'</a>'}).join('')}).join('')+'</div></div>'
      +'<div class="md"><label>결재방법</label><select onchange="INTRA.ciSet(\'type\',this.value)">'+['결재','검토','협조'].map(function(x){return '<option'+(CI.type===x?' selected':'')+'>'+x+'</option>'}).join('')+'</select><button class="gw-b" onclick="INTRA.ciAddLine()">▶ 추가</button><button class="gw-b" onclick="INTRA.ciDelLine()">◀ 삭제</button>'
        +'<small>'+(sm&&isAbsent(sm,day)?'부재 '+esc(sm.absent.from||'')+'~'+esc(sm.absent.to||'')+(sm.absent.deputy&&sm.absent.deputy.name?'<br>대결 '+esc(sm.absent.deputy.name):''):'')+'</small></div>'
      +'<div class="rt"><div class="gw-row"><label>결재선</label><select style="flex:1" onchange="INTRA.ciLoadLine(this.value)"><option value="">저장한 결재선 불러오기</option>'+(PREFS.lines||[]).map(function(x,i){return '<option value="'+i+'">'+esc(x.name)+'</option>'}).join('')+'</select><button class="gw-b" onclick="INTRA.ciSaveLine()">등록</button></div>'
        +'<table class="gw-tbl sm"><thead><tr><th style="width:36px">순서</th><th>직위</th><th style="width:70px">결재방법</th><th>결재자</th></tr></thead><tbody><tr><td class="c">기안</td><td>'+esc(myTitle())+'</td><td class="c">'+(CI.line.length?'기안':'전결')+'</td><td>'+esc(MY.name||'')+'</td></tr>'
        +CI.line.map(function(x,i){return '<tr class="'+(CI.selL===i?'on':'')+'" onclick="INTRA.ciPick(\'l\','+i+')"><td class="c">'+(i+1)+'</td><td>'+esc(x.title||'')+'</td><td class="c">'+esc(x.type)+'</td><td>'+esc(x.name)+' <small>'+esc(x.orgName||'')+'</small></td></tr>'}).join('')+'</tbody></table>'
        +'<div class="gw-row"><button class="gw-b" onclick="INTRA.ciMove(-1)">▲ 위로</button><button class="gw-b" onclick="INTRA.ciMove(1)">▼ 아래로</button></div>'
        +'<small>위에서부터 차례로 결재합니다. '+(need<=1?'결재자를 넣지 않으면 기안자 전결(1인 결재)로 바로 시행됩니다.':'<b style="color:#c0392b">이 기관은 '+need+'인 이상 결재 — 결재자 '+(need-1)+'명 이상 필요</b>')+'</small></div></div>'}
  else if(CI.tab==='to'){var none=CI.kind==='draft';var L=CI.to.map(function(k){return {t:'o',n:orgName(k)}}).concat(CI.ext.map(function(x){return {t:'x',n:x}}));
    var left=CI.sub==='org'?keys.filter(function(k){return k!==ORG.key}).map(function(k){return '<a class="tm'+(ORGDIR[k].level===2?' l2':'')+(CI.selO===k?' on':'')+'" onclick="INTRA.ciPick(\'o\',\''+esc(k)+'\')" ondblclick="INTRA.ciAddTo()">'+ic('fold',13)+' '+esc(ORGDIR[k].name)+(CI.to.indexOf(k)>=0?' ✓':'')+'</a>'}).join('')||'<small style="padding:8px;display:block">다른 기관이 아직 등록되지 않았습니다.</small>'
      :CI.sub==='grp'?[['g1','시도연맹 전체'],['g2','구군연맹 전체'],['g0','전체 연맹(중앙 포함)']].map(function(g){return '<a class="tm'+(CI.selO===g[0]?' on':'')+'" onclick="INTRA.ciPick(\'o\',\''+g[0]+'\')" ondblclick="INTRA.ciAddTo()">'+ic('org',13)+' '+g[1]+'</a>'}).join('')
      :'<div style="padding:10px"><input id="ciMan" maxlength="80" placeholder="예: ○○교육지원청 교육장" style="width:100%" onkeydown="if(event.key===\'Enter\')INTRA.ciAddTo()"><small style="display:block;margin-top:6px;line-height:1.6">인트라넷에 없는 외부 기관은 이름을 직접 적어 넣습니다(일반기안만). 외부 기관에는 시행문을 인쇄해 보냅니다.</small></div>';
    h+=(none?'<div class="gw-hint">내부결재는 수신자를 지정하지 않습니다. 다른 연맹에 보내려면 [문서정보]에서 협조문이나 일반기안으로 바꾸세요.</div>':'')
      +'<div class="gw-ci3"><div class="tr"><div class="gw-tabs sm">'+[['org','조직도'],['grp','수신자그룹'],['man','수기입력']].map(function(t){return '<a class="'+(CI.sub===t[0]?'on':'')+'" onclick="INTRA.ciPick(\'sub\',\''+t[0]+'\')">'+t[1]+'</a>'}).join('')+'</div><div class="sc">'+left+'</div></div>'
      +'<div class="md"><button class="gw-b" onclick="INTRA.ciAddTo()">▶ 추가</button><button class="gw-b" onclick="INTRA.ciDelTo()">◀ 삭제</button></div>'
      +'<div class="rt"><table class="gw-tbl sm"><thead><tr><th>수신자 ('+L.length+')</th><th style="width:80px">구분</th></tr></thead><tbody>'+(L.length?L.map(function(x,i){return '<tr class="'+(CI.selT===i?'on':'')+'" onclick="INTRA.ciPick(\'t\','+i+')"><td>'+esc(x.n)+'</td><td class="c">'+(x.t==='o'?'연맹':'수기입력')+'</td></tr>'}).join(''):'<tr><td colspan="2" class="empty" style="padding:22px 0">수신자가 없습니다</td></tr>')+'</tbody></table>'
        +'<div class="gw-row" style="margin-top:8px"><label class="ck"><input type="checkbox"'+(CI.toLabelOn?' checked':'')+' onchange="INTRA.ciSet(\'toLabelOn\',this.checked)"> 수신자표기</label><input maxlength="80" value="'+esc(CI.toLabel)+'" placeholder="예: 수신처 참조 · 각 시도연맹 회장" oninput="INTRA.ciSet(\'toLabel\',this.value)" style="flex:1"></div>'
        +'<div class="gw-row"><label>발신명의</label><select onchange="INTRA.ciSet(\'sender\',this.value)" style="flex:1">'+[ORG.name+'회장',ORG.name].map(function(x){return '<option'+(CI.sender===x?' selected':'')+'>'+esc(x)+'</option>'}).join('')+'</select></div></div></div>'}
  else{var sealOpts=Object.keys(ORGDIR).filter(function(o){return o===ORG.key||o==='central'||(ORG.level===2&&o==='sido_'+ORG.sido)}).map(function(o){return '<option value="'+esc(o)+'"'+(CI.seal.org===o?' selected':'')+'>'+esc(orgName(o))+'</option>'}).join('');
    h+='<table class="gw-form"><tr><th>발송 방법</th><td>'+(CI.kind==='draft'?'내부결재 — 발송하지 않습니다.':CI.kind==='official'?'결재가 끝나면 「발송대기」에 올라갑니다. [시행문 인쇄]로 출력(PDF)해 보내고 [발송]을 눌러 발송 방법과 일시를 기록합니다.<br><small>수신자에 연맹이 있으면 [발송]할 때 그 연맹의 접수대기에도 올라갑니다.</small>'
          :'<label class="ck"><input type="checkbox"'+(CI.auto?' checked':'')+' onchange="INTRA.ciSet(\'auto\',this.checked)"> 결재가 끝나면 바로 발송</label><br><small>끄면 「발송대기」에 머물고, [발송]을 눌러야 수신 기관에 보입니다(직인 날인 후 보낼 때).</small>')+'</td></tr>'
      +'<tr><th>직인(관인) 날인</th><td><label class="ck"><input type="checkbox"'+(CI.seal.on?' checked':'')+(CI.kind==='seal'?' disabled':'')+' onchange="INTRA.ciSet(\'seal.on\',this.checked);INTRA.ciTab(\'send\')"> 직인 날인을 요청합니다</label>'
        +(CI.seal.on?'<div class="gw-row"><label>직인</label><select style="width:240px" onchange="INTRA.ciSet(\'seal.org\',this.value)">'+sealOpts+'</select><label>방식</label><select style="width:220px" onchange="INTRA.ciSet(\'seal.mode\',this.value)"><option value="doc"'+(CI.seal.mode!=='file'?' selected':'')+'>시행문에 날인</option><option value="file"'+(CI.seal.mode==='file'?' selected':'')+'>붙임 문서에 날인 (PDF·이미지)</option></select></div>'
          +'<div class="gw-row"><label>용도</label><input maxlength="120" value="'+esc(CI.seal.purpose||'')+'" placeholder="제출처 · 부수" oninput="INTRA.ciSet(\'seal.purpose\',this.value)" style="flex:1"></div>':'')
        +'<br><small>결재가 끝난 뒤 직인 관리자가 승인해야 날인되며, 직인 대장에 기록됩니다.</small></td></tr>'
      +'<tr><th>발신명의</th><td>'+esc(CI.sender||'')+' <small>([수신자] 탭에서 바꿉니다)</small></td></tr></table>'}
  var order=['doc','to','line','send'],ti=order.indexOf(CI.tab);
  b.innerHTML=h+'</div><div class="gw-cifoot">'+(CI.first?(ti>0?'<button class="gw-b" onclick="INTRA.ciTab(\''+order[ti-1]+'\')">◀ 이전</button>':'')+(ti<3?'<button class="gw-b" onclick="INTRA.ciNext()">다음 ▶</button>':'')+'<button class="gw-b pri" onclick="INTRA.ciOk()">확인 · 본문 작성</button>':'<button class="gw-b pri" onclick="INTRA.ciOk()">확인</button>')+'<button class="gw-b" onclick="INTRA.closeW(\'gwCi\')">취소</button><span id="ciMsg" class="gw-say bad"></span></div>';
}
// 결재자가 부재 중이면 대결자로 바꿔 지정할지 묻습니다
function ciAddLine(){var m=MEMBERS.find(function(x){return x._id===CI.selM});if(!m){alert('조직도에서 결재자를 고르세요.');return}
  if(CI.line.some(function(x){return x.uid===m.uid})){alert('이미 결재선에 있습니다.');return}if(CI.line.length>=6){alert('결재선은 6명까지입니다.');return}
  if(isAbsent(m,now().slice(0,10))){var dp=m.absent.deputy;
    if(dp&&dp.uid&&dp.uid!==ME.uid&&!CI.line.some(function(x){return x.uid===dp.uid})){
      if(confirm(m.name+' 님은 부재 중입니다 ('+(m.absent.from||'')+' ~ '+(m.absent.to||'')+').\n대결자 '+dp.name+' 님으로 지정할까요?\n\n[확인] 대결자로 지정 · [취소] 그대로 '+m.name+' 님으로 지정')){CI.line.push({uid:dp.uid,name:dp.name,orgName:m.orgName,title:(dp.title||'')+' ('+m.name+' 대결)',type:'대결'});ciDraw();return}}
    else if(!confirm(m.name+' 님은 부재 중입니다 ('+(m.absent.from||'')+' ~ '+(m.absent.to||'')+'). 대결자가 지정되어 있지 않습니다.\n그래도 결재선에 넣을까요?'))return}
  CI.line.push({uid:m.uid,name:m.name,orgName:m.orgName,title:m.title||'',type:CI.type||'결재'});ciDraw()}
function ciDelLine(){if(CI.selL<0||!CI.line[CI.selL]){alert('오른쪽 결재선에서 뺄 사람을 고르세요.');return}CI.line.splice(CI.selL,1);CI.selL=-1;ciDraw()}
function ciMove(dir){var i=CI.selL,j=i+dir;if(i<0||j<0||j>=CI.line.length)return;var t=CI.line[i];CI.line[i]=CI.line[j];CI.line[j]=t;CI.selL=j;ciDraw()}
function ciLoadLine(i){var x=(PREFS.lines||[])[+i];if(i===''||!x)return;CI.line=x.line.filter(function(l){return l.uid!==ME.uid&&MEMBERS.some(function(m){return m.uid===l.uid})}).map(function(l){return Object.assign({},l)});CI.selL=-1;ciDraw()}
async function ciSaveLine(){if(!CI.line.length){alert('저장할 결재선이 없습니다.');return}var n=prompt('결재선 이름 (예: 사무처장 → 회장)',CI.line.map(function(x){return x.name}).join(' → '));if(!n||!n.trim())return;
  var bk=(PREFS.lines||[]).slice();PREFS.lines=bk.filter(function(x){return x.name!==n.trim()}).concat([{name:n.trim().slice(0,40),line:clone(CI.line)}]).slice(-12);
  try{await prefsSave();ciDraw()}catch(e){PREFS.lines=bk;alert('저장 실패: '+(e.code||e.message)+'\n(보안 규칙 v48 이상 게시가 필요합니다)')}}
function ciAddTo(){if(CI.kind==='draft'){alert('내부결재는 수신자를 지정하지 않습니다.\n[문서정보]에서 협조문이나 일반기안으로 바꾸세요.');return}
  if(CI.sub==='man'){var v=($('ciMan').value||'').trim();if(v.length<2)return;if(CI.kind!=='official'){alert('외부 기관(수기 입력)은 일반기안에서만 넣을 수 있습니다.\n[문서정보]에서 발송종류를 일반기안으로 바꾸세요.');return}if(CI.ext.indexOf(v)<0&&CI.ext.length<10)CI.ext.push(v.slice(0,80));ciDraw();return}
  var add=function(k){if(k!==ORG.key&&ORGDIR[k]&&CI.to.indexOf(k)<0)CI.to.push(k)};
  if(CI.sub==='grp'){if(!CI.selO){alert('수신자그룹을 고르세요.');return}Object.keys(ORGDIR).forEach(function(k){var lv=ORGDIR[k].level;if(CI.selO==='g0'||(CI.selO==='g1'&&lv===1)||(CI.selO==='g2'&&lv===2))add(k)})}
  else{if(!CI.selO){alert('조직도에서 수신 기관을 고르세요.');return}add(CI.selO)}
  ciDraw()}
function ciDelTo(){var i=CI.selT;if(i<0){alert('오른쪽 목록에서 뺄 수신자를 고르세요.');return}if(i<CI.to.length)CI.to.splice(i,1);else CI.ext.splice(i-CI.to.length,1);CI.selT=-1;ciDraw()}
function ciNext(){var order=['doc','to','line','send'],i=order.indexOf(CI.tab);if(CI.tab==='doc'&&String(CI.title||'').trim().length<2){var m=$('ciMsg');if(m)m.textContent='제목을 입력하세요';return}
  var n=order[i+1];if(n==='to'&&CI.kind==='draft')n='line';ciTab(n)}
function ciOk(){
  if(CI.first){var er='',need=apprMinOf(ORG.key,ORGDIR)-1,kd=CI.fixed?CP.kind:CI.kind;
    if(String(CI.title||'').trim().length<2){er='제목을 입력하세요';CI.tab='doc'}
    else if((kd==='coop'||kd==='notice')&&!CI.to.length){er='수신 기관을 지정하세요';CI.tab='to'}
    else if(kd==='official'&&!CI.to.length&&!CI.ext.length){er='수신자를 지정하세요 (조직도 또는 수기입력)';CI.tab='to'}
    else if(CI.line.length<need){er='이 기관은 '+(need+1)+'인 이상 결재입니다 — 결재자를 '+need+'명 이상 지정하세요';CI.tab='line'}
    if(er){ciDraw();var m=$('ciMsg');if(m)m.textContent=er;return}}
  var first=CI.first;
  if(!CI.fixed)CP.kind=CI.kind;CP.urgent=!!CI.urgent;CP.cab=CI.cab||'';CP.line=clone(CI.line);
  CP.to=CP.kind==='draft'?[]:CI.to.slice();CP.extTo=CP.kind==='official'?CI.ext.join(', '):'';CP.auto=CI.auto!==false;CP.seal=clone(CI.seal);if(CP.kind==='seal')CP.seal.on=true;
  CP.sender=CI.sender||ORG.name+'회장';CP.toLabel=CI.toLabelOn?String(CI.toLabel||'').trim().slice(0,80):'';
  CP.title=String(CI.title||'').trim();if($('cpTitle'))$('cpTitle').value=CP.title;closeW('gwCi');
  if(first){CP.first=false;cpEditor()}else cpDraw()}
function cpAddLine(){ciOpen('line')}
function cpDelLine(i){CP.line.splice(i,1);cpDraw()}
function cpLoadLine(){ciOpen('line')}
function cpSaveLine(){ciOpen('line')}
async function cpSaveForm(){var t=$('cpTitle').value.trim(),b=$('cpBody').value;if(b.trim().length<2){alert('본문을 입력한 뒤 저장하세요.');return}var n=prompt('서식 이름',t||KIND[CP.kind]);if(!n||!n.trim())return;
  var bk=(PREFS.forms||[]).slice();PREFS.forms=bk.concat([{name:n.trim().slice(0,40),kind:CP.kind,title:t.slice(0,120),body:b.slice(0,6000),to:CP.to.slice()}]).slice(-20);
  try{await prefsSave();var m=$('cpMsg');m.textContent='내 서식으로 저장했습니다 (서식함)';m.className='gw-say'}catch(e){PREFS.forms=bk;alert('저장 실패: '+(e.code||e.message)+'\n(보안 규칙 v48 이상 게시가 필요합니다)')}}
async function saveTemp(){var m=$('cpMsg');var title=$('cpTitle').value.trim();if(!title&&!$('cpBody').value.trim()){m.textContent='제목이나 내용을 입력하세요';m.className='gw-say bad';return}
  var ref=CP.tempId?DB.collection('intraTemp').doc(CP.tempId):DB.collection('intraTemp').doc();
  var t={uid:ME.uid,org:ORG.key,kind:CP.kind,title:title.slice(0,120),body:$('cpBody').value.slice(0,6000),line:CP.line,to:CP.to,extTo:String(CP.extTo||'').slice(0,300),auto:CP.auto!==false,urgent:!!CP.urgent,cabId:CP.cab||'',sender:CP.sender||'',toLabel:CP.toLabel||'',
    seal:CP.seal&&CP.seal.on?{orgKey:CP.seal.org,mode:CP.seal.mode,purpose:CP.seal.purpose||''}:null,updatedAt:now()};
  try{await ref.set(t);CP.tempId=ref.id;m.textContent='임시저장했습니다'+(CP.files.length?' (붙임 파일은 저장되지 않습니다)':'');m.className='gw-say'}catch(e){m.textContent='임시저장 실패: '+(e.code||e.message)+(/permission/i.test(String(e.code||e.message))?' (보안 규칙 v48 이상 게시 필요)':'');m.className='gw-say bad'}}
function cpAddTo(){var v=$('cpToWho').value;if(v&&CP.to.indexOf(v)<0)CP.to.push(v);cpDraw()}
function cpAddToAll(lv){Object.keys(ORGDIR).forEach(function(k){if(ORGDIR[k].level===lv&&k!==ORG.key&&CP.to.indexOf(k)<0&&(ORG.level!==1||lv!==2||ORGDIR[k].sido===ORG.sido))CP.to.push(k)});cpDraw()}
function cpDelTo(i){CP.to.splice(i,1);cpDraw()}
function cpDelKeep(i){CP.keep.splice(i,1);cpDraw()}
function cpDelFile(i){CP.files.splice(i,1);cpDraw()}
function cpFiles(inp){var ok=/\.(pdf|png|jpe?g|gif|webp|hwp|hwpx|docx?|xlsx?|pptx?|txt|zip)$/i;[].slice.call(inp.files||[]).forEach(function(f){if(!ok.test(f.name)){alert(f.name+' — 올릴 수 없는 형식입니다.');return}if(f.size>20*1024*1024){alert(f.name+' — 20MB 이하만 올릴 수 있습니다.');return}if(CP.files.length+CP.keep.length>=10){alert('붙임은 10개까지입니다.');return}CP.files.push(f)});inp.value='';cpDraw()}
function mimeOf(f){if(f.type)return f.type;var e=(f.name.split('.').pop()||'').toLowerCase();return {hwp:'application/x-hwp',hwpx:'application/vnd.hancom.hwpx',pdf:'application/pdf',zip:'application/zip',txt:'text/plain'}[e]||'application/octet-stream'}
async function nextNo(tx,orgKey,rcv){var y=new Date().getFullYear();var ref=DB.collection('intraCounters').doc(orgKey+'__'+y+(rcv?'__r':''));var g=await tx.get(ref);var n=((g.exists&&g.data().n)||0)+1;tx.set(ref,{org:orgKey,year:y,n:n,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});var p=(ORGDIR[orgKey]&&ORGDIR[orgKey].docPrefix)||'문서';return rcv?docNoOf(p+' 접수',y,n):docNoOf(p,y,n)}
async function submit(){
  var m=$('cpMsg'),bad=function(t){m.textContent=t;m.className='gw-say bad'};var kind=CP.kind,ext=kind==='ext',off=kind==='official';
  var title=$('cpTitle').value.trim(),body=$('cpBody').value.trim();
  if(title.length<2)return bad('제목을 입력하세요');if(body.length<2)return bad(ext?'요지를 입력하세요':'내용을 입력하세요');
  if((kind==='coop'||kind==='notice')&&!CP.to.length)return bad('수신 기관을 지정하세요 — [결재정보] › 수신자');
  var extTo=off?String(CP.extTo||'').trim():'';if(off&&extTo.length<2&&!CP.to.length)return bad('수신자를 지정하세요 — [결재정보] › 수신자');
  var extFrom=ext?$('cpExtFrom').value.trim():'';if(ext&&extFrom.length<2)return bad('발신처를 입력하세요');
  var need=ext?0:apprMinOf(ORG.key,ORGDIR)-1;
  if(CP.line.length<need)return bad('이 기관은 '+(need+1)+'인 이상 결재입니다 — [결재정보] › 결재선에서 결재자를 '+need+'명 이상 지정하세요'+(MEMBERS.some(function(x){return x.uid!==ME.uid})?'':' (인트라넷에 등록된 다른 임원이 없습니다. 결재자가 먼저 인트라넷에 로그인해야 합니다)'));
  var wantSeal=!ext&&!!(CP.seal&&CP.seal.on),seal=null;
  if(wantSeal){var so=CP.seal.org||ORG.key,mode=CP.seal.mode||'doc';if(!so)return bad('직인을 선택하세요');
    if(mode==='file'&&!(CP.files.concat(CP.keep)).some(function(f){return /\.(pdf|png|jpe?g)$/i.test(f.name)}))return bad('붙임 문서에 날인하려면 PDF 또는 이미지 파일을 붙이세요');
    if(!((ORGDIR[so]||{}).sealKeepers||[]).length&&!confirm(orgName(so)+'에 직인 관리자가 지정되어 있지 않습니다.\n지정되기 전에는 직인대기 상태로 남습니다. 그래도 상신할까요?'))return;
    seal={orgKey:so,orgName:orgName(so),mode:mode,purpose:String(CP.seal.purpose||'').trim().slice(0,120),status:'요청'}}
  var b=$('cpGo');b.disabled=true;m.className='gw-say';
  try{
    var ref=DB.collection('intraDocs').doc();var files=CP.keep.slice();
    for(var i=0;i<CP.files.length;i++){var f=CP.files[i];m.textContent='파일 올리는 중 ('+(i+1)+'/'+CP.files.length+')';
      var path='intranet/'+ref.id+'/'+Date.now()+'_'+i+'.'+(f.name.split('.').pop()||'bin').toLowerCase();
      await firebase.storage().ref(path).put(f,{contentType:mimeOf(f),customMetadata:{name:encodeURIComponent(f.name)}});files.push({name:f.name,path:path,size:f.size,by:ME.uid})}
    m.textContent=ext?'등록하는 중':'상신하는 중';
    var line=ext?[]:CP.line,done=!line.length,t=now();
    var d={kind:kind,title:title,body:body,org:ORG.key,orgName:ORG.name,authorUid:ME.uid,authorName:MY.name||'',authorTitle:myTitle(),
      line:line.map(function(x){return {uid:x.uid,name:x.name,orgName:x.orgName,title:x.title||'',type:x.type,status:'대기',at:'',comment:'',sign:''}}),
      toOrgs:CP.to.slice(),toNames:CP.to.map(orgName),status:done?'완료':'진행',docNo:'',files:files,recv:{},replies:[],seal:seal,log:[logOf(ext?'외부 문서 접수 등록':done?'기안 · 전결 시행(1인 결재)':'기안')],createdAt:t,updatedAt:t,doneAt:done?t:''};
    if(off){d.extTo=extTo.slice(0,300);d.send={auto:false,status:''}}
    else if(CP.to.length)d.send={auto:CP.auto!==false,status:''};
    if(!ext){d.urgent=!!CP.urgent;d.sender=CP.sender||'';d.toLabel=CP.toLabel||'';if(CP.cab){d.cab={};d.cab[ORG.key]=CP.cab}}
    var asg=null;
    if(ext){var au=$('cpAssign').value;var am=MEMBERS.find(function(x){return x.uid===au&&x.orgKey===ORG.key})||{uid:ME.uid,name:MY.name||''};asg={uid:am.uid,name:am.name};
      d.extFrom=extFrom.slice(0,80);d.extNo=$('cpExtNo').value.trim().slice(0,60);d.extDate=$('cpExtDate').value||'';
      d.recv[ORG.key]={status:'접수',by:ME.uid,byName:MY.name||'',orgName:ORG.name,at:t,note:'',assignee:asg}}
    d.readers=readersOf(ME.uid,d.line);if(asg&&d.readers.indexOf(asg.uid)<0)d.readers.push(asg.uid);
    d.readOrgs=readOrgsOf(d,done&&sentOf(d));
    await DB.runTransaction(async function(tx){if(done)d.docNo=await nextNo(tx,ORG.key,ext);tx.set(ref,d)});
    if(CP.from){try{await DB.collection('intraDocs').doc(CP.from).update({log:firebase.firestore.FieldValue.arrayUnion(logOf('재기안 → 새 문서')),updatedAt:now()})}catch(e){}}
    if(CP.tempId){try{await DB.collection('intraTemp').doc(CP.tempId).delete()}catch(e){}}
    if(ext){if(asg.uid!==ME.uid)try{KFDF.notify(asg.uid,'['+ORG.name+'] 접수 문서 담당 지정 — '+title,'intranet.html')}catch(e){}}
    else if(done)afterDone(Object.assign({_id:ref.id},d));else try{KFDF.notify(d.line[0].uid,'['+ORG.name+'] '+(d.line[0].type)+' 요청 — '+title,'intranet.html')}catch(e){}
    closeW('gwCi');closeW('gwCp');setFolder(ext?'x_reg':(done&&sendPending(d)?'s_wait':'a_mine'));say((ext?'접수 등록했습니다':'상신했습니다')+(d.docNo?' — '+d.docNo:'')+(done&&sendPending(d)?' · 발송대기':''));
  }catch(e){b.disabled=false;bad((ext?'등록':'상신')+' 실패: '+(e.code||e.message||e)+(/permission/i.test(String(e.code||e.message))&&(ext||off)?' (보안 규칙 v48 게시 필요)':''))}
}
function afterDone(d){if(sentOf(d))(d.toOrgs||[]).forEach(function(k){notifyOrg(k,'['+d.orgName+'] '+(KIND[d.kind]||'')+' 도착 — '+d.title)});
  else if(sendPending(d)&&d.authorUid!==ME.uid)try{KFDF.notify(d.authorUid,'결재 완료 · 발송대기 — '+d.title,'intranet.html')}catch(e){}
  if(d.seal&&d.seal.status==='요청')((ORGDIR[d.seal.orgKey]||{}).sealKeepers||[]).forEach(function(u){if(u!==ME.uid)try{KFDF.notify(u,'직인 날인 요청 — '+d.title+' ('+d.orgName+')','intranet.html')}catch(e){}})}
// ── 발송 ──
async function sendDo(id,method){var d=DOCS[id];if(!d||!sendPending(d))throw new Error('발송대기 문서가 아닙니다');
  await DB.collection('intraDocs').doc(id).update({send:{auto:false,status:'발송',at:now(),by:ME.uid,byName:MY.name||'',method:String(method||'').slice(0,40)},readOrgs:readOrgsOf(d,true),updatedAt:now(),log:firebase.firestore.FieldValue.arrayUnion(logOf('발송'+(method?' ('+method+')':'')))});
  (d.toOrgs||[]).forEach(function(k){notifyOrg(k,'['+d.orgName+'] '+(KIND[d.kind]||'')+' 도착 — '+d.title)})}
async function sendDoc(id){var d=DOCS[id];if(!d)return;var method='';
  if(d.seal&&d.seal.status==='요청'&&!confirm('직인 날인이 아직 끝나지 않았습니다. 그래도 발송할까요?'))return;
  if(d.kind==='official'){method=prompt('발송 방법을 적어 주세요 (예: 우편, 전자우편, 팩스, 직접 전달)','전자우편');if(method===null)return}
  else if(!confirm('수신 기관 '+(d.toOrgs||[]).length+'곳에 발송할까요?\n'+(d.toNames||[]).join(', ')))return;
  if(d.kind==='official'&&(d.toOrgs||[]).length&&!confirm('수신자 중 연맹 '+d.toOrgs.length+'곳('+(d.toNames||[]).join(', ')+')의 접수대기에도 올라갑니다. 발송할까요?'))return;
  try{await sendDo(id,method);say('발송했습니다')}catch(e){alert('발송 실패: '+(e.code||e.message)+(/permission/i.test(String(e.code||e.message))?'\n(보안 규칙 v48 게시가 필요합니다)':''))}}
// ── 결재 ──
async function approve(id,ok){
  var d0=DOCS[id];if(!d0||!isMyTurn(d0,ME.uid))return;
  var cm=prompt(ok?'의견 (선택)':'반려 사유를 입력하세요 (기안자에게 전달됩니다)','');if(cm===null)return;
  if(!ok&&cm.trim().length<2){alert('반려 사유를 입력하세요.');return}
  var ref=DB.collection('intraDocs').doc(id),res=null;
  try{
    await DB.runTransaction(async function(tx){var g=await tx.get(ref);var d=g.data();var i=curStep(d);if(d.status!=='진행'||i<0||d.line[i].uid!==ME.uid)throw new Error('이미 처리되었거나 내 차례가 아닙니다');
      var line=d.line.slice();line[i]=Object.assign({},line[i],{status:ok?'승인':'반려',at:now(),comment:cm.trim().slice(0,500),sign:ok?String(MY.signatureImg||'').slice(0,1500):''});
      var upd={line:line,updatedAt:now(),log:firebase.firestore.FieldValue.arrayUnion(logOf((line[i].type||'결재')+(ok?' 승인':' 반려')))};
      if(!ok)upd.status='반려';
      else if(i===line.length-1){upd.status='완료';upd.doneAt=now();upd.docNo=await nextNo(tx,d.org);upd.readOrgs=readOrgsOf(d,!d.send||d.send.auto===true)}
      tx.update(ref,upd);res=Object.assign({_id:id},d,upd,{line:line})});
    if(!ok)try{KFDF.notify(res.authorUid,'반려 — '+res.title+' ('+(MY.name||'')+')','intranet.html')}catch(e){}
    else if(res.status==='완료'){try{KFDF.notify(res.authorUid,'결재 완료 — '+res.title+' · '+res.docNo,'intranet.html')}catch(e){}afterDone(res)}
    else{var n=res.line[curStep(res)];try{KFDF.notify(n.uid,'['+res.orgName+'] '+(n.type)+' 요청 — '+res.title,'intranet.html')}catch(e){}}
    say(ok?'승인했습니다':'반려했습니다');
  }catch(e){alert('처리 실패: '+(e.code||e.message||e))}
}
async function withdraw(id){if(!confirm('문서를 회수할까요? 결재가 시작되기 전에만 회수할 수 있습니다.'))return;
  try{await DB.runTransaction(async function(tx){var ref=DB.collection('intraDocs').doc(id);var d=(await tx.get(ref)).data();if(d.status!=='진행'||(d.line||[]).some(function(x){return x.status==='승인'||x.status==='반려'}))throw new Error('이미 결재가 시작되었습니다');tx.update(ref,{status:'회수',updatedAt:now(),log:firebase.firestore.FieldValue.arrayUnion(logOf('회수'))})});say('회수했습니다')}catch(e){alert('회수 실패: '+(e.code||e.message||e))}}
async function del(id){var d=DOCS[id];if(!d||!confirm('['+d.title+'] 문서를 삭제할까요? 되돌릴 수 없습니다.'))return;try{await DB.collection('intraDocs').doc(id).delete();closeW('gwDoc');say('삭제했습니다')}catch(e){alert('삭제 실패: '+(e.code||e.message))}}
async function recvDo(id,st,note,as){var d=DOCS[id];var old=((d||{}).recv||{})[ORG.key]||{};
  var rec={status:st,by:ME.uid,byName:MY.name||'',orgName:ORG.name,at:now(),note:String(note||'').trim().slice(0,800)};
  var a=as||old.assignee;if(a&&st!=='반송')rec.assignee={uid:a.uid,name:a.name};
  var u={updatedAt:now(),log:firebase.firestore.FieldValue.arrayUnion(logOf('수신 '+st+(as?' · 담당 '+as.name:'')))};u['recv.'+ORG.key]=rec;
  await DB.collection('intraDocs').doc(id).update(u);
  if(d&&(d.kind==='coop'||st==='반송')&&d.authorUid!==ME.uid)try{KFDF.notify(d.authorUid,'['+ORG.name+'] '+(st==='반송'?'문서 반송':'협조문 '+st)+' — '+d.title,'intranet.html')}catch(e){}
  if(as&&as.uid!==ME.uid)try{KFDF.notify(as.uid,'['+ORG.name+'] 접수 문서 담당 지정 — '+(d?d.title:''),'intranet.html')}catch(e){}}
async function recv(id,st){var note='';
  if(st==='완료'||st==='불가'){note=prompt(st==='완료'?'처리 결과를 입력하세요'+(DOCS[id]&&DOCS[id].kind==='ext'?'':' (발신 기관에 회신됩니다)'):'협조가 어려운 사유를 입력하세요','');if(note===null)return;if(note.trim().length<2){alert('내용을 입력하세요.');return}}
  try{await recvDo(id,st,note);say(st+' 처리했습니다')}catch(e){alert('처리 실패: '+(e.code||e.message))}}
// 접수하면서 담당자를 정합니다 — 담당자의 「개인접수」에 올라갑니다
function recvOpen(id){var d=DOCS[id];if(!d)return;var cur=(((d.recv||{})[ORG.key]||{}).assignee||{}).uid||ME.uid;var mem=MEMBERS.filter(function(m){return m.orgKey===ORG.key});
  win('gwRecv','접수 · 담당자 지정','<div class="gw-wtool"><button class="gw-b pri" onclick="INTRA.recvGo(\''+id+'\')">접수</button><button class="gw-b" onclick="INTRA.closeW(\'gwRecv\')">취소</button></div>'
    +'<table class="gw-form"><tr><th>문서</th><td>'+esc(d.title||'')+'<br><small>'+esc(d.orgName||'')+' · '+esc(d.docNo||'')+'</small></td></tr><tr><th>담당자</th><td><select id="rvWho" style="width:260px">'+mem.map(function(m){return '<option value="'+esc(m.uid)+'"'+(m.uid===cur?' selected':'')+'>'+esc(m.name)+' '+esc(m.title||'')+'</option>'}).join('')+'</select><br><small>담당자의 「개인접수」에 올라가고 알림이 갑니다.</small></td></tr></table>',520)}
async function recvGo(id){var u=$('rvWho').value;var m=MEMBERS.find(function(x){return x.uid===u&&x.orgKey===ORG.key})||{uid:ME.uid,name:MY.name||''};var old=((DOCS[id]||{}).recv||{})[ORG.key];
  try{await recvDo(id,old&&old.status==='처리중'?'처리중':'접수',old?old.note:'',{uid:m.uid,name:m.name});closeW('gwRecv');say('접수했습니다 — 담당 '+m.name)}catch(e){alert('처리 실패: '+(e.code||e.message))}}
async function recvBack(id){var n=prompt('반송 사유를 입력하세요 (발신 기관에 전달됩니다)','');if(n===null)return;if(n.trim().length<2){alert('사유를 입력하세요.');return}
  try{await recvDo(id,'반송',n);say('반송했습니다')}catch(e){alert('처리 실패: '+(e.code||e.message))}}
async function setCab(id,cb){var u={updatedAt:now()};u['cab.'+ORG.key]=cb||firebase.firestore.FieldValue.delete();
  try{await DB.collection('intraDocs').doc(id).update(u);say('기록물철을 바꿨습니다')}catch(e){alert('저장 실패: '+(e.code||e.message)+(/permission/i.test(String(e.code||e.message))?'\n(보안 규칙 v48 게시가 필요합니다)':''))}}
async function reply(id){var t=($('gwRep').value||'').trim();if(t.length<2)return;var d=DOCS[id];
  try{await DB.collection('intraDocs').doc(id).update({replies:firebase.firestore.FieldValue.arrayUnion({uid:ME.uid,name:MY.name||'',orgName:ORG.name,text:t.slice(0,500),at:now()}),updatedAt:now()});$('gwRep').value='';
    if(d&&d.authorUid!==ME.uid)try{KFDF.notify(d.authorUid,'['+ORG.name+'] '+(MY.name||'')+' 의견 — '+d.title,'intranet.html')}catch(e){}}catch(e){alert('등록 실패: '+(e.code||e.message))}}
// ── 직인 ──
function loadScript(u){return new Promise(function(res,rej){if(document.querySelector('script[data-u="'+u+'"]'))return res();var s=document.createElement('script');s.src=u;s.dataset.u=u;s.onload=res;s.onerror=function(){rej(new Error('라이브러리를 불러오지 못했습니다'))};document.head.appendChild(s)})}
async function sealImg(orgKey){var g=await DB.collection('intraSeals').doc(orgKey).get();if(g.exists&&g.data().img)return g.data().img;throw new Error(orgName(orgKey)+' 직인 이미지가 등록되어 있지 않습니다. 환경설정에서 먼저 등록하세요.')}
async function sealOpen(id){
  var d=DOCS[id];if(!d||!sealPending(d))return;var img;
  try{img=await sealImg(d.seal.orgKey)}catch(e){alert(e.message);return}
  if(d.seal.mode!=='file'){
    if(!confirm('['+d.title+']\n'+d.orgName+' 시행문에 '+orgName(d.seal.orgKey)+' 직인을 날인합니다.\n용도: '+(d.seal.purpose||'-')+'\n\n승인할까요? (직인 대장에 기록됩니다)'))return;
    try{await DB.collection('intraDocs').doc(id).update({seal:Object.assign({},d.seal,{status:'승인',by:ME.uid,byName:MY.name||'',at:now(),img:img}),updatedAt:now(),log:firebase.firestore.FieldValue.arrayUnion(logOf('직인 날인 승인(시행문)'))});
      try{KFDF.notify(d.authorUid,'직인 날인 승인 — '+d.title,'intranet.html')}catch(e){}say('직인 날인을 승인했습니다')}catch(e){alert('승인 실패: '+(e.code||e.message))}
    return}
  var fs=(d.files||[]).map(function(f,i){return {f:f,i:i}}).filter(function(x){return /\.(pdf|png|jpe?g)$/i.test(x.f.name)});
  STAMP={id:id,img:img,fi:fs.length?fs[0].i:-1,page:0,pages:1,cx:.72,cy:.78,mm:30,bytes:null,isPdf:false};
  win('gwSt','직인 날인','<div class="gw-wtool"><button class="gw-b" onclick="INTRA.stMake(true)">미리보기</button><button class="gw-b pri" id="stGo" onclick="INTRA.stMake(false)">날인 승인</button><button class="gw-b" onclick="INTRA.closeW(\'gwSt\')">닫기</button><span id="stMsg" class="gw-say"></span></div>'
    +'<table class="gw-form"><tr><th>문서</th><td><select id="stFile" onchange="INTRA.stLoad(+this.value)" style="width:320px">'+fs.map(function(x){return '<option value="'+x.i+'">'+esc(x.f.name)+'</option>'}).join('')+'</select> <label class="gw-b" style="cursor:pointer">내 PC의 파일<input type="file" accept=".pdf,image/png,image/jpeg" style="display:none" onchange="INTRA.stLocal(this)"></label></td>'
    +'<th>쪽 / 크기</th><td><input id="stPage" type="number" min="1" value="1" style="width:60px" onchange="INTRA.stPage(+this.value)"> / <b id="stPages">1</b> 쪽 &nbsp; <input id="stMm" type="number" min="10" max="60" value="30" style="width:60px" onchange="INTRA.stSize(+this.value)"> mm</td></tr></table>'
    +'<div class="gw-note">문서 위에서 직인을 찍을 자리를 누르세요. 발신명의 끝 글자에 걸치게 찍는 것이 일반적입니다.</div><div id="stWrap" class="gw-stwrap"><canvas id="stCv"></canvas><img id="stSeal" src="'+esc(img)+'" alt=""></div>',920);
  $('stCv').onclick=function(e){var r=this.getBoundingClientRect();STAMP.cx=(e.clientX-r.left)/r.width;STAMP.cy=(e.clientY-r.top)/r.height;stDraw()};
  if(STAMP.fi>=0)stLoad(STAMP.fi);else stMsg('날인할 PDF·이미지가 없습니다. [내 PC의 파일]을 눌러 선택하세요.',true);
}
function stMsg(t,bad){var m=$('stMsg');if(m){m.textContent=t;m.className='gw-say'+(bad?' bad':'')}}
async function stLoad(i){var d=DOCS[STAMP.id];var f=(d.files||[])[i];if(!f)return;STAMP.fi=i;STAMP.name=f.name;stMsg('문서를 불러오는 중');
  try{var u=await firebase.storage().ref(f.path).getDownloadURL();var r=await fetch(u);if(!r.ok)throw new Error(r.status);await stSet(new Uint8Array(await r.arrayBuffer()),f.name)}
  catch(e){stMsg('문서를 불러오지 못했습니다. 파일을 내려받아 [내 PC의 파일]로 선택하세요.',true)}}
async function stLocal(inp){var f=inp.files&&inp.files[0];if(!f)return;STAMP.name=f.name;await stSet(new Uint8Array(await f.arrayBuffer()),f.name)}
async function stSet(bytes,name){STAMP.bytes=bytes;STAMP.isPdf=/\.pdf$/i.test(name);STAMP.page=0;
  if(STAMP.isPdf){await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    STAMP.pdf=await pdfjsLib.getDocument({data:bytes.slice()}).promise;STAMP.pages=STAMP.pdf.numPages;STAMP.page=STAMP.pages-1}
  else{STAMP.pages=1;STAMP.image=await new Promise(function(res,rej){var im=new Image();im.onload=function(){res(im)};im.onerror=function(){rej(new Error('이미지를 읽지 못했습니다'))};im.src=URL.createObjectURL(new Blob([bytes]))})}
  $('stPages').textContent=STAMP.pages;$('stPage').value=STAMP.page+1;$('stPage').max=STAMP.pages;await stRender();stMsg('')}
async function stRender(){var cv=$('stCv'),W=Math.min(860,$('stWrap').clientWidth||860);
  if(STAMP.isPdf){var p=await STAMP.pdf.getPage(STAMP.page+1);var v0=p.getViewport({scale:1});var v=p.getViewport({scale:W/v0.width});cv.width=v.width;cv.height=v.height;STAMP.ptW=v0.width;STAMP.ptH=v0.height;await p.render({canvasContext:cv.getContext('2d'),viewport:v}).promise}
  else{var im=STAMP.image;cv.width=W;cv.height=Math.round(W*im.height/im.width);cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);STAMP.ptW=595.28;STAMP.ptH=595.28*im.height/im.width}
  stDraw()}
function stDraw(){var cv=$('stCv'),s=$('stSeal');if(!cv||!s)return;var px=STAMP.mm*72/25.4*(cv.clientWidth/STAMP.ptW);s.style.width=px+'px';s.style.height=px+'px';s.style.left=(STAMP.cx*cv.clientWidth-px/2)+'px';s.style.top=(STAMP.cy*cv.clientHeight-px/2)+'px';s.style.display='block'}
function stPage(n){STAMP.page=Math.max(0,Math.min(STAMP.pages-1,(n||1)-1));stRender()}
function stSize(n){STAMP.mm=Math.max(10,Math.min(60,n||30));stDraw()}
function dataBytes(u){var b=atob(u.split(',')[1]);var a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}
async function stMake(preview){
  if(!STAMP.bytes){stMsg('날인할 문서를 먼저 불러오세요',true);return}
  var d=DOCS[STAMP.id],blob,name=String(STAMP.name||'문서').replace(/\.[^.]+$/,'')+'_날인본';stMsg('날인본을 만드는 중');
  try{
    if(STAMP.isPdf){await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js');
      var pdf=await PDFLib.PDFDocument.load(STAMP.bytes,{ignoreEncryption:true});var pg=pdf.getPages()[STAMP.page];var sz=pg.getSize();
      var im=/^data:image\/png/.test(STAMP.img)?await pdf.embedPng(dataBytes(STAMP.img)):await pdf.embedJpg(dataBytes(STAMP.img));var w=STAMP.mm*72/25.4;
      pg.drawImage(im,{x:STAMP.cx*sz.width-w/2,y:sz.height-STAMP.cy*sz.height-w/2,width:w,height:w,opacity:.93});
      blob=new Blob([await pdf.save()],{type:'application/pdf'});name+='.pdf'}
    else{var c=document.createElement('canvas');c.width=STAMP.image.width;c.height=STAMP.image.height;var x=c.getContext('2d');x.drawImage(STAMP.image,0,0);
      var si=await new Promise(function(res){var i2=new Image();i2.onload=function(){res(i2)};i2.src=STAMP.img});var w2=STAMP.mm/210*c.width;x.globalAlpha=.93;x.drawImage(si,STAMP.cx*c.width-w2/2,STAMP.cy*c.height-w2/2,w2,w2);
      blob=await new Promise(function(res){c.toBlob(res,'image/jpeg',.92)});name+='.jpg'}
    if(preview){window.open(URL.createObjectURL(blob),'_blank');stMsg('새 창에서 날인 위치를 확인하세요.');return}
    if(!confirm('['+d.title+']\n'+orgName(d.seal.orgKey)+' 직인을 날인한 문서를 저장하고 승인합니다.\n직인 대장에 기록되며 되돌릴 수 없습니다. 계속할까요?'))return;
    $('stGo').disabled=true;var path='intranet/'+STAMP.id+'/stamped_'+Date.now()+(STAMP.isPdf?'.pdf':'.jpg');
    await firebase.storage().ref(path).put(blob,{contentType:blob.type});
    await DB.collection('intraDocs').doc(STAMP.id).update({seal:Object.assign({},d.seal,{status:'승인',by:ME.uid,byName:MY.name||'',at:now(),stamped:{name:name,path:path,size:blob.size,page:STAMP.page+1}}),updatedAt:now(),log:firebase.firestore.FieldValue.arrayUnion(logOf('직인 날인 승인(붙임 문서)'))});
    try{KFDF.notify(d.authorUid,'직인 날인본이 준비되었습니다 — '+d.title,'intranet.html')}catch(e){}
    closeW('gwSt');say('날인본을 저장하고 승인했습니다');
  }catch(e){var b=$('stGo');if(b)b.disabled=false;stMsg('실패: '+(e.code||e.message||e),true)}
}
async function sealReject(id){var d=DOCS[id];if(!d)return;var n=prompt('직인 날인을 반려합니다. 사유를 입력하세요','');if(n===null)return;if(n.trim().length<2){alert('사유를 입력하세요.');return}
  try{await DB.collection('intraDocs').doc(id).update({seal:Object.assign({},d.seal,{status:'반려',by:ME.uid,byName:MY.name||'',at:now(),note:n.trim().slice(0,300)}),updatedAt:now(),log:firebase.firestore.FieldValue.arrayUnion(logOf('직인 반려'))});try{KFDF.notify(d.authorUid,'직인 날인 반려 — '+d.title,'intranet.html')}catch(e){}say('반려했습니다')}catch(e){alert('처리 실패: '+(e.code||e.message))}}
// ── 환경설정 ──
async function settings(){
  var o=ORGDIR[ORG.key]||{};var mine=MEMBERS.filter(function(m){return m.orgKey===ORG.key});var keeper=isKeeper(ORG.key,ME.uid,ORGDIR);var has='';
  if(keeper){try{var g=await DB.collection('intraSeals').doc(ORG.key).get();has=g.exists&&g.data().img?'<img src="'+esc(g.data().img)+'" class="gw-sealimg">':'등록된 직인이 없습니다.'}catch(e){has=esc(e.code||e.message)}}
  if(V.mod!=='set')return;
  $('gwMain').innerHTML='<div class="gw-bar"><h2>환경설정 <span>('+esc(ORG.name)+')</span></h2><span class="sp"></span><span id="gwMsg" class="gw-say"></span></div>'
    +'<table class="gw-form"><tr><th>내 직위</th><td><div class="gw-row"><input id="setTitle" maxlength="20" value="'+esc(myTitle())+'" placeholder="회장 · 전무이사 · 사무국장 등" style="width:260px"><button class="gw-b" onclick="INTRA.saveTitle()">저장</button></div></td></tr>'
    +(function(){var me=MEMBERS.find(function(x){return x.uid===ME.uid&&x.orgKey===ORG.key})||{};var a=me.absent||{};var dps=MEMBERS.filter(function(x){return x.uid!==ME.uid});
        return '<tr><th>부재 · 대결</th><td><label class="ck"><input type="checkbox" id="setAbsOn"'+(a.on?' checked':'')+'> 부재 중</label> <input type="date" id="setAbsFrom" value="'+esc(a.from||'')+'"> ~ <input type="date" id="setAbsTo" value="'+esc(a.to||'')+'">'
          +'<div class="gw-row"><label>대결자</label><select id="setAbsDep" style="width:300px"><option value="">(지정 안 함)</option>'+dps.map(function(x){return '<option value="'+esc(x._id)+'"'+(a.deputy&&a.deputy.uid===x.uid?' selected':'')+'>'+esc(x.orgName)+' / '+esc(x.name)+' '+esc(x.title||'')+'</option>'}).join('')+'</select><button class="gw-b" onclick="INTRA.saveAbsent()">저장</button></div>'
          +'<small>부재 기간에 나를 결재선에 넣으려는 사람에게 대결자로 바꿀지 물어봅니다. 조직도에 부재로 표시됩니다.</small></td></tr>'})()
    +'<tr><th>기록물철</th><td><div class="gw-chips">'+((o.cabinets||[]).map(function(c,i){return '<span>'+esc(c.name)+' <a onclick="INTRA.delCab('+i+')">✕</a></span>'}).join('')||'<small>만든 기록물철이 없습니다.</small>')+'</div><div class="gw-row"><input id="setCabName" maxlength="30" placeholder="예: 2026 유소년 스포츠 기반구축사업" style="width:300px"><button class="gw-b" onclick="INTRA.addCab()">기록물철 추가</button></div><small>문서함 왼쪽에 폴더로 보이고, 완료된 문서를 문서 화면에서 분류해 넣습니다.</small></td></tr>'
    +'<tr><th>기관 이름</th><td><div class="gw-row"><input id="setName" maxlength="40" value="'+esc(o.name||ORG.name)+'" style="width:320px"></div></td></tr>'
    +'<tr><th>문서번호 머리글</th><td><div class="gw-row"><input id="setPrefix" maxlength="12" value="'+esc(o.docPrefix||defPrefix(ORG))+'" style="width:160px"><button class="gw-b" onclick="INTRA.saveOrg()">기관 정보 저장</button></div><small>문서번호 예: '+esc(docNoOf(o.docPrefix||defPrefix(ORG),new Date().getFullYear(),12))+'</small></td></tr>'
    +'<tr><th>직인 관리자</th><td><div class="gw-chips">'+mine.map(function(m){return '<label class="ck"><input type="checkbox" class="setKeep" value="'+esc(m.uid)+'"'+((o.sealKeepers||[]).indexOf(m.uid)>=0?' checked':'')+'> '+esc(m.name)+' '+esc(m.title||'')+'</label>'}).join(' &nbsp; ')+'</div><button class="gw-b" onclick="INTRA.saveKeepers()">직인 관리자 저장</button><br><small>직인 관리자는 직인 이미지를 관리하고 직인 날인을 승인합니다.</small></td></tr>'
    +'<tr><th>직인 이미지</th><td>'+(keeper?has+'<div class="gw-row" style="margin-top:6px"><label class="gw-b" style="cursor:pointer">직인 이미지 등록 · 변경<input type="file" accept="image/png,image/jpeg" style="display:none" onchange="INTRA.saveSeal(this)"></label></div><small>직인 이미지는 직인 관리자만 볼 수 있고, 날인을 승인한 문서에만 들어갑니다.</small>':'직인 관리자만 보고 바꿀 수 있습니다.')+'</td></tr>'
    +(ORG.key==='central'?'<tr><th>중앙 조직도<br>제외</th><td><div class="gw-chips">'+mine.filter(function(m){return m.uid!==ME.uid}).map(function(m){return '<label class="ck"><input type="checkbox" class="setHide" value="'+esc(m.uid)+'" data-name="'+esc(m.name)+'"> '+esc(m.name)+' '+esc(m.title||'')+'</label>'}).join(' &nbsp; ')+'</div>'
      +(HIDE.length?'<div style="margin-top:4px">제외 중: '+HIDE.map(function(h){return '<label class="ck"><input type="checkbox" class="setUnhide" value="'+esc(h.uid)+'"> '+esc(h.name||'')+'</label>'}).join(' &nbsp; ')+' <small>(체크하면 다시 중앙에 표시)</small></div>':'')
      +'<button class="gw-b" onclick="INTRA.saveHide()">저장</button><br><small>홈페이지 관리 권한은 그대로 두고, 인트라넷에서만 중앙 소속으로 보이지 않게 합니다. 제외된 사람은 시도·구군 소속으로만 인트라넷을 씁니다.</small></td></tr>':'')
    +'<tr><th>결재 방식</th><td>'+(ORG.key==='central'?(function(){var p=o.apprPolicy||{},by=p.by||{};var op=function(v,base){return [['','기본 따름'],['1','1인 전결'],['2','2인 이상'],['3','3인 이상']].filter(function(x){return base||x[0]}).map(function(x){return '<option value="'+x[0]+'"'+(String(v||'')===x[0]?' selected':'')+'>'+x[1]+'</option>'}).join('')};
        var ks=Object.keys(ORGDIR).sort(function(a,b){return (ORGDIR[a].level-ORGDIR[b].level)||String(ORGDIR[a].name).localeCompare(String(ORGDIR[b].name),'ko')});
        return '<div class="gw-row"><label>전체 기본</label><select id="setApprDef" style="width:120px">'+op(p.def||1,false)+'</select></div>'
          +'<div class="gw-row" style="align-items:flex-start;flex-direction:column;gap:3px;margin-top:4px">'+ks.map(function(k){return '<span><select class="setApprBy" data-k="'+esc(k)+'" style="width:110px">'+op(by[k],true)+'</select> '+esc(ORGDIR[k].name)+' <small>(임원 '+MEMBERS.filter(function(m){return m.orgKey===k}).length+'명 등록)</small></span>'}).join('')+'</div>'
          +'<button class="gw-b" onclick="INTRA.saveAppr()" style="margin-top:4px">결재 방식 저장</button><br><small>1인 전결: 기안자가 결재선 없이 바로 시행(결재자를 넣어도 됩니다). 2인 이상: 기안자 외 결재자 1명 이상이 승인해야 시행. 3인 이상: 결재자 2명 이상. 중앙 사무국만 바꿀 수 있고, 저장한 뒤 새로 기안하는 문서부터 적용됩니다.</small>'})()
        :(function(){var n=apprMinOf(ORG.key,ORGDIR);return (n<=1?'1인 전결 — 결재선 없이 바로 시행할 수 있습니다.':n+'인 이상 결재 — 결재자를 '+(n-1)+'명 이상 지정해야 합니다.')+' <small>(중앙 사무국 설정)</small>'})())+'</td></tr>'
    +'<tr><th>보안</th><td>이 창에서 30분 동안 사용하지 않으면 자동으로 잠깁니다. <button class="gw-b" onclick="INTRA.lock()">지금 잠금</button></td></tr></table>';
}
async function saveTitle(){try{await DB.collection('intraMembers').doc(ME.uid+'__'+ORG.key).update({title:$('setTitle').value.trim().slice(0,20),updatedAt:firebase.firestore.FieldValue.serverTimestamp(),uid:ME.uid,orgKey:ORG.key});await loadDir();renderAll();say('직위를 저장했습니다')}catch(e){say('저장 실패: '+(e.code||e.message),true)}}
async function saveOrg(){var n=$('setName').value.trim(),p=$('setPrefix').value.trim();if(n.length<2||!p){say('기관 이름과 머리글을 입력하세요',true);return}
  try{await DB.collection('intraOrgs').doc(ORG.key).update({name:n,docPrefix:p,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:ME.uid});await loadDir();renderAll();say('저장했습니다')}catch(e){say('저장 실패: '+(e.code||e.message),true)}}
async function saveAbsent(){var on=$('setAbsOn').checked,fr=$('setAbsFrom').value,to=$('setAbsTo').value;if(on&&(!fr||!to||fr>to)){say('부재 기간을 정확히 입력하세요',true);return}
  var dm=MEMBERS.find(function(x){return x._id===$('setAbsDep').value});
  var a={on:on,from:fr,to:to,deputy:dm?{uid:dm.uid,name:dm.name,title:dm.title||''}:null};
  try{await DB.collection('intraMembers').doc(ME.uid+'__'+ORG.key).update({absent:a,uid:ME.uid,orgKey:ORG.key,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});await loadDir();renderAll();say(on?'부재를 설정했습니다':'부재를 해제했습니다')}catch(e){say('저장 실패: '+(e.code||e.message)+(/permission/i.test(String(e.code||e.message))?' (보안 규칙 v48 게시 필요)':''),true)}}
async function addCab(){var n=$('setCabName').value.trim();if(n.length<2){say('기록물철 이름을 입력하세요',true);return}var cs=((ORGDIR[ORG.key]||{}).cabinets||[]).slice();if(cs.length>=30){say('기록물철은 30개까지입니다',true);return}
  cs.push({id:'k'+Date.now().toString(36),name:n.slice(0,30)});try{await DB.collection('intraOrgs').doc(ORG.key).update({cabinets:cs,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:ME.uid});await loadDir();renderAll();say('기록물철을 추가했습니다')}catch(e){say('저장 실패: '+(e.code||e.message),true)}}
async function delCab(i){var cs=((ORGDIR[ORG.key]||{}).cabinets||[]).slice();var c=cs[i];if(!c)return;var n=inFolder('c_'+c.id).length;if(!confirm('기록물철 「'+c.name+'」을 삭제할까요?'+(n?'\n이 철에 분류된 문서 '+n+'건은 문서 자체는 그대로 남고 분류만 풀립니다.':'')))return;
  cs.splice(i,1);try{await DB.collection('intraOrgs').doc(ORG.key).update({cabinets:cs,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:ME.uid});await loadDir();renderAll();say('삭제했습니다')}catch(e){say('저장 실패: '+(e.code||e.message),true)}}
async function saveAppr(){
  if(ORG.key!=='central')return;var def=+$('setApprDef').value||1,by={};
  [].slice.call(document.querySelectorAll('.setApprBy')).forEach(function(x){if(x.value)by[x.getAttribute('data-k')]=+x.value});
  var lone=Object.keys(ORGDIR).filter(function(k){return apprMinOf(k,{central:{apprPolicy:{def:def,by:by}}})>1&&MEMBERS.filter(function(m){return m.orgKey===k}).length<2});
  if(!confirm('결재 방식을 저장할까요?\n· 전체 기본: '+(def<=1?'1인 전결':def+'인 이상')+(Object.keys(by).length?'\n· 기관별 지정 '+Object.keys(by).length+'곳':'')+(lone.length?'\n\n⚠ 임원이 1명뿐이라 2인 이상 결재를 할 수 없는 기관: '+lone.map(orgName).join(', ')+'\n(결재자가 인트라넷에 로그인해 명부에 올라와야 기안할 수 있습니다)':'')))return;
  try{await DB.collection('intraOrgs').doc('central').update({apprPolicy:{def:def,by:by},apprBy:ME.uid,apprByName:MY.name||'',apprAt:now()});await loadDir();renderAll();say('결재 방식을 저장했습니다')}catch(e){say('저장 실패: '+(e.code||e.message),true)}}
async function saveHide(){
  var add=[].slice.call(document.querySelectorAll('.setHide:checked')).map(function(x){return {uid:x.value,name:x.getAttribute('data-name')||''}});
  var del=[].slice.call(document.querySelectorAll('.setUnhide:checked')).map(function(x){return x.value});
  if(!add.length&&!del.length){say('바꿀 내용이 없습니다',true);return}
  var next=HIDE.filter(function(h){return del.indexOf(h.uid)<0}).concat(add.filter(function(a){return !hiddenIn(HIDE,a.uid)}));
  if(!confirm((add.length?'중앙 조직도에서 제외: '+add.map(function(a){return a.name}).join(', ')+'\n':'')+(del.length?'다시 중앙에 표시: '+del.length+'명\n':'')+'\n저장할까요? (홈페이지 관리 권한은 바뀌지 않습니다)'))return;
  try{await DB.collection('intraOrgs').doc('central').update({hideCentral:next,hideBy:ME.uid,hideByName:MY.name||'',hideAt:now()});
    for(var i=0;i<add.length;i++){try{await DB.collection('intraMembers').doc(add[i].uid+'__central').delete()}catch(e){}
      (ORGDIR.central.sealKeepers||[]).indexOf(add[i].uid)>=0&&await DB.collection('intraOrgs').doc('central').update({sealKeepers:firebase.firestore.FieldValue.arrayRemove(add[i].uid)})}
    HIDE=next;await loadDir();renderAll();say('저장했습니다')}catch(e){say('저장 실패: '+(e.code||e.message),true)}}
async function saveKeepers(){var k=[].slice.call(document.querySelectorAll('.setKeep:checked')).map(function(x){return x.value});
  if(!confirm('직인 관리자를 '+k.length+'명으로 저장할까요?'))return;
  try{await DB.collection('intraOrgs').doc(ORG.key).update({sealKeepers:k,keepersBy:ME.uid,keepersByName:MY.name||'',keepersAt:now()});await loadDir();renderAll()}catch(e){say('저장 실패: '+(e.code||e.message),true)}}
function saveSeal(inp){var f=inp.files&&inp.files[0];if(!f)return;var rd=new FileReader();rd.onload=function(ev){var im=new Image();im.onload=async function(){
  var M=480,r=Math.min(1,M/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*r);c.height=Math.round(im.height*r);var x=c.getContext('2d');x.drawImage(im,0,0,c.width,c.height);
  try{var px=x.getImageData(0,0,c.width,c.height),p=px.data;for(var i=0;i<p.length;i+=4){if(p[i]>225&&p[i+1]>225&&p[i+2]>225)p[i+3]=0}x.putImageData(px,0,0)}catch(e){}
  var u=c.toDataURL('image/png');if(u.length>600000){say('이미지가 너무 큽니다.',true);return}
  if(!confirm('이 이미지를 '+ORG.name+' 직인으로 등록할까요?'))return;
  try{await DB.collection('intraSeals').doc(ORG.key).set({orgKey:ORG.key,img:u,by:ME.uid,byName:MY.name||'',at:now()});settings()}catch(e){say('등록 실패: '+(e.code||e.message),true)}};im.src=ev.target.result};rd.readAsDataURL(f)}
// ── 시행문 인쇄 ──
function print(id){var d=DOCS[id];if(!d)return;var w=window.open('','_blank');if(!w){alert('팝업이 차단되었습니다. 이 사이트의 팝업을 허용하세요.');return}
  var seal=(d.seal&&d.seal.status==='승인'&&d.seal.img)?'<img class="seal" src="'+esc(d.seal.img)+'">':'';var l=d.line||[];
  w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>'+esc(d.docNo||'')+' '+esc(d.title)+'</title><style>'
    +'@page{size:A4;margin:20mm 18mm}*{box-sizing:border-box}body{font-family:"Malgun Gothic","맑은 고딕",sans-serif;font-size:11.5pt;line-height:1.8;color:#111;word-break:keep-all;margin:0}'
    +'.mt{text-align:center;font-size:10.5pt;letter-spacing:1px;margin-bottom:3mm}.hd{text-align:center;font-size:21pt;font-weight:800;letter-spacing:2px;padding-bottom:6mm;border-bottom:2.2px solid #111}.kv{margin:7mm 0 0}.kv div{display:flex;gap:4mm}.kv b{flex:none;width:18mm}'
    +'h1{font-size:12.5pt;margin:3mm 0 0;display:flex;gap:4mm}h1 b{flex:none;width:18mm}.rule{border-top:1px solid #111;margin:4mm 0 6mm}.body{min-height:95mm;white-space:pre-wrap}'
    +'.att{margin-top:6mm}.from{text-align:center;font-size:19pt;font-weight:800;letter-spacing:3px;margin:16mm 0 10mm}.from span{position:relative;display:inline-block}.seal{position:absolute;right:-22mm;top:50%;transform:translateY(-50%);width:30mm;height:30mm;object-fit:contain;mix-blend-mode:multiply;opacity:.93}'
    +'.ft{border-top:2.2px solid #111;padding-top:3mm;font-size:9.5pt;line-height:1.7}.ft .ln{display:flex;flex-wrap:wrap;gap:1mm 7mm}.np{text-align:center;margin:0 0 10px}@media print{.np{display:none}}'
    +'</style></head><body><div class="np"><button onclick="window.print()" style="padding:6px 18px;font-size:13px">인쇄 · PDF로 저장</button></div>'
    +'<div class="mt">'+MOTTO+'</div><div class="hd">'+esc(d.orgName)+'</div><div class="kv"><div><b>수신</b><span>'+esc(d.toLabel||((d.toNames||[]).length+(d.extTo?1:0)>4?'수신처 참조':recvText(d)))+'</span></div><div><b>(경유)</b><span></span></div></div>'
    +'<h1><b>제목</b><span>'+esc(d.title)+'</span></h1><div class="rule"></div><div class="body">'+esc(d.body)+'</div>'
    +((d.files||[]).length?'<div class="att"><b>붙임</b>&nbsp; '+d.files.map(function(f,i){return (i+1)+'. '+esc(f.name)+' 1부'}).join(' &nbsp;')+'. &nbsp;끝.</div>':'<div class="att">끝.</div>')
    +'<div class="from"><span>'+esc(senderOf(d))+seal+'</span></div>'+(((d.toNames||[]).length+(d.extTo?1:0)>4||d.toLabel)&&((d.toNames||[]).length||d.extTo)?'<div style="font-size:10pt;margin-bottom:6mm"><b>수신처</b>&nbsp; '+esc((d.toNames||[]).concat(d.extTo?[d.extTo]:[]).join(', '))+'</div>':'')
    +'<div class="ft"><div class="ln"><span><b>기안</b> '+esc(d.authorTitle||'')+' '+esc(d.authorName||'')+'</span>'+l.map(function(x){return '<span><b>'+esc(x.type||'결재')+'</b> '+esc(x.title||'')+' '+esc(x.name||'')+(x.status==='승인'?' ('+esc(locd(x.at))+')':'')+'</span>'}).join('')+'</div>'
    +'<div class="ln"><span><b>시행</b> '+esc(d.docNo||'')+' ('+esc(locd(d.doneAt||d.updatedAt))+')</span><span><b>접수</b> ( . . . )</span></div>'
    +'<div class="ln"><span>'+esc(d.orgName)+'</span><span>https://대한민국플라잉디스크연맹.com</span></div></div></body></html>');w.document.close()}

window.INTRA={login:login,lock:lock,logout:logout,setOrg:setOrg,setMod:setMod,setFolder:setFolder,setV:setV,search:search,resetSearch:resetSearch,refresh:refresh,go:go,sel:sel,selAll:selAll,openSel:openSel,recvSel:recvSel,newMenu:newMenu,
  openDoc:openDoc,closeW:closeW,openFile:openFile,openStamped:openStamped,compose:compose,cpAddLine:cpAddLine,cpDelLine:cpDelLine,cpAddTo:cpAddTo,cpAddToAll:cpAddToAll,cpDelTo:cpDelTo,cpDelKeep:cpDelKeep,cpDelFile:cpDelFile,cpFiles:cpFiles,submit:submit,approve:approve,withdraw:withdraw,del:del,recv:recv,reply:reply,
  sealOpen:sealOpen,sealReject:sealReject,stLoad:stLoad,stLocal:stLocal,stPage:stPage,stSize:stSize,stMake:stMake,settings:settings,home:home,saveAppr:saveAppr,sendSel:sendSel,sendDoc:sendDoc,recvOpen:recvOpen,recvGo:recvGo,recvBack:recvBack,setCab:setCab,saveTemp:saveTemp,tempOpen:tempOpen,tempDel:tempDel,formUse:formUse,formDel:formDel,cpLoadLine:cpLoadLine,cpSaveLine:cpSaveLine,cpSaveForm:cpSaveForm,ciOpen:ciOpen,ciSet:ciSet,ciTab:ciTab,ciKind:ciKind,ciPick:ciPick,ciAddLine:ciAddLine,ciDelLine:ciDelLine,ciMove:ciMove,ciLoadLine:ciLoadLine,ciSaveLine:ciSaveLine,ciAddTo:ciAddTo,ciDelTo:ciDelTo,ciOk:ciOk,ciNext:ciNext,saveAbsent:saveAbsent,addCab:addCab,delCab:delCab,saveTitle:saveTitle,saveOrg:saveOrg,saveHide:saveHide,saveKeepers:saveKeepers,saveSeal:saveSeal,print:print,
  _sim:function(o){ME=o.me;MY=o.my;ORGS=myOrgsOf(MY);ORG=ORGS[0];MEMBERS=o.members||[];ORGDIR=o.orgs||{};DOCS=o.docs||{};TEMPS=o.temps||{};PREFS=o.prefs||{lines:[],forms:[]};$('gwLogin').style.display='none';$('gwApp').style.display='flex';renderAll()}};
// 확장 모듈(intranet2.js)이 쓰는 연결점 — reg(이름, {left, main, count, alarm, home, start})
window.INTRA_X={reg:function(k,o){EXT[k]=o},db:function(){return DB},me:function(){return ME},my:function(){return MY},org:function(){return ORG},orgs:function(){return ORGS},members:function(){return MEMBERS},dir:function(){return ORGDIR},V:V,
  esc:esc,nl:nl,ic:ic,loc:loc,locd:locd,now:now,$:$,win:win,closeW:closeW,say:say,orgName:orgName,myTitle:myTitle,mimeOf:mimeOf,pager:pager,isCentral:function(){return !!ORG&&ORG.key==='central'},
  render:function(){renderLeft();renderMain()},setMod:setMod,
  on:function(q,cb,er){UNSUB.push(q.onSnapshot(cb,er||function(){}))},notify:function(u,t){if(u&&u!==ME.uid)try{KFDF.notify(u,t,'intranet.html')}catch(e){}}};
KFDF.initApp();DB=firebase.firestore();AUTH=firebase.auth();
['mousemove','keydown','click','touchstart'].forEach(function(e){document.addEventListener(e,touch,{passive:true})});
document.addEventListener('click',function(){var m=$('gwNewMenu');if(m)m.style.display='none'});
var first=true;
AUTH.onAuthStateChanged(function(u){
  if(!first){if(!u&&$('gwApp').style.display!=='none')showLogin('로그아웃되었습니다.');return}first=false;
  // 새 창에서는 항상 아이디·비밀번호를 다시 입력합니다. 같은 창을 새로 고친 경우에만(30분 안) 이어서 씁니다.
  if(u&&gateOk(gateGet(),u.uid,Date.now())){gateSet(u.uid);enter(u)}else showLogin('')});
})();
