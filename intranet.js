// intranet.js v20260929a · 연맹 인트라넷 — 중앙 · 시도연맹 · 구군연맹 임원용 전자문서(기안·결재 / 협조 요청 / 직인 날인 / 공람) · 문서함 · 문서번호 대장
//   기관(orgKey): central | sido_{시도} | gugun_{시도}_{구군} — 회원의 등급(admin·owner / sidoOfficer+sido / gugunOfficer+sido+gugun)에서 정해집니다.
//   저장(보안 규칙 v46): intraDocs(문서) · intraMembers(임원 명부) · intraOrgs(기관 설정) · intraSeals(직인 이미지, 직인 관리자만) · intraCounters(문서번호)
//   첨부: storage intranet/{문서ID}/ (스토리지 규칙 v9)
//   열람 범위: 기안자 · 결재선에 든 사람(readers) · 발신 기관과 수신 기관 임원(readOrgs). 수신 기관에는 결재가 끝난 뒤에 보입니다.
(function(){
'use strict';
var DB,AUTH;
var ME=null,MY=null,ORGS=[],ORG=null,MEMBERS=[],ORGDIR={},DOCS={},BOX='todo',Q='',UNSUB=[],CP=null,STAMP=null;
var KIND={draft:['기안·결재','#153A77'],coop:['협조 요청','#0e7490'],seal:['직인 날인','#8c1622'],notice:['공람·공지','#7c3aed']};
var STC={'진행':'#153A77','완료':'#0f766e','반려':'#C41E2F','회수':'#8a919d'};
var BOXES=[['todo','📥 처리할 문서'],['mine','✍ 기안함'],['line','🖊 결재함'],['inbox','📨 수신함'],['outbox','📤 발신함'],['seal','🔏 직인 대장'],['reg','📚 문서 대장'],['all','🗂 전체']];
function $(id){return document.getElementById(id)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function nl(s){return esc(s).replace(/\n/g,'<br>')}
function now(){return new Date().toISOString()}
function fdt(s){s=String(s||'');return s?s.slice(0,10).replace(/-/g,'. ')+'. '+s.slice(11,16):''}
function fd(s){s=String(s||'');return s?s.slice(0,10).replace(/-/g,'. ')+'.':''}
function pill(t,bg){return '<span class="in-pill" style="background:'+bg+'">'+esc(t)+'</span>'}
function roleSet(md){return [md.role].concat(md.roles||[]).filter(Boolean)}
// ── 순수 함수(시험 대상) ──
function myOrgsOf(md){var r=roleSet(md||{}),o=[];md=md||{};
  if(md.owner===true||r.indexOf('admin')>=0)o.push({key:'central',name:'대한민국플라잉디스크연맹',level:0,sido:'',gugun:''});
  if(r.indexOf('sidoOfficer')>=0&&md.sido)o.push({key:'sido_'+md.sido,name:md.sido+'플라잉디스크연맹',level:1,sido:md.sido,gugun:''});
  if(r.indexOf('gugunOfficer')>=0&&md.sido&&md.gugun)o.push({key:'gugun_'+md.sido+'_'+md.gugun,name:md.sido+' '+md.gugun+'플라잉디스크연맹',level:2,sido:md.sido,gugun:md.gugun});
  return o}
function curStep(d){var l=d.line||[];for(var i=0;i<l.length;i++){if(l[i].status!=='승인')return i}return -1}
function isMyTurn(d,uid){if(d.status!=='진행')return false;var i=curStep(d);return i>=0&&d.line[i].uid===uid}
function sealPending(d){return !!(d.seal&&d.seal.status==='요청'&&d.status==='완료')}
function isKeeper(orgKey,uid,dir){var o=(dir||{})[orgKey];return !!(o&&(o.sealKeepers||[]).indexOf(uid)>=0)}
function needRecv(d,orgKey){return d.status==='완료'&&(d.toOrgs||[]).indexOf(orgKey)>=0&&!((d.recv||{})[orgKey])}
function boxesOf(d,c){var b=['all'],uid=c.uid,ok=c.orgKey;
  if(isMyTurn(d,uid)||(sealPending(d)&&isKeeper(d.seal.orgKey,uid,c.dir))||needRecv(d,ok))b.push('todo');
  if(d.authorUid===uid)b.push('mine');
  if((d.line||[]).some(function(x){return x.uid===uid}))b.push('line');
  if(d.status==='완료'&&(d.toOrgs||[]).indexOf(ok)>=0)b.push('inbox');
  if(d.status==='완료'&&d.org===ok&&(d.toOrgs||[]).length)b.push('outbox');
  if(d.seal&&(d.seal.orgKey===ok||d.org===ok))b.push('seal');
  if(d.org===ok&&d.docNo)b.push('reg');
  return b}
function defPrefix(o){if(!o)return '문서';if(o.key==='central')return '대플연';if(o.level===1)return o.sido+'플연';return (o.gugun||'')+'플연'}
function docNoOf(prefix,year,n){return prefix+' '+year+'-'+String(n).padStart(3,'0')}
function readersOf(uid,line){var r=[uid];(line||[]).forEach(function(x){if(x.uid&&r.indexOf(x.uid)<0)r.push(x.uid)});return r}
function readOrgsOf(d,done){var r=[d.org];if(d.seal&&d.seal.orgKey&&r.indexOf(d.seal.orgKey)<0)r.push(d.seal.orgKey);if(done)(d.toOrgs||[]).forEach(function(k){if(r.indexOf(k)<0)r.push(k)});return r}
window.KFDF_INTRA_CORE={myOrgsOf:myOrgsOf,curStep:curStep,isMyTurn:isMyTurn,boxesOf:boxesOf,needRecv:needRecv,sealPending:sealPending,isKeeper:isKeeper,defPrefix:defPrefix,docNoOf:docNoOf,readersOf:readersOf,readOrgsOf:readOrgsOf};
if(typeof document==='undefined'||!window.firebase)return;

function deny(t){$('inApp').style.display='none';var d=$('inDeny');d.style.display='block';d.innerHTML=t}
function say(t,bad){var m=$('inMsg');if(!m)return;m.textContent=t||'';m.style.color=bad?'#C41E2F':'#0f766e';if(t)setTimeout(function(){if(m.textContent===t)m.textContent=''},5000)}
function ctx(){return {uid:ME.uid,orgKey:ORG.key,dir:ORGDIR}}
function orgName(k){return (ORGDIR[k]&&ORGDIR[k].name)||(k==='central'?'대한민국플라잉디스크연맹':String(k||'').replace(/^sido_/,'').replace(/^gugun_/,'').replace(/_/g,' ')+'플라잉디스크연맹')}
function myTitle(){var m=MEMBERS.find(function(x){return x.uid===ME.uid&&x.orgKey===ORG.key});return (m&&m.title)||''}
function notifyOrg(k,t){MEMBERS.filter(function(m){return m.orgKey===k&&m.uid!==ME.uid}).forEach(function(m){try{KFDF.notify(m.uid,t,'intranet.html')}catch(e){}})}
function logOf(act){return {at:now(),uid:ME.uid,name:MY.name||'',org:ORG.name,act:act}}

// ── 시작 ──
async function boot(u){
  ME=u;if(!u){deny('연맹 인트라넷은 로그인 후 이용할 수 있습니다. <a href="login.html" style="color:#153A77">로그인</a>');return}
  try{var d=await DB.collection('users').doc(u.uid).get();MY=d.exists?(d.data()||{}):{}}catch(e){deny('회원 정보를 확인하지 못했습니다: '+esc(e.message||e));return}
  ORGS=myOrgsOf(MY);
  if(!ORGS.length||MY.status!=='approved'){deny('연맹 인트라넷은 <b>중앙 사무국 · 시도연맹 임원 · 구군연맹 임원</b>만 이용할 수 있습니다.<div class="in-note">임원 등록은 클럽 › 임원 등록 신청 또는 사무국(권한 관리)에서 합니다. 시도·구군이 지정되어 있어야 소속 기관이 정해집니다.</div>');return}
  var saved='';try{saved=localStorage.getItem('kfdfIntraOrg')||''}catch(e){}
  ORG=ORGS.find(function(o){return o.key===saved})||ORGS[0];
  $('inApp').style.display='block';try{if(window.KFDF_VIEW)KFDF_VIEW.showAdminLinks()}catch(e){}
  try{await register();await loadDir()}catch(e){deny('인트라넷을 열지 못했습니다: '+esc(e.code||e.message||e)+'<div class="in-note">보안 규칙 v46 이 게시되어 있는지 확인해 주세요.</div>');return}
  listen();renderTop();
}
// 임원 명부·기관 문서를 내 정보로 맞춰 둡니다(처음 들어올 때 등록)
async function register(){
  for(var i=0;i<ORGS.length;i++){var o=ORGS[i];
    var mref=DB.collection('intraMembers').doc(ME.uid+'__'+o.key);var g=await mref.get();
    var base={uid:ME.uid,name:MY.name||'',orgKey:o.key,orgName:o.name,level:o.level,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
    if(!g.exists)await mref.set(Object.assign({title:''},base));else if((g.data()||{}).name!==base.name||(g.data()||{}).orgName!==base.orgName)await mref.update(base);
    var oref=DB.collection('intraOrgs').doc(o.key);var og=await oref.get();
    if(!og.exists)await oref.set({key:o.key,name:o.name,level:o.level,sido:o.sido,gugun:o.gugun,docPrefix:defPrefix(o),sealKeepers:[],createdAt:firebase.firestore.FieldValue.serverTimestamp(),createdBy:ME.uid});
  }
}
async function loadDir(){
  var a=await Promise.all([DB.collection('intraMembers').get(),DB.collection('intraOrgs').get()]);
  MEMBERS=a[0].docs.map(function(d){return Object.assign({_id:d.id},d.data())});ORGDIR={};a[1].docs.forEach(function(d){ORGDIR[d.id]=d.data()});
  ORGS.forEach(function(o){if(ORGDIR[o.key]&&ORGDIR[o.key].name)o.name=ORGDIR[o.key].name});
}
function listen(){
  UNSUB.forEach(function(f){try{f()}catch(e){}});UNSUB=[];DOCS={};
  var on=function(q){UNSUB.push(q.onSnapshot(function(s){s.docChanges().forEach(function(c){if(c.type==='removed')delete DOCS[c.doc.id];else DOCS[c.doc.id]=Object.assign({_id:c.doc.id},c.doc.data())});render()},function(e){say('문서를 불러오지 못했습니다: '+(e.code||e.message),true)}))};
  on(DB.collection('intraDocs').where('readers','array-contains',ME.uid).limit(500));
  on(DB.collection('intraDocs').where('readOrgs','array-contains',ORG.key).limit(500));
}
function setOrg(k){ORG=ORGS.find(function(o){return o.key===k})||ORG;try{localStorage.setItem('kfdfIntraOrg',ORG.key)}catch(e){}listen();renderTop()}
function setBox(b){BOX=b;render()}
function setQ(v){Q=v;renderList()}
function renderTop(){
  $('inOrg').innerHTML=ORGS.length>1?'<select onchange="INTRA.setOrg(this.value)" class="in-inp" style="font-weight:800">'+ORGS.map(function(o){return '<option value="'+esc(o.key)+'"'+(o.key===ORG.key?' selected':'')+'>'+esc(o.name)+'</option>'}).join('')+'</select>':'<b style="font-size:15px">'+esc(ORG.name)+'</b>';
  $('inMe').innerHTML=esc(MY.name||'')+' <span style="color:#8a919d">'+esc(myTitle()||'직위 미입력')+'</span>';
  render();
}
function list(box){var c=ctx();return Object.keys(DOCS).map(function(k){return DOCS[k]}).filter(function(d){return boxesOf(d,c).indexOf(box)>=0})}
function render(){
  if(!ORG)return;
  $('inSide').innerHTML=BOXES.map(function(b){var n=list(b[0]).length;return '<button class="in-box'+(BOX===b[0]?' on':'')+'" onclick="INTRA.setBox(\''+b[0]+'\')"><span>'+b[1]+'</span>'+(n?'<i'+(b[0]==='todo'?' class="hot"':'')+'>'+n+'</i>':'')+'</button>'}).join('');
  renderList();
  if(CP_OPEN_ID&&DOCS[CP_OPEN_ID]&&$('inDoc'))openDoc(CP_OPEN_ID,true);
}
var CP_OPEN_ID='';
function stateOf(d){var c=ctx();
  if(d.status==='진행'){var i=curStep(d);return i>=0?((d.line[i].type||'결재')+' 대기 · '+(d.line[i].name||'')):'진행'}
  if(d.status==='완료'&&sealPending(d))return '직인 승인 대기';
  if(d.status==='완료'&&needRecv(d,c.orgKey))return d.kind==='coop'?'접수 대기':'확인 대기';
  if(d.status==='완료'&&d.kind==='coop'){var r=d.recv||{},t=(d.toOrgs||[]).length,n=Object.keys(r).filter(function(k){return r[k].status==='완료'}).length;return '회신 '+n+'/'+t}
  return d.status}
function renderList(){
  var q=Q.trim().toLowerCase();
  var L=list(BOX).filter(function(d){return !q||[d.title,d.docNo,d.authorName,d.orgName,(d.toNames||[]).join(' '),d.body].join(' ').toLowerCase().indexOf(q)>=0})
    .sort(function(a,b){return String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''))});
  var h='<div class="in-lh"><b>'+esc((BOXES.find(function(b){return b[0]===BOX})||[])[1]||'')+'</b> <span style="color:#8a919d;font-size:12.5px">'+L.length+'건</span></div>';
  if(!L.length){$('inList').innerHTML=h+'<div class="in-empty">문서가 없습니다.</div>';return}
  $('inList').innerHTML=h+L.map(function(d){var k=KIND[d.kind]||KIND.draft;var hot=boxesOf(d,ctx()).indexOf('todo')>=0;
    return '<button class="in-row'+(hot?' hot':'')+'" onclick="INTRA.openDoc(\''+d._id+'\')"><div class="t">'+pill(k[0],k[1])+' <b>'+esc(d.title||'(제목 없음)')+'</b>'+((d.files||[]).length?' <span title="첨부 '+d.files.length+'개">📎</span>':'')+'</div>'
      +'<div class="m"><span>'+esc(d.orgName||'')+' · '+esc(d.authorName||'')+'</span>'+(d.docNo?'<span>'+esc(d.docNo)+'</span>':'')+((d.toNames||[]).length?'<span>수신 '+esc(d.toNames.slice(0,3).join(', '))+(d.toNames.length>3?' 외 '+(d.toNames.length-3):'')+'</span>':'')
      +'<span>'+esc(fdt(d.updatedAt||d.createdAt))+'</span><span class="s" style="color:'+(STC[d.status]||'#153A77')+'">'+esc(stateOf(d))+'</span></div></button>'}).join('');
}
// ── 모달 ──
function modal(id,html,wide){var o=$(id);if(o)o.remove();o=document.createElement('div');o.id=id;o.className='in-ov';o.innerHTML='<div class="in-md"'+(wide?' style="max-width:'+wide+'px"':'')+'>'+html+'</div>';document.body.appendChild(o);return o}
function closeM(id){var o=$(id);if(o)o.remove();if(id==='inDoc')CP_OPEN_ID=''}
// ── 문서 보기 ──
function lineHtml(d){var l=d.line||[];if(!l.length)return '<div class="in-note">결재선 없이 바로 시행한 문서입니다.</div>';
  return '<div class="in-line"><div class="c"><i>기안</i><b>'+esc(d.authorName||'')+'</b><small>'+esc(d.authorTitle||'')+'</small><u>'+esc(fd(d.createdAt))+'</u></div>'
    +l.map(function(x,i){var cur=(d.status==='진행'&&curStep(d)===i);
      return '<div class="c'+(cur?' cur':'')+(x.status==='반려'?' rej':'')+'"><i>'+esc(x.type||'결재')+'</i>'+(x.status==='승인'&&x.sign?'<img src="'+esc(x.sign)+'" alt="">':'')+'<b>'+esc(x.name||'')+'</b><small>'+esc([x.orgName!==d.orgName?x.orgName:'',x.title].filter(Boolean).join(' '))+'</small><u>'+(x.status==='승인'?esc(fd(x.at)):x.status==='반려'?'반려':cur?'대기 중':'')+'</u></div>'}).join('')+'</div>'
    +l.filter(function(x){return x.comment}).map(function(x){return '<div class="in-cm"><b>'+esc(x.name)+'</b> '+(x.status==='반려'?'<span style="color:#C41E2F;font-weight:800">반려</span> ':'')+nl(x.comment)+'</div>'}).join('')}
function filesHtml(d){var f=d.files||[];if(!f.length)return '';
  return '<div class="in-sec"><h4>붙임 '+f.length+'개</h4>'+f.map(function(x,i){return '<button class="in-file" onclick="INTRA.openFile(\''+d._id+'\','+i+')">📎 '+esc(x.name)+' <small>'+Math.max(1,Math.round((x.size||0)/1024))+'KB</small></button>'}).join('')+'</div>'}
function openDoc(id,keep){
  var d=DOCS[id];if(!d)return;CP_OPEN_ID=id;var c=ctx(),k=KIND[d.kind]||KIND.draft,mine=d.authorUid===ME.uid,turn=isMyTurn(d,ME.uid);
  var acted=(d.line||[]).some(function(x){return x.status==='승인'||x.status==='반려'});
  var act=[];
  if(turn)act.push('<button class="in-btn g" onclick="INTRA.approve(\''+id+'\',true)">✅ '+esc((d.line[curStep(d)].type||'결재'))+' 승인</button><button class="in-btn r" onclick="INTRA.approve(\''+id+'\',false)">↩ 반려</button>');
  if(mine&&d.status==='진행'&&!acted)act.push('<button class="in-btn s" onclick="INTRA.withdraw(\''+id+'\')">회수</button>');
  if(mine&&(d.status==='반려'||d.status==='회수'))act.push('<button class="in-btn" onclick="INTRA.compose(\''+d.kind+'\',\''+id+'\')">✍ 고쳐서 다시 올리기</button><button class="in-btn s" onclick="INTRA.del(\''+id+'\')">삭제</button>');
  if(needRecv(d,c.orgKey))act.push(d.kind==='coop'?'<button class="in-btn g" onclick="INTRA.recv(\''+id+'\',\'접수\')">📥 접수</button>':'<button class="in-btn g" onclick="INTRA.recv(\''+id+'\',\'확인\')">✓ 확인</button>');
  var myRecv=(d.recv||{})[c.orgKey];
  if(d.kind==='coop'&&myRecv&&myRecv.status!=='완료'&&myRecv.status!=='불가')act.push('<button class="in-btn" onclick="INTRA.recv(\''+id+'\',\'처리중\')">처리 중</button><button class="in-btn g" onclick="INTRA.recv(\''+id+'\',\'완료\')">처리 완료 회신</button><button class="in-btn r" onclick="INTRA.recv(\''+id+'\',\'불가\')">협조 불가</button>');
  if(sealPending(d)&&isKeeper(d.seal.orgKey,ME.uid,ORGDIR))act.push('<button class="in-btn g" onclick="INTRA.sealOpen(\''+id+'\')">🔏 직인 날인 승인</button><button class="in-btn r" onclick="INTRA.sealReject(\''+id+'\')">직인 반려</button>');
  if(d.status==='완료'&&(d.kind==='draft'||d.kind==='coop'||d.kind==='notice'))act.push('<button class="in-btn o" onclick="INTRA.print(\''+id+'\')">🖨 시행문 인쇄 · PDF</button>');
  var seal=d.seal?('<div class="in-sec"><h4>직인 날인</h4><div class="in-kv"><span>직인</span><b>'+esc(d.seal.orgName||orgName(d.seal.orgKey))+'</b><span>방식</span><b>'+(d.seal.mode==='file'?'붙임 문서에 날인':'시행문에 날인')+'</b><span>용도·제출처</span><b>'+esc(d.seal.purpose||'-')+'</b><span>상태</span><b style="color:'+(d.seal.status==='승인'?'#0f766e':d.seal.status==='반려'?'#C41E2F':'#b8860b')+'">'+esc(d.seal.status)+(d.seal.byName?' · '+esc(d.seal.byName)+' '+esc(fdt(d.seal.at)):'')+'</b></div>'
    +(d.seal.note?'<div class="in-cm">'+nl(d.seal.note)+'</div>':'')+(d.seal.stamped?'<button class="in-file" style="border-color:#8c1622;color:#8c1622" onclick="INTRA.openStamped(\''+id+'\')">🔏 날인본 '+esc(d.seal.stamped.name)+'</button>':'')+'</div>'):'';
  var recv=(d.toOrgs||[]).length?('<div class="in-sec"><h4>수신 기관 '+d.toOrgs.length+'곳</h4><div class="in-recv">'+d.toOrgs.map(function(o,i){var r=(d.recv||{})[o];return '<div><b>'+esc((d.toNames||[])[i]||orgName(o))+'</b> '+(r?pill(r.status,r.status==='불가'?'#C41E2F':r.status==='완료'||r.status==='확인'?'#0f766e':'#153A77')+' <small>'+esc(r.byName||'')+' '+esc(fdt(r.at))+'</small>'+(r.note?'<div class="in-cm" style="margin:3px 0 0">'+nl(r.note)+'</div>':''):(d.status==='완료'?pill('미확인','#8a919d'):pill('결재 후 발송','#8a919d')))+'</div>'}).join('')+'</div></div>'):'';
  var rep='<div class="in-sec"><h4>의견 · 회신 '+((d.replies||[]).length)+'</h4>'+((d.replies||[]).map(function(r){return '<div class="in-cm"><b>'+esc(r.name)+'</b> <small>'+esc(r.orgName||'')+' · '+esc(fdt(r.at))+'</small><br>'+nl(r.text)+'</div>'}).join(''))
    +'<div style="display:flex;gap:6px;margin-top:6px"><input id="inRep" class="in-inp" style="flex:1" maxlength="500" placeholder="의견·회신을 남깁니다"><button class="in-btn" onclick="INTRA.reply(\''+id+'\')">등록</button></div></div>';
  var h='<div class="in-mh">'+pill(k[0],k[1])+' '+pill(d.status,STC[d.status]||'#153A77')+(d.docNo?' <span style="font-weight:800;font-size:13px">'+esc(d.docNo)+'</span>':'')+'<span style="flex:1"></span><button class="in-btn s" onclick="INTRA.closeM(\'inDoc\')">닫기</button></div>'
    +'<h3 class="in-title">'+esc(d.title||'')+'</h3>'
    +'<div class="in-kv"><span>발신</span><b>'+esc(d.orgName||'')+'</b><span>기안자</span><b>'+esc(d.authorName||'')+' '+esc(d.authorTitle||'')+'</b><span>기안일</span><b>'+esc(fdt(d.createdAt))+'</b>'+(d.doneAt?'<span>시행일</span><b>'+esc(fdt(d.doneAt))+'</b>':'')+'</div>'
    +lineHtml(d)+'<div class="in-body">'+nl(d.body||'')+'</div>'+filesHtml(d)+seal+recv+rep
    +'<div id="inDocMsg" class="in-msg"></div><div class="in-acts">'+act.join('')+'</div>'
    +'<details style="margin-top:10px"><summary style="cursor:pointer;font-size:12px;color:#8a919d">처리 기록 '+((d.log||[]).length)+'건</summary>'+((d.log||[]).map(function(x){return '<div style="font-size:12px;color:#6b7280">'+esc(fdt(x.at))+' · '+esc(x.name)+' ('+esc(x.org||'')+') · '+esc(x.act)+'</div>'}).join(''))+'</details>';
  var keepV=keep&&$('inRep')?$('inRep').value:'';modal('inDoc',h,860);if(keepV)$('inRep').value=keepV;
}
function dmsg(t,bad){var m=$('inDocMsg');if(m){m.textContent=t;m.style.color=bad?'#C41E2F':'#0f766e'}}
async function openFile(id,i){var f=((DOCS[id]||{}).files||[])[i];if(!f)return;var w=window.open('','_blank');try{var u=await firebase.storage().ref(f.path).getDownloadURL();if(w)w.location.href=u;else location.href=u}catch(e){if(w)w.close();alert('파일을 열 수 없습니다: '+(e.code||e.message)+'\n(스토리지 규칙 v9 게시 여부 확인)')}}
async function openStamped(id){var s=((DOCS[id]||{}).seal||{}).stamped;if(!s)return;var w=window.open('','_blank');try{var u=await firebase.storage().ref(s.path).getDownloadURL();if(w)w.location.href=u;else location.href=u}catch(e){if(w)w.close();alert('파일을 열 수 없습니다: '+(e.code||e.message))}}
// ── 문서 작성 ──
function compose(kind,fromId){
  var src=fromId?DOCS[fromId]:null;closeM('inDoc');
  CP={kind:kind,line:src?(src.line||[]).map(function(x){return {uid:x.uid,name:x.name,orgName:x.orgName,title:x.title,type:x.type}}):[],to:src?(src.toOrgs||[]).slice():[],files:[],keep:src?(src.files||[]).slice():[],from:fromId||''};
  var k=KIND[kind];
  var sealOpts=Object.keys(ORGDIR).filter(function(o){return o===ORG.key||o==='central'||(ORG.level===2&&o==='sido_'+ORG.sido)}).map(function(o){return '<option value="'+esc(o)+'"'+(src&&src.seal&&src.seal.orgKey===o?' selected':(o===ORG.key?' selected':''))+'>'+esc(orgName(o))+' 직인</option>'}).join('');
  var h='<div class="in-mh">'+pill(k[0],k[1])+' <b style="font-size:16px">문서 작성</b><span style="flex:1"></span><button class="in-btn s" onclick="INTRA.closeM(\'inCp\')">닫기</button></div>'
    +'<div class="in-kv"><span>발신 기관</span><b>'+esc(ORG.name)+'</b><span>기안자</span><b>'+esc(MY.name||'')+' '+esc(myTitle())+'</b></div>'
    +'<label class="in-lb">제목 *</label><input id="cpTitle" class="in-inp" maxlength="120" value="'+esc(src?src.title:'')+'" placeholder="'+(kind==='coop'?'예: 제3회 회장기 대회 심판 파견 협조 요청':kind==='seal'?'예: 후원명칭 사용 승인서 직인 날인 요청':kind==='notice'?'예: 2026년 하반기 임원 연수 안내':'예: 2026년 시도연맹 지원금 교부 계획')+'">'
    +'<label class="in-lb">내용 *</label><textarea id="cpBody" class="in-inp" rows="9" maxlength="6000" placeholder="1. 관련: …&#10;2. 위 호와 관련하여 아래와 같이 …&#10;&#10;  가. …&#10;  나. …">'+esc(src?src.body:'')+'</textarea>'
    +'<label class="in-lb">붙임 파일 <small>(PDF · 이미지 · 한글 · 워드 · 엑셀, 파일당 20MB)</small></label><input type="file" id="cpFiles" multiple onchange="INTRA.cpFiles(this)"><div id="cpFileList" class="in-chips"></div>'
    +'<label class="in-lb">결재선 <small>(위에서부터 차례로 — 비워 두면 결재 없이 바로 시행)</small></label><div id="cpLine" class="in-chips"></div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap"><select id="cpLineWho" class="in-inp" style="flex:1 1 220px"></select><select id="cpLineType" class="in-inp" style="flex:0 0 100px"><option>검토</option><option>협조</option><option selected>결재</option></select><button class="in-btn o" onclick="INTRA.cpAddLine()">+ 추가</button></div>'
    +(kind==='seal'?'':'<label class="in-lb">수신 기관 '+(kind==='coop'||kind==='notice'?'*':'<small>(내부 결재만 하면 비워 둠)</small>')+'</label><div id="cpTo" class="in-chips"></div><div style="display:flex;gap:6px;flex-wrap:wrap"><select id="cpToWho" class="in-inp" style="flex:1 1 220px"></select><button class="in-btn o" onclick="INTRA.cpAddTo()">+ 추가</button><button class="in-btn o" onclick="INTRA.cpAddToAll(1)">시도연맹 전체</button><button class="in-btn o" onclick="INTRA.cpAddToAll(2)">구군연맹 전체</button></div>')
    +'<div class="in-sealbox"><label style="display:flex;gap:8px;align-items:center;font-weight:800;font-size:13.5px"><input type="checkbox" id="cpSeal" style="width:auto"'+(kind==='seal'||(src&&src.seal)?' checked':'')+(kind==='seal'?' disabled':'')+' onchange="document.getElementById(\'cpSealBox\').style.display=this.checked?\'block\':\'none\'">🔏 직인 날인 요청</label>'
    +'<div id="cpSealBox" style="display:'+(kind==='seal'||(src&&src.seal)?'block':'none')+';margin-top:8px"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px">'
    +'<div><label class="in-lb" style="margin-top:0">어느 직인</label><select id="cpSealOrg" class="in-inp">'+sealOpts+'</select></div>'
    +'<div><label class="in-lb" style="margin-top:0">날인 방식</label><select id="cpSealMode" class="in-inp"><option value="doc"'+(kind!=='seal'?' selected':'')+'>시행문(이 문서)에 날인</option><option value="file"'+(kind==='seal'?' selected':'')+'>붙임 문서에 날인 (PDF·이미지)</option></select></div></div>'
    +'<label class="in-lb">용도 · 제출처</label><input id="cpSealPurpose" class="in-inp" maxlength="120" value="'+esc(src&&src.seal?src.seal.purpose:'')+'" placeholder="예: ○○시체육회 제출용 · 1부"><div class="in-note">직인은 결재가 끝난 뒤 직인 관리자가 승인해야 찍힙니다. 날인 내역은 직인 대장에 남습니다.</div></div></div>'
    +'<div id="cpMsg" class="in-msg"></div><div class="in-acts"><button class="in-btn s" onclick="INTRA.closeM(\'inCp\')">취소</button><button class="in-btn g" id="cpGo" onclick="INTRA.submit()">올리기</button></div>';
  modal('inCp',h,820);cpDraw();
}
function cpDraw(){
  var who=$('cpLineWho');if(who){var ms=MEMBERS.filter(function(m){return m.uid!==ME.uid&&!CP.line.some(function(x){return x.uid===m.uid})}).sort(function(a,b){return (a.orgKey===ORG.key?0:1)-(b.orgKey===ORG.key?0:1)||(a.level-b.level)||String(a.orgName).localeCompare(String(b.orgName),'ko')||String(a.name).localeCompare(String(b.name),'ko')});
    who.innerHTML=ms.length?ms.map(function(m){return '<option value="'+esc(m._id)+'">'+esc(m.orgName)+' · '+esc(m.name)+(m.title?' '+esc(m.title):'')+'</option>'}).join(''):'<option value="">등록된 다른 임원이 없습니다 (임원이 인트라넷에 한 번 들어오면 명부에 올라옵니다)</option>'}
  var l=$('cpLine');if(l)l.innerHTML=CP.line.map(function(x,i){return '<span class="in-chip">'+(i+1)+'. '+esc(x.type)+' · '+esc(x.name)+' <small>'+esc(x.orgName)+'</small> <a onclick="INTRA.cpDelLine('+i+')">✕</a></span>'}).join('')||'<span class="in-note" style="margin:0">결재선 없음</span>';
  var tw=$('cpToWho');if(tw){var os=Object.keys(ORGDIR).filter(function(k){return k!==ORG.key&&CP.to.indexOf(k)<0}).sort(function(a,b){return (ORGDIR[a].level-ORGDIR[b].level)||String(ORGDIR[a].name).localeCompare(String(ORGDIR[b].name),'ko')});
    tw.innerHTML=os.length?os.map(function(k){return '<option value="'+esc(k)+'">'+esc(ORGDIR[k].name)+'</option>'}).join(''):'<option value="">선택할 기관이 없습니다</option>'}
  var t=$('cpTo');if(t)t.innerHTML=CP.to.map(function(k,i){return '<span class="in-chip">'+esc(orgName(k))+' <a onclick="INTRA.cpDelTo('+i+')">✕</a></span>'}).join('')||'<span class="in-note" style="margin:0">수신 기관 없음</span>';
  var f=$('cpFileList');if(f)f.innerHTML=CP.keep.map(function(x,i){return '<span class="in-chip">📎 '+esc(x.name)+' <a onclick="INTRA.cpDelKeep('+i+')">✕</a></span>'}).concat(CP.files.map(function(x,i){return '<span class="in-chip">📎 '+esc(x.name)+' <small>'+Math.round(x.size/1024)+'KB</small> <a onclick="INTRA.cpDelFile('+i+')">✕</a></span>'})).join('');
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
  var m=$('cpMsg'),bad=function(t){m.textContent=t;m.style.color='#C41E2F'};var kind=CP.kind;
  var title=$('cpTitle').value.trim(),body=$('cpBody').value.trim();
  if(title.length<2)return bad('제목을 입력해 주세요');if(body.length<2)return bad('내용을 입력해 주세요');
  if((kind==='coop'||kind==='notice')&&!CP.to.length)return bad('수신 기관을 하나 이상 골라 주세요');
  var wantSeal=$('cpSeal').checked,seal=null;
  if(wantSeal){var so=$('cpSealOrg').value,mode=$('cpSealMode').value;if(!so)return bad('직인을 골라 주세요');
    if(mode==='file'&&!(CP.files.concat(CP.keep)).some(function(f){return /\.(pdf|png|jpe?g)$/i.test(f.name)}))return bad('붙임 문서에 날인하려면 PDF 또는 이미지 파일을 붙여 주세요');
    if(!((ORGDIR[so]||{}).sealKeepers||[]).length&&!confirm(orgName(so)+'에 직인 관리자가 아직 지정되어 있지 않습니다.\n지정되기 전에는 승인할 사람이 없어 대기 상태로 남습니다. 그래도 올릴까요?'))return;
    seal={orgKey:so,orgName:orgName(so),mode:mode,purpose:$('cpSealPurpose').value.trim(),status:'요청'}}
  var b=$('cpGo');b.disabled=true;m.style.color='#8a919d';
  try{
    var ref=DB.collection('intraDocs').doc();var files=CP.keep.slice();
    for(var i=0;i<CP.files.length;i++){var f=CP.files[i];m.textContent='파일 올리는 중… ('+(i+1)+'/'+CP.files.length+')';
      var path='intranet/'+ref.id+'/'+Date.now()+'_'+i+'.'+(f.name.split('.').pop()||'bin').toLowerCase();
      await firebase.storage().ref(path).put(f,{contentType:mimeOf(f),customMetadata:{name:encodeURIComponent(f.name)}});files.push({name:f.name,path:path,size:f.size,by:ME.uid})}
    m.textContent='문서 올리는 중…';
    var done=!CP.line.length,t=now();
    var d={kind:kind,title:title,body:body,org:ORG.key,orgName:ORG.name,authorUid:ME.uid,authorName:MY.name||'',authorTitle:myTitle(),
      line:CP.line.map(function(x){return {uid:x.uid,name:x.name,orgName:x.orgName,title:x.title||'',type:x.type,status:'대기',at:'',comment:'',sign:''}}),
      toOrgs:CP.to.slice(),toNames:CP.to.map(orgName),status:done?'완료':'진행',docNo:'',files:files,recv:{},replies:[],seal:seal,log:[logOf(done?'기안 · 결재선 없이 시행':'기안')],createdAt:t,updatedAt:t,doneAt:done?t:''};
    d.readers=readersOf(ME.uid,d.line);d.readOrgs=readOrgsOf(d,done);
    await DB.runTransaction(async function(tx){if(done)d.docNo=await nextNo(tx,ORG.key);tx.set(ref,d)});
    if(CP.from){try{await DB.collection('intraDocs').doc(CP.from).update({log:firebase.firestore.FieldValue.arrayUnion(logOf('다시 올림 → 새 문서')),updatedAt:now()})}catch(e){}}
    if(done)afterDone(Object.assign({_id:ref.id},d));else try{KFDF.notify(d.line[0].uid,'🖊 ['+ORG.name+'] '+(d.line[0].type)+' 요청 — '+title,'intranet.html')}catch(e){}
    closeM('inCp');BOX='mine';render();say('문서를 올렸습니다'+(d.docNo?' — '+d.docNo:''));
  }catch(e){b.disabled=false;bad('올리기 실패: '+(e.code||e.message||e))}
}
function afterDone(d){(d.toOrgs||[]).forEach(function(k){notifyOrg(k,'📨 ['+d.orgName+'] '+(KIND[d.kind]||[''])[0]+' — '+d.title)});
  if(d.seal&&d.seal.status==='요청')((ORGDIR[d.seal.orgKey]||{}).sealKeepers||[]).forEach(function(u){if(u!==ME.uid)try{KFDF.notify(u,'🔏 직인 날인 요청 — '+d.title+' ('+d.orgName+')','intranet.html')}catch(e){}})}
// ── 결재 ──
async function approve(id,ok){
  var d0=DOCS[id];if(!d0||!isMyTurn(d0,ME.uid))return;
  var cm=prompt(ok?'의견 (선택) — 비워 두고 확인을 누르면 승인됩니다':'반려 사유를 적어 주세요 (기안자에게 전달됩니다)','');if(cm===null)return;
  if(!ok&&cm.trim().length<2){alert('반려 사유를 적어 주세요.');return}
  var ref=DB.collection('intraDocs').doc(id),res=null;
  try{
    await DB.runTransaction(async function(tx){var g=await tx.get(ref);var d=g.data();var i=curStep(d);if(d.status!=='진행'||i<0||d.line[i].uid!==ME.uid)throw new Error('이미 처리되었거나 내 차례가 아닙니다');
      var line=d.line.slice();line[i]=Object.assign({},line[i],{status:ok?'승인':'반려',at:now(),comment:cm.trim().slice(0,500),sign:ok?String(MY.signatureImg||'').slice(0,1500):''});
      var upd={line:line,updatedAt:now(),log:firebase.firestore.FieldValue.arrayUnion(logOf((line[i].type||'결재')+(ok?' 승인':' 반려')))};
      if(!ok)upd.status='반려';
      else if(i===line.length-1){upd.status='완료';upd.doneAt=now();upd.docNo=await nextNo(tx,d.org);upd.readOrgs=readOrgsOf(d,true)}
      tx.update(ref,upd);res=Object.assign({_id:id},d,upd,{line:line})});
    if(!ok)try{KFDF.notify(res.authorUid,'↩ 반려 — '+res.title+' ('+(MY.name||'')+')','intranet.html')}catch(e){}
    else if(res.status==='완료'){try{KFDF.notify(res.authorUid,'✅ 결재 완료 — '+res.title+' · '+res.docNo,'intranet.html')}catch(e){}afterDone(res)}
    else{var n=res.line[curStep(res)];try{KFDF.notify(n.uid,'🖊 ['+res.orgName+'] '+(n.type)+' 요청 — '+res.title,'intranet.html')}catch(e){}}
    say(ok?'승인했습니다':'반려했습니다');
  }catch(e){alert('처리 실패: '+(e.code||e.message||e))}
}
async function withdraw(id){if(!confirm('이 문서를 회수할까요? 결재가 시작되기 전에만 회수할 수 있습니다.'))return;
  try{await DB.runTransaction(async function(tx){var ref=DB.collection('intraDocs').doc(id);var d=(await tx.get(ref)).data();if(d.status!=='진행'||(d.line||[]).some(function(x){return x.status==='승인'||x.status==='반려'}))throw new Error('이미 결재가 시작되었습니다');tx.update(ref,{status:'회수',updatedAt:now(),log:firebase.firestore.FieldValue.arrayUnion(logOf('회수'))})});say('회수했습니다')}catch(e){alert('회수 실패: '+(e.code||e.message||e))}}
async function del(id){var d=DOCS[id];if(!d||!confirm('['+d.title+'] 문서를 삭제할까요? 되돌릴 수 없습니다.'))return;try{await DB.collection('intraDocs').doc(id).delete();closeM('inDoc');say('삭제했습니다')}catch(e){alert('삭제 실패: '+(e.code||e.message))}}
async function recv(id,st){var d=DOCS[id];if(!d)return;var note='';
  if(st==='완료'||st==='불가'){note=prompt(st==='완료'?'처리 결과를 적어 주세요 (발신 기관에 회신됩니다)':'협조가 어려운 사유를 적어 주세요','');if(note===null)return;if(note.trim().length<2){alert('내용을 적어 주세요.');return}}
  var u={updatedAt:now(),log:firebase.firestore.FieldValue.arrayUnion(logOf('수신 '+st))};u['recv.'+ORG.key]={status:st,by:ME.uid,byName:MY.name||'',orgName:ORG.name,at:now(),note:note.trim().slice(0,800)};
  try{await DB.collection('intraDocs').doc(id).update(u);if(d.kind==='coop')try{KFDF.notify(d.authorUid,'📨 ['+ORG.name+'] 협조 요청 '+st+' — '+d.title,'intranet.html')}catch(e){}say(st+' 처리했습니다')}catch(e){alert('처리 실패: '+(e.code||e.message))}}
async function reply(id){var t=($('inRep').value||'').trim();if(t.length<2)return;var d=DOCS[id];
  try{await DB.collection('intraDocs').doc(id).update({replies:firebase.firestore.FieldValue.arrayUnion({uid:ME.uid,name:MY.name||'',orgName:ORG.name,text:t.slice(0,500),at:now()}),updatedAt:now()});$('inRep').value='';
    if(d&&d.authorUid!==ME.uid)try{KFDF.notify(d.authorUid,'💬 ['+ORG.name+'] '+(MY.name||'')+' — '+d.title,'intranet.html')}catch(e){}}catch(e){alert('등록 실패: '+(e.code||e.message))}}
// ── 직인 ──
function loadScript(u){return new Promise(function(res,rej){if(document.querySelector('script[data-u="'+u+'"]'))return res();var s=document.createElement('script');s.src=u;s.dataset.u=u;s.onload=res;s.onerror=function(){rej(new Error('라이브러리를 불러오지 못했습니다'))};document.head.appendChild(s)})}
async function sealImg(orgKey){var g=await DB.collection('intraSeals').doc(orgKey).get();if(g.exists&&g.data().img)return g.data().img;throw new Error(orgName(orgKey)+' 직인 이미지가 등록되어 있지 않습니다. [⚙ 기관 설정]에서 먼저 등록해 주세요.')}
async function sealOpen(id){
  var d=DOCS[id];if(!d||!sealPending(d))return;var img;
  try{img=await sealImg(d.seal.orgKey)}catch(e){alert(e.message);return}
  if(d.seal.mode!=='file'){
    if(!confirm('['+d.title+']\n'+d.orgName+' 시행문에 '+orgName(d.seal.orgKey)+' 직인을 날인합니다.\n용도: '+(d.seal.purpose||'-')+'\n\n승인할까요? (직인 대장에 기록됩니다)'))return;
    try{await DB.collection('intraDocs').doc(id).update({seal:Object.assign({},d.seal,{status:'승인',by:ME.uid,byName:MY.name||'',at:now(),img:img}),updatedAt:now(),log:firebase.firestore.FieldValue.arrayUnion(logOf('직인 날인 승인(시행문)'))});
      try{KFDF.notify(d.authorUid,'🔏 직인 날인 승인 — '+d.title,'intranet.html')}catch(e){}say('직인 날인을 승인했습니다')}catch(e){alert('승인 실패: '+(e.code||e.message))}
    return}
  var fs=(d.files||[]).map(function(f,i){return {f:f,i:i}}).filter(function(x){return /\.(pdf|png|jpe?g)$/i.test(x.f.name)});
  STAMP={id:id,img:img,fi:fs.length?fs[0].i:-1,page:0,pages:1,cx:.72,cy:.78,mm:30,bytes:null,isPdf:false,local:null};
  modal('inSt','<div class="in-mh"><b style="font-size:16px">🔏 직인 날인 — '+esc(d.title)+'</b><span style="flex:1"></span><button class="in-btn s" onclick="INTRA.closeM(\'inSt\')">닫기</button></div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><select id="stFile" class="in-inp" style="flex:1 1 240px" onchange="INTRA.stLoad(+this.value)">'+fs.map(function(x){return '<option value="'+x.i+'">'+esc(x.f.name)+'</option>'}).join('')+'</select>'
    +'<label class="in-btn o" style="cursor:pointer">내 PC의 파일로<input type="file" accept=".pdf,image/png,image/jpeg" style="display:none" onchange="INTRA.stLocal(this)"></label>'
    +'<span>쪽 <input id="stPage" type="number" min="1" value="1" class="in-inp" style="width:70px" onchange="INTRA.stPage(+this.value)"> / <b id="stPages">1</b></span>'
    +'<span>크기 <input id="stMm" type="number" min="10" max="60" value="30" class="in-inp" style="width:70px" onchange="INTRA.stSize(+this.value)"> mm</span></div>'
    +'<div class="in-note">문서 위에서 직인을 찍을 자리를 누르세요. 보통 발신명의(○○연맹회장) 끝 글자에 걸치게 찍습니다.</div>'
    +'<div id="stWrap" class="in-stwrap"><canvas id="stCv"></canvas><img id="stSeal" src="'+esc(img)+'" alt=""></div>'
    +'<div id="stMsg" class="in-msg"></div><div class="in-acts"><button class="in-btn o" onclick="INTRA.stMake(true)">미리보기</button><button class="in-btn g" id="stGo" onclick="INTRA.stMake(false)">🔏 날인하고 승인</button></div>',900);
  $('stCv').onclick=function(e){var r=this.getBoundingClientRect();STAMP.cx=(e.clientX-r.left)/r.width;STAMP.cy=(e.clientY-r.top)/r.height;stDraw()};
  if(STAMP.fi>=0)stLoad(STAMP.fi);else $('stMsg').textContent='날인할 PDF·이미지가 없습니다. [내 PC의 파일로]를 눌러 고르세요.';
}
function stMsg(t,bad){var m=$('stMsg');if(m){m.textContent=t;m.style.color=bad?'#C41E2F':'#6b7280'}}
async function stLoad(i){var d=DOCS[STAMP.id];var f=(d.files||[])[i];if(!f)return;STAMP.fi=i;STAMP.name=f.name;stMsg('문서를 불러오는 중…');
  try{var u=await firebase.storage().ref(f.path).getDownloadURL();var r=await fetch(u);if(!r.ok)throw new Error(r.status);await stSet(new Uint8Array(await r.arrayBuffer()),f.name)}
  catch(e){stMsg('문서를 불러오지 못했습니다('+(e.message||e)+'). 파일을 내려받아 [내 PC의 파일로]를 눌러 골라 주세요.',true)}}
async function stLocal(inp){var f=inp.files&&inp.files[0];if(!f)return;STAMP.name=f.name;await stSet(new Uint8Array(await f.arrayBuffer()),f.name)}
async function stSet(bytes,name){STAMP.bytes=bytes;STAMP.isPdf=/\.pdf$/i.test(name);STAMP.page=0;
  if(STAMP.isPdf){await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    STAMP.pdf=await pdfjsLib.getDocument({data:bytes.slice()}).promise;STAMP.pages=STAMP.pdf.numPages;STAMP.page=STAMP.pages-1}
  else{STAMP.pages=1;STAMP.image=await new Promise(function(res,rej){var im=new Image();im.onload=function(){res(im)};im.onerror=function(){rej(new Error('이미지를 읽지 못했습니다'))};im.src=URL.createObjectURL(new Blob([bytes]))})}
  $('stPages').textContent=STAMP.pages;$('stPage').value=STAMP.page+1;$('stPage').max=STAMP.pages;await stRender();stMsg('')}
async function stRender(){var cv=$('stCv'),W=Math.min(820,$('stWrap').clientWidth||820);
  if(STAMP.isPdf){var p=await STAMP.pdf.getPage(STAMP.page+1);var v0=p.getViewport({scale:1});var v=p.getViewport({scale:W/v0.width});cv.width=v.width;cv.height=v.height;STAMP.ptW=v0.width;STAMP.ptH=v0.height;await p.render({canvasContext:cv.getContext('2d'),viewport:v}).promise}
  else{var im=STAMP.image;cv.width=W;cv.height=Math.round(W*im.height/im.width);cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);STAMP.ptW=595.28;STAMP.ptH=595.28*im.height/im.width}
  stDraw()}
function stDraw(){var cv=$('stCv'),s=$('stSeal');if(!cv||!s)return;var px=STAMP.mm*72/25.4*(cv.clientWidth/STAMP.ptW);s.style.width=px+'px';s.style.height=px+'px';s.style.left=(STAMP.cx*cv.clientWidth-px/2)+'px';s.style.top=(STAMP.cy*cv.clientHeight-px/2)+'px';s.style.display='block'}
function stPage(n){STAMP.page=Math.max(0,Math.min(STAMP.pages-1,(n||1)-1));stRender()}
function stSize(n){STAMP.mm=Math.max(10,Math.min(60,n||30));stDraw()}
function dataBytes(u){var b=atob(u.split(',')[1]);var a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}
async function stMake(preview){
  if(!STAMP.bytes){stMsg('날인할 문서를 먼저 불러와 주세요',true);return}
  var d=DOCS[STAMP.id],blob,name=String(STAMP.name||'문서').replace(/\.[^.]+$/,'')+'_날인본';stMsg('날인본을 만드는 중…');
  try{
    if(STAMP.isPdf){await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js');
      var pdf=await PDFLib.PDFDocument.load(STAMP.bytes,{ignoreEncryption:true});var pg=pdf.getPages()[STAMP.page];var sz=pg.getSize();
      var im=/^data:image\/png/.test(STAMP.img)?await pdf.embedPng(dataBytes(STAMP.img)):await pdf.embedJpg(dataBytes(STAMP.img));var w=STAMP.mm*72/25.4;
      pg.drawImage(im,{x:STAMP.cx*sz.width-w/2,y:sz.height-STAMP.cy*sz.height-w/2,width:w,height:w,opacity:.93});
      blob=new Blob([await pdf.save()],{type:'application/pdf'});name+='.pdf'}
    else{var c=document.createElement('canvas');c.width=STAMP.image.width;c.height=STAMP.image.height;var x=c.getContext('2d');x.drawImage(STAMP.image,0,0);
      var si=await new Promise(function(res){var i2=new Image();i2.onload=function(){res(i2)};i2.src=STAMP.img});var w2=STAMP.mm/210*c.width;x.globalAlpha=.93;x.drawImage(si,STAMP.cx*c.width-w2/2,STAMP.cy*c.height-w2/2,w2,w2);
      blob=await new Promise(function(res){c.toBlob(res,'image/jpeg',.92)});name+='.jpg'}
    if(preview){window.open(URL.createObjectURL(blob),'_blank');stMsg('새 창에서 날인 위치를 확인하세요. 맞으면 [날인하고 승인]을 누릅니다.');return}
    if(!confirm('['+d.title+']\n'+orgName(d.seal.orgKey)+' 직인을 날인한 문서를 저장하고 승인합니다.\n직인 대장에 기록되며 되돌릴 수 없습니다. 계속할까요?'))return;
    $('stGo').disabled=true;var path='intranet/'+STAMP.id+'/stamped_'+Date.now()+(STAMP.isPdf?'.pdf':'.jpg');
    await firebase.storage().ref(path).put(blob,{contentType:blob.type});
    await DB.collection('intraDocs').doc(STAMP.id).update({seal:Object.assign({},d.seal,{status:'승인',by:ME.uid,byName:MY.name||'',at:now(),stamped:{name:name,path:path,size:blob.size,page:STAMP.page+1}}),updatedAt:now(),log:firebase.firestore.FieldValue.arrayUnion(logOf('직인 날인 승인(붙임 문서)'))});
    try{KFDF.notify(d.authorUid,'🔏 직인 날인본이 준비되었습니다 — '+d.title,'intranet.html')}catch(e){}
    closeM('inSt');say('날인본을 저장하고 승인했습니다');
  }catch(e){var b=$('stGo');if(b)b.disabled=false;stMsg('실패: '+(e.code||e.message||e),true)}
}
async function sealReject(id){var d=DOCS[id];if(!d)return;var n=prompt('직인 날인을 반려합니다. 사유를 적어 주세요','');if(n===null)return;if(n.trim().length<2){alert('사유를 적어 주세요.');return}
  try{await DB.collection('intraDocs').doc(id).update({seal:Object.assign({},d.seal,{status:'반려',by:ME.uid,byName:MY.name||'',at:now(),note:n.trim().slice(0,300)}),updatedAt:now(),log:firebase.firestore.FieldValue.arrayUnion(logOf('직인 반려'))});try{KFDF.notify(d.authorUid,'🔏 직인 날인 반려 — '+d.title,'intranet.html')}catch(e){}say('반려했습니다')}catch(e){alert('처리 실패: '+(e.code||e.message))}}
// ── 기관 설정 ──
async function settings(){
  var o=ORGDIR[ORG.key]||{};var mine=MEMBERS.filter(function(m){return m.orgKey===ORG.key});var keeper=isKeeper(ORG.key,ME.uid,ORGDIR);var has='확인 불가';
  if(keeper){try{var g=await DB.collection('intraSeals').doc(ORG.key).get();has=g.exists&&g.data().img?'<img src="'+esc(g.data().img)+'" style="width:84px;height:84px;object-fit:contain;border:1px solid #e2e7f0;border-radius:10px;background:#fff">':'<span style="color:#C41E2F;font-weight:800">등록된 직인 없음</span>'}catch(e){has='<span style="color:#C41E2F">'+esc(e.code||e.message)+'</span>'}}
  modal('inSet','<div class="in-mh"><b style="font-size:16px">⚙ 기관 설정 — '+esc(ORG.name)+'</b><span style="flex:1"></span><button class="in-btn s" onclick="INTRA.closeM(\'inSet\')">닫기</button></div>'
    +'<label class="in-lb">내 직위</label><div style="display:flex;gap:6px"><input id="setTitle" class="in-inp" style="flex:1" maxlength="20" value="'+esc(myTitle())+'" placeholder="예: 회장 · 전무이사 · 사무국장"><button class="in-btn" onclick="INTRA.saveTitle()">저장</button></div>'
    +'<label class="in-lb">기관 이름 · 문서번호 머리글</label><div style="display:grid;grid-template-columns:2fr 1fr auto;gap:6px"><input id="setName" class="in-inp" maxlength="40" value="'+esc(o.name||ORG.name)+'"><input id="setPrefix" class="in-inp" maxlength="12" value="'+esc(o.docPrefix||defPrefix(ORG))+'" title="문서번호 예: '+esc(docNoOf(o.docPrefix||defPrefix(ORG),new Date().getFullYear(),12))+'"><button class="in-btn" onclick="INTRA.saveOrg()">저장</button></div>'
    +'<label class="in-lb">직인 관리자 <small>(직인 날인을 승인하고 직인 이미지를 관리하는 사람)</small></label><div class="in-chips">'+mine.map(function(m){return '<label class="in-chip" style="cursor:pointer"><input type="checkbox" class="setKeep" value="'+esc(m.uid)+'" style="width:auto"'+((o.sealKeepers||[]).indexOf(m.uid)>=0?' checked':'')+'> '+esc(m.name)+' <small>'+esc(m.title||'')+'</small></label>'}).join('')+'</div><button class="in-btn" style="margin-top:6px" onclick="INTRA.saveKeepers()">직인 관리자 저장</button>'
    +'<label class="in-lb">직인 이미지</label>'+(keeper?'<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">'+has+'<label class="in-btn o" style="cursor:pointer">직인 이미지 올리기 · 바꾸기<input type="file" accept="image/png,image/jpeg" style="display:none" onchange="INTRA.saveSeal(this)"></label></div><div class="in-note">배경이 투명한 PNG 를 권장합니다(흰 배경은 자동으로 지웁니다). 직인 이미지는 직인 관리자만 볼 수 있고, 날인을 승인한 문서에만 들어갑니다.</div>':'<div class="in-note">직인 이미지는 직인 관리자만 보고 바꿀 수 있습니다. 먼저 직인 관리자를 지정해 주세요.</div>')
    +'<label class="in-lb">우리 기관 임원 '+mine.length+'명</label><div class="in-note" style="margin-top:0">'+mine.map(function(m){return esc(m.name)+(m.title?' '+esc(m.title):'')}).join(' · ')+'</div><div id="setMsg" class="in-msg"></div>',640);
}
function setMsg(t,bad){var m=$('setMsg');if(m){m.textContent=t;m.style.color=bad?'#C41E2F':'#0f766e'}}
async function saveTitle(){try{await DB.collection('intraMembers').doc(ME.uid+'__'+ORG.key).update({title:$('setTitle').value.trim().slice(0,20),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});await loadDir();renderTop();setMsg('직위를 저장했습니다')}catch(e){setMsg('저장 실패: '+(e.code||e.message),true)}}
async function saveOrg(){var n=$('setName').value.trim(),p=$('setPrefix').value.trim();if(n.length<2||!p){setMsg('기관 이름과 머리글을 입력해 주세요',true);return}
  try{await DB.collection('intraOrgs').doc(ORG.key).update({name:n,docPrefix:p,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:ME.uid});await loadDir();renderTop();setMsg('저장했습니다')}catch(e){setMsg('저장 실패: '+(e.code||e.message),true)}}
async function saveKeepers(){var k=[].slice.call(document.querySelectorAll('.setKeep:checked')).map(function(x){return x.value});
  if(!confirm('직인 관리자를 '+k.length+'명으로 저장할까요?\n직인 관리자는 직인 이미지를 보고 날인을 승인할 수 있습니다.'))return;
  try{await DB.collection('intraOrgs').doc(ORG.key).update({sealKeepers:k,keepersBy:ME.uid,keepersByName:MY.name||'',keepersAt:now()});await loadDir();settings();render()}catch(e){setMsg('저장 실패: '+(e.code||e.message),true)}}
function saveSeal(inp){var f=inp.files&&inp.files[0];if(!f)return;var rd=new FileReader();rd.onload=function(ev){var im=new Image();im.onload=async function(){
  var M=480,r=Math.min(1,M/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*r);c.height=Math.round(im.height*r);var x=c.getContext('2d');x.drawImage(im,0,0,c.width,c.height);
  try{var px=x.getImageData(0,0,c.width,c.height),p=px.data;for(var i=0;i<p.length;i+=4){if(p[i]>225&&p[i+1]>225&&p[i+2]>225)p[i+3]=0}x.putImageData(px,0,0)}catch(e){}
  var u=c.toDataURL('image/png');if(u.length>600000){setMsg('이미지가 너무 큽니다. 더 작은 파일로 올려 주세요.',true);return}
  if(!confirm('이 이미지를 '+ORG.name+' 직인으로 등록할까요?'))return;
  try{await DB.collection('intraSeals').doc(ORG.key).set({orgKey:ORG.key,img:u,by:ME.uid,byName:MY.name||'',at:now()});settings()}catch(e){setMsg('등록 실패: '+(e.code||e.message),true)}};im.src=ev.target.result};rd.readAsDataURL(f)}
// ── 시행문 인쇄 ──
function print(id){var d=DOCS[id];if(!d)return;var w=window.open('','_blank');if(!w){alert('팝업이 차단되었습니다. 이 사이트의 팝업을 허용해 주세요.');return}
  var seal=(d.seal&&d.seal.status==='승인'&&d.seal.img)?'<img class="seal" src="'+esc(d.seal.img)+'">':'';
  var l=d.line||[];var last=l.length?l[l.length-1]:null;
  w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>'+esc(d.docNo||'')+' '+esc(d.title)+'</title><style>'
    +'@page{size:A4;margin:20mm 18mm}*{box-sizing:border-box}body{font-family:"Malgun Gothic","맑은 고딕",sans-serif;font-size:11.5pt;line-height:1.8;color:#111;word-break:keep-all;margin:0}'
    +'.hd{text-align:center;font-size:21pt;font-weight:800;letter-spacing:2px;padding-bottom:6mm;border-bottom:2.2px solid #111}.kv{margin:7mm 0 0}.kv div{display:flex;gap:4mm}.kv b{flex:none;width:18mm}'
    +'h1{font-size:12.5pt;margin:3mm 0 0;display:flex;gap:4mm}h1 b{flex:none;width:18mm}.rule{border-top:1px solid #111;margin:4mm 0 6mm}.body{min-height:95mm;white-space:pre-wrap}'
    +'.att{margin-top:6mm}.from{text-align:center;font-size:19pt;font-weight:800;letter-spacing:3px;margin:16mm 0 10mm;position:relative}.from span{position:relative;display:inline-block}.seal{position:absolute;right:-22mm;top:50%;transform:translateY(-50%);width:30mm;height:30mm;object-fit:contain;mix-blend-mode:multiply;opacity:.93}'
    +'.ft{border-top:2.2px solid #111;padding-top:3mm;font-size:9.5pt;line-height:1.7}.ft .ln{display:flex;flex-wrap:wrap;gap:1mm 7mm}.ft b{font-weight:800}.np{text-align:center;margin:0 0 10px}@media print{.np{display:none}}'
    +'</style></head><body><div class="np"><button onclick="window.print()" style="padding:8px 20px;font-size:14px">🖨 인쇄 · PDF로 저장</button></div>'
    +'<div class="hd">'+esc(d.orgName)+'</div><div class="kv"><div><b>수신</b><span>'+esc((d.toNames||[]).length?((d.toNames.length>4)?'수신처 참조':d.toNames.join(', ')):'내부결재')+'</span></div><div><b>(경유)</b><span></span></div></div>'
    +'<h1><b>제목</b><span>'+esc(d.title)+'</span></h1><div class="rule"></div><div class="body">'+esc(d.body)+'</div>'
    +((d.files||[]).length?'<div class="att"><b>붙임</b>&nbsp; '+d.files.map(function(f,i){return (i+1)+'. '+esc(f.name)+' 1부'}).join(' &nbsp;')+'. &nbsp;끝.</div>':'<div class="att">끝.</div>')
    +'<div class="from"><span>'+esc(d.orgName)+'회장'+seal+'</span></div>'+((d.toNames||[]).length>4?'<div style="font-size:10pt;margin-bottom:6mm"><b>수신처</b>&nbsp; '+esc(d.toNames.join(', '))+'</div>':'')
    +'<div class="ft"><div class="ln"><span><b>기안</b> '+esc(d.authorTitle||'')+' '+esc(d.authorName||'')+'</span>'+l.map(function(x){return '<span><b>'+esc(x.type||'결재')+'</b> '+esc(x.title||'')+' '+esc(x.name||'')+(x.status==='승인'?' ('+esc(fd(x.at))+')':'')+'</span>'}).join('')+'</div>'
    +'<div class="ln"><span><b>시행</b> '+esc(d.docNo||'')+' ('+esc(fd(d.doneAt||d.updatedAt))+')</span><span><b>접수</b> ( . . . )</span></div>'
    +'<div class="ln"><span>'+esc(d.orgName)+'</span><span>https://대한민국플라잉디스크연맹.com</span>'+(last?'':'')+'</div></div></body></html>');w.document.close()}

