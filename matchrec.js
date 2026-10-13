// matchrec.js v20261014a · 대회 경기기록 공용 모듈 — 출전 오더지 · 경기 기록(득점·어시스트·제재) · 디스크골프 스코어 · 결과지 PDF · 집계
//   화면: match.html(기록 콘솔·경기 관리) · competition.html(오더지 작성) · results.html(공개 결과) · live.html(중계 콘솔 호환)
//   원칙 ① 경기 문서(liveMatches) 하나가 원본 ② 점수는 득점 기록(events)에서 계산해 a.score/b.score 에 같이 저장(중계 화면 호환)
//        ③ 입력권(ctrl)은 한 번에 한 화면 ④ 기록 추가는 고유 id + 트랜잭션(중복 전송 무시) ⑤ 취소는 삭제 대신 void 표시
//   시간: 앱 타이머는 참고용(분 단위 제안) — 득점마다 분을 고칠 수 있고 「시계 맞추기」로 현장 시계에 맞춤
(function(){
  'use strict';
  var PERIODS=['전반','후반','연장'];
  var CARDS={C:'주의',W:'퇴장',D:'경기지연',N:'비교육적 언행'};
  var CTRL_FRESH=90*1000, CTRL_BEAT=30*1000;
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function uid8(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
  function p2(n){return String(n).padStart(2,'0')}
  function now(){return Date.now()}
  function tsMs(x){try{if(!x)return 0;if(x.toDate)return x.toDate().getTime();if(typeof x==='number')return x;var d=new Date(x);return isNaN(d)?0:d.getTime()}catch(e){return 0}}

  // ── 점수: 득점 기록(type goal) + 옛 중계 기록(d ±1) — void 는 제외 ──
  function score(events){
    var a=0,b=0,half={a:{},b:{}};
    (events||[]).forEach(function(e){
      if(!e||e.void)return;var d=0;
      if(e.type==='goal')d=1;else if(e.type==null&&typeof e.d==='number')d=e.d;else return;
      if(e.side==='a')a+=d;else if(e.side==='b')b+=d;else return;
      var p=e.period||'';if(p){var H=half[e.side];H[p]=(H[p]||0)+d}
    });
    return {a:Math.max(0,a),b:Math.max(0,b),half:half};
  }
  function goals(events,side){return (events||[]).filter(function(e){return e&&!e.void&&e.type==='goal'&&(!side||e.side===side)})}

  // ── 타이머(문서 기준) ──
  function clockMs(m){var c=(m&&m.clock)||{};return (+c.base||0)+(c.running&&c.startedAt?Math.max(0,now()-c.startedAt):0)}
  function clockTxt(m){var t=Math.floor(clockMs(m)/1000);return p2(Math.floor(t/60))+':'+p2(t%60)}
  function minuteOf(m){return Math.floor(clockMs(m)/60000)}
  function clockSet(m,minutes){var c=Object.assign({running:false,base:0,startedAt:0},(m&&m.clock)||{});var ms=Math.max(0,Math.round(+minutes||0)*60000);if(c.running){c.startedAt=now();c.base=ms}else{c.base=ms;c.startedAt=0}return c}
  function clockAct(m,act){var c=Object.assign({running:false,base:0,startedAt:0},(m&&m.clock)||{});
    if(act==='start'){if(!c.running){c.running=true;c.startedAt=now()}}
    else if(act==='pause'){c.base=clockMs(m);c.running=false;c.startedAt=0}
    else if(act==='reset'){c.running=false;c.base=0;c.startedAt=0}
    return c}

  // ── 입력권 ──
  function ctrlState(m,uid){var c=(m&&m.ctrl)||null;if(!c||!c.uid)return 'free';if(now()-(+c.at||0)>CTRL_FRESH)return 'stale';return c.uid===uid?'mine':'other'}
  function ctrlLabel(m){var c=(m&&m.ctrl)||{};return (c.name||'')+(c.screen==='live'?' (중계 콘솔)':c.screen==='match'?' (기록 콘솔)':'')}

  // ── 기록 추가·취소 (트랜잭션) ──
  //   opts: {uid,name,screen,requireCtrl}  · ev: {id,type,side,min,period,scorer,assist,card,target,note}
  function addEvent(DB,fb,id,ev,opts){
    opts=opts||{};var ref=DB.collection('liveMatches').doc(id);
    return DB.runTransaction(function(tx){return tx.get(ref).then(function(s){
      if(!s.exists)throw new Error('경기 문서가 없습니다');var m=s.data()||{};
      if(m.locked)throw new Error('확정(잠금)된 경기입니다 — 사무국 정정으로만 바꿀 수 있습니다');
      var st=ctrlState(m,opts.uid);if(opts.requireCtrl&&st==='other')throw new Error('다른 화면('+ctrlLabel(m)+')이 입력 중입니다. 「넘겨받기」 후 다시 눌러 주세요');
      var evs=(m.events||[]).slice();if(evs.some(function(e){return e&&e.id&&e.id===ev.id}))return {dup:true};
      var rec=Object.assign({},ev,{t:ev.t||new Date().toISOString(),by:{uid:opts.uid||'',name:opts.name||''}});
      if(rec.type==='goal'){rec.d=1;rec.team=(m[rec.side]||{}).name||''}
      evs.push(rec);var sc=score(evs);if(rec.type==='goal')rec.score=sc.a+':'+sc.b;
      var upd={events:evs,'a.score':sc.a,'b.score':sc.b,halfScore:sc.half,updatedAt:fb.firestore.FieldValue.serverTimestamp(),by:opts.name||''};
      if(m.status==='예정'&&rec.type==='goal'){upd.status='진행';upd.startAt=fb.firestore.FieldValue.serverTimestamp()}
      if(opts.extra)Object.assign(upd,opts.extra);
      tx.update(ref,upd);return {ok:true,score:sc}})})}
  function voidEvent(DB,fb,id,evId,opts){
    opts=opts||{};var ref=DB.collection('liveMatches').doc(id);
    return DB.runTransaction(function(tx){return tx.get(ref).then(function(s){
      var m=s.data()||{};if(m.locked)throw new Error('확정(잠금)된 경기입니다');
      var evs=(m.events||[]).slice();var i=evs.findIndex(function(e){return e&&e.id===evId});if(i<0)throw new Error('기록을 찾지 못했습니다');
      if(evs[i].void)return {dup:true};
      evs[i]=Object.assign({},evs[i],{void:{by:opts.name||'',uid:opts.uid||'',at:new Date().toISOString(),reason:opts.reason||''}});
      var sc=score(evs);tx.update(ref,{events:evs,'a.score':sc.a,'b.score':sc.b,halfScore:sc.half,updatedAt:fb.firestore.FieldValue.serverTimestamp(),by:opts.name||''});return {ok:true}})})}
  function editEvent(DB,fb,id,evId,patch,opts){
    opts=opts||{};var ref=DB.collection('liveMatches').doc(id);
    return DB.runTransaction(function(tx){return tx.get(ref).then(function(s){
      var m=s.data()||{};if(m.locked&&!opts.force)throw new Error('확정(잠금)된 경기입니다');
      var evs=(m.events||[]).slice();var i=evs.findIndex(function(e){return e&&e.id===evId});if(i<0)throw new Error('기록을 찾지 못했습니다');
      var hist=(evs[i].edits||[]).concat([{by:opts.name||'',at:new Date().toISOString(),before:{min:evs[i].min,period:evs[i].period,scorer:evs[i].scorer||null,assist:evs[i].assist||null}}]);
      evs[i]=Object.assign({},evs[i],patch,{edits:hist});var sc=score(evs);
      tx.update(ref,{events:evs,'a.score':sc.a,'b.score':sc.b,halfScore:sc.half,updatedAt:fb.firestore.FieldValue.serverTimestamp(),by:opts.name||''});return {ok:true}})})}

  // ── 오프라인 대기열 (기기 저장 → 연결되면 순서대로 전송) ──
  var QKEY='kfdf_mr_queue';
  function qLoad(){try{return JSON.parse(localStorage.getItem(QKEY)||'[]')}catch(e){return []}}
  function qSave(q){try{localStorage.setItem(QKEY,JSON.stringify(q))}catch(e){}}
  function qPush(op){var q=qLoad();q.push(Object.assign({qid:uid8(),at:now()},op));qSave(q)}
  function qCount(matchId){return qLoad().filter(function(o){return !matchId||o.id===matchId}).length}
  var flushing=false;
  function flush(DB,fb,opts,onDone){
    if(flushing)return Promise.resolve();flushing=true;var q=qLoad();var left=[];var fails=[];
    var chain=Promise.resolve();
    q.forEach(function(op){chain=chain.then(function(){
      var p=op.kind==='add'?addEvent(DB,fb,op.id,op.ev,Object.assign({},opts,op.opts||{})):op.kind==='void'?voidEvent(DB,fb,op.id,op.evId,Object.assign({},opts,op.opts||{})):Promise.resolve();
      return p.then(function(){},function(e){var c=String(e&&(e.code||e.message)||'');if(/unavailable|network|deadline|offline|Failed to fetch/i.test(c))left.push(op);else fails.push({op:op,err:c})})})});
    return chain.then(function(){qSave(left);flushing=false;if(onDone)onDone({sent:q.length-left.length-fails.length,left:left.length,fails:fails})},function(){flushing=false})}

  // ── 기록 권한 ──
  function canRecord(m,uid,my){my=my||{};var roles=[my.role].concat(my.roles||[]);
    if(my.owner===true||roles.indexOf('admin')>=0||roles.indexOf('sidoOfficer')>=0||my.liveScorer===true)return true;
    return !!(uid&&m&&(m.officialUids||[]).indexOf(uid)>=0)}
  function isStaffUser(my){my=my||{};var roles=[my.role].concat(my.roles||[]);return my.owner===true||roles.indexOf('admin')>=0||roles.indexOf('sidoOfficer')>=0||my.liveScorer===true}

  // ── 오더지 ──
  function orderId(slotId,pid){return slotId+'_'+String(pid||'').replace(/[^A-Za-z0-9_-]/g,'')}
  function orderFromEntry(slotId,s,c,prev){
    var p=prev||{};var pm={};(p.players||[]).forEach(function(x){pm[x.key]=x});
    var players=(c.roster||[]).map(function(r,i){var key=String(r.name||'').replace(/\s+/g,'')+'|'+(r.birth||'');var o=pm[key]||{};
      return {i:i+1,key:key,name:r.name||'',birth:r.birth||'',school:r.school||'',gender:r.gender||'',no:o.no!=null?o.no:'',subNo:o.subNo||'',role:o.role||'',uid:r.memberUid||r.uid||'',guardianUid:r.guardianUid||''}});
    return {slotId:slotId,pid:c.pid||'',uid:c.uid||'',team:c.name||'',school:c.teamOrg||'',teamType:c.teamType||'',div:(c.prefs||[])[0]||'',gender:c.teamGender||'',
      compTitle:s.title||'',coach:{name:p.coach&&p.coach.name||c.leader||'',role:p.coach&&p.coach.role||c.leaderRole||'',sign:p.coach&&p.coach.sign||'',at:p.coach&&p.coach.at||''},
      players:players,status:p.status||'작성중',updatedAt:p.updatedAt||null}}
  function orderCheck(o){var errs=[],warn=[];var nos={};
    (o.players||[]).forEach(function(x){var n=String(x.no==null?'':x.no).trim();if(n===''){warn.push(x.name+' 배번 없음');return}if(!/^\d{1,3}$/.test(n)){errs.push(x.name+' 배번은 숫자(1~3자리)');return}if(nos[n]){errs.push('배번 '+n+' 중복('+nos[n]+'·'+x.name+')')}else nos[n]=x.name});
    if(!(o.players||[]).some(function(x){return String(x.no||'').trim()!==''}))errs.push('배번을 한 명 이상 입력해 주세요');
    if(!(o.players||[]).some(function(x){return x.role==='주장'}))warn.push('주장이 지정되지 않음');
    return {errs:errs,warn:warn}}
  // 경기 화면의 선수 버튼 순서: 주전 → 주장 → 교체 → 미지정, 같은 급은 배번순
  function lineup(o){var P=(o&&o.players||[]).filter(function(x){return String(x.no||'').trim()!==''});var rk={'주장':0,'주전':0,'교체':2,'':1};
    return P.slice().sort(function(a,b){return (rk[a.role]!=null?rk[a.role]:1)-(rk[b.role]!=null?rk[b.role]:1)||(+a.no)-(+b.no)}).map(function(x){return {no:String(x.no),name:x.name,key:x.key,role:x.role||''}})}

  // ── 경기 안 선수 통계 ──
  function playerStats(m){var S={a:{},b:{}};(m.events||[]).forEach(function(e){if(!e||e.void)return;var side=e.side;if(!S[side])return;
    if(e.type==='goal'){if(e.scorer){var k=e.scorer.no+'|'+e.scorer.name;S[side][k]=S[side][k]||{no:e.scorer.no,name:e.scorer.name,g:0,a:0,c:[]};S[side][k].g++}
      if(e.assist){var k2=e.assist.no+'|'+e.assist.name;S[side][k2]=S[side][k2]||{no:e.assist.no,name:e.assist.name,g:0,a:0,c:[]};S[side][k2].a++}}
    if(e.type==='card'&&e.target){var k3=(e.target.no||'')+'|'+e.target.name;S[side][k3]=S[side][k3]||{no:e.target.no||'',name:e.target.name,g:0,a:0,c:[]};S[side][k3].c.push(e.card)}});
    return S}

  // ── 대회 집계 (compStats) ──
  //   matches: liveMatches 문서 배열(slot 소속) · 순위표는 부문별 승점(승 3·무 1), 득실 → 다득점
  function computeStats(matches,orders){
    var byDiv={},scorers={},played=0;
    (matches||[]).forEach(function(m){if(!m||m.golf)return;var dv=m.div||'전체';var D=byDiv[dv]=byDiv[dv]||{teams:{},matches:0};
      var sc=score(m.events||[]);var fin=m.status==='종료';
      ['a','b'].forEach(function(side){var t=m[side]||{};var key=t.pid||t.name||'';if(!key)return;var T=D.teams[key]=D.teams[key]||{pid:t.pid||'',name:t.name||'',school:t.school||'',p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0,fair:0};
        if(fin){var me=side==='a'?sc.a:sc.b,op=side==='a'?sc.b:sc.a;T.p++;T.gf+=me;T.ga+=op;if(me>op)T.w++;else if(me<op)T.l++;else T.d++;T.pts=T.w*3+T.d;T.fair+=((m.fairplay||{})[side]||0)}});
      if(fin){D.matches++;played++}
      (m.events||[]).forEach(function(e){if(!e||e.void||e.type!=='goal')return;var t=m[e.side]||{};
        [['scorer','g'],['assist','a']].forEach(function(x){var p=e[x[0]];if(!p||!p.name)return;var k=dv+'|'+(t.pid||t.name)+'|'+p.no+'|'+p.name;var S=scorers[k]=scorers[k]||{div:dv,team:t.name||'',school:t.school||'',no:p.no,name:p.name,g:0,a:0};S[x[1]]++})})});
    Object.keys(byDiv).forEach(function(dv){var T=byDiv[dv].teams;byDiv[dv].table=Object.keys(T).map(function(k){return T[k]}).sort(function(x,y){return y.pts-x.pts||(y.gf-y.ga)-(x.gf-x.ga)||y.gf-x.gf||y.fair-x.fair||String(x.name).localeCompare(String(y.name),'ko')}).map(function(t,i){return Object.assign({rank:i+1},t)})});
    var top=Object.keys(scorers).map(function(k){return scorers[k]}).sort(function(x,y){return y.g-x.g||y.a-x.a||String(x.name).localeCompare(String(y.name),'ko')});
    return {byDiv:byDiv,scorers:top,played:played,total:(matches||[]).filter(function(m){return m&&!m.golf}).length,at:new Date().toISOString()}}

  // ── 디스크골프 ──
  //   round: {holes:9|18, par:[...], groups:[{no,players:[{pid,name,school,div}],marker:{uid,name}}], scores:{pid:{h:[...], po:[...]}}, playoff:[{hole,par}]}
  //   순위: 합계 오름차순 → 동타는 연장 홀(playoff) 결과로만 가림(연장 미실시·동타 지속은 공동 순위 T)
  function golfTotals(round,pid){var s=((round.scores||{})[pid])||{};var h=(s.h||[]).slice(0,round.holes||18);var tot=0,n=0;h.forEach(function(v){if(v!=null&&v!==''){tot+=+v;n++}});
    var parSum=0;(round.par||[]).slice(0,n).forEach(function(v){parSum+=+v||0});return {total:tot,holesIn:n,toPar:n?tot-parSum:0,po:(s.po||[]).map(function(v){return v==null||v===''?null:+v}),done:n>=(round.holes||18)}}
  function golfRank(round){var P=[];(round.groups||[]).forEach(function(g){(g.players||[]).forEach(function(p){P.push(Object.assign({},p,golfTotals(round,p.pid)))})});
    var byDiv={};P.forEach(function(p){var dv=p.div||'전체';(byDiv[dv]=byDiv[dv]||[]).push(p)});
    Object.keys(byDiv).forEach(function(dv){var L=byDiv[dv];
      L.sort(function(x,y){if(x.done!==y.done)return x.done?-1:1;if(x.total!==y.total)return x.total-y.total;
        var n=Math.max(x.po.length,y.po.length);for(var i=0;i<n;i++){var a=x.po[i],b=y.po[i];if(a==null||b==null)return 0;if(a!==b)return a-b}return 0});
      var rank=0;L.forEach(function(p,i){var prev=L[i-1];var tie=prev&&prev.done===p.done&&prev.total===p.total&&(function(){var n=Math.max(prev.po.length,p.po.length);for(var k=0;k<n;k++){var a=prev.po[k],b=p.po[k];if(a==null||b==null)return true;if(a!==b)return false}return true})();
        if(!tie)rank=i+1;p.rank=rank;p.tied=!!tie||(L[i+1]&&L[i+1].total===p.total&&L[i+1].done===p.done&&(function(){var n=Math.max(L[i+1].po.length,p.po.length);for(var k=0;k<n;k++){var a=L[i+1].po[k],b=p.po[k];if(a==null||b==null)return true;if(a!==b)return false}return true})())})});
    return byDiv}

  // ── 결과 페이지용 표시 ──
  function evLine(e){if(!e)return '';var mm=e.min!=null&&e.min!==''?e.min+"'":(e.clock||'');var who=e.type==='goal'?((e.scorer?('#'+e.scorer.no+' '+e.scorer.name):'득점자 미지정')+(e.assist?' · 어시 #'+e.assist.no+' '+e.assist.name:'')):e.type==='card'?(CARDS[e.card]||e.card)+' '+((e.target||{}).kind==='coach'?'지도자'+(((e.target||{}).name&&e.target.name!=='지도자')?' '+e.target.name:''):(((e.target||{}).no?'#'+e.target.no+' ':'')+((e.target||{}).name||''))):e.type==='timeout'?'타임아웃':e.type==='injury'?'부상 중단':(e.note||e.type||'');return {min:mm,who:who}}

  // ══ 인쇄(PDF) — 양식 그대로 ══
  var PCSS='@page{size:A4;margin:12mm}body{margin:0;font-family:Pretendard,"Malgun Gothic",sans-serif;color:#111;font-size:11pt}*{box-sizing:border-box}'
    +'.bar{position:sticky;top:0;background:#16181d;color:#fff;padding:8px 12px;font-size:13px;display:flex;gap:10px;align-items:center}.bar button{background:#C41E2F;color:#fff;border:none;border-radius:8px;padding:7px 14px;font-weight:800;cursor:pointer;font-family:inherit}'
    +'@media print{.bar{display:none}}.pg{width:186mm;margin:8mm auto;page-break-after:always}.pg:last-child{page-break-after:auto}'
    +'table{border-collapse:collapse;width:100%}td,th{border:1px solid #333;padding:2.2mm 2mm;font-size:10.5pt;text-align:center;vertical-align:middle;word-break:keep-all}'
    +'th{background:#e8f3ee;font-weight:800}.h1{text-align:center;font-size:22pt;font-weight:900;margin:2mm 0 1mm}.h2{text-align:center;font-size:12.5pt;font-weight:700;margin:0 0 4mm;color:#333}'
    +'.lab{background:#e8f3ee;font-weight:800}.sig{height:11mm;object-fit:contain;max-width:34mm;vertical-align:middle}.l{text-align:left}.s{font-size:9.5pt}.y{background:#fff59a}.b{background:#dcdcf0}.g{background:#bfe8d2}'
    +'.sl{display:flex;justify-content:space-between;margin-top:4mm;font-size:10.5pt;align-items:flex-end}.sl div{flex:1}.sl b{margin-right:3mm}.sl u{display:inline-block;min-width:34mm;border-bottom:1px solid #333;text-align:center;text-decoration:none}';
  function pwin(title){var w=window.open('','_blank');if(!w){alert('팝업이 차단되어 인쇄 창을 열 수 없습니다. 주소창의 팝업 차단 표시에서 허용해 주세요.');return null}
    w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>'+esc(title)+'</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"><style>'+PCSS+'</style></head><body><div class="bar"><button onclick="window.print()">🖨 인쇄 · PDF로 저장</button><span>인쇄 창에서 대상을 「PDF로 저장」, 용지 A4, 「배경 그래픽」 켜기</span></div>');return w}
  function pend(w){w.document.write('<script>setTimeout(function(){window.print()},500)<\/script></body></html>');w.document.close()}
  function printOrder(o,opt){opt=opt||{};var w=pwin('출전 선수 오더지_'+(o.team||''));if(!w)return;
    var rows='';for(var i=0;i<18;i++){var p=(o.players||[])[i]||{};rows+='<tr><td style="width:10mm">'+(i+1)+'</td><td style="width:22mm">'+esc(p.no||'')+'</td><td class="l" style="padding-left:4mm">'+esc(p.name||'')+'</td><td style="width:22mm">'+esc(p.subNo||'')+'</td><td style="width:42mm">'+esc(p.role||'')+'</td></tr>'}
    w.document.write('<div class="pg"><div class="h1">출전 선수 오더지</div><div class="h2">'+esc(o.compTitle||'')+'</div>'
      +'<table><tr><td class="lab" style="width:28mm">학 교 명</td><td class="l" style="padding-left:4mm;font-weight:800">'+esc(o.school||o.team||'')+(o.team&&o.team!==o.school?' ('+esc(o.team)+')':'')+'</td><td class="lab" style="width:16mm">대 회<br>종 별</td><td style="width:40mm">'+esc(o.div||'')+'</td></tr>'
      +'<tr><td class="lab">감독교사</td><td colspan="3" class="l" style="padding-left:4mm">성명 : <b>'+esc(o.coach&&o.coach.name||'')+'</b>'+(o.coach&&o.coach.role?' <span class="s">('+esc(o.coach.role)+')</span>':'')+' &nbsp;&nbsp;&nbsp; 서명 : '+(o.coach&&o.coach.sign?'<img class="sig" src="'+esc(o.coach.sign)+'">':'')+(o.coach&&o.coach.at?' <span class="s" style="color:#666">'+esc(String(o.coach.at).slice(0,16).replace('T',' '))+'</span>':'')+'</td></tr></table>'
      +'<table style="margin-top:0;border-top:none"><tr><th>순번</th><th>신청 배번</th><th>선 수 이 름</th><th>교체 배번</th><th>비고(주장, 주전, 교체)</th></tr>'+rows+'</table>'
      +'<div class="s" style="color:#666;margin-top:3mm">연맹 홈페이지 참가 신청 명단 기준 · 제출 '+esc(o.status||'')+(o.updatedAt?' · '+esc(String(tsMs(o.updatedAt)?new Date(tsMs(o.updatedAt)).toLocaleString('ko-KR'):'')):'')+' · 대한민국플라잉디스크연맹</div></div>');pend(w)}
  // 결과지 — m: 경기, oa/ob: 오더지, signs: compSigns 문서
  function printSheet(m,oa,ob,signs,opt){opt=opt||{};signs=signs||{};var w=pwin('경기 기록지_'+((m.a||{}).name||'')+'_'+((m.b||{}).name||''));if(!w)return;
    var sc=score(m.events||[]);var H=sc.half||{a:{},b:{}};
    function team(side,o){var t=m[side]||{};var ps=playerStats(m)[side]||{};var L=lineup(o||{});var rows=[];var seen={};
      L.forEach(function(p){var s=ps[p.no+'|'+p.name]||{};seen[p.no+'|'+p.name]=1;rows.push({no:p.no,name:p.name,g:s.g||0,a:s.a||0,c:s.c||[]})});
      Object.keys(ps).forEach(function(k){if(!seen[k]){var s=ps[k];rows.push({no:s.no,name:s.name,g:s.g,a:s.a,c:s.c})}});
      var gl=goals(m.events,side);var times={};gl.forEach(function(e){if(e.scorer){var k=e.scorer.no+'|'+e.scorer.name;(times[k]=times[k]||[]).push((e.period||'').charAt(0)+(e.min!=null?e.min+"'":''))}});
      var tr='';for(var i=0;i<18;i++){var r=rows[i]||{};var k=r.no+'|'+r.name;var cc=r.c||[];tr+='<tr><td style="width:9mm">'+esc(r.no||'')+'</td><td class="s" style="width:20mm">'+esc((times[k]||[]).join(' '))+'</td><td style="width:9mm">'+(r.g||'')+'</td><td style="width:9mm">'+(r.a||'')+'</td><td style="width:8mm">'+(cc.indexOf('C')>=0?'C':'')+(cc.indexOf('N')>=0?'N':'')+(cc.indexOf('D')>=0?'D':'')+'</td><td style="width:8mm"></td><td style="width:8mm">'+(cc.indexOf('W')>=0?'W':'')+'</td></tr>'}
      return '<table><tr><td class="lab" style="width:16mm">학교명</td><td colspan="6" class="l" style="padding-left:3mm;font-weight:800">'+esc(t.school||t.name||'')+(t.name&&t.name!==t.school?' ('+esc(t.name)+')':'')+'</td></tr>'
        +'<tr><th>배번</th><th>TIME</th><th>득점</th><th>도움</th><th colspan="3">제재</th></tr><tr><th></th><th></th><th></th><th></th><th class="s">주의</th><th class="s">경고</th><th class="s">퇴장</th></tr>'+tr
        +'<tr><td class="g" style="font-weight:800">가점</td><td class="g" colspan="2">'+esc((m.fairplay||{})[side]!=null?(m.fairplay[side]+'점'):'')+'</td><td colspan="4"></td></tr></table>'}
    var ta=m.a||{},tb=m.b||{};var day=m.day||'';var dd=day?new Date(day+'T00:00:00'):null;
    function sg(role){var s=signs[role]||{};return s.name?('<b>'+esc(s.name)+'</b> '+(s.img?'<img class="sig" src="'+esc(s.img)+'">':'<u>&nbsp;</u>')):'<u>&nbsp;</u>'}
    w.document.write('<div class="pg"><div class="h1" style="font-size:16pt">( '+esc(m.div||'')+' )부 ( '+esc(m.round||'')+' )경기 기록(결과)지 ( '+esc(m.stage||'예선')+' )</div>'
      +'<table><tr><td class="lab" style="width:20mm">경기<br>일시</td><td style="width:46mm">'+(dd?dd.getFullYear()+'년 '+(dd.getMonth()+1)+'월 '+dd.getDate()+'일':esc(day))+(m.startAt?' '+esc(new Date(tsMs(m.startAt)).toTimeString().slice(0,5)):'')+'</td><td class="lab" style="width:20mm">경기장소</td><td class="l" style="padding-left:3mm">'+esc(m.place||'')+(m.court?' ( '+esc(m.court)+' )':'')+'</td></tr></table>'
      +'<table style="border-top:none"><tr><td class="lab" rowspan="3" style="width:20mm">경기 결과</td><th style="width:46mm">학교명</th><th class="y" style="width:20mm">전반</th><th class="b" style="width:20mm">후반</th><th style="width:20mm">총점</th><th>결과</th></tr>'
      +['a','b'].map(function(side){var t=m[side]||{};var me=side==='a'?sc.a:sc.b,op=side==='a'?sc.b:sc.a;var res=m.status==='종료'?(me>op?'승':me<op?'패':'무'):'';return '<tr><td class="l" style="padding-left:3mm;font-weight:800">'+esc(t.school||t.name||'')+'</td><td class="y">'+((H[side]||{})['전반']||0)+'</td><td class="b">'+(((H[side]||{})['후반']||0)+((H[side]||{})['연장']||0))+'</td><td style="font-weight:900">'+me+'</td><td style="font-weight:800">'+res+'</td></tr>'}).join('')+'</table>'
      +'<div style="display:flex;gap:2mm;margin-top:3mm"><div style="flex:1">'+team('a',oa)+'</div><div style="flex:1">'+team('b',ob)+'</div></div>'
      +'<div class="s" style="margin-top:2mm">※제재(지도자 포함): 주의(C), 퇴장(W), 경기지연(D), 지도자의 비교육적 언행(N)</div>'
      +'<div class="s">※페어플레이 가점(주심,부심,기록,감독관합의): 우수(2점), 보통(1) &nbsp; 최우수선수 추천: <b>'+esc(m.mvp?('#'+(m.mvp.no||'')+' '+(m.mvp.name||'')+(m.mvp.team?' ('+m.mvp.team+')':'')):'')+'</b> &nbsp; 우수지도자 추천: <b>'+esc(m.bestCoach&&m.bestCoach.name||'')+'</b></div>'
      +'<div class="sl"><div><b>감독교사:</b>'+sg('coachA')+'</div><div><b>감독교사:</b>'+sg('coachB')+'</div></div>'
      +'<div class="sl"><div><b>감독관:</b>'+sg('supervisor')+'</div><div><b>기록원:</b>'+sg('recorder')+'</div></div>'
      +'<div class="sl"><div><b>심판1:</b>'+sg('ref1')+'</div><div><b>심판2:</b>'+sg('ref2')+'</div><div><b>심판3:</b>'+sg('ref3')+'</div></div>'
      +'<div class="s" style="color:#666;margin-top:3mm">연맹 홈페이지 경기 기록 콘솔 기록 · '+(m.locked?'확정':'미확정')+(m.confirmedBy?' · 확정 '+esc(m.confirmedBy.name||'')+' '+esc(String(m.confirmedBy.at||'').slice(0,16).replace('T',' ')):'')+' · 득점 시각은 기록원이 현장 시계 기준으로 적은 분(참고)</div></div>');pend(w)}
  function printGolf(round,title){var w=pwin('디스크골프 스코어_'+(title||''));if(!w)return;var R=golfRank(round);var holes=round.holes||18;var hs='';for(var i=1;i<=holes;i++)hs+='<th style="width:6.5mm">'+i+'</th>';
    var ps='';(round.par||[]).slice(0,holes).forEach(function(p){ps+='<td>'+esc(p)+'</td>'});
    Object.keys(R).forEach(function(dv){w.document.write('<div class="pg"><div class="h1" style="font-size:16pt">디스크골프 스코어카드 · '+esc(dv)+'</div><div class="h2">'+esc(title||'')+' · '+holes+'홀'+(round.playoff&&round.playoff.length?' · 연장 '+round.playoff.length+'홀':'')+'</div>'
      +'<table class="s"><tr><th>순위</th><th class="l">선수</th><th>소속</th>'+hs+'<th>합계</th><th>파 대비</th>'+(round.playoff&&round.playoff.length?'<th>연장</th>':'')+'</tr><tr><td colspan="3" class="lab">PAR</td>'+ps+'<td colspan="2"></td>'+(round.playoff&&round.playoff.length?'<td></td>':'')+'</tr>'
      +R[dv].map(function(p){var h='';for(var i=0;i<holes;i++){var v=(((round.scores||{})[p.pid]||{}).h||[])[i];h+='<td>'+(v==null||v===''?'':esc(v))+'</td>'}return '<tr><td>'+(p.tied?'T':'')+p.rank+'</td><td class="l">'+esc(p.name)+'</td><td>'+esc(p.school||'')+'</td>'+h+'<td style="font-weight:900">'+p.total+'</td><td>'+(p.toPar>0?'+':'')+p.toPar+'</td>'+(round.playoff&&round.playoff.length?'<td>'+p.po.map(function(v){return v==null?'-':v}).join('/')+'</td>':'')+'</tr>'}).join('')+'</table>'
      +'<div class="sl"><div><b>마커:</b><u>&nbsp;</u></div><div><b>경기위원:</b><u>&nbsp;</u></div></div></div>')});pend(w)}

  window.KFDF_MR={PERIODS:PERIODS,CARDS:CARDS,esc:esc,uid8:uid8,tsMs:tsMs,score:score,goals:goals,clockMs:clockMs,clockTxt:clockTxt,minuteOf:minuteOf,clockSet:clockSet,clockAct:clockAct,
    ctrlState:ctrlState,ctrlLabel:ctrlLabel,CTRL_BEAT:CTRL_BEAT,addEvent:addEvent,voidEvent:voidEvent,editEvent:editEvent,qPush:qPush,qCount:qCount,flush:flush,
    canRecord:canRecord,isStaffUser:isStaffUser,orderId:orderId,orderFromEntry:orderFromEntry,orderCheck:orderCheck,lineup:lineup,playerStats:playerStats,computeStats:computeStats,
    golfTotals:golfTotals,golfRank:golfRank,evLine:evLine,printOrder:printOrder,printSheet:printSheet,printGolf:printGolf};
})();
