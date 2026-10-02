// intranet2.js v20261002a · 연맹 인트라넷 확장 — 쪽지 · 게시판 · 업무요청 · 설문(투표)
//   intranet.js 의 INTRA_X 연결점에 모듈을 등록합니다. 저장: intraMsgs · intraPosts · intraTasks · intraPolls (보안 규칙 v48)
//   · 쪽지: 보낸 사람과 받는 사람(parts)만 봅니다. 읽음(readBy)·지움(del)만 고칠 수 있습니다.
//   · 게시판: 공지사항(중앙 작성)·자료실·자유게시판은 임원 전체(scope 'all'), 기관 게시판은 그 기관 임원만(readOrgs).
//   · 업무요청: 요청자와 담당자(parts)만. 담당자가 진행·완료·반려, 양쪽이 의견을 남깁니다.
//   · 설문: 전체 또는 우리 기관 대상. 한 사람이 자기 응답(votes.{uid})만 쓸 수 있습니다.
(function(){
'use strict';
var X=window.INTRA_X;if(!X)return;
var esc=X.esc,nl=X.nl,ic=X.ic,loc=X.loc,$=X.$;
var MSGS={},POSTS={},TASKS={},POLLS={},ERR={},SEEN={};
var S={mail:'in',board:'notice',task:'todo',poll:'need',page:1};
var BOARDS=[['notice','공지사항'],['org','우리 기관 게시판'],['data','자료실'],['free','자유게시판']];
function FV(){return firebase.firestore.FieldValue}
function me(){return X.me().uid}
function vals(o){return Object.keys(o).map(function(k){return o[k]})}
function byNew(a,b){return String(b.createdAt||'').localeCompare(String(a.createdAt||''))}
function today(){return X.now().slice(0,10)}
function ruleNote(mod){return ERR[mod]?'<div class="gw-note" style="color:#c0392b;font-weight:700">이 기능은 보안 규칙 v48 을 게시한 뒤 사용할 수 있습니다.</div>':''}
function denied(e){var t=String((e&&(e.code||e.message))||e);return t+(/permission/i.test(t)?' (보안 규칙 v48 게시 필요)':'')}
function watch(q,store,mod){X.on(q,function(s){s.docChanges().forEach(function(c){if(c.type==='removed')delete store[c.doc.id];else store[c.doc.id]=Object.assign({_id:c.doc.id},c.doc.data())});ERR[mod]=false;X.render()},function(){ERR[mod]=true;X.render()})}
function clear(o){Object.keys(o).forEach(function(k){delete o[k]})}
async function upload(files,id){var out=[];for(var i=0;i<files.length;i++){var f=files[i];var path='intranet/'+id+'/'+Date.now()+'_'+i+'.'+(f.name.split('.').pop()||'bin').toLowerCase();
  await firebase.storage().ref(path).put(f,{contentType:X.mimeOf(f),customMetadata:{name:encodeURIComponent(f.name)}});out.push({name:f.name,path:path,size:f.size})}return out}
function pickFiles(inp,max){var ok=/\.(pdf|png|jpe?g|gif|webp|hwp|hwpx|docx?|xlsx?|pptx?|txt|zip)$/i,out=[];[].slice.call(inp.files||[]).forEach(function(f){if(!ok.test(f.name)){alert(f.name+' — 올릴 수 없는 형식입니다.');return}if(f.size>20*1024*1024){alert(f.name+' — 20MB 이하만 올릴 수 있습니다.');return}if(out.length<(max||5))out.push(f)});return out}
async function openPath(p){var w=window.open('','_blank');try{var u=await firebase.storage().ref(p).getDownloadURL();if(w)w.location.href=u;else location.href=u}catch(e){if(w)w.close();alert('파일을 열 수 없습니다: '+(e.code||e.message))}}
function fileLinks(fs){return (fs||[]).map(function(x){return '<a class="gw-file" onclick="INTRA2.file(\''+esc(x.path)+'\')">'+ic('clip',12)+' '+esc(x.name)+' <small>('+Math.max(1,Math.round((x.size||0)/1024))+'KB)</small></a>'}).join('')}
function left(btn,act,mod,folders){return '<div class="gw-new"><button class="main" onclick="'+act+'">'+ic('pen',14)+' '+btn+'</button></div><div class="gw-tree" style="margin-top:14px">'
  +folders.map(function(g){return '<div class="grp">'+ic('fold',14)+' '+g[0]+'</div>'+g[1].map(function(f){return '<a class="'+(S[mod]===f[0]?'on':'')+'" onclick="INTRA2.go(\''+mod+'\',\''+f[0]+'\')">'+ic('fold',13)+' '+esc(f[1])+(f[2]?' <b'+(f[3]?' class="hot"':'')+'>'+f[2]+'</b>':'')+'</a>'}).join('')}).join('')+'</div>'}
function bar(title,n,mod){return '<div class="gw-bar"><h2>'+esc(title)+' <span>('+n+')</span></h2><span class="sp"></span><span id="gwMsg" class="gw-say"></span></div>'+ruleNote(mod)}
function tbl(cols,rows,empty){return '<div class="gw-tblw"><table class="gw-tbl"><colgroup>'+cols.map(function(c){return '<col'+(c[1]?' style="width:'+c[1]+'px"':'')+'>'}).join('')+'</colgroup><thead><tr>'+cols.map(function(c){return '<th>'+c[0]+'</th>'}).join('')+'</tr></thead><tbody>'+(rows.length?rows.join(''):'<tr><td colspan="'+cols.length+'" class="empty">'+empty+'</td></tr>')+'</tbody></table></div>'}
function memOpts(skipMe,sel){return X.members().filter(function(m){return !skipMe||m.uid!==me()}).sort(function(a,b){return (a.level-b.level)||String(a.orgName).localeCompare(String(b.orgName),'ko')||String(a.name).localeCompare(String(b.name),'ko')}).map(function(m){return '<option value="'+esc(m._id)+'"'+(sel===m.uid?' selected':'')+'>'+esc(m.orgName)+' / '+esc(m.name)+' '+esc(m.title||'')+'</option>'}).join('')}
function go(mod,f){S[mod]=f;S.page=1;if(X.V.mod!==mod)X.setMod(mod);else X.render()}

// ══════════ 쪽지 ══════════
function mIn(){return vals(MSGS).filter(function(x){return (x.to||[]).indexOf(me())>=0&&!((x.del||{})[me()])}).sort(byNew)}
function mSent(){return vals(MSGS).filter(function(x){return x.fromUid===me()&&!((x.del||{})[me()])}).sort(byNew)}
function mTrash(){return vals(MSGS).filter(function(x){return (x.del||{})[me()]}).sort(byNew)}
function mUnread(){return mIn().filter(function(x){return !((x.readBy||{})[me()])}).length}
var MAIL={
  start:function(){clear(MSGS);watch(X.db().collection('intraMsgs').where('parts','array-contains',me()).limit(300),MSGS,'mail')},
  count:mUnread,
  alarm:function(){return ['쪽지',[['안읽은 쪽지',mUnread(),"INTRA2.go('mail','in')"]]]},
  left:function(){return left('쪽지 쓰기','INTRA2.mailNew()','mail',[['쪽지함',[['in','받은 쪽지함',mUnread(),1],['sent','보낸 쪽지함'],['trash','지운 쪽지함']]]])},
  main:function(m){var f=S.mail,L=f==='sent'?mSent():f==='trash'?mTrash():mIn();
    m.innerHTML=bar({in:'받은 쪽지함',sent:'보낸 쪽지함',trash:'지운 쪽지함'}[f],L.length,'mail')
      +tbl([['',34],[f==='sent'?'받는 사람':'보낸 사람',190],['제목'],['',40],['날짜',130]],L.map(function(x){var un=f==='in'&&!((x.readBy||{})[me()]);var rd=Object.keys(x.readBy||{}).length;
        return '<tr class="'+(un?'todo':'')+'"><td class="c">'+(un?'<b style="color:#e8590c">●</b>':'')+'</td><td>'+esc(f==='sent'?((x.toNames||[]).slice(0,3).join(', ')+((x.toNames||[]).length>3?' 외 '+((x.toNames||[]).length-3)+'명':'')):(x.fromName||'')+' ('+(x.fromOrg||'')+')')+'</td>'
          +'<td class="t"><a onclick="INTRA2.mailOpen(\''+x._id+'\')">'+esc(x.title||'(제목 없음)')+'</a>'+(f==='sent'?' <small style="color:#777">읽음 '+rd+'/'+(x.to||[]).length+'</small>':'')+'</td><td class="c">'+((x.files||[]).length?'<span class="clip">'+ic('clip',12)+'</span>':'')+'</td><td class="c">'+esc(loc(x.createdAt))+'</td></tr>'}),'쪽지가 없습니다.')}
};
var MC=null;
function mailNew(toUids,title,body){MC={to:[],files:[]};(toUids||[]).forEach(function(u){mailAddUid(u)});
  X.win('gwMail','쪽지 쓰기','<div class="gw-wtool"><button class="gw-b pri" id="mlGo" onclick="INTRA2.mailSend()">보내기</button><button class="gw-b" onclick="INTRA.closeW(\'gwMail\')">취소</button><span id="mlMsg" class="gw-say"></span></div>'
    +'<table class="gw-form"><tr><th>받는 사람 <em>*</em></th><td><div id="mlTo" class="gw-chips"></div><div class="gw-row"><select id="mlWho" style="flex:1">'+memOpts(true)+'</select><button class="gw-b" onclick="INTRA2.mailAdd()">추가</button></div>'
      +'<div class="gw-row"><button class="gw-b" onclick="INTRA2.mailGroup(\'org\')">우리 기관</button><button class="gw-b" onclick="INTRA2.mailGroup(\'central\')">중앙 사무국</button><button class="gw-b" onclick="INTRA2.mailGroup(\'sido\')">시도연맹 전체</button><button class="gw-b" onclick="INTRA2.mailGroup(\'all\')">임원 전체</button></div></td></tr>'
    +'<tr><th>제목 <em>*</em></th><td><input id="mlTitle" maxlength="120" value="'+esc(title||'')+'" style="width:100%"></td></tr>'
    +'<tr><th>내용</th><td><textarea id="mlBody" rows="10" maxlength="6000">'+esc(body||'')+'</textarea></td></tr>'
    +'<tr><th>붙임</th><td><input type="file" multiple onchange="INTRA2.mailFiles(this)"><div id="mlFiles" class="gw-chips"></div><small>파일당 20MB, 5개까지</small></td></tr></table>',760);mailDraw()}
function mailAddUid(u){var m=X.members().find(function(x){return x.uid===u});if(m&&u!==me()&&!MC.to.some(function(x){return x.uid===u})&&MC.to.length<50)MC.to.push({uid:m.uid,name:m.name,org:m.orgName})}
function mailDraw(){var t=$('mlTo');if(t)t.innerHTML=MC.to.map(function(x,i){return '<span>'+esc(x.name)+' <small>'+esc(x.org)+'</small> <a onclick="INTRA2.mailDelTo('+i+')">✕</a></span>'}).join('');var f=$('mlFiles');if(f)f.innerHTML=MC.files.map(function(x){return '<span>'+esc(x.name)+'</span>'}).join('')}
function mailAdd(){var m=X.members().find(function(x){return x._id===$('mlWho').value});if(m)mailAddUid(m.uid);mailDraw()}
function mailGroup(g){var k=X.org().key;X.members().forEach(function(m){if(g==='all'||(g==='org'&&m.orgKey===k)||(g==='central'&&m.orgKey==='central')||(g==='sido'&&m.level===1))mailAddUid(m.uid)});mailDraw()}
async function mailSend(){var m=$('mlMsg'),bad=function(t){m.textContent=t;m.className='gw-say bad'};var title=$('mlTitle').value.trim();if(!MC.to.length)return bad('받는 사람을 추가하세요');if(title.length<1)return bad('제목을 입력하세요');
  var b=$('mlGo');b.disabled=true;m.className='gw-say';m.textContent='보내는 중';
  try{var ref=X.db().collection('intraMsgs').doc();var files=await upload(MC.files,ref.id);var to=MC.to.map(function(x){return x.uid});
    await ref.set({fromUid:me(),fromName:X.my().name||'',fromOrg:X.org().name,to:to,toNames:MC.to.map(function(x){return x.name}),parts:[me()].concat(to),title:title.slice(0,120),body:$('mlBody').value.slice(0,6000),files:files,createdAt:X.now(),readBy:{},del:{}});
    to.forEach(function(u){X.notify(u,'쪽지 — '+title+' ('+(X.my().name||'')+')')});X.closeW('gwMail');go('mail','sent');X.say('쪽지를 보냈습니다')}
  catch(e){b.disabled=false;bad('보내기 실패: '+denied(e))}}
function mailOpen(id){var x=MSGS[id];if(!x)return;var mine=x.fromUid===me(),del=(x.del||{})[me()];
  if(!mine&&!((x.readBy||{})[me()])){var u={};u['readBy.'+me()]=X.now();X.db().collection('intraMsgs').doc(id).update(u).catch(function(){})}
  var rb=x.readBy||{};
  X.win('gwMail','쪽지','<div class="gw-wtool">'+(mine?'':'<button class="gw-b pri" onclick="INTRA2.mailReply(\''+id+'\')">답장</button>')+'<button class="gw-b" onclick="INTRA2.mailDel(\''+id+'\','+(del?'false':'true')+')">'+(del?'복원':'삭제')+'</button><button class="gw-b" onclick="INTRA.closeW(\'gwMail\')">닫기</button></div>'
    +'<table class="gw-form"><tr><th>보낸 사람</th><td>'+esc(x.fromName||'')+' ('+esc(x.fromOrg||'')+')</td><th>보낸 날짜</th><td>'+esc(loc(x.createdAt))+'</td></tr>'
    +'<tr><th>받는 사람</th><td colspan="3">'+(x.to||[]).map(function(u,i){return esc((x.toNames||[])[i]||'')+(mine?(rb[u]?' <small style="color:#1d6b3a">읽음</small>':' <small style="color:#999">안읽음</small>'):'')}).join(', ')+'</td></tr>'
    +'<tr><th>제목</th><td colspan="3"><b>'+esc(x.title||'')+'</b></td></tr><tr><th>내용</th><td colspan="3" class="body">'+nl(x.body||'')+'</td></tr>'
    +((x.files||[]).length?'<tr><th>붙임</th><td colspan="3">'+fileLinks(x.files)+'</td></tr>':'')+'</table>',760)}
function mailReply(id){var x=MSGS[id];if(!x)return;mailNew([x.fromUid],'RE: '+(x.title||''),'\n\n----- '+(x.fromName||'')+' ('+loc(x.createdAt)+') -----\n'+(x.body||''))}
async function mailDel(id,on){var u={};u['del.'+me()]=on?true:FV().delete();try{await X.db().collection('intraMsgs').doc(id).update(u);X.closeW('gwMail');X.say(on?'지운 쪽지함으로 옮겼습니다':'복원했습니다')}catch(e){alert('처리 실패: '+denied(e))}}

// ══════════ 게시판 ══════════
function canWrite(b){return b!=='notice'||X.isCentral()}
function pList(b){var k=X.org().key;return vals(POSTS).filter(function(p){return p.board===b&&(b!=='org'||p.org===k)}).sort(function(a,b2){return ((b2.pin?1:0)-(a.pin?1:0))||byNew(a,b2)})}
function pRecent(){var d=new Date(Date.now()-7*86400000).toISOString();return vals(POSTS).filter(function(p){return p.createdAt>d&&p.authorUid!==me()}).length}
var BOARD={
  start:function(){clear(POSTS);watch(X.db().collection('intraPosts').where('scope','==','all').limit(300),POSTS,'board');watch(X.db().collection('intraPosts').where('readOrgs','array-contains',X.org().key).limit(300),POSTS,'board')},
  count:function(){return 0},
  alarm:function(){return ['게시판',[['최근 게시물 (7일)',pRecent(),"INTRA2.go('board','notice')"]]]},
  left:function(){return left('게시하기','INTRA2.postNew()','board',[['게시판',BOARDS.map(function(b){return [b[0],b[1],pList(b[0]).length]})]])},
  main:function(m){var b=S.board,L=pList(b),nm=(BOARDS.find(function(x){return x[0]===b})||[])[1]||'';
    m.innerHTML=bar(nm,L.length,'board')+'<div class="gw-tool">'+(canWrite(b)?'<button class="gw-b pri" onclick="INTRA2.postNew()">게시하기</button>':'<small style="color:#777">공지사항은 중앙 사무국이 올립니다.</small>')+'</div>'
      +tbl([['번호',56],['제목'],['',40],['게시자',170],['조회',56],['게시일',130],['종료일',90]],L.map(function(p,i){return '<tr><td class="c">'+(p.pin?'<b style="color:#e8590c">공지</b>':(L.length-i))+'</td><td class="t"><a onclick="INTRA2.postOpen(\''+p._id+'\')">'+(p.pin?'<b>':'')+esc(p.title||'')+(p.pin?'</b>':'')+'</a>'+((p.comments||[]).length?' <small style="color:#e8590c">['+p.comments.length+']</small>':'')+'</td>'
        +'<td class="c">'+((p.files||[]).length?'<span class="clip">'+ic('clip',12)+'</span>':'')+'</td><td>'+esc(p.authorName||'')+' <small style="color:#777">'+esc(p.orgName||'')+'</small></td><td class="c">'+(p.views||0)+'</td><td class="c">'+esc(loc(p.createdAt))+'</td><td class="c">'+esc(p.until||'영구')+'</td></tr>'}),'게시물이 없습니다.')},
  home:function(){var L=vals(POSTS).sort(byNew).slice(0,6);var wk=new Date(Date.now()-3*86400000).toISOString();
    return '<section class="gw-card c4"><h3>'+ic('board',14)+' 최근 게시물<button title="전체 보기" onclick="INTRA2.go(\'board\',\'notice\')">＋</button></h3><div class="hl">'+(L.length?L.map(function(p){return '<a class="hr" onclick="INTRA2.postOpen(\''+p._id+'\')"><span class="t">'+(p.createdAt>wk?'<i class="nw">N</i>':'')+'['+esc((BOARDS.find(function(x){return x[0]===p.board})||[])[1]||'')+'] '+esc(p.title||'')+'</span><span class="w">'+esc(p.authorName||'')+'</span><span class="d">'+esc(loc(p.createdAt).slice(0,10))+'</span></a>'}).join(''):'<div class="he">게시물이 없습니다.</div>')+'</div></section>'}
};
var PC=null;
function postNew(editId){var p=editId?POSTS[editId]:null,b=p?p.board:S.board;if(!canWrite(b)){alert('공지사항은 중앙 사무국만 올릴 수 있습니다.');return}
  PC={id:editId||'',board:b,files:[],keep:p?(p.files||[]).slice():[]};
  X.win('gwPost',p?'게시물 수정':'게시하기','<div class="gw-wtool"><button class="gw-b pri" id="psGo" onclick="INTRA2.postSave()">'+(p?'저장':'게시')+'</button><button class="gw-b" onclick="INTRA.closeW(\'gwPost\')">취소</button><span id="psMsg" class="gw-say"></span></div>'
    +'<table class="gw-form"><tr><th>게시판</th><td>'+esc((BOARDS.find(function(x){return x[0]===b})||[])[1]||'')+(b==='org'?' <small>('+esc(X.org().name)+' 임원만 봅니다)</small>':' <small>(인트라넷 임원 전체가 봅니다)</small>')+'</td></tr>'
    +'<tr><th>제목 <em>*</em></th><td><input id="psTitle" maxlength="120" value="'+esc(p?p.title:'')+'" style="width:100%"></td></tr>'
    +'<tr><th>내용 <em>*</em></th><td><textarea id="psBody" rows="12" maxlength="8000">'+esc(p?p.body:'')+'</textarea></td></tr>'
    +'<tr><th>옵션</th><td><label class="ck"><input type="checkbox" id="psPin"'+(p&&p.pin?' checked':'')+'> 목록 맨 위에 고정</label> &nbsp; 게시 종료일 <input type="date" id="psUntil" value="'+esc(p?(p.until||''):'')+'"> <small>(비우면 영구)</small></td></tr>'
    +'<tr><th>붙임</th><td><input type="file" multiple onchange="INTRA2.postFiles(this)"><div id="psFiles" class="gw-chips"></div><small>파일당 20MB, 5개까지</small></td></tr></table>',800);postDraw()}
function postDraw(){var f=$('psFiles');if(f)f.innerHTML=PC.keep.map(function(x,i){return '<span>'+esc(x.name)+' <a onclick="INTRA2.postDelKeep('+i+')">✕</a></span>'}).concat(PC.files.map(function(x){return '<span>'+esc(x.name)+' <small>새 파일</small></span>'})).join('')}
async function postSave(){var m=$('psMsg'),bad=function(t){m.textContent=t;m.className='gw-say bad'};var title=$('psTitle').value.trim(),body=$('psBody').value.trim();if(title.length<2)return bad('제목을 입력하세요');if(body.length<2)return bad('내용을 입력하세요');
  var b=$('psGo');b.disabled=true;m.className='gw-say';m.textContent='저장하는 중';
  try{var col=X.db().collection('intraPosts'),ref=PC.id?col.doc(PC.id):col.doc();var files=PC.keep.concat(await upload(PC.files,ref.id));var o=X.org();
    var base={title:title.slice(0,120),body:body.slice(0,8000),files:files,pin:$('psPin').checked,until:$('psUntil').value||'',updatedAt:X.now()};
    if(PC.id)await ref.update(base);
    else await ref.set(Object.assign(base,{board:PC.board,org:o.key,orgName:o.name,authorUid:me(),authorName:X.my().name||'',scope:PC.board==='org'?'org':'all',readOrgs:[o.key],views:0,comments:[],createdAt:X.now()}));
    X.closeW('gwPost');go('board',PC.board);X.say(PC.id?'수정했습니다':'게시했습니다')}
  catch(e){b.disabled=false;bad('저장 실패: '+denied(e))}}
function postOpen(id){var p=POSTS[id];if(!p)return;var can=p.authorUid===me()||X.isCentral();
  if(!SEEN[id]){SEEN[id]=1;X.db().collection('intraPosts').doc(id).update({views:FV().increment(1)}).catch(function(){})}
  var keep=$('pcText')?$('pcText').value:'';
  X.win('gwPost',(BOARDS.find(function(x){return x[0]===p.board})||[])[1]||'게시물','<div class="gw-wtool">'+(p.authorUid===me()?'<button class="gw-b" onclick="INTRA2.postNew(\''+id+'\')">수정</button>':'')+(can?'<button class="gw-b" onclick="INTRA2.postDel(\''+id+'\')">삭제</button>':'')+'<button class="gw-b" onclick="INTRA.closeW(\'gwPost\')">닫기</button></div>'
    +'<table class="gw-form"><tr><th>제목</th><td colspan="3"><b>'+esc(p.title||'')+'</b></td></tr><tr><th>게시자</th><td>'+esc(p.authorName||'')+' ('+esc(p.orgName||'')+')</td><th>게시일</th><td>'+esc(loc(p.createdAt))+' · 조회 '+(p.views||0)+'</td></tr>'
    +'<tr><th>내용</th><td colspan="3" class="body">'+nl(p.body||'')+'</td></tr>'+((p.files||[]).length?'<tr><th>붙임</th><td colspan="3">'+fileLinks(p.files)+'</td></tr>':'')+'</table>'
    +'<h4>댓글 ('+((p.comments||[]).length)+')</h4>'+((p.comments||[]).length?'<table class="gw-tbl sm"><tbody>'+p.comments.map(function(c){return '<tr><td style="width:170px">'+esc(c.name)+'<br><small>'+esc(c.org||'')+'</small></td><td>'+nl(c.text)+'</td><td class="c" style="width:120px">'+esc(loc(c.at))+'</td></tr>'}).join('')+'</tbody></table>':'')
    +'<div class="gw-rep"><input id="pcText" maxlength="500" placeholder="댓글을 입력하세요" onkeydown="if(event.key===\'Enter\')INTRA2.postCmt(\''+id+'\')"><button class="gw-b" onclick="INTRA2.postCmt(\''+id+'\')">등록</button></div>',800);
  if(keep)$('pcText').value=keep}
async function postCmt(id){var t=($('pcText').value||'').trim();if(t.length<1)return;var p=POSTS[id];
  try{await X.db().collection('intraPosts').doc(id).update({comments:FV().arrayUnion({uid:me(),name:X.my().name||'',org:X.org().name,text:t.slice(0,500),at:X.now()})});$('pcText').value='';if(p)X.notify(p.authorUid,'댓글 — '+p.title+' ('+(X.my().name||'')+')');setTimeout(function(){if($('gwPost')&&POSTS[id])postOpen(id)},600)}catch(e){alert('등록 실패: '+denied(e))}}
async function postDel(id){var p=POSTS[id];if(!p||!confirm('['+p.title+'] 게시물을 삭제할까요? 되돌릴 수 없습니다.'))return;try{await X.db().collection('intraPosts').doc(id).delete();X.closeW('gwPost');X.say('삭제했습니다')}catch(e){alert('삭제 실패: '+denied(e))}}

// ══════════ 업무요청 ══════════
function tOf(f){var u=me();return vals(TASKS).filter(function(t){return f==='todo'?(t.toUid===u&&t.status==='요청'):f==='doing'?(t.toUid===u&&t.status==='진행'):f==='sent'?(t.fromUid===u):(t.status==='완료'||t.status==='반려')}).sort(byNew)}
var TASK={
  start:function(){clear(TASKS);watch(X.db().collection('intraTasks').where('parts','array-contains',me()).limit(300),TASKS,'task')},
  count:function(){return tOf('todo').length},
  alarm:function(){return ['업무요청',[['처리할 업무',tOf('todo').length,"INTRA2.go('task','todo')"],['진행중인 업무',tOf('doing').length,"INTRA2.go('task','doing')"]]]},
  left:function(){return left('업무요청','INTRA2.taskNew()','task',[['업무',[['todo','처리할 업무',tOf('todo').length,1],['doing','진행중인 업무',tOf('doing').length],['done','종료된 업무'],['sent','보낸 업무']]]])},
  main:function(m){var f=S.task,L=tOf(f),td=today();
    m.innerHTML=bar({todo:'처리할 업무',doing:'진행중인 업무',done:'종료된 업무',sent:'보낸 업무'}[f],L.length,'task')
      +tbl([['진행상태',80],['제목'],['요청자',150],['담당자',150],['요청일',130],['기한',96]],L.map(function(t){var late=t.due&&t.due<td&&(t.status==='요청'||t.status==='진행');
        return '<tr class="'+((t.toUid===me()&&t.status==='요청')?'todo':'')+'"><td class="c st">'+esc(t.status)+'</td><td class="t"><a onclick="INTRA2.taskOpen(\''+t._id+'\')">'+esc(t.title||'')+'</a>'+((t.notes||[]).length?' <small style="color:#e8590c">['+t.notes.length+']</small>':'')+'</td><td>'+esc(t.fromName||'')+'</td><td>'+esc(t.toName||'')+'</td><td class="c">'+esc(loc(t.createdAt))+'</td><td class="c"'+(late?' style="color:#c0392b;font-weight:700"':'')+'>'+esc(t.due||'')+'</td></tr>'}),'업무가 없습니다.')},
  home:function(){var L=tOf('todo').concat(tOf('doing')).slice(0,6);
    return '<section class="gw-card c3"><h3>'+ic('task',14)+' 처리할 업무<button title="전체 보기" onclick="INTRA2.go(\'task\',\'todo\')">＋</button></h3><div class="hl">'+(L.length?L.map(function(t){return '<a class="hr" onclick="INTRA2.taskOpen(\''+t._id+'\')"><span class="t">'+(t.status==='요청'?'<i class="nw">N</i>':'')+esc(t.title||'')+'</span><span class="w">'+esc(t.fromName||'')+'</span><span class="d">'+esc(t.due?'기한 '+t.due.slice(5):loc(t.createdAt).slice(0,10))+'</span></a>'}).join(''):'<div class="he">처리할 업무가 없습니다.</div>')+'</div></section>'}
};
function taskNew(){X.win('gwTask','업무요청','<div class="gw-wtool"><button class="gw-b pri" id="tkGo" onclick="INTRA2.taskSave()">요청</button><button class="gw-b" onclick="INTRA.closeW(\'gwTask\')">취소</button><span id="tkMsg" class="gw-say"></span></div>'
  +'<table class="gw-form"><tr><th>담당자 <em>*</em></th><td><select id="tkTo" style="width:100%">'+(memOpts(true)||'<option value="">등록된 다른 임원이 없습니다</option>')+'</select></td></tr>'
  +'<tr><th>제목 <em>*</em></th><td><input id="tkTitle" maxlength="120" style="width:100%"></td></tr><tr><th>요청 내용 <em>*</em></th><td><textarea id="tkBody" rows="8" maxlength="4000"></textarea></td></tr>'
  +'<tr><th>기한</th><td><input type="date" id="tkDue"> <small>결재 없이 가볍게 주고받는 요청입니다. 담당자가 진행·완료·반려로 답합니다.</small></td></tr></table>',720)}
async function taskSave(){var m=$('tkMsg'),bad=function(t){m.textContent=t;m.className='gw-say bad'};var to=X.members().find(function(x){return x._id===$('tkTo').value});var title=$('tkTitle').value.trim(),body=$('tkBody').value.trim();
  if(!to)return bad('담당자를 선택하세요');if(title.length<2)return bad('제목을 입력하세요');if(body.length<2)return bad('요청 내용을 입력하세요');var b=$('tkGo');b.disabled=true;
  try{await X.db().collection('intraTasks').add({title:title.slice(0,120),body:body.slice(0,4000),due:$('tkDue').value||'',fromUid:me(),fromName:X.my().name||'',fromOrg:X.org().name,toUid:to.uid,toName:to.name,toOrg:to.orgName,parts:[me(),to.uid],status:'요청',notes:[],createdAt:X.now(),updatedAt:X.now()});
    X.notify(to.uid,'업무요청 — '+title+' ('+(X.my().name||'')+')');X.closeW('gwTask');go('task','sent');X.say('업무를 요청했습니다')}catch(e){b.disabled=false;bad('요청 실패: '+denied(e))}}
function taskOpen(id){var t=TASKS[id];if(!t)return;var mine=t.toUid===me(),from=t.fromUid===me(),a=[];
  if(mine&&t.status==='요청')a.push('<button class="gw-b pri" onclick="INTRA2.taskSet(\''+id+'\',\'진행\')">진행 (접수)</button><button class="gw-b" onclick="INTRA2.taskSet(\''+id+'\',\'반려\')">반려</button>');
  if(mine&&t.status==='진행')a.push('<button class="gw-b pri" onclick="INTRA2.taskSet(\''+id+'\',\'완료\')">완료</button>');
  if(from&&t.status==='요청')a.push('<button class="gw-b" onclick="INTRA2.taskDel(\''+id+'\')">요청 취소</button>');
  a.push('<button class="gw-b" onclick="INTRA.closeW(\'gwTask\')">닫기</button>');
  X.win('gwTask','업무요청','<div class="gw-wtool">'+a.join('')+'</div><table class="gw-form"><tr><th>진행상태</th><td><b>'+esc(t.status)+'</b>'+(t.doneAt?' · '+esc(loc(t.doneAt)):'')+'</td><th>기한</th><td>'+esc(t.due||'-')+'</td></tr>'
    +'<tr><th>요청자</th><td>'+esc(t.fromName||'')+' ('+esc(t.fromOrg||'')+')</td><th>담당자</th><td>'+esc(t.toName||'')+' ('+esc(t.toOrg||'')+')</td></tr>'
    +'<tr><th>제목</th><td colspan="3"><b>'+esc(t.title||'')+'</b></td></tr><tr><th>요청 내용</th><td colspan="3" class="body" style="height:auto;min-height:90px">'+nl(t.body||'')+'</td></tr></table>'
    +'<h4>의견 · 처리 내용 ('+((t.notes||[]).length)+')</h4>'+((t.notes||[]).length?'<table class="gw-tbl sm"><tbody>'+t.notes.map(function(n){return '<tr><td style="width:150px">'+esc(n.name)+(n.act?'<br><small>'+esc(n.act)+'</small>':'')+'</td><td>'+nl(n.text)+'</td><td class="c" style="width:120px">'+esc(loc(n.at))+'</td></tr>'}).join('')+'</tbody></table>':'')
    +'<div class="gw-rep"><input id="tkNote" maxlength="500" placeholder="의견을 입력하세요" onkeydown="if(event.key===\'Enter\')INTRA2.taskNote(\''+id+'\')"><button class="gw-b" onclick="INTRA2.taskNote(\''+id+'\')">등록</button></div>',760)}
async function taskSet(id,st){var t=TASKS[id];if(!t)return;var note='';if(st!=='진행'){note=prompt(st==='완료'?'처리 결과를 입력하세요':'반려 사유를 입력하세요','');if(note===null)return;if(note.trim().length<2){alert('내용을 입력하세요.');return}}
  var u={status:st,updatedAt:X.now(),notes:FV().arrayUnion({uid:me(),name:X.my().name||'',act:st,text:(note||'접수했습니다').trim().slice(0,500),at:X.now()})};if(st==='완료'||st==='반려')u.doneAt=X.now();
  try{await X.db().collection('intraTasks').doc(id).update(u);X.notify(t.fromUid,'업무 '+st+' — '+t.title+' ('+(X.my().name||'')+')');X.closeW('gwTask');X.say(st+' 처리했습니다')}catch(e){alert('처리 실패: '+denied(e))}}
async function taskNote(id){var t=TASKS[id],v=($('tkNote').value||'').trim();if(!t||v.length<1)return;
  try{await X.db().collection('intraTasks').doc(id).update({notes:FV().arrayUnion({uid:me(),name:X.my().name||'',act:'',text:v.slice(0,500),at:X.now()}),updatedAt:X.now()});X.notify(t.fromUid===me()?t.toUid:t.fromUid,'업무 의견 — '+t.title+' ('+(X.my().name||'')+')');setTimeout(function(){if($('gwTask')&&TASKS[id])taskOpen(id)},600)}catch(e){alert('등록 실패: '+denied(e))}}
async function taskDel(id){if(!confirm('업무요청을 취소(삭제)할까요?'))return;try{await X.db().collection('intraTasks').doc(id).delete();X.closeW('gwTask');X.say('요청을 취소했습니다')}catch(e){alert('취소 실패: '+denied(e))}}

// ══════════ 설문 · 투표 ══════════
function pOpen(p){return !p.closed&&(!p.until||p.until>=today())}
function pollOf(f){var u=me();return vals(POLLS).filter(function(p){return f==='need'?(pOpen(p)&&!((p.votes||{})[u])):f==='open'?pOpen(p):f==='mine'?p.authorUid===u:!pOpen(p)}).sort(byNew)}
// 문항 입력: 빈 줄로 문항을 나누고, 첫 줄이 질문(* 로 시작하면 복수 선택), 나머지 줄이 보기
function parseQs(t){return String(t||'').replace(/\r/g,'').split(/\n\s*\n/).map(function(b){var l=b.split('\n').map(function(x){return x.trim()}).filter(Boolean);if(l.length<3)return null;var multi=/^\*/.test(l[0]);return {q:l[0].replace(/^\*\s*/,'').slice(0,200),multi:multi,opts:l.slice(1,13).map(function(x){return x.replace(/^[-·\d.)\s]+/,'').slice(0,100)}).filter(Boolean)}}).filter(function(q){return q&&q.opts.length>=2}).slice(0,10)}
var POLL={
  start:function(){clear(POLLS);watch(X.db().collection('intraPolls').where('scope','==','all').limit(200),POLLS,'poll');watch(X.db().collection('intraPolls').where('readOrgs','array-contains',X.org().key).limit(200),POLLS,'poll')},
  count:function(){return pollOf('need').length},
  alarm:function(){return ['설문',[['응답할 설문',pollOf('need').length,"INTRA2.go('poll','need')"]]]},
  left:function(){return left('설문 등록','INTRA2.pollNew()','poll',[['설문 · 투표',[['need','응답할 설문',pollOf('need').length,1],['open','진행중 설문',pollOf('open').length],['closed','종료 설문'],['mine','내가 만든 설문']]]])},
  main:function(m){var f=S.poll,L=pollOf(f);
    m.innerHTML=bar({need:'응답할 설문',open:'진행중 설문',closed:'종료 설문',mine:'내가 만든 설문'}[f],L.length,'poll')
      +tbl([['제목'],['작성자',170],['상태',70],['작성일',130],['종료일',96],['응답자',70]],L.map(function(p){var n=Object.keys(p.votes||{}).length,done=(p.votes||{})[me()];
        return '<tr class="'+(pOpen(p)&&!done?'todo':'')+'"><td class="t"><a onclick="INTRA2.pollOpen(\''+p._id+'\')">'+esc(p.title||'')+'</a>'+(done?' <small style="color:#1d6b3a">응답함</small>':'')+'</td><td>'+esc(p.authorName||'')+' <small style="color:#777">'+esc(p.orgName||'')+'</small></td><td class="c st">'+(pOpen(p)?'진행중':'종료')+'</td><td class="c">'+esc(loc(p.createdAt))+'</td><td class="c">'+esc(p.until||'-')+'</td><td class="c">'+n+'</td></tr>'}),'설문이 없습니다.')}
};
function pollNew(){X.win('gwPoll','설문 등록','<div class="gw-wtool"><button class="gw-b pri" id="plGo" onclick="INTRA2.pollSave()">등록</button><button class="gw-b" onclick="INTRA.closeW(\'gwPoll\')">취소</button><span id="plMsg" class="gw-say"></span></div>'
  +'<table class="gw-form"><tr><th>제목 <em>*</em></th><td><input id="plTitle" maxlength="120" style="width:100%"></td></tr><tr><th>안내</th><td><textarea id="plDesc" rows="3" maxlength="1000"></textarea></td></tr>'
  +'<tr><th>대상 · 기간</th><td><select id="plScope" style="width:200px"><option value="all">인트라넷 임원 전체</option><option value="org">'+esc(X.org().name)+'</option></select> &nbsp; 종료일 <input type="date" id="plUntil"> &nbsp; <label class="ck"><input type="checkbox" id="plAnon"> 무기명 (응답자 이름을 저장하지 않음)</label></td></tr>'
  +'<tr><th>문항 <em>*</em></th><td><textarea id="plQs" rows="12" placeholder="정기총회 개최 일자는 언제가 좋습니까?&#10;11월 14일(토)&#10;11월 21일(토)&#10;11월 28일(토)&#10;&#10;*필요한 지원을 모두 골라 주세요&#10;용품&#10;강사 파견&#10;홍보물"></textarea><small>빈 줄로 문항을 나눕니다. 첫 줄은 질문, 그 아래 줄들이 보기(2개 이상)입니다. 질문을 * 로 시작하면 여러 개를 고를 수 있습니다. 문항 10개, 보기 12개까지.</small></td></tr></table>',780)}
async function pollSave(){var m=$('plMsg'),bad=function(t){m.textContent=t;m.className='gw-say bad'};var title=$('plTitle').value.trim(),qs=parseQs($('plQs').value);if(title.length<2)return bad('제목을 입력하세요');if(!qs.length)return bad('문항을 입력하세요 (질문 한 줄 + 보기 2줄 이상)');
  var o=X.org(),sc=$('plScope').value,b=$('plGo');b.disabled=true;
  try{await X.db().collection('intraPolls').add({title:title.slice(0,120),desc:$('plDesc').value.slice(0,1000),questions:qs,until:$('plUntil').value||'',scope:sc,readOrgs:[o.key],org:o.key,orgName:o.name,authorUid:me(),authorName:X.my().name||'',anon:$('plAnon').checked,votes:{},closed:false,createdAt:X.now()});
    X.members().forEach(function(mm){if(sc==='all'||mm.orgKey===o.key)X.notify(mm.uid,'설문 — '+title+' ('+o.name+')')});X.closeW('gwPoll');go('poll','mine');X.say('설문을 등록했습니다')}catch(e){b.disabled=false;bad('등록 실패: '+denied(e))}}
function pollOpen(id){var p=POLLS[id];if(!p)return;var mineV=(p.votes||{})[me()],open=pOpen(p),author=p.authorUid===me(),vs=vals(p.votes||{}),n=vs.length,showRes=!!mineV||author||!open;
  var qh=(p.questions||[]).map(function(q,qi){var cnt=q.opts.map(function(_,oi){return vs.filter(function(v){return ((v.a||{})[qi]||[]).indexOf(oi)>=0}).length});var mx=Math.max(1,n);
    return '<h4>'+(qi+1)+'. '+esc(q.q)+(q.multi?' <small>(복수 선택)</small>':'')+'</h4><div class="gw-poll">'+q.opts.map(function(o,oi){var ck=mineV&&((mineV.a||{})[qi]||[]).indexOf(oi)>=0;
      return '<label><input type="'+(q.multi?'checkbox':'radio')+'" name="plq'+qi+'" value="'+oi+'"'+(ck?' checked':'')+(open?'':' disabled')+'> <span>'+esc(o)+'</span>'+(showRes?'<i><b style="width:'+Math.round(cnt[oi]/mx*100)+'%"></b></i><em>'+cnt[oi]+'</em>':'')+'</label>'}).join('')+'</div>'}).join('');
  var who=(author&&!p.anon&&n)?'<h4>응답자 ('+n+')</h4><div class="gw-note" style="padding:0">'+vs.map(function(v){return esc(v.name||'')+(v.org?' <small>('+esc(v.org)+')</small>':'')}).join(', ')+'</div>':'';
  X.win('gwPoll','설문','<div class="gw-wtool">'+(open?'<button class="gw-b pri" onclick="INTRA2.pollVote(\''+id+'\')">'+(mineV?'응답 수정':'응답 제출')+'</button>':'')+(author&&open?'<button class="gw-b" onclick="INTRA2.pollClose(\''+id+'\')">설문 종료</button>':'')+((author||X.isCentral())?'<button class="gw-b" onclick="INTRA2.pollDel(\''+id+'\')">삭제</button>':'')+'<button class="gw-b" onclick="INTRA.closeW(\'gwPoll\')">닫기</button><span id="plMsg" class="gw-say"></span></div>'
    +'<table class="gw-form"><tr><th>제목</th><td colspan="3"><b>'+esc(p.title||'')+'</b></td></tr><tr><th>작성자</th><td>'+esc(p.authorName||'')+' ('+esc(p.orgName||'')+')</td><th>상태</th><td>'+(open?'진행중':'종료')+(p.until?' · 종료일 '+esc(p.until):'')+' · 응답 '+n+'명'+(p.anon?' · 무기명':'')+'</td></tr>'+(p.desc?'<tr><th>안내</th><td colspan="3">'+nl(p.desc)+'</td></tr>':'')+'</table>'
    +qh+(showRes?'':'<div class="gw-note" style="padding:8px 0">응답을 제출하면 집계 결과가 보입니다.</div>')+who,760)}
async function pollVote(id){var p=POLLS[id];if(!p)return;var a={},miss=-1;(p.questions||[]).forEach(function(q,qi){var v=[].slice.call(document.querySelectorAll('input[name="plq'+qi+'"]:checked')).map(function(x){return +x.value});if(!v.length&&miss<0)miss=qi;a[qi]=v});
  if(miss>=0){var m=$('plMsg');m.textContent=(miss+1)+'번 문항에 응답해 주세요';m.className='gw-say bad';return}
  var u={};u['votes.'+me()]={a:a,name:p.anon?'':(X.my().name||''),org:p.anon?'':X.org().name,at:X.now()};
  try{await X.db().collection('intraPolls').doc(id).update(u);X.say('응답을 제출했습니다');setTimeout(function(){if($('gwPoll')&&POLLS[id])pollOpen(id)},600)}catch(e){alert('제출 실패: '+denied(e))}}
async function pollClose(id){if(!confirm('설문을 종료할까요? 더 이상 응답을 받지 않습니다.'))return;try{await X.db().collection('intraPolls').doc(id).update({closed:true,updatedAt:X.now()});X.closeW('gwPoll');X.say('설문을 종료했습니다')}catch(e){alert('처리 실패: '+denied(e))}}
async function pollDel(id){if(!confirm('설문을 삭제할까요? 응답 기록도 함께 지워집니다.'))return;try{await X.db().collection('intraPolls').doc(id).delete();X.closeW('gwPoll');X.say('삭제했습니다')}catch(e){alert('삭제 실패: '+denied(e))}}

X.reg('mail',MAIL);X.reg('board',BOARD);X.reg('task',TASK);X.reg('poll',POLL);
window.INTRA2={go:go,file:openPath,parseQs:parseQs,
  mailNew:mailNew,mailAdd:mailAdd,mailGroup:mailGroup,mailDelTo:function(i){MC.to.splice(i,1);mailDraw()},mailFiles:function(inp){MC.files=pickFiles(inp,5);mailDraw()},mailSend:mailSend,mailOpen:mailOpen,mailReply:mailReply,mailDel:mailDel,
  postNew:postNew,postFiles:function(inp){PC.files=pickFiles(inp,Math.max(0,5-PC.keep.length));postDraw()},postDelKeep:function(i){PC.keep.splice(i,1);postDraw()},postSave:postSave,postOpen:postOpen,postCmt:postCmt,postDel:postDel,
  taskNew:taskNew,taskSave:taskSave,taskOpen:taskOpen,taskSet:taskSet,taskNote:taskNote,taskDel:taskDel,
  pollNew:pollNew,pollSave:pollSave,pollOpen:pollOpen,pollVote:pollVote,pollClose:pollClose,pollDel:pollDel,
  _sim:function(o){[['msgs',MSGS],['posts',POSTS],['tasks',TASKS],['polls',POLLS]].forEach(function(p){clear(p[1]);Object.assign(p[1],o[p[0]]||{})});X.render()}};
})();