window.INTRA={setOrg:setOrg,setBox:setBox,setQ:setQ,openDoc:openDoc,closeM:closeM,openFile:openFile,openStamped:openStamped,compose:compose,cpAddLine:cpAddLine,cpDelLine:cpDelLine,cpAddTo:cpAddTo,cpAddToAll:cpAddToAll,cpDelTo:cpDelTo,cpDelKeep:cpDelKeep,cpDelFile:cpDelFile,cpFiles:cpFiles,submit:submit,approve:approve,withdraw:withdraw,del:del,recv:recv,reply:reply,sealOpen:sealOpen,sealReject:sealReject,stLoad:stLoad,stLocal:stLocal,stPage:stPage,stSize:stSize,stMake:stMake,settings:settings,saveTitle:saveTitle,saveOrg:saveOrg,saveKeepers:saveKeepers,saveSeal:saveSeal,print:print,
  _sim:function(o){ME=o.me;MY=o.my;ORGS=myOrgsOf(MY);ORG=ORGS[0];MEMBERS=o.members||[];ORGDIR=o.orgs||{};DOCS=o.docs||{};$('inDeny').style.display='none';$('inApp').style.display='block';renderTop()}};
KFDF.initApp();DB=firebase.firestore();AUTH=firebase.auth();
AUTH.onAuthStateChanged(function(u){boot(u)});
})();
