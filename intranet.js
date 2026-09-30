// intranet.js v20260930a · 연맹 인트라넷(그룹웨어) — 중앙 · 시도연맹 · 구군연맹 임원용 전자결재 · 문서함 · 직인 · 조직도
//   · 홈페이지와 별도 창에서 열리며, 들어올 때마다 아이디·비밀번호를 다시 입력해 인증합니다(창마다 · 30분 동안 쓰지 않으면 잠김).
//   · 기관(orgKey): central | sido_{시도} | gugun_{시도}_{구군} — 회원 등급(admin·owner / sidoOfficer+sido / gugunOfficer+sido+gugun)에서 정해집니다.
//   · 저장(보안 규칙 v46): intraDocs · intraMembers · intraOrgs · intraSeals(직인 관리자만) · intraCounters / 첨부: storage intranet/{문서ID}/ (스토리지 규칙 v9)
//   · 열람 범위: 기안자 · 결재선(readers) · 발신 기관과 수신 기관 임원(readOrgs). 수신 기관에는 결재가 끝난 뒤에 보입니다.
(function(){
'use strict';
var DB,AUTH;
var ME=null,MY=null,ORGS=[],ORG=null,MEMBERS=[],ORGDIR={},DOCS={},UNSUB=[],CP=null,STAMP=null,OPEN_ID='',LAST=Date.now(),TICK=null,HIDE=[];
var V={mod:'appr',folder:'a_wait',q:'',from:'',to:'',kind:'',page:1,size:15,sel:{}};
var IDLE_MS=30*60*1000;
var KIND={draft:'기안',coop:'협조',seal:'직인',notice:'공람'};
var MODS=[['appr','결재'],['docs','문서함'],['seal','직인'],['org','조직도'],['set','환경설정']];
var TREE={
  appr:[['결재',[['a_wait','결재대기'],['a_prog','결재진행'],['a_mine','기안함'],['a_done','결재완료'],['a_rej','반려·회수']]],['수신',[['r_wait','접수대기'],['r_done','접수완료']]],['공람',[['n_wait','공람대기'],['n_done','공람완료']]]],
  docs:[['문서함',[['s_out','발신함'],['r_all','수신함'],['reg','문서 대장'],['all','전체 문서']]]],
  seal:[['직인',[['k_wait','직인대기'],['k_reg','직인 대장']]]]
};
var FNAME={};Object.keys(TREE).forEach(function(m){TREE[m].forEach(function(g){g[1].forEach(function(f){FNAME[f[0]]=f[1]})})});
var IC={
  appr:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 14l2 2 4-4"/>',
  docs:'<path d="M3 6h7l2 2h9v11H3z"/>',
  seal:'<path d="M9 3h6v6l3 3v4H6v-4l3-3z"/><path d="M5 20h14"/>',
  org:'<rect x="9" y="3" width="6" height="5"/><rect x="3" y="16" width="6" height="5"/><rect x="15" y="16" width="6" height="5"/><path d="M12 8v4M6 16v-4h12v4"/>',
  set:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
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
function needRecv(d,orgKey){return d.status==='완료'&&(d.toOrgs||[]).indexOf(orgKey)>=0&&!((d.recv||{})[orgKey])}
function foldersOf(d,c){var f=['all'],uid=c.uid,ok=c.orgKey,mine=d.authorUid===uid,inLine=(d.line||[]).some(function(x){return x.uid===uid}),toMe=(d.toOrgs||[]).indexOf(ok)>=0,got=!!((d.recv||{})[ok]);
  if(isMyTurn(d,uid))f.push('a_wait');
  if(d.status==='진행'&&(mine||inLine)&&!isMyTurn(d,uid))f.push('a_prog');
  if(mine)f.push('a_mine');
  if(d.status==='완료'&&(mine||inLine))f.push('a_done');
  if(mine&&(d.status==='반려'||d.status==='회수'))f.push('a_rej');
  if(d.status==='완료'&&toMe){f.push('r_all');if(d.kind==='notice')f.push(got?'n_done':'n_wait');else f.push(got?'r_done':'r_wait')}
  if(d.status==='완료'&&d.org===ok&&(d.toOrgs||[]).length)f.push('s_out');
  if(sealPending(d)&&(isKeeper(d.seal.orgKey,uid,c.dir)||d.org===ok))f.push('k_wait');
  if(d.seal&&(d.seal.orgKey===ok||d.org===ok))f.push('k_reg');
  if(d.org===ok&&d.docNo)f.push('reg');
  return f}
function todoOf(d,c){return isMyTurn(d,c.uid)||needRecv(d,c.orgKey)||(sealPending(d)&&isKeeper(d.seal.orgKey,c.uid,c.dir))}
function defPrefix(o){if(!o)return '문서';if(o.key==='central')return '대플연';if(o.level===1)return o.sido+'플연';return (o.gugun||'')+'플연'}
function docNoOf(prefix,year,n){return prefix+' '+year+'-'+String(n).padStart(3,'0')}
function readersOf(uid,line){var r=[uid];(line||[]).forEach(function(x){if(x.uid&&r.indexOf(x.uid)<0)r.push(x.uid)});return r}
function readOrgsOf(d,done){var r=[d.org];if(d.seal&&d.seal.orgKey&&r.indexOf(d.seal.orgKey)<0)r.push(d.seal.orgKey);if(done)(d.toOrgs||[]).forEach(function(k){if(r.indexOf(k)<0)r.push(k)});return r}
function stateOf(d,c){
  if(d.status==='진행'){var i=curStep(d);return i>=0?((d.line[i].type||'결재')+'대기'):'진행'}
  if(d.status==='완료'&&sealPending(d))return '직인대기';
  if(d.status==='완료'&&needRecv(d,c.orgKey))return d.kind==='notice'?'공람대기':'접수대기';
  if(d.status==='완료'&&(d.toOrgs||[]).indexOf(c.orgKey)>=0){var r=(d.recv||{})[c.orgKey];return r?r.status:'완료'}
  if(d.status==='완료'&&d.kind==='coop'&&(d.toOrgs||[]).length){var rv=d.recv||{},n=Object.keys(rv).filter(function(k){return rv[k].status==='완료'}).length;return '회신 '+n+'/'+d.toOrgs.length}
  return d.status==='완료'?'시행완료':d.status}
// 중앙 조직도 제외 목록에 있는지 — 있으면 인트라넷에서는 중앙 소속이 아님
function hiddenIn(list,uid){return (list||[]).some(function(x){return x&&x.uid===uid})}
function gateOk(g,uid,t){return !!(g&&g.uid===uid&&(t-g.at)<12*3600*1000&&(t-(g.act||g.at))<IDLE_MS)}
window.KFDF_INTRA_CORE={hiddenIn:hiddenIn,myOrgsOf:myOrgsOf,curStep:curStep,isMyTurn:isMyTurn,foldersOf:foldersOf,todoOf:todoOf,needRecv:needRecv,sealPending:sealPending,isKeeper:isKeeper,defPrefix:defPrefix,docNoOf:docNoOf,readersOf:readersOf,readOrgsOf:readOrgsOf,stateOf:stateOf,gateOk:gateOk};
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
function showLogin(msg){
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
}
function setOrg(k){ORG=ORGS.find(function(o){return o.key===k})||ORG;try{localStorage.setItem('kfdfIntraOrg',ORG.key)}catch(e){}V.page=1;V.sel={};listen();renderAll()}
function setMod(m){V.mod=m;if(TREE[m])V.folder=TREE[m][0][1][0][0];V.page=1;V.sel={};renderAll()}
function setFolder(f){V.folder=f;var m=Object.keys(TREE).find(function(k){return TREE[k].some(function(g){return g[1].some(function(x){return x[0]===f})})});if(m)V.mod=m;V.page=1;V.sel={};renderAll()}
function all(){return Object.keys(DOCS).map(function(k){return DOCS[k]})}
function inFolder(f){var c=ctx();return all().filter(function(d){return foldersOf(d,c).indexOf(f)>=0})}
function count(f){return inFolder(f).length}
// ══ 화면 ══
function renderAll(){renderTop();renderLeft();renderMain();renderRight()}
function renderTop(){
  $('gwNav').innerHTML=MODS.map(function(m){return '<button class="'+(V.mod===m[0]?'on':'')+'" onclick="INTRA.setMod(\''+m[0]+'\')">'+ic(m[0],22)+'<span>'+m[1]+'</span></button>'}).join('');
  $('gwUser').innerHTML='<span class="av">'+ic('user',22)+'</span><span class="nm"><b>'+esc(ORG.name)+'</b><i>'+esc(MY.name||'')+(myTitle()?' ('+esc(myTitle())+')':'')+'</i></span>'
    +'<button title="잠금" onclick="INTRA.lock()">'+ic('lock',15)+'</button><button class="tx" onclick="INTRA.logout()">로그아웃</button>';
}
function renderLeft(){
  if(!ORG)return;var q=[['a_wait','결재대기'],['r_wait','접수대기'],['n_wait','공람대기'],['k_wait','직인대기']];
  var h='<div class="gw-new"><button class="main" onclick="INTRA.compose(\'draft\')">'+ic('pen',14)+' 기안하기</button><button class="dd" onclick="INTRA.newMenu(event)" title="문서 종류 선택">▾</button>'
    +'<div class="menu" id="gwNewMenu"><a onclick="INTRA.compose(\'draft\')">기안 · 결재</a><a onclick="INTRA.compose(\'coop\')">협조 요청</a><a onclick="INTRA.compose(\'seal\')">직인 날인 요청</a><a onclick="INTRA.compose(\'notice\')">공람 · 공지</a></div></div>'
    +'<div class="gw-quick">'+q.map(function(x){var n=count(x[0]);return '<button onclick="INTRA.setFolder(\''+x[0]+'\')"><span class="c'+(n?' on':'')+'">'+ic('file',18)+(n?'<em>'+(n>99?'99+':n)+'</em>':'')+'</span><i>'+x[1]+'</i></button>'}).join('')+'</div>'
    +'<div class="gw-tree">';
  Object.keys(TREE).forEach(function(m){TREE[m].forEach(function(g){h+='<div class="grp">'+ic('fold',14)+' '+g[0]+'</div>'+g[1].map(function(f){var n=count(f[0]);var hot=/_wait$/.test(f[0])&&n;return '<a class="'+(V.folder===f[0]&&TREE[V.mod]?'on':'')+'" onclick="INTRA.setFolder(\''+f[0]+'\')">'+ic('fold',13)+' '+f[1]+(n?' <b'+(hot?' class="hot"':'')+'>'+n+'</b>':'')+'</a>'}).join('')})});
  $('gwLeft').innerHTML=h+'</div>';
}
function newMenu(e){e.stopPropagation();var m=$('gwNewMenu');m.style.display=m.style.display==='block'?'none':'block'}
function filtered(){var q=V.q.trim().toLowerCase(),c=ctx();
  return inFolder(V.folder).filter(function(d){var t=String(d.createdAt||'').slice(0,10);
    return (!q||[d.title,d.docNo,d.authorName,d.orgName,(d.toNames||[]).join(' ')].join(' ').toLowerCase().indexOf(q)>=0)&&(!V.from||t>=V.from)&&(!V.to||t<=V.to)&&(!V.kind||d.kind===V.kind)})
    .sort(function(a,b){return String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''))})}
function renderMain(){
  if(!ORG)return;var m=$('gwMain');
  if(V.mod==='org'){m.innerHTML=orgHtml();return}
  if(V.mod==='set'){settings();return}
  var L=filtered(),pages=Math.max(1,Math.ceil(L.length/V.size));if(V.page>pages)V.page=pages;var P=L.slice((V.page-1)*V.size,V.page*V.size),c=ctx();
  var keep={q:document.activeElement&&document.activeElement.id==='gwQ'};
  m.innerHTML='<div class="gw-bar"><h2>'+esc(FNAME[V.folder]||'')+' <span>('+L.length+')</span></h2><span class="sp"></span>'
      +'<label>부서</label>'+(ORGS.length>1?'<select onchange="INTRA.setOrg(this.value)">'+ORGS.map(function(o){return '<option value="'+esc(o.key)+'"'+(o.key===ORG.key?' selected':'')+'>'+esc(o.name)+'</option>'}).join('')+'</select>':'<select disabled><option>'+esc(ORG.name)+'</option></select>')
      +'<label>구분</label><select onchange="INTRA.setV(\'kind\',this.value)"><option value="">전체</option>'+Object.keys(KIND).map(function(k){return '<option value="'+k+'"'+(V.kind===k?' selected':'')+'>'+KIND[k]+'</option>'}).join('')+'</select></div>'
    +'<div class="gw-search"><label>제목</label><input id="gwQ" value="'+esc(V.q)+'" onkeydown="if(event.key===\'Enter\')INTRA.setV(\'q\',this.value)"><label>기안일자</label><input type="date" id="gwFrom" value="'+esc(V.from)+'"><span>~</span><input type="date" id="gwTo" value="'+esc(V.to)+'">'
      +'<button class="gw-b" onclick="INTRA.search()">검색</button><button class="gw-b" onclick="INTRA.resetSearch()">초기화</button><span id="gwMsg" class="gw-say"></span></div>'
    +'<div class="gw-tool"><button class="gw-b" onclick="INTRA.openSel()">문서정보</button><button class="gw-b" onclick="INTRA.recvSel(\'접수\')">접수</button><button class="gw-b" onclick="INTRA.recvSel(\'확인\')">공람확인</button><button class="gw-b" onclick="INTRA.compose(\'draft\')">기안</button>'
      +'<span class="sp"></span><select onchange="INTRA.setV(\'size\',+this.value)">'+[15,30,50].map(function(n){return '<option'+(V.size===n?' selected':'')+'>'+n+'</option>'}).join('')+'</select><button class="gw-b" title="새로 고침" onclick="INTRA.refresh()">'+ic('ref',13)+'</button></div>'
    +'<div class="gw-tblw"><table class="gw-tbl"><colgroup><col style="width:34px"><col style="width:58px"><col><col style="width:132px"><col style="width:84px"><col style="width:150px"><col style="width:118px"><col style="width:118px"><col style="width:84px"></colgroup>'
      +'<thead><tr><th><input type="checkbox" onclick="INTRA.selAll(this.checked)"></th><th>구분</th><th>제목</th><th>문서번호</th><th>기안자</th><th>기안부서</th><th>기안일시</th><th>처리일시</th><th>처리현황</th></tr></thead><tbody>'
      +(P.length?P.map(function(d){var todo=todoOf(d,c);return '<tr class="'+(todo?'todo':'')+'"><td class="c"><input type="checkbox" '+(V.sel[d._id]?'checked ':'')+'onclick="INTRA.sel(\''+d._id+'\',this.checked)"></td><td class="c">'+esc(KIND[d.kind]||'')+'</td>'
          +'<td class="t"><a onclick="INTRA.openDoc(\''+d._id+'\')">'+esc(d.title||'(제목 없음)')+'</a>'+((d.files||[]).length?' <span class="clip" title="붙임 '+d.files.length+'개">'+ic('clip',12)+'</span>':'')+'</td>'
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
async function recvSel(st){var c=ctx(),s=selIds().filter(function(id){var d=DOCS[id];return needRecv(d,c.orgKey)&&((st==='확인')===(d.kind==='notice'))});
  if(!s.length){alert(st==='확인'?'공람 확인할 문서를 선택하세요.':'접수할 문서를 선택하세요.');return}
  if(!confirm(s.length+'건을 '+st+' 처리할까요?'))return;var n=0;for(var i=0;i<s.length;i++){try{await recvDo(s[i],st,'');n++}catch(e){}}V.sel={};say(n+'건 '+st+' 처리했습니다')}
function renderRight(){
  var adm=MY.owner===true||roleSet(MY).indexOf('admin')>=0,sd=roleSet(MY).indexOf('sidoOfficer')>=0;
  var links=[['홈페이지','index.html'],['마이페이지','mypage.html']].concat(adm||sd?[['관리자 페이지','admin.html']]:[]).concat(adm?[['권한 관리 센터','perm.html'],['학교별 운영일지','schoollogs.html']]:[]).concat([['선정학교 현황','selected.html'],['대회 · 공고 관리','competition.html?view=manage'],['심판 · 운영요원 모집','staff.html'],['자격 업무','license.html'],['연맹 일정','calendar.html']]);
  var mine=MEMBERS.filter(function(m){return m.orgKey===ORG.key}).sort(function(a,b){return String(a.name).localeCompare(String(b.name),'ko')});
  $('gwRight').innerHTML='<div class="box"><h3>바로가기</h3>'+links.map(function(l){return '<a href="'+l[1]+'" target="_blank" rel="noopener">'+esc(l[0])+'<span>▸</span></a>'}).join('')+'</div>'
    +'<div class="box"><h3>조직도</h3><div class="org">'+ic('fold',13)+' '+esc(ORG.name)+'</div>'+(mine.map(function(m){return '<div class="mem"><span class="av">'+ic('user',20)+'</span><span>성명 : '+esc(m.name)+'<br>직위 : '+esc(m.title||'-')+'</span></div>'}).join('')||'<div class="mem">등록된 임원이 없습니다.</div>')+'</div>';
}
function orgHtml(){var ks=Object.keys(ORGDIR).sort(function(a,b){return (ORGDIR[a].level-ORGDIR[b].level)||String(ORGDIR[a].name).localeCompare(String(ORGDIR[b].name),'ko')});
  return '<div class="gw-bar"><h2>조직도 <span>('+MEMBERS.length+'명 · '+ks.length+'개 기관)</span></h2></div><div class="gw-note">임원이 인트라넷에 처음 로그인하면 명부에 올라옵니다. 직위는 환경설정에서 본인이 입력합니다.</div>'
    +'<div class="gw-tblw"><table class="gw-tbl"><colgroup><col style="width:70px"><col style="width:240px"><col style="width:110px"><col style="width:140px"><col></colgroup><thead><tr><th>구분</th><th>기관</th><th>성명</th><th>직위</th><th>비고</th></tr></thead><tbody>'
    +ks.map(function(k){var o=ORGDIR[k],ms=MEMBERS.filter(function(m){return m.orgKey===k});
      return (ms.length?ms:[null]).map(function(m,i){return '<tr>'+(i?'':'<td class="c" rowspan="'+Math.max(1,ms.length)+'">'+['중앙','시도','구군'][o.level]+'</td><td rowspan="'+Math.max(1,ms.length)+'">'+esc(o.name)+'</td>')+'<td class="c">'+(m?esc(m.name):'-')+'</td><td class="c">'+(m?esc(m.title||''):'')+'</td><td>'+(m&&(o.sealKeepers||[]).indexOf(m.uid)>=0?'직인 관리자':'')+'</td></tr>'}).join('')}).join('')+'</tbody></table></div>'}
// ══ 창(문서 보기 · 작성) ══
function win(id,title,body,w){var o=$(id);if(o)o.remove();o=document.createElement('div');o.id=id;o.className='gw-win';o.innerHTML='<div class="gw-wbox" style="max-width:'+(w||900)+'px"><div class="gw-wtit"><b>'+esc(title)+'</b><button onclick="INTRA.closeW(\''+id+'\')">✕</button></div><div class="gw-wbody">'+body+'</div></div>';document.body.appendChild(o);return o}
function closeW(id){var o=$(id);if(o)o.remove();if(id==='gwDoc')OPEN_ID=''}
function apprBox(d){var l=d.line||[];var cols=[{t:'기안',n:d.authorName,p:d.authorTitle,s:'',d:locd(d.createdAt),cur:false,rej:false}].concat(l.map(function(x,i){return {t:x.type||'결재',n:x.name,p:x.title,s:x.status==='승인'?x.sign:'',d:x.status==='승인'?locd(x.at):(x.status==='반려'?'반려':''),cur:d.status==='진행'&&curStep(d)===i,rej:x.status==='반려',ok:x.status==='승인'}}));
  return '<table class="gw-appr"><tr>'+cols.map(function(c){return '<th>'+esc(c.t)+'</th>'}).join('')+'</tr><tr>'+cols.map(function(c){return '<td class="sg'+(c.cur?' cur':'')+(c.rej?' rej':'')+'">'+(c.s?'<img src="'+esc(c.s)+'" alt="">':(c.ok?'<em>승인</em>':c.rej?'<em>반려</em>':c.cur?'<em>대기</em>':''))+'</td>'}).join('')+'</tr><tr>'+cols.map(function(c){return '<td>'+esc(c.n||'')+(c.p?'<br><small>'+esc(c.p)+'</small>':'')+'</td>'}).join('')+'</tr><tr>'+cols.map(function(c){return '<td class="dt">'+esc(c.d||'')+'</td>'}).join('')+'</tr></table>'}
function openDoc(id,keep){
  var d=DOCS[id];if(!d)return;OPEN_ID=id;var c=ctx(),mine=d.authorUid===ME.uid,turn=isMyTurn(d,ME.uid);
  var acted=(d.line||[]).some(function(x){return x.status==='승인'||x.status==='반려'}),a=[];
  if(turn)a.push('<button class="gw-b pri" onclick="INTRA.approve(\''+id+'\',true)">'+esc(d.line[curStep(d)].type||'결재')+'</button><button class="gw-b" onclick="INTRA.approve(\''+id+'\',false)">반려</button>');
  if(mine&&d.status==='진행'&&!acted)a.push('<button class="gw-b" onclick="INTRA.withdraw(\''+id+'\')">회수</button>');
  if(mine&&(d.status==='반려'||d.status==='회수'))a.push('<button class="gw-b pri" onclick="INTRA.compose(\''+d.kind+'\',\''+id+'\')">재기안</button><button class="gw-b" onclick="INTRA.del(\''+id+'\')">삭제</button>');
  if(needRecv(d,c.orgKey))a.push(d.kind==='notice'?'<button class="gw-b pri" onclick="INTRA.recv(\''+id+'\',\'확인\')">공람확인</button>':'<button class="gw-b pri" onclick="INTRA.recv(\''+id+'\',\'접수\')">접수</button>');
  var myRecv=(d.recv||{})[c.orgKey];
  if(d.kind==='coop'&&myRecv&&myRecv.status!=='완료'&&myRecv.status!=='불가')a.push('<button class="gw-b" onclick="INTRA.recv(\''+id+'\',\'처리중\')">처리중</button><button class="gw-b pri" onclick="INTRA.recv(\''+id+'\',\'완료\')">처리완료 회신</button><button class="gw-b" onclick="INTRA.recv(\''+id+'\',\'불가\')">협조불가</button>');
  if(sealPending(d)&&isKeeper(d.seal.orgKey,ME.uid,ORGDIR))a.push('<button class="gw-b pri" onclick="INTRA.sealOpen(\''+id+'\')">직인 날인</button><button class="gw-b" onclick="INTRA.sealReject(\''+id+'\')">직인 반려</button>');
  if(d.status==='완료'&&d.kind!=='seal')a.push('<button class="gw-b" onclick="INTRA.print(\''+id+'\')">시행문 인쇄</button>');
  a.push('<button class="gw-b" onclick="INTRA.closeW(\'gwDoc\')">닫기</button>');
  var cm=(d.line||[]).filter(function(x){return x.comment}).map(function(x){return '<tr><th>'+esc(x.name)+'<br><small>'+esc(x.type||'')+(x.status==='반려'?' 반려':'')+'</small></th><td>'+nl(x.comment)+'</td></tr>'}).join('');
  var files=(d.files||[]).map(function(x,i){return '<a class="gw-file" onclick="INTRA.openFile(\''+id+'\','+i+')">'+ic('clip',12)+' '+esc(x.name)+' <small>('+Math.max(1,Math.round((x.size||0)/1024))+'KB)</small></a>'}).join('');
  var seal=d.seal?('<tr><th>직인</th><td>'+esc(d.seal.orgName||orgName(d.seal.orgKey))+' · '+(d.seal.mode==='file'?'붙임 문서 날인':'시행문 날인')+' · '+esc(d.seal.purpose||'-')+' · <b>'+esc(d.seal.status)+'</b>'+(d.seal.byName?' ('+esc(d.seal.byName)+' '+esc(loc(d.seal.at))+')':'')+(d.seal.note?'<br>'+nl(d.seal.note):'')+(d.seal.stamped?'<br><a class="gw-file" onclick="INTRA.openStamped(\''+id+'\')">'+ic('clip',12)+' 날인본 '+esc(d.seal.stamped.name)+'</a>':'')+'</td></tr>'):'';
  var recv=(d.toOrgs||[]).length?('<h4>수신 현황</h4><table class="gw-tbl sm"><thead><tr><th>수신 기관</th><th>처리현황</th><th>처리자</th><th>처리일시</th><th>회신 내용</th></tr></thead><tbody>'+d.toOrgs.map(function(o,i){var r=(d.recv||{})[o];return '<tr><td>'+esc((d.toNames||[])[i]||orgName(o))+'</td><td class="c">'+(r?esc(r.status):(d.status==='완료'?'미접수':'결재 후 발송'))+'</td><td class="c">'+esc(r?r.byName:'')+'</td><td class="c">'+esc(r?loc(r.at):'')+'</td><td>'+(r&&r.note?nl(r.note):'')+'</td></tr>'}).join('')+'</tbody></table>'):'';
  var rep='<h4>의견 ('+((d.replies||[]).length)+')</h4>'+((d.replies||[]).length?'<table class="gw-tbl sm"><tbody>'+d.replies.map(function(r){return '<tr><td style="width:170px">'+esc(r.name)+'<br><small>'+esc(r.orgName||'')+'</small></td><td>'+nl(r.text)+'</td><td class="c" style="width:120px">'+esc(loc(r.at))+'</td></tr>'}).join('')+'</tbody></table>':'')
    +'<div class="gw-rep"><input id="gwRep" maxlength="500" placeholder="의견을 입력하세요" onkeydown="if(event.key===\'Enter\')INTRA.reply(\''+id+'\')"><button class="gw-b" onclick="INTRA.reply(\''+id+'\')">등록</button></div>';
  var h='<div class="gw-wtool">'+a.join('')+'<span id="gwDocMsg" class="gw-say"></span></div>'
    +'<div class="gw-dochd"><div class="ttl"><small>'+esc(KIND[d.kind]||'')+'문서</small><h3>'+esc(d.title||'')+'</h3></div>'+apprBox(d)+'</div>'
    +'<table class="gw-form"><tr><th>문서번호</th><td>'+esc(d.docNo||'(결재 완료 시 부여)')+'</td><th>처리현황</th><td>'+esc(stateOf(d,c))+'</td></tr>'
    +'<tr><th>기안부서</th><td>'+esc(d.orgName||'')+'</td><th>기안자</th><td>'+esc(d.authorName||'')+' '+esc(d.authorTitle||'')+'</td></tr>'
    +'<tr><th>기안일시</th><td>'+esc(loc(d.createdAt))+'</td><th>시행일시</th><td>'+esc(loc(d.doneAt))+'</td></tr>'
    +'<tr><th>수신</th><td colspan="3">'+esc((d.toNames||[]).join(', ')||'내부결재')+'</td></tr>'
    +'<tr><th>제목</th><td colspan="3"><b>'+esc(d.title||'')+'</b></td></tr>'
    +'<tr><th>내용</th><td colspan="3" class="body">'+nl(d.body||'')+'</td></tr>'
    +(files?'<tr><th>붙임</th><td colspan="3">'+files+'</td></tr>':'')+seal+'</table>'
    +(cm?'<h4>결재 의견</h4><table class="gw-form">'+cm+'</table>':'')+recv+rep
    +'<details class="gw-log"><summary>처리 기록 '+((d.log||[]).length)+'건</summary>'+((d.log||[]).map(function(x){return '<div>'+esc(loc(x.at))+' · '+esc(x.name)+' ('+esc(x.org||'')+') · '+esc(x.act)+'</div>'}).join(''))+'</details>';
  var kv=keep&&$('gwRep')?$('gwRep').value:'';win('gwDoc','문서정보',h,960);if(kv)$('gwRep').value=kv;
}
async function openFile(id,i){var f=((DOCS[id]||{}).files||[])[i];if(!f)return;var w=window.open('','_blank');try{var u=await firebase.storage().ref(f.path).getDownloadURL();if(w)w.location.href=u;else location.href=u}catch(e){if(w)w.close();alert('파일을 열 수 없습니다: '+(e.code||e.message)+'\n(스토리지 규칙 v9 게시 여부 확인)')}}
async function openStamped(id){var s=((DOCS[id]||{}).seal||{}).stamped;if(!s)return;var w=window.open('','_blank');try{var u=await firebase.storage().ref(s.path).getDownloadURL();if(w)w.location.href=u;else location.href=u}catch(e){if(w)w.close();alert('파일을 열 수 없습니다: '+(e.code||e.message))}}
// ── 문서 작성 ──
function compose(kind,fromId){
  var src=fromId?DOCS[fromId]:null;closeW('gwDoc');var nm=$('gwNewMenu');if(nm)nm.style.display='none';
  CP={kind:kind,line:src?(src.line||[]).map(function(x){return {uid:x.uid,name:x.name,orgName:x.orgName,title:x.title,type:x.type}}):[],to:src?(src.toOrgs||[]).slice():[],files:[],keep:src?(src.files||[]).slice():[],from:fromId||''};
  var sealOpts=Object.keys(ORGDIR).filter(function(o){return o===ORG.key||o==='central'||(ORG.level===2&&o==='sido_'+ORG.sido)}).map(function(o){return '<option value="'+esc(o)+'"'+(src&&src.seal&&src.seal.orgKey===o?' selected':(o===ORG.key?' selected':''))+'>'+esc(orgName(o))+'</option>'}).join('');
  var sealOn=kind==='seal'||!!(src&&src.seal);
  var h='<div class="gw-wtool"><button class="gw-b pri" id="cpGo" onclick="INTRA.submit()">결재상신</button><button class="gw-b" onclick="INTRA.closeW(\'gwCp\')">취소</button><span id="cpMsg" class="gw-say"></span></div>'
    +'<table class="gw-form"><tr><th>문서 구분</th><td>'+esc({draft:'기안 · 결재',coop:'협조 요청',seal:'직인 날인 요청',notice:'공람 · 공지'}[kind])+'</td><th>기안일</th><td>'+esc(locd(now()))+'</td></tr>'
    +'<tr><th>기안부서</th><td>'+esc(ORG.name)+'</td><th>기안자</th><td>'+esc(MY.name||'')+' '+esc(myTitle())+'</td></tr>'
    +'<tr><th>결재선</th><td colspan="3"><div id="cpLine" class="gw-chips"></div><div class="gw-row"><select id="cpLineType" style="width:80px"><option>검토</option><option>협조</option><option selected>결재</option></select><select id="cpLineWho" style="flex:1"></select><button class="gw-b" onclick="INTRA.cpAddLine()">추가</button></div><small>위에서부터 차례로 결재합니다. 비워 두면 결재 없이 바로 시행됩니다.</small></td></tr>'
    +(kind==='seal'?'':'<tr><th>수신'+(kind==='coop'||kind==='notice'?' <em>*</em>':'')+'</th><td colspan="3"><div id="cpTo" class="gw-chips"></div><div class="gw-row"><select id="cpToWho" style="flex:1"></select><button class="gw-b" onclick="INTRA.cpAddTo()">추가</button><button class="gw-b" onclick="INTRA.cpAddToAll(1)">시도연맹 전체</button><button class="gw-b" onclick="INTRA.cpAddToAll(2)">구군연맹 전체</button></div><small>내부 결재만 할 때는 비워 둡니다.</small></td></tr>')
    +'<tr><th>제목 <em>*</em></th><td colspan="3"><input id="cpTitle" maxlength="120" value="'+esc(src?src.title:'')+'"></td></tr>'
    +'<tr><th>내용 <em>*</em></th><td colspan="3"><textarea id="cpBody" rows="12" maxlength="6000" placeholder="1. 관련: &#10;2. 위 호와 관련하여 아래와 같이 …&#10;&#10;  가. &#10;  나. ">'+esc(src?src.body:'')+'</textarea></td></tr>'
    +'<tr><th>붙임</th><td colspan="3"><input type="file" id="cpFiles" multiple onchange="INTRA.cpFiles(this)"><div id="cpFileList" class="gw-chips"></div><small>PDF · 이미지 · 한글 · 워드 · 엑셀, 파일당 20MB, 10개까지</small></td></tr>'
    +'<tr><th>직인 날인</th><td colspan="3"><label class="ck"><input type="checkbox" id="cpSeal"'+(sealOn?' checked':'')+(kind==='seal'?' disabled':'')+' onchange="document.getElementById(\'cpSealBox\').style.display=this.checked?\'block\':\'none\'"> 직인 날인을 요청합니다</label>'
      +'<div id="cpSealBox" style="display:'+(sealOn?'block':'none')+'"><div class="gw-row"><label>직인</label><select id="cpSealOrg" style="width:240px">'+sealOpts+'</select><label>방식</label><select id="cpSealMode" style="width:220px"><option value="doc"'+(kind!=='seal'?' selected':'')+'>시행문에 날인</option><option value="file"'+(kind==='seal'?' selected':'')+'>붙임 문서에 날인 (PDF·이미지)</option></select></div>'
      +'<div class="gw-row"><label>용도</label><input id="cpSealPurpose" maxlength="120" value="'+esc(src&&src.seal?src.seal.purpose:'')+'" placeholder="제출처 · 부수" style="flex:1"></div><small>결재가 끝난 뒤 직인 관리자가 승인해야 날인되며, 직인 대장에 기록됩니다.</small></div></td></tr></table>';
  win('gwCp','기안하기',h,900);cpDraw();
}
function cpDraw(){
  var who=$('cpLineWho');if(who){var ms=MEMBERS.filter(function(m){return m.uid!==ME.uid&&!CP.line.some(function(x){return x.uid===m.uid})}).sort(function(a,b){return (a.orgKey===ORG.key?0:1)-(b.orgKey===ORG.key?0:1)||(a.level-b.level)||String(a.orgName).localeCompare(String(b.orgName),'ko')||String(a.name).localeCompare(String(b.name),'ko')});
    who.innerHTML=ms.length?ms.map(function(m){return '<option value="'+esc(m._id)+'">'+esc(m.orgName)+' / '+esc(m.name)+(m.title?' '+esc(m.title):'')+'</option>'}).join(''):'<option value="">등록된 다른 임원이 없습니다</option>'}
  var l=$('cpLine');if(l)l.innerHTML=CP.line.map(function(x,i){return '<span>'+(i+1)+'. ['+esc(x.type)+'] '+esc(x.name)+' <small>'+esc(x.orgName)+'</small> <a onclick="INTRA.cpDelLine('+i+')">✕</a></span>'}).join('');
  var tw=$('cpToWho');if(tw){var os=Object.keys(ORGDIR).filter(function(k){return k!==ORG.key&&CP.to.indexOf(k)<0}).sort(function(a,b){return (ORGDIR[a].level-ORGDIR[b].level)||String(ORGDIR[a].name).localeCompare(String(ORGDIR[b].name),'ko')});
    tw.innerHTML=os.length?os.map(function(k){return '<option value="'+esc(k)+'">'+esc(ORGDIR[k].name)+'</option>'}).join(''):'<option value="">선택할 기관이 없습니다</option>'}
  var t=$('cpTo');if(t)t.innerHTML=CP.to.map(function(k,i){return '<span>'+esc(orgName(k))+' <a onclick="INTRA.cpDelTo('+i+')">✕</a></span>'}).join('');
  var f=$('cpFileList');if(f)f.innerHTML=CP.keep.map(function(x,i){return '<span>'+esc(x.name)+' <a onclick="INTRA.cpDelKeep('+i+')">✕</a></span>'}).concat(CP.files.map(function(x,i){return '<span>'+esc(x.name)+' <small>'+Math.round(x.size/1024)+'KB</small> <a onclick="INTRA.cpDelFile('+i+')">✕</a></span>'})).join('');
}
function cpAddLine(){var v=$('cpLineWho').value;var m=MEMBERS.find(function(x){return x._id===v});if(!m)return;CP.line.push({uid:m.uid,name:m.name,orgName:m.orgName,title:m.title||'',type:$('cpLineType').value});cpDraw()}
function cpDelLine(i){CP.line.splice(i,1);cpDraw()}
function cpAddTo(){var v=$('cpToWho').value;if(v&&CP.to.indexOf(v)<0)CP.to.push(v);cpDraw()}
function cpAddToAll(lv){Object.keys(ORGDIR).forEach(function(k){if(ORGDIR[k].level===lv&&k!==ORG.key&&CP.to.indexOf(k)<0&&(ORG.level!==1||lv!==2||ORGDIR[k].sido===ORG.sido))CP.to.push(k)});cpDraw()}
function cpDelTo(i){CP.to.splice(i,1);cpDraw()}
function cpDelKeep(i){CP.keep.splice(i,1);cpDraw()}
function cpDelFile(i){CP.files.splice(i,1);cpDraw()}
function cpFiles(inp){var ok=/\.(pdf|png|jpe?g|gif|webp|hwp|hwpx|docx?|xlsx?|pptx?|txt|zip)$/i;[].slice.call(inp.files||[]).forEach(function(f){if(!ok.test(f.name)){alert(f.name+' — 올릴 수 없는 형식입니다.');return}if(f.size>20*1024*1024){alert(f.name+' — 20MB 이하만 올릴 수 있습니다.');return}if(CP.files.length+CP.keep.length>=10){alert('붙임은 10개까지입니다.');return}CP.files.push(f)});inp.value='';cpDraw()}
function mimeOf(f){if(f.type)return f.type;var e=(f.name.split('.').pop()||'').toLowerCase();return {hwp:'application/x-hwp',hwpx:'application/vnd.hancom.hwpx',pdf:'application/pdf',zip:'application/zip',txt:'text/plain'}[e]||'application/octet-stream'}
async function nextNo(tx,orgKey){var y=new Date().getFullYear();var ref=DB.collection('intraCounters').doc(orgKey+'__'+y);var g=await tx.get(ref);var n=((g.exists&&g.data().n)||0)+1;tx.set(ref,{org:orgKey,year:y,n:n,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});return docNoOf((ORGDIR[orgKey]&&ORGDIR[orgKey].docPrefix)||'문서',y,n)}
async function submit(){
  var m=$('cpMsg'),bad=function(t){m.textContent=t;m.className='gw-say bad'};var kind=CP.kind;
  var title=$('cpTitle').value.trim(),body=$('cpBody').value.trim();
  if(title.length<2)return bad('제목을 입력하세요');if(body.length<2)return bad('내용을 입력하세요');
  if((kind==='coop'||kind==='notice')&&!CP.to.length)return bad('수신 기관을 선택하세요');
  var wantSeal=$('cpSeal').checked,seal=null;
  if(wantSeal){var so=$('cpSealOrg').value,mode=$('cpSealMode').value;if(!so)return bad('직인을 선택하세요');
    if(mode==='file'&&!(CP.files.concat(CP.keep)).some(function(f){return /\.(pdf|png|jpe?g)$/i.test(f.name)}))return bad('붙임 문서에 날인하려면 PDF 또는 이미지 파일을 붙이세요');
    if(!((ORGDIR[so]||{}).sealKeepers||[]).length&&!confirm(orgName(so)+'에 직인 관리자가 지정되어 있지 않습니다.\n지정되기 전에는 직인대기 상태로 남습니다. 그래도 상신할까요?'))return;
    seal={orgKey:so,orgName:orgName(so),mode:mode,purpose:$('cpSealPurpose').value.trim(),status:'요청'}}
  var b=$('cpGo');b.disabled=true;m.className='gw-say';
  try{
    var ref=DB.collection('intraDocs').doc();var files=CP.keep.slice();
    for(var i=0;i<CP.files.length;i++){var f=CP.files[i];m.textContent='파일 올리는 중 ('+(i+1)+'/'+CP.files.length+')';
      var path='intranet/'+ref.id+'/'+Date.now()+'_'+i+'.'+(f.name.split('.').pop()||'bin').toLowerCase();
      await firebase.storage().ref(path).put(f,{contentType:mimeOf(f),customMetadata:{name:encodeURIComponent(f.name)}});files.push({name:f.name,path:path,size:f.size,by:ME.uid})}
    m.textContent='상신하는 중';
    var done=!CP.line.length,t=now();
    var d={kind:kind,title:title,body:body,org:ORG.key,orgName:ORG.name,authorUid:ME.uid,authorName:MY.name||'',authorTitle:myTitle(),
      line:CP.line.map(function(x){return {uid:x.uid,name:x.name,orgName:x.orgName,title:x.title||'',type:x.type,status:'대기',at:'',comment:'',sign:''}}),
      toOrgs:CP.to.slice(),toNames:CP.to.map(orgName),status:done?'완료':'진행',docNo:'',files:files,recv:{},replies:[],seal:seal,log:[logOf(done?'기안 · 결재선 없이 시행':'기안')],createdAt:t,updatedAt:t,doneAt:done?t:''};
    d.readers=readersOf(ME.uid,d.line);d.readOrgs=readOrgsOf(d,done);
    await DB.runTransaction(async function(tx){if(done)d.docNo=await nextNo(tx,ORG.key);tx.set(ref,d)});
    if(CP.from){try{await DB.collection('intraDocs').doc(CP.from).update({log:firebase.firestore.FieldValue.arrayUnion(logOf('재기안 → 새 문서')),updatedAt:now()})}catch(e){}}
    if(done)afterDone(Object.assign({_id:ref.id},d));else try{KFDF.notify(d.line[0].uid,'['+ORG.name+'] '+(d.line[0].type)+' 요청 — '+title,'intranet.html')}catch(e){}
    closeW('gwCp');setFolder('a_mine');say('상신했습니다'+(d.docNo?' — '+d.docNo:''));
  }catch(e){b.disabled=false;bad('상신 실패: '+(e.code||e.message||e))}
}
function afterDone(d){(d.toOrgs||[]).forEach(function(k){notifyOrg(k,'['+d.orgName+'] '+(KIND[d.kind]||'')+'문서 도착 — '+d.title)});
  if(d.seal&&d.seal.status==='요청')((ORGDIR[d.seal.orgKey]||{}).sealKeepers||[]).forEach(function(u){if(u!==ME.uid)try{KFDF.notify(u,'직인 날인 요청 — '+d.title+' ('+d.orgName+')','intranet.html')}catch(e){}})}
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
      else if(i===line.length-1){upd.status='완료';upd.doneAt=now();upd.docNo=await nextNo(tx,d.org);upd.readOrgs=readOrgsOf(d,true)}
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
async function recvDo(id,st,note){var d=DOCS[id];var u={updatedAt:now(),log:firebase.firestore.FieldValue.arrayUnion(logOf('수신 '+st))};u['recv.'+ORG.key]={status:st,by:ME.uid,byName:MY.name||'',orgName:ORG.name,at:now(),note:String(note||'').trim().slice(0,800)};
  await DB.collection('intraDocs').doc(id).update(u);if(d&&d.kind==='coop')try{KFDF.notify(d.authorUid,'['+ORG.name+'] 협조 요청 '+st+' — '+d.title,'intranet.html')}catch(e){}}
async function recv(id,st){var note='';
  if(st==='완료'||st==='불가'){note=prompt(st==='완료'?'처리 결과를 입력하세요 (발신 기관에 회신됩니다)':'협조가 어려운 사유를 입력하세요','');if(note===null)return;if(note.trim().length<2){alert('내용을 입력하세요.');return}}
  try{await recvDo(id,st,note);say(st+' 처리했습니다')}catch(e){alert('처리 실패: '+(e.code||e.message))}}
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
    +'<tr><th>기관 이름</th><td><div class="gw-row"><input id="setName" maxlength="40" value="'+esc(o.name||ORG.name)+'" style="width:320px"></div></td></tr>'
    +'<tr><th>문서번호 머리글</th><td><div class="gw-row"><input id="setPrefix" maxlength="12" value="'+esc(o.docPrefix||defPrefix(ORG))+'" style="width:160px"><button class="gw-b" onclick="INTRA.saveOrg()">기관 정보 저장</button></div><small>문서번호 예: '+esc(docNoOf(o.docPrefix||defPrefix(ORG),new Date().getFullYear(),12))+'</small></td></tr>'
    +'<tr><th>직인 관리자</th><td><div class="gw-chips">'+mine.map(function(m){return '<label class="ck"><input type="checkbox" class="setKeep" value="'+esc(m.uid)+'"'+((o.sealKeepers||[]).indexOf(m.uid)>=0?' checked':'')+'> '+esc(m.name)+' '+esc(m.title||'')+'</label>'}).join(' &nbsp; ')+'</div><button class="gw-b" onclick="INTRA.saveKeepers()">직인 관리자 저장</button><br><small>직인 관리자는 직인 이미지를 관리하고 직인 날인을 승인합니다.</small></td></tr>'
    +'<tr><th>직인 이미지</th><td>'+(keeper?has+'<div class="gw-row" style="margin-top:6px"><label class="gw-b" style="cursor:pointer">직인 이미지 등록 · 변경<input type="file" accept="image/png,image/jpeg" style="display:none" onchange="INTRA.saveSeal(this)"></label></div><small>직인 이미지는 직인 관리자만 볼 수 있고, 날인을 승인한 문서에만 들어갑니다.</small>':'직인 관리자만 보고 바꿀 수 있습니다.')+'</td></tr>'
    +(ORG.key==='central'?'<tr><th>중앙 조직도<br>제외</th><td><div class="gw-chips">'+mine.filter(function(m){return m.uid!==ME.uid}).map(function(m){return '<label class="ck"><input type="checkbox" class="setHide" value="'+esc(m.uid)+'" data-name="'+esc(m.name)+'"> '+esc(m.name)+' '+esc(m.title||'')+'</label>'}).join(' &nbsp; ')+'</div>'
      +(HIDE.length?'<div style="margin-top:4px">제외 중: '+HIDE.map(function(h){return '<label class="ck"><input type="checkbox" class="setUnhide" value="'+esc(h.uid)+'"> '+esc(h.name||'')+'</label>'}).join(' &nbsp; ')+' <small>(체크하면 다시 중앙에 표시)</small></div>':'')
      +'<button class="gw-b" onclick="INTRA.saveHide()">저장</button><br><small>홈페이지 관리 권한은 그대로 두고, 인트라넷에서만 중앙 소속으로 보이지 않게 합니다. 제외된 사람은 시도·구군 소속으로만 인트라넷을 씁니다.</small></td></tr>':'')
    +'<tr><th>보안</th><td>이 창에서 30분 동안 사용하지 않으면 자동으로 잠깁니다. <button class="gw-b" onclick="INTRA.lock()">지금 잠금</button></td></tr></table>';
}
async function saveTitle(){try{await DB.collection('intraMembers').doc(ME.uid+'__'+ORG.key).update({title:$('setTitle').value.trim().slice(0,20),updatedAt:firebase.firestore.FieldValue.serverTimestamp(),uid:ME.uid,orgKey:ORG.key});await loadDir();renderAll();say('직위를 저장했습니다')}catch(e){say('저장 실패: '+(e.code||e.message),true)}}
async function saveOrg(){var n=$('setName').value.trim(),p=$('setPrefix').value.trim();if(n.length<2||!p){say('기관 이름과 머리글을 입력하세요',true);return}
  try{await DB.collection('intraOrgs').doc(ORG.key).update({name:n,docPrefix:p,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:ME.uid});await loadDir();renderAll();say('저장했습니다')}catch(e){say('저장 실패: '+(e.code||e.message),true)}}
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
    +'.hd{text-align:center;font-size:21pt;font-weight:800;letter-spacing:2px;padding-bottom:6mm;border-bottom:2.2px solid #111}.kv{margin:7mm 0 0}.kv div{display:flex;gap:4mm}.kv b{flex:none;width:18mm}'
    +'h1{font-size:12.5pt;margin:3mm 0 0;display:flex;gap:4mm}h1 b{flex:none;width:18mm}.rule{border-top:1px solid #111;margin:4mm 0 6mm}.body{min-height:95mm;white-space:pre-wrap}'
    +'.att{margin-top:6mm}.from{text-align:center;font-size:19pt;font-weight:800;letter-spacing:3px;margin:16mm 0 10mm}.from span{position:relative;display:inline-block}.seal{position:absolute;right:-22mm;top:50%;transform:translateY(-50%);width:30mm;height:30mm;object-fit:contain;mix-blend-mode:multiply;opacity:.93}'
    +'.ft{border-top:2.2px solid #111;padding-top:3mm;font-size:9.5pt;line-height:1.7}.ft .ln{display:flex;flex-wrap:wrap;gap:1mm 7mm}.np{text-align:center;margin:0 0 10px}@media print{.np{display:none}}'
    +'</style></head><body><div class="np"><button onclick="window.print()" style="padding:6px 18px;font-size:13px">인쇄 · PDF로 저장</button></div>'
    +'<div class="hd">'+esc(d.orgName)+'</div><div class="kv"><div><b>수신</b><span>'+esc((d.toNames||[]).length?((d.toNames.length>4)?'수신처 참조':d.toNames.join(', ')):'내부결재')+'</span></div><div><b>(경유)</b><span></span></div></div>'
    +'<h1><b>제목</b><span>'+esc(d.title)+'</span></h1><div class="rule"></div><div class="body">'+esc(d.body)+'</div>'
    +((d.files||[]).length?'<div class="att"><b>붙임</b>&nbsp; '+d.files.map(function(f,i){return (i+1)+'. '+esc(f.name)+' 1부'}).join(' &nbsp;')+'. &nbsp;끝.</div>':'<div class="att">끝.</div>')
    +'<div class="from"><span>'+esc(d.orgName)+'회장'+seal+'</span></div>'+((d.toNames||[]).length>4?'<div style="font-size:10pt;margin-bottom:6mm"><b>수신처</b>&nbsp; '+esc(d.toNames.join(', '))+'</div>':'')
    +'<div class="ft"><div class="ln"><span><b>기안</b> '+esc(d.authorTitle||'')+' '+esc(d.authorName||'')+'</span>'+l.map(function(x){return '<span><b>'+esc(x.type||'결재')+'</b> '+esc(x.title||'')+' '+esc(x.name||'')+(x.status==='승인'?' ('+esc(locd(x.at))+')':'')+'</span>'}).join('')+'</div>'
    +'<div class="ln"><span><b>시행</b> '+esc(d.docNo||'')+' ('+esc(locd(d.doneAt||d.updatedAt))+')</span><span><b>접수</b> ( . . . )</span></div>'
    +'<div class="ln"><span>'+esc(d.orgName)+'</span><span>https://대한민국플라잉디스크연맹.com</span></div></div></body></html>');w.document.close()}

window.INTRA={login:login,lock:lock,logout:logout,setOrg:setOrg,setMod:setMod,setFolder:setFolder,setV:setV,search:search,resetSearch:resetSearch,refresh:refresh,go:go,sel:sel,selAll:selAll,openSel:openSel,recvSel:recvSel,newMenu:newMenu,
  openDoc:openDoc,closeW:closeW,openFile:openFile,openStamped:openStamped,compose:compose,cpAddLine:cpAddLine,cpDelLine:cpDelLine,cpAddTo:cpAddTo,cpAddToAll:cpAddToAll,cpDelTo:cpDelTo,cpDelKeep:cpDelKeep,cpDelFile:cpDelFile,cpFiles:cpFiles,submit:submit,approve:approve,withdraw:withdraw,del:del,recv:recv,reply:reply,
  sealOpen:sealOpen,sealReject:sealReject,stLoad:stLoad,stLocal:stLocal,stPage:stPage,stSize:stSize,stMake:stMake,settings:settings,saveTitle:saveTitle,saveOrg:saveOrg,saveHide:saveHide,saveKeepers:saveKeepers,saveSeal:saveSeal,print:print,
  _sim:function(o){ME=o.me;MY=o.my;ORGS=myOrgsOf(MY);ORG=ORGS[0];MEMBERS=o.members||[];ORGDIR=o.orgs||{};DOCS=o.docs||{};$('gwLogin').style.display='none';$('gwApp').style.display='flex';renderAll()}};
KFDF.initApp();DB=firebase.firestore();AUTH=firebase.auth();
['mousemove','keydown','click','touchstart'].forEach(function(e){document.addEventListener(e,touch,{passive:true})});
document.addEventListener('click',function(){var m=$('gwNewMenu');if(m)m.style.display='none'});
var first=true;
AUTH.onAuthStateChanged(function(u){
  if(!first){if(!u&&$('gwApp').style.display!=='none')showLogin('로그아웃되었습니다.');return}first=false;
  // 새 창에서는 항상 아이디·비밀번호를 다시 입력합니다. 같은 창을 새로 고친 경우에만(30분 안) 이어서 씁니다.
  if(u&&gateOk(gateGet(),u.uid,Date.now())){gateSet(u.uid);enter(u)}else showLogin('')});
})();
