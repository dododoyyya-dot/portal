// matchrec.js v20261019b · 대회 경기기록 공용 모듈 — 출전 오더지 · 경기 기록(득점·어시스트·제재) · 디스크골프 스코어 · 결과지 PDF · 집계
//   화면: match.html(기록 콘솔·경기 관리) · competition.html(오더지 작성) · results.html(공개 결과) · live.html(중계 콘솔 호환)
//   원칙 ① 경기 문서(liveMatches) 하나가 원본 ② 점수는 득점 기록(events)에서 계산해 a.score/b.score 에 같이 저장(중계 화면 호환)
//        ③ 입력권(ctrl)은 한 번에 한 화면 ④ 기록 추가는 고유 id + 트랜잭션(중복 전송 무시) ⑤ 취소는 삭제 대신 void 표시
//   시간: 앱 타이머는 참고용(분 단위 제안) — 득점마다 분을 고칠 수 있고 「시계 맞추기」로 현장 시계에 맞춤
(function(){
  'use strict';
  var PERIODS=['전반','후반','연장'];
  // [제재 2차] 입력은 주의·옐로·레드 3가지만(CARD_PICK). 예전 기록(W 퇴장·D 경기지연·N 비교육적 언행)은 그대로 읽힘
  var CARDS={C:'주의',Y:'옐로',R:'레드',W:'퇴장',D:'경기지연',N:'비교육적 언행'};
  var CARD_PICK=['C','Y','R'];
  function isOff(card){return card==='R'||card==='W'}
  // [경기복] 팀 색상 프리셋(오더지에서 고름) — 흰색은 테두리로 구분
  var KIT_COLORS=[['흰색','#ffffff'],['검정','#1f2329'],['빨강','#d62839'],['주황','#f28c28'],['노랑','#f6c90e'],['초록','#1f9d55'],['하늘','#4fb3f6'],['파랑','#1f5fd6'],['남색','#1b2a5e'],['보라','#7b4bd1'],['분홍','#f06aa6'],['회색','#9aa1ad']];
  function kitTextColor(hex){hex=String(hex||'#ffffff').replace('#','');if(hex.length===3)hex=hex.split('').map(function(c){return c+c}).join('');var r=parseInt(hex.substr(0,2),16),g=parseInt(hex.substr(2,2),16),b=parseInt(hex.substr(4,2),16);return (r*299+g*587+b*114)/1000>150?'#111':'#fff'}
  // 오더지 경기복: o.kits=[{name,color},{name,color}] · 1번 옷 배번 = no, 2번 옷 배번 = subNo(비면 1번 배번)
  function kitsOf(o){var k=(o&&o.kits)||[];return [Object.assign({name:'1번 경기복',color:'#ffffff'},k[0]||{}),Object.assign({name:'2번 경기복(조끼)',color:'#1f5fd6'},k[1]||{})]}
  function noFor(p,kit){if(!p)return '';var n=kit===1?(String(p.subNo==null?'':p.subNo).trim()||String(p.no==null?'':p.no).trim()):String(p.no==null?'':p.no).trim();return n}
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
  function secOf(m){return Math.floor(clockMs(m)/1000)}
  function fmtSec(t){t=Math.max(0,Math.floor(+t||0));return p2(Math.floor(t/60))+':'+p2(t%60)}
  function evSec(e){if(!e)return null;if(e.sec!=null&&e.sec!=='')return +e.sec;if(e.min!=null&&e.min!=='')return (+e.min)*60;return null}
  function evTime(e){var t=evSec(e);return t==null?(e&&e.clock||''):(e.sec!=null?fmtSec(t):e.min+"'")}
  // 초 단위로 맞추기(ms) — 진행 중이면 그 시점부터 다시 셈
  function clockSetMs(m,ms){var c=Object.assign({running:false,base:0,startedAt:0},(m&&m.clock)||{});ms=Math.max(0,Math.round(+ms||0));if(c.running){c.startedAt=now();c.base=ms}else{c.base=ms;c.startedAt=0}return c}
  // 더하기·빼기 — 초는 그대로 둠(예: 12:37 에 +1분 → 13:37)
  function clockAdd(m,dms){return clockSetMs(m,clockMs(m)+(+dms||0))}
  // 하프타임 진입: 초를 버리고 멈춤(예: 20:37 → 20:00)
  function clockFloorMin(m){var ms=Math.floor(clockMs(m)/60000)*60000;return {running:false,base:ms,startedAt:0}}
  // 작전타임·하프타임 별도 타이머: m.brk={kind:'half'|'to',side,start(ms),dur(초)}
  function brkLeft(m){var b=m&&m.brk;if(!b||!b.start)return 0;return Math.max(0,(+b.dur||0)-Math.floor((now()-(+b.start))/1000))}
  // 작전타임 사용 내역: 구간별 팀당 1회
  function timeouts(m){var o={a:{},b:{}};(m&&m.events||[]).forEach(function(e){if(!e||e.void||e.type!=='timeout'||!o[e.side])return;var p=e.period||'';(o[e.side][p]=o[e.side][p]||[]).push(e)});return o}
  // 퇴장 선수(레드·퇴장) — key 또는 배번
  // [퇴장] 레드(R)·퇴장(W) 1장, 또는 옐로(Y) 2장 누적 — 선수 키·배번 두 가지로 표시
  function sentOff(m,side){var o={},yc={};(m&&m.events||[]).forEach(function(e){if(!e||e.void||e.type!=='card'||e.side!==side||!e.target||e.target.kind==='coach')return;var ks=[];if(e.target.key)ks.push('k:'+e.target.key);if(e.target.no)ks.push('n:'+e.target.no);
    if(isOff(e.card))ks.forEach(function(k){o[k]=1});else if(e.card==='Y'){var hit=ks.some(function(k){return (yc[k]||0)>=1});ks.forEach(function(k){yc[k]=(yc[k]||0)+1});if(hit)ks.forEach(function(k){o[k]=1})}});return o}
  function yellowCount(m,side,target){var n=0;(m&&m.events||[]).forEach(function(e){if(!e||e.void||e.type!=='card'||e.side!==side||e.card!=='Y'||!e.target||e.target.kind==='coach')return;if((target.key&&e.target.key===target.key)||(target.no&&e.target.no===target.no))n++});return n}
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
      var hist=(evs[i].edits||[]).concat([{by:opts.name||'',at:new Date().toISOString(),before:{min:evs[i].min,sec:evs[i].sec==null?null:evs[i].sec,period:evs[i].period,scorer:evs[i].scorer||null,assist:evs[i].assist||null,card:evs[i].card||null,note:evs[i].note||''}}]);
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
      return {i:i+1,key:key,name:r.name||'',birth:r.birth||'',school:r.school||'',gender:r.gender||'',no:(o.no!=null&&String(o.no).trim()!=='')?o.no:String(r.no||'').trim(),subNo:o.subNo||'',role:o.role||'',uid:r.memberUid||r.uid||'',guardianUid:r.guardianUid||''}});   // [배번] 오더지에 아직 배번이 없으면 참가 신청 명단(엑셀·화면)의 배번을 그대로
    return {slotId:slotId,pid:c.pid||'',uid:c.uid||'',team:c.name||'',school:c.teamOrg||'',teamType:c.teamType||'',div:(c.prefs||[])[0]||'',gender:c.teamGender||'',
      compTitle:s.title||'',coach:{name:p.coach&&p.coach.name||c.leader||'',role:p.coach&&p.coach.role||c.leaderRole||'',sign:p.coach&&p.coach.sign||'',at:p.coach&&p.coach.at||''},
      players:players,status:p.status||'작성중',updatedAt:p.updatedAt||null}}
  function orderCheck(o){var errs=[],warn=[];var nos={};
    (o.players||[]).forEach(function(x){var n=String(x.no==null?'':x.no).trim();if(n===''){warn.push(x.name+' 배번 없음');return}if(!/^\d{1,3}$/.test(n)){errs.push(x.name+' 배번은 숫자(1~3자리)');return}if(nos[n]){errs.push('배번 '+n+' 중복('+nos[n]+'·'+x.name+')')}else nos[n]=x.name});
    if(!(o.players||[]).some(function(x){return String(x.no||'').trim()!==''}))errs.push('배번을 한 명 이상 입력해 주세요');
    if(!(o.players||[]).some(function(x){return x.role==='주장'}))warn.push('주장이 지정되지 않음');
    return {errs:errs,warn:warn}}
  // 경기 화면의 선수 버튼 순서: 주전 → 주장 → 교체 → 미지정, 같은 급은 배번순
  //   opt: {kit:0|1, nums:{key:배번(경기 중 변경)}} — 경기복에 맞는 배번, 경기 중 바꾼 배번 우선
  function lineup(o,opt){opt=opt||{};var kit=opt.kit===1?1:0,nums=opt.nums||{};var rk={'주장':0,'주전':0,'교체':2,'':1};
    var P=(o&&o.players||[]).map(function(x){var n=nums[x.key]!=null&&String(nums[x.key]).trim()!==''?String(nums[x.key]).trim():noFor(x,kit);return {no:n,name:x.name,key:x.key,role:x.role||'',school:x.school||''}}).filter(function(x){return x.no!==''});
    return P.sort(function(a,b){return (rk[a.role]!=null?rk[a.role]:1)-(rk[b.role]!=null?rk[b.role]:1)||(+a.no)-(+b.no)})}

  // ── 경기 안 선수 통계 ──
  function playerStats(m){var S={a:{},b:{}};(m.events||[]).forEach(function(e){if(!e||e.void)return;var side=e.side;if(!S[side])return;
    if(e.type==='goal'){if(e.scorer){var k=e.scorer.no+'|'+e.scorer.name;S[side][k]=S[side][k]||{no:e.scorer.no,name:e.scorer.name,g:0,a:0,c:[]};S[side][k].g++}
      if(e.assist){var k2=e.assist.no+'|'+e.assist.name;S[side][k2]=S[side][k2]||{no:e.assist.no,name:e.assist.name,g:0,a:0,c:[]};S[side][k2].a++}}
    if(e.type==='card'&&e.target){var k3=(e.target.no||'')+'|'+e.target.name;S[side][k3]=S[side][k3]||{no:e.target.no||'',name:e.target.name,g:0,a:0,c:[]};S[side][k3].c.push(e.card)}});
    return S}

  // ── 대회 집계 (compStats) ──
  //   matches: liveMatches 문서 배열(slot 소속) · 순위표는 부문별 승점(승 3·무 1), 득실 → 다득점
  // [조별 순위 2026-10-18] 집계 칸 이름 — 조가 있는 경기는 「부문 · A조」, 조를 쓰는 부문의 조 없는 경기(토너먼트)는 「부문 · 본선」, 조가 없는 부문은 부문 이름 그대로
  function statKeyFn(matches){var gd={};(matches||[]).forEach(function(m){if(m&&!m.golf&&m.group)gd[m.div||'전체']=1});
    return function(m){var dv=(m&&m.div)||'전체';if(m&&m.group)return dv+' · '+m.group;return gd[dv]?dv+' · '+((m&&m.stage)||'본선'):dv}}
  // [본선 대진표 2026-10-18] 토너먼트 경기를 나무 모양으로 — from{a,b}(앞 경기 승자) 연결을 따라 결승에서 거꾸로 펼침. 3·4위전(loserFrom)은 아래 따로.
  function isKnockout(m){return !!(m&&!m.golf&&!m.group&&(m.from||(m.a&&m.a.seed)||(m.b&&m.b.seed)||/강|결승|3·4위/.test(String(m.round||''))))}
  var BKW=188,BKG=28;
  var BKCSS='.kbk{margin:8px 0 4px}.kbk-sc{overflow-x:auto;padding:4px 2px 10px;-webkit-overflow-scrolling:touch}.kbk-root{display:inline-flex;flex-direction:column;gap:14px;min-width:max-content}'
    +'.kbk-n{display:flex;align-items:center}.kbk-ch{display:flex;flex-direction:column;padding-right:14px}.kbk-ch>.kbk-n{position:relative;padding:5px 0}'
    +'.kbk-ch>.kbk-n::after{content:"";position:absolute;right:-14px;top:50%;width:14px;border-top:1.5px solid #b6c1d2}'
    +'.kbk-ch>.kbk-n:first-child:not(:last-child)::before{content:"";position:absolute;right:-14px;top:50%;bottom:0;border-right:1.5px solid #b6c1d2}'
    +'.kbk-ch>.kbk-n:last-child:not(:first-child)::before{content:"";position:absolute;right:-14px;top:0;bottom:50%;border-right:1.5px solid #b6c1d2}'
    +'.kbk-sp{flex:none}.kbk-m{box-sizing:border-box;width:'+BKW+'px;flex:none;margin-left:14px;position:relative;background:#fff;border:1.5px solid #dbe2ec;border-radius:12px;padding:7px 10px;box-shadow:0 2px 8px rgba(15,23,42,.05);text-align:left}'
    +'.kbk-m.j::before{content:"";position:absolute;left:-15.5px;top:50%;width:14px;border-top:1.5px solid #b6c1d2}.kbk-m.ck{cursor:pointer}.kbk-m.ck:hover{border-color:#153A77}'
    +'.kbk-m.live{border-color:#C41E2F;box-shadow:0 0 0 2px rgba(196,30,47,.12)}.kbk-m.done{background:#f6f9ff}.kbk-m.fin{border-color:#d4a017;box-shadow:0 0 0 2px rgba(212,160,23,.15)}'
    +'.kbk-m .r{display:flex;justify-content:space-between;gap:6px;font-size:10.5px;font-weight:800;color:#6b7280;margin-bottom:3px;white-space:nowrap}.kbk-m .r b{color:#153A77}.kbk-m.fin .r b{color:#8a6a1f}'
    +'.kbk-m .t{display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:12.5px;font-weight:700;padding:2px 0;color:#16181d}.kbk-m .t+.t{border-top:1px dashed #e8edf3}'
    +'.kbk-m .t span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kbk-m .t.ph span{color:#8a919d;font-weight:600}.kbk-m .t.w{color:#153A77;font-weight:900}.kbk-m .t.w span::after{content:" ✓";color:#0f766e}.kbk-m .t i{font-style:normal;font-variant-numeric:tabular-nums;font-weight:900;min-width:16px;text-align:right}'
    +'.kbk-3{display:flex;gap:10px;align-items:center;margin-top:2px}.kbk-3 small{font-size:11.5px;font-weight:800;color:#6b7280}.kbk-3 .kbk-m{margin-left:0}';
  function bracketHtml(list,opt){opt=opt||{};list=(list||[]).filter(isKnockout);if(!list.length)return '';
    var byId={};list.forEach(function(m){byId[m.id]=m});var main=list.filter(function(m){return !m.loserFrom});
    var kids={};main.forEach(function(m){var f=m.from||{};var k=[];['a','b'].forEach(function(s){var c=byId[f[s]];if(c&&!c.loserFrom)k.push(c)});kids[m.id]=k});
    var refd={};main.forEach(function(m){kids[m.id].forEach(function(c){refd[c.id]=1})});
    var roots=main.filter(function(m){return !refd[m.id]}).sort(function(a,b){return (+a.order||0)-(+b.order||0)});
    var depth=function(m,seen){seen=seen||{};if(seen[m.id])return 0;seen[m.id]=1;var d=0;kids[m.id].forEach(function(c){d=Math.max(d,1+depth(c,seen))});return d};
    var card=function(m,j,isFinal){var sc=score(m.events||[]);var st=m.status||'예정';var win=st==='종료'?(sc.a>sc.b?'a':sc.b>sc.a?'b':''):'';
      var row=function(s){var t=m[s]||{};var ph=/^\(.*\)$/.test(String(t.name||'').trim())||!t.name;return '<div class="t'+(ph?' ph':'')+(win===s?' w':'')+'"><span title="'+esc(t.name||'')+'">'+esc(t.name||'미정')+'</span>'+(st!=='예정'?'<i>'+(s==='a'?sc.a:sc.b)+'</i>':'')+'</div>'};
      var meta=[m.day?String(m.day).slice(5).replace('-','.'):'',m.time||'',m.court||''].filter(Boolean).join(' ');
      return '<div class="kbk-m'+(j?' j':'')+(st==='진행'?' live':st==='종료'?' done':'')+(isFinal?' fin':'')+(opt.click?' ck':'')+'"'+(opt.click?' onclick="'+opt.click+'(\''+m.id+'\')"':'')+'><div class="r"><b>'+esc(m.round||'')+'</b><span>'+esc(st==='진행'?'진행 중':meta)+'</span></div>'+row('a')+row('b')+'</div>'};
    var node=function(m,level,L,isRoot){var k=kids[m.id];
      if(k.length)return '<div class="kbk-n"><div class="kbk-ch">'+k.map(function(c){return node(c,level+1,L,false)}).join('')+'</div>'+card(m,true,isRoot)+'</div>';
      var sp=(L-level)*(BKW+BKG);return '<div class="kbk-n">'+(sp>0?'<div class="kbk-sp" style="width:'+sp+'px"></div>':'')+card(m,false,isRoot)+'</div>'};
    var body=roots.map(function(r){return node(r,0,depth(r),true)}).join('');
    var third=list.filter(function(m){return m.loserFrom});
    return '<div class="kbk"><style>'+BKCSS+'</style><div class="kbk-sc"><div class="kbk-root">'+body+(third.length?'<div class="kbk-3"><small>3·4위전</small>'+third.map(function(m){return card(m,false,false)}).join('')+'</div>':'')+'</div></div></div>'}
  // 집계 칸 순서: 부문은 경기 순서(가장 이른 경기)대로, 부문 안에서는 A조→E조→본선
  function sortStatKeys(keys,matches){var first={};(matches||[]).forEach(function(m){if(!m)return;var d=m.div||'전체';var o=+m.order||0;if(first[d]==null||o<first[d])first[d]=o});return (keys||[]).slice().sort(function(a,b){var da=a.split(' · ')[0],db=b.split(' · ')[0];return ((first[da]||0)-(first[db]||0))||a.localeCompare(b,'ko')})}
  function computeStats(matches,orders,lots){lots=lots||{};
    var byDiv={},scorers={},played=0;var KEY=statKeyFn(matches);
    (matches||[]).forEach(function(m){if(!m||m.golf)return;var dvName=m.div||'전체';var dv=KEY(m);var D=byDiv[dv]=byDiv[dv]||{teams:{},matches:0};
      var sc=score(m.events||[]);var fin=m.status==='종료';
      ['a','b'].forEach(function(side){var t=m[side]||{};var key=t.pid||t.name||'';if(!key)return;if(!t.pid&&/^\(.*\)$/.test(String(t.name||'').trim()))return;/* 「(준결승 1경기 승자)」 같은 자리 표시는 순위표에서 제외 */var T=D.teams[key]=D.teams[key]||{pid:t.pid||'',name:t.name||'',school:t.school||'',p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0,fair:0};
        if(fin){var me=side==='a'?sc.a:sc.b,op=side==='a'?sc.b:sc.a;T.p++;T.gf+=me;T.ga+=op;if(me>op)T.w++;else if(me<op)T.l++;else T.d++;T.pts=T.w*3+T.d;T.fair+=((m.fairplay||{})[side]||0);T.sanc=(T.sanc||0)+(m.events||[]).filter(function(e){return e&&!e.void&&e.type==='card'&&e.side===side}).length}});
      if(fin)(D.fin=D.fin||[]).push(m);
      if(fin){D.matches++;played++}
      (m.events||[]).forEach(function(e){if(!e||e.void||e.type!=='goal')return;var t=m[e.side]||{};
        [['scorer','g'],['assist','a']].forEach(function(x){var p=e[x[0]];if(!p||!p.name)return;var k=dvName+'|'+(t.pid||t.name)+'|'+p.no+'|'+p.name;var S=scorers[k]=scorers[k]||{div:dvName,team:t.name||'',school:t.school||'',no:p.no,name:p.name,g:0,a:0};S[x[1]]++})})});
    Object.keys(byDiv).forEach(function(dv){if(!Object.keys(byDiv[dv].teams).length){delete byDiv[dv];return}var T=byDiv[dv].teams;byDiv[dv].table=rankTable(Object.keys(T).map(function(k){return Object.assign({key:k,sanc:0},T[k])}),byDiv[dv].fin||[],lots[dv]||{});delete byDiv[dv].fin});
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
  function evLine(e){if(!e)return '';var mm=evTime(e);var who=e.type==='goal'?((e.scorer?('#'+e.scorer.no+' '+e.scorer.name):'득점자 미지정')+(e.assist?' · 어시 #'+e.assist.no+' '+e.assist.name:'')):e.type==='card'?(CARDS[e.card]||e.card)+' '+((e.target||{}).kind==='coach'?'지도자'+(((e.target||{}).name&&e.target.name!=='지도자')?' '+e.target.name:''):(((e.target||{}).no?'#'+e.target.no+' ':'')+((e.target||{}).name||''))):e.type==='timeout'?'작전타임':e.type==='injury'?'부상 중단':e.type==='pull'?'풀':(e.note||e.type||'');if(e.type==='card'&&e.note)who+=' — '+e.note;return {min:mm,who:who}}

  // ══ 인쇄(PDF) — 양식 그대로 ══
  var PCSS='@page{size:A4;margin:12mm}body{margin:0;font-family:Pretendard,"Malgun Gothic",sans-serif;color:#111;font-size:11pt}*{box-sizing:border-box}'
    +'.bar{position:sticky;top:0;background:#16181d;color:#fff;padding:8px 12px;font-size:13px;display:flex;gap:10px;align-items:center}.bar button{background:#C41E2F;color:#fff;border:none;border-radius:8px;padding:7px 14px;font-weight:800;cursor:pointer;font-family:inherit}'
    +'@media print{.bar{display:none}}.pg{width:186mm;margin:8mm auto;page-break-after:always}.pg:last-child{page-break-after:auto}'
    +'table{border-collapse:collapse;width:100%}td,th{border:1px solid #333;padding:2.2mm 2mm;font-size:10.5pt;text-align:center;vertical-align:middle;word-break:keep-all}'
    +'th{background:#e8f3ee;font-weight:800}.h1{text-align:center;font-size:22pt;font-weight:900;margin:2mm 0 1mm}.h2{text-align:center;font-size:12.5pt;font-weight:700;margin:0 0 4mm;color:#333}'
    +'.lab{background:#e8f3ee;font-weight:800}.sig{height:11mm;object-fit:contain;max-width:34mm;vertical-align:middle}.l{text-align:left}.s{font-size:9.5pt}.y{background:#fff59a}.b{background:#dcdcf0}.g{background:#bfe8d2}'
    +'.sl{display:flex;justify-content:space-between;margin-top:4mm;font-size:10.5pt;align-items:flex-end;gap:3mm;flex-wrap:wrap}.sl div{flex:1;min-width:40%}.sl b{margin-right:3mm}.sl u{display:inline-block;min-width:34mm;border-bottom:1px solid #333;text-align:center;text-decoration:none}'
    +'.tt td.tm{font-variant-numeric:tabular-nums;font-size:9.5pt;white-space:nowrap}.tt td.l b{font-size:11pt}.tl td{padding:1.8mm 1.5mm;font-size:10pt}.tl td.l b{font-size:10.5pt}.tl td.tm{font-variant-numeric:tabular-nums;font-size:9.5pt;white-space:nowrap}.tl td.sc{font-variant-numeric:tabular-nums;font-size:11.5pt;font-weight:900;background:#fffbe6;white-space:nowrap}.tl td.sc .hi{color:#b00020}.tl td.tm{background:#fffbe6;line-height:1.25}.tl td.tm .sc2{font-size:11pt;font-weight:900;margin-top:1px}.tl td.tm .sc2 .hi{color:#b00020}.tl th.tn{font-size:11pt}.tl th.mid{background:#fff3c4}.tl tr.pd td{background:#e8f3ee;font-weight:800;font-size:9pt;padding:0.8mm}.win{color:#b00020;font-weight:900}.winline{text-align:center;font-size:13pt;font-weight:900;margin:2mm 0 0;border:1.5px solid #333;padding:1.5mm;background:#f6f6f6}';
  function pwin(title){var w=window.open('','_blank');if(!w){alert('팝업이 차단되어 인쇄 창을 열 수 없습니다. 주소창의 팝업 차단 표시에서 허용해 주세요.');return null}
    w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>'+esc(title)+'</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"><style>'+PCSS+'</style></head><body><div class="bar"><button onclick="window.print()">🖨 인쇄 · PDF로 저장</button><span>인쇄 창에서 대상을 「PDF로 저장」, 용지 A4, 「배경 그래픽」 켜기</span></div>');return w}
  function pend(w){w.document.write('<script>setTimeout(function(){window.print()},500)<\/script></body></html>');w.document.close()}
  function printOrder(o,opt){opt=opt||{};var w=pwin('출전 선수 오더지_'+(o.team||''));if(!w)return;var K=kitsOf(o);var rk={'주장':0,'주전':0,'':1,'교체':2};var PL=(o.players||[]).slice().sort(function(a,b){return (rk[a.role||'']!=null?rk[a.role||'']:1)-(rk[b.role||'']!=null?rk[b.role||'']:1)||(+a.no||999)-(+b.no||999)});
    var sw=function(k){return '<span style="display:inline-block;width:4mm;height:4mm;border:1px solid #333;vertical-align:middle;background:'+esc(k.color)+'"></span>'};
    var rows='';for(var i=0;i<18;i++){var p=PL[i]||{};rows+='<tr'+(p.role==='교체'?' style="background:#f6f6f6"':'')+'><td style="width:10mm">'+(p.name?i+1:'')+'</td><td style="width:20mm;font-weight:800">'+esc(p.no||'')+'</td><td class="l" style="padding-left:4mm">'+esc(p.name||'')+'</td><td class="s" style="width:34mm">'+esc(p.school||'')+'</td><td style="width:20mm">'+esc(p.subNo||'')+'</td><td style="width:24mm">'+esc(p.role||'')+'</td></tr>'}
    w.document.write('<div class="pg"><div class="h1">출전 선수 오더지</div><div class="h2">'+esc(o.compTitle||'')+'</div><div style="text-align:center;font-size:17pt;font-weight:900;border:2px solid #111;padding:2mm;margin:0 0 3mm">출전 부문 : '+esc(o.div||'미지정')+'</div>'
      +'<table><tr><td class="lab" style="width:28mm">학 교 명</td><td class="l" style="padding-left:4mm;font-weight:800">'+esc(o.school||o.team||'')+(o.team&&o.team!==o.school?' ('+esc(o.team)+')':'')+'</td><td class="lab" style="width:16mm">소 속</td><td style="width:40mm">'+esc(o.school||'')+'</td></tr>'
      +'<tr><td class="lab">경 기 복</td><td colspan="3" class="l" style="padding-left:4mm">'+sw(K[0])+' 1번 '+esc(K[0].name)+' (신청 배번) &nbsp;&nbsp; '+sw(K[1])+' 2번 '+esc(K[1].name)+' (교체 배번)</td></tr>'
      +'<tr><td class="lab">감독교사</td><td colspan="3" class="l" style="padding-left:4mm">성명 : <b>'+esc(o.coach&&o.coach.name||'')+'</b>'+(o.coach&&o.coach.role?' <span class="s">('+esc(o.coach.role)+')</span>':'')+' &nbsp;&nbsp;&nbsp; 서명 : '+(o.coach&&o.coach.sign?'<img class="sig" src="'+esc(o.coach.sign)+'">':'')+(o.coach&&o.coach.at?' <span class="s" style="color:#666">'+esc(String(o.coach.at).slice(0,16).replace('T',' '))+'</span>':'')+'</td></tr></table>'
      +'<table style="margin-top:0;border-top:none"><tr><th>순번</th><th>신청 배번<br><span class="s">1번 옷</span></th><th>선 수 이 름</th><th>소속</th><th>교체 배번<br><span class="s">2번 옷</span></th><th>비고(주장, 주전, 교체)</th></tr>'+rows+'</table>'
      +'<div class="s" style="color:#666;margin-top:3mm">연맹 홈페이지 참가 신청 명단 기준 · 제출 '+esc(o.status||'')+(o.updatedAt?' · '+esc(String(tsMs(o.updatedAt)?new Date(tsMs(o.updatedAt)).toLocaleString('ko-KR'):'')):'')+' · 대한민국플라잉디스크연맹</div></div>');pend(w)}
  // ── 심판진 목록(역할 라벨 포함) — officials.list(동적 칸) 또는 옛 고정 키(ref1~3·scorer·recorder·supervisor) ──
  var ROLE_LABEL={ref1:'주심',ref2:'부심',ref3:'부심',scorer:'점수심',recorder:'기록원',supervisor:'감독관'};
  function offList(m){var o=(m&&m.officials)||{};if(Array.isArray(o.list))return o.list.filter(function(x){return x&&(x.name||x.uid)});var out=[];['supervisor','ref1','ref2','ref3','scorer','recorder'].forEach(function(k){if(o[k]&&(o[k].name||o[k].uid))out.push({key:k,role:ROLE_LABEL[k],name:o[k].name||'',uid:o[k].uid||''})});return out}
  function offOf(m,uid){if(!uid)return null;return offList(m).filter(function(x){return x.uid===uid})[0]||null}
  // 팀 지도자 목록 — 경기 정보에서 고친 것(m.coaches[side]) 우선, 없으면 오더지 감독교사
  function coachesOf(m,side,o){var c=m&&m.coaches&&m.coaches[side];if(Array.isArray(c)&&c.length)return c.filter(function(x){return x&&x.name});var oc=(o&&o.coach)||{};return oc.name?[{name:oc.name,role:oc.role||'',sign:oc.sign||''}]:[]}
  function winnerOf(m){var sc=score(m&&m.events||[]);if(m.status!=='종료')return '';return sc.a>sc.b?'a':sc.b>sc.a?'b':''}
  // 결과지(연맹 기록지) — 시간 순서로 한 사건에 한 줄: 왼쪽 팀(득점·도움·제재) | TIME | 점수(가운데) | 오른쪽 팀(득점·도움·제재). 부산 기록지 양식(2026-10-15 샘플) 기준, 10차에서 두 팀 나란히 적던 것을 한 줄 한 사건으로 고침
  function sheetBody(m,oa,ob,signs,opt){opt=opt||{};signs=signs||{};
    var sc=score(m.events||[]);var H=sc.half||{a:{},b:{}};var PO={'전반':0,'후반':1,'연장':2};var win=winnerOf(m);
    var EV=(m.events||[]).map(function(e,i){return {e:e,i:i}}).filter(function(x){var e=x.e;return e&&!e.void&&(e.side==='a'||e.side==='b')&&(e.type==='goal'||e.type==='card'||e.type==='timeout'||(e.type==null&&typeof e.d==='number'))})
      .sort(function(x,y){var a=x.e,b=y.e;return ((PO[a.period]!=null?PO[a.period]:9)-(PO[b.period]!=null?PO[b.period]:9))||((evSec(a)||0)-(evSec(b)||0))||(x.i-y.i)});
    var pn=function(p){return p?('<b>'+esc(p.no||'')+'</b>'+(p.name?' <span class="s">'+esc(p.name)+'</span>':'')):''};
    var E3='<td></td><td></td><td></td>';
    var cellsOf=function(e){
      if(e.type==='goal')return '<td class="l">'+(e.scorer?pn(e.scorer):'<span class="s">미지정</span>')+'</td><td class="l">'+pn(e.assist)+'</td><td></td>';
      if(e.type==='card'){var tg=e.target||{};return '<td></td><td></td><td class="l"><b>'+esc(CARDS[e.card]||e.card)+'</b> '+(tg.kind==='coach'?'지도자 '+esc(tg.name||''):'<b>'+esc(tg.no||'')+'</b>'+(tg.name?' <span class="s">'+esc(tg.name)+'</span>':''))+(e.note?' <span class="s">('+esc(e.note)+')</span>':'')+'</td>'}
      if(e.type==='timeout')return '<td colspan="3" class="s">작전타임</td>';
      return '<td class="l" colspan="3">'+(e.d>0?'득점':'득점 취소')+'</td>'};
    var run={a:0,b:0};var rows=[];var curP=null;
    EV.forEach(function(x){var e=x.e;var p=e.period||'';if(p!==curP){curP=p;rows.push('<tr class="pd"><td colspan="3"></td><td>'+esc(p||'구간 미정')+'</td><td colspan="3"></td></tr>')}
      var d=e.type==='goal'?1:(e.type==null?(+e.d||0):0);if(d)run[e.side]=Math.max(0,run[e.side]+d);
      var C=cellsOf(e);var left=e.side==='a'?C:E3,right=e.side==='b'?C:E3;
      var scv=d?('<b'+(e.side==='a'?' class="hi"':'')+'>'+run.a+'</b> : <b'+(e.side==='b'?' class="hi"':'')+'>'+run.b+'</b>'):'';
      rows.push('<tr>'+left+'<td class="tm">'+esc(evTime(e))+(scv?'<div class="sc2">'+scv+'</div>':'')+'</td>'+right+'</tr>')});
    var N=16;while(rows.length<N)rows.push('<tr>'+E3+'<td class="tm">&nbsp;</td>'+E3+'</tr>');
    function th_(side,o){var t=m[side]||{};var kit=((m.kit||{})[side]===1)?1:0;var K=kitsOf(o||{})[kit];
      return '<th colspan="3" class="tn">'+esc(teamLabel(t))+(win===side?' <span class="win">승</span>':'')+' <span class="s" style="display:inline-block;border:1px solid #333;background:'+esc(K.color)+';color:'+kitTextColor(K.color)+';padding:0 2mm;border-radius:1mm;font-weight:600">'+esc(K.name)+'</span></th>'}
    function gp(side){var fp=(m.fairplay||{})[side];var cs=(m.coachScore||{})[side];return '<td class="g l" colspan="3" style="padding-left:3mm"><b>가점</b> &nbsp;페어플레이 <b>'+(fp!=null?fp:'')+'</b>'+(cs!=null?' &nbsp;·&nbsp; 지도자 <b>'+cs+'</b>':'')+'</td>'}
    var timeline='<table class="tl"><colgroup><col style="width:26mm"><col style="width:25mm"><col style="width:33mm"><col style="width:18mm"><col style="width:26mm"><col style="width:25mm"><col style="width:33mm"></colgroup>'
      +'<tr>'+th_('a',oa)+'<th rowspan="2" class="mid">TIME<br><span class="s" style="font-weight:600">점수</span></th>'+th_('b',ob)+'</tr>'
      +'<tr><th>득점</th><th>도움</th><th>제재</th><th>득점</th><th>도움</th><th>제재</th></tr>'+rows.join('')
      +'<tr>'+gp('a')+'<td class="g"></td>'+gp('b')+'</tr></table>';
    var ta=m.a||{},tb=m.b||{};var day=m.day||'';var dd=day?new Date(day+'T00:00:00'):null;
    var sg=function(s){return s&&s.name?('<b>'+esc(s.name)+'</b> '+(s.img?'<img class="sig" src="'+esc(s.img)+'">':'<u>&nbsp;</u>')):'<u>&nbsp;</u>'};
    var coachBox=function(side,o){var cs=coachesOf(m,side,o);var key=side==='a'?'coachA':'coachB';var first=signs[key]&&signs[key].name?signs[key]:(cs[0]?{name:cs[0].name,img:cs[0].sign}:null);
      return '<div><b>감독교사('+esc(t_(side))+'):</b>'+sg(first)+(cs.length>1?' <span class="s">· '+cs.slice(1).map(function(c){return esc(c.name)}).join(', ')+'</span>':'')+'</div>'};
    function t_(side){var t=m[side]||{};return t.name||t.school||side.toUpperCase()}
    var offs=offList(m);var byRole={};offs.forEach(function(x){(byRole[x.role||'심판']=byRole[x.role||'심판']||[]).push(x)});
    var offLine=function(role,labelFn){var L=byRole[role]||[];if(!L.length)return '<div><b>'+esc(role)+':</b><u>&nbsp;</u></div>';return L.map(function(x,i){return '<div><b>'+esc(labelFn?labelFn(i):role)+':</b>'+sg(signs[x.key]&&signs[x.key].name?signs[x.key]:{name:x.name})+'</div>'}).join('')};
    var mvps=(m.mvps&&m.mvps.length?m.mvps:(m.mvp?[m.mvp]:[])).map(function(p){return '#'+(p.no||'')+' '+(p.name||'')+(p.team?' ('+p.team+')':'')}).join(', ');
    return '<div class="pg"><div class="h1" style="font-size:16pt">( '+esc(m.div||'')+' )부 ( '+esc(m.round||'')+' )경기 기록(결과)지 ( '+esc(m.stage||'예선')+' )</div>'
      +'<table><tr><td class="lab" style="width:20mm">경기<br>일시</td><td style="width:46mm">'+(dd?dd.getFullYear()+'년 '+(dd.getMonth()+1)+'월 '+dd.getDate()+'일':esc(day))+(m.time?' '+esc(m.time):(m.startAt?' '+esc(new Date(tsMs(m.startAt)).toTimeString().slice(0,5)):''))+'</td><td class="lab" style="width:20mm">경기장소</td><td class="l" style="padding-left:3mm">'+esc(m.place||'')+(m.court?' ( '+esc(m.court)+' )':'')+'</td></tr></table>'
      +'<table style="border-top:none"><tr><td class="lab" rowspan="3" style="width:20mm">경기 결과</td><th style="width:46mm">학교명</th><th class="y" style="width:20mm">전반</th><th class="b" style="width:20mm">후반</th><th style="width:20mm">총점</th><th>결과</th></tr>'
      +['a','b'].map(function(side){var t=m[side]||{};var me=side==='a'?sc.a:sc.b,op=side==='a'?sc.b:sc.a;var res=m.status==='종료'?(me>op?'승':me<op?'패':'무'):'';return '<tr><td class="l" style="padding-left:3mm;font-weight:800">'+esc(teamLabel(t))+'</td><td class="y">'+((H[side]||{})['전반']||0)+'</td><td class="b">'+(((H[side]||{})['후반']||0)+((H[side]||{})['연장']||0))+'</td><td style="font-weight:900">'+me+'</td><td style="font-weight:900;font-size:12pt">'+res+'</td></tr>'}).join('')+'</table>'
      +(win?'<div class="winline">'+esc(t_('a'))+' <b>'+sc.a+'</b> : <b>'+sc.b+'</b> '+esc(t_('b'))+' &nbsp;—&nbsp; <span class="win">'+esc(t_(win))+' 승</span></div>':'')
      +'<div style="margin-top:2mm">'+timeline+'</div>'
      +'<div class="s" style="margin-top:2mm">※ 한 줄에 사건 하나 — 왼쪽 팀 사건은 왼쪽 칸, 오른쪽 팀 사건은 오른쪽 칸에 적고 가운데 칸은 위가 시간, 아래가 그 득점 직후의 점수(왼쪽 : 오른쪽) &nbsp; ※제재(지도자 포함): 주의 · 옐로(경고) · 레드(퇴장) — 옐로 2장은 퇴장 &nbsp; ※페어플레이·지도자 가점: 5 ~ −3</div>'
      +'<div class="s">최우수선수 추천: <b>'+esc(mvps)+'</b></div>'
      +'<div class="sl">'+coachBox('a',oa)+coachBox('b',ob)+'</div>'
      +'<div class="sl">'+offLine('감독관')+offLine('기록원')+offLine('점수심')+'</div>'
      +'<div class="sl">'+offLine('주심',function(i){return '주심'+((byRole['주심']||[]).length>1?(i+1):'')})+offLine('부심',function(i){return '부심'+(i+1)})+'</div>'
      +'<div class="s" style="color:#666;margin-top:3mm">연맹 홈페이지 경기 기록 콘솔 기록 · '+(m.locked?'확정':'미확정')+(m.confirmedBy?' · 확정 '+esc(m.confirmedBy.name||'')+(m.confirmedBy.role?'('+esc(m.confirmedBy.role)+')':'')+' '+esc(String(m.confirmedBy.at||'').slice(0,16).replace('T',' ')):'')+' · 시간은 구간 안의 경기 시간(분:초)</div></div>'}
  // ══ [타임라인 기록지 2026-10-18] 가운데 세로줄에 시간·점수, 왼쪽은 A팀·오른쪽은 B팀 사건(득점·도움·제재·작전타임), 구간마다 표시 ══
  var KTLCSS='.ktl{font-family:Pretendard,"Malgun Gothic",sans-serif;color:#111827;max-width:780px;margin:0 auto;background:#fff}'
    +'.ktl-hd{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;padding:18px 12px 12px}'
    +'.ktl-tm{text-align:center;min-width:0}.ktl-tm .dot{width:46px;height:46px;border-radius:50%;margin:0 auto 7px;border:2px solid rgba(0,0,0,.12);box-shadow:inset 0 0 0 3px rgba(255,255,255,.55)}.ktl-tm b{display:block;font-size:16px;font-weight:900;word-break:keep-all;line-height:1.3}.ktl-tm small{display:block;font-size:11.5px;color:#6b7280;margin-top:2px;word-break:keep-all}'
    +'.ktl-tm .wn{display:inline-block;margin-top:5px;background:#C41E2F;color:#fff;font-size:11px;font-weight:900;border-radius:999px;padding:2px 10px}'
    +'.ktl-sc{text-align:center}.ktl-sc .n{font-size:42px;font-weight:900;font-variant-numeric:tabular-nums;letter-spacing:-1px;line-height:1}.ktl-sc .n i{font-style:normal;color:#c3c9d3;margin:0 8px}.ktl-sc small{display:block;font-size:11.5px;font-weight:800;color:#6b7280;margin-top:6px}'
    +'.ktl-meta{text-align:center;font-size:12px;color:#6b7280;padding:0 10px 10px;border-bottom:1px solid #eef1f5}'
    +'.ktl-bd{position:relative;padding:10px 0 14px}.ktl-bd::before{content:"";position:absolute;left:50%;top:0;bottom:0;width:4px;margin-left:-2px;background:#e6e9ef;border-radius:2px}'
    +'.ktl-r{position:relative;display:grid;grid-template-columns:1fr 78px 1fr;align-items:center;min-height:62px}'
    +'.ktl-t{display:flex;flex-direction:column;align-items:center;gap:3px;z-index:1}.ktl-t span{display:inline-flex;align-items:center;justify-content:center;min-width:60px;height:36px;padding:0 9px;border:3px solid #e6e9ef;border-radius:999px;background:#fff;font-weight:900;font-size:14px;font-variant-numeric:tabular-nums;color:#111827}'
    +'.ktl-t em{font-style:normal;font-size:11.5px;font-weight:900;color:#fff;background:#153A77;border-radius:999px;padding:1px 9px;font-variant-numeric:tabular-nums}'
    +'.ktl-e{display:flex;align-items:center;gap:8px;padding:6px 12px}.ktl-l .ktl-e{justify-content:flex-end;text-align:right}.ktl-rr .ktl-e{justify-content:flex-start;text-align:left}'
    +'.ktl-e .tx{min-width:0}.ktl-e .tx b{display:block;font-size:15px;font-weight:900;word-break:keep-all;line-height:1.3}.ktl-e .tx small{display:block;font-size:12px;color:#6b7280;margin-top:1px;word-break:keep-all}'
    +'.ktl-chip{flex:none;font-size:11.5px;font-weight:900;border-radius:7px;padding:4px 8px;white-space:nowrap}.k-goal{background:#e5f5ea;color:#15803d}.k-y{background:#fff3c4;color:#a16207}.k-r{background:#fde2e4;color:#be123c}.k-c{background:#eef2f7;color:#475569}.k-o{background:#ffedd5;color:#c2410c}.k-to{background:#e6edfd;color:#1d4ed8}.k-x{background:#f1f2f4;color:#6b7280}'
    +'.ktl-ic{flex:none;display:inline-flex;align-items:center}.ktl-cd{display:inline-block;width:12px;height:16px;border-radius:2px;box-shadow:0 1px 2px rgba(0,0,0,.25)}.ktl-cd.y{background:#facc15}.ktl-cd.r{background:#e11d48}'
    +'.ktl-p{position:relative;display:flex;flex-direction:column;align-items:center;margin:10px 0;z-index:1}.ktl-p .ck{width:46px;height:46px;border-radius:50%;background:#9aa3af;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 5px #fff}'
    +'.ktl-p b{margin-top:5px;font-size:13px;font-weight:900;background:#fff;padding:0 8px}.ktl-p small{font-size:11.5px;color:#6b7280;background:#fff;padding:0 6px}.ktl-p.end .ck{background:#153A77}'
    +'.ktl-r.void{opacity:.4}.ktl-r.void .tx b{text-decoration:line-through}.ktl-act{display:flex;gap:4px;margin-top:4px}.ktl-l .ktl-act{justify-content:flex-end}.ktl-ao{display:none;margin-top:0;flex:0 0 auto}.ktl-l .ktl-ao{margin-right:auto}.ktl-rr .ktl-ao{margin-left:auto}@media(min-width:700px){.ktl-ao{display:flex}.ktl-am{display:none}}'
    +'.ktl-act button{border:1px solid #d5dce8;background:#fff;color:#111827;border-radius:8px;padding:3px 9px;font-size:11.5px;font-weight:800;cursor:pointer;font-family:inherit}'
    +'.ktl-empty{position:relative;z-index:1;text-align:center;font-size:13px;color:#6b7280;background:#fff;margin:14px auto;padding:6px 12px;max-width:80%}'
    +'.ktl-ft{border-top:1px solid #eef1f5;padding:10px 14px;font-size:12.5px;color:#374151;line-height:1.75}.ktl-ft b{color:#111827}'
    +'.ktl-e .ktl-gl{display:flex;gap:14px;align-items:flex-start}.ktl-l .ktl-e .ktl-gl{justify-content:flex-end}.ktl-e .ktl-pp b{display:block;font-size:15px;font-weight:900;line-height:1.3;white-space:nowrap}.ktl-e .ktl-pp small{display:block;font-size:11px;font-weight:700;color:#6b7280;margin-top:1px}'
    +'.ktl-th{display:grid;grid-template-columns:1fr 78px 1fr;align-items:center;padding:10px 12px 6px;border-bottom:1px solid #eef1f5;position:relative;z-index:1;background:#fff}.ktl-th b{font-size:14px;font-weight:900;color:#153A77}.ktl-th b small{display:block;font-size:11.5px;font-weight:700;color:#4b5563;margin-top:2px;line-height:1.35;word-break:keep-all;overflow-wrap:break-word}.ktl-th b:first-child{text-align:right;padding-right:12px}.ktl-th b:last-child{padding-left:12px}.ktl-th span{text-align:center;font-size:11px;font-weight:800;color:#9aa1ad}'
    +'.ktl.cp .ktl-r{min-height:54px}.ktl.cp .ktl-p{margin:6px 0}.ktl.cp .ktl-p .ck{width:36px;height:36px}'
    +'@media(max-width:520px){.ktl-r{grid-template-columns:1fr 64px 1fr}.ktl-th{grid-template-columns:1fr 64px 1fr}.ktl-e .ktl-pp b{font-size:13px}.ktl-e .ktl-gl{gap:8px}.ktl-e{padding:5px 6px;gap:5px}.ktl-e .tx b{font-size:13.5px}.ktl-chip{font-size:10.5px;padding:3px 6px}.ktl-t span{min-width:52px;height:32px;font-size:13px}.ktl-sc .n{font-size:34px}.ktl-tm b{font-size:14px}}'
    +'@media print{.ktl-act{display:none}.ktl{max-width:none}}';
  var CKSVG='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6M5 5l1.5 1.5M19 5l-1.5 1.5"/></svg>';
  var DISCSVG='<svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="#15803d"/><circle cx="12" cy="12" r="6" fill="none" stroke="#fff" stroke-width="2.2"/><circle cx="12" cy="12" r="1.8" fill="#fff"/></svg>';
  function timelineBody(m,oa,ob,opt){opt=opt||{};var PO={'전반':0,'후반':1,'연장':2};var sc=score(m.events||[]);var win=winnerOf(m);
    var all=(m.events||[]).map(function(e,i){return {e:e,i:i}}).filter(function(x){var e=x.e;if(!e||!(e.side==='a'||e.side==='b'))return false;if(e.void&&!opt.showVoid)return false;return e.type==='goal'||e.type==='card'||e.type==='timeout'||(e.type==null&&typeof e.d==='number')})
      .sort(function(x,y){var a=x.e,b=y.e;return ((PO[a.period]!=null?PO[a.period]:9)-(PO[b.period]!=null?PO[b.period]:9))||((evSec(a)||0)-(evSec(b)||0))||(x.i-y.i)});
    var items=[],run={a:0,b:0},curP=null,CL=m.clockLog||{};
    all.forEach(function(x){var e=x.e;var p=e.period||'';if(p!==curP){curP=p;items.push({p:p})}var d=e.void?0:(e.type==='goal'?1:(e.type==null?(+e.d||0):0));if(d)run[e.side]=Math.max(0,run[e.side]+d);items.push({e:e,d:d,sa:run.a,sb:run.b})});
    if(m.status==='종료')items.push({end:1});
    if(opt.desc)items.reverse();
    var pn=function(p){return p?((p.no?'#'+p.no+' ':'')+(p.name||'')):''};
    var LS=opt.swap?'b':'a',RS=opt.swap?'a':'b';   /* [2026-10-19] 코트 체인지 — 점수판과 같은 좌우 */
    var cell=function(e,side){var chip='',ic='',main='',sub='';
      if(e.type==='goal'){ic=DISCSVG;main=e.scorer?pn(e.scorer):'득점자 미지정';sub='(득점'+(e.assist?' · 도움 '+pn(e.assist):'')+')'}
      else if(e.type==null){chip='<span class="ktl-chip '+(e.d>0?'k-goal':'k-x')+'">'+(e.d>0?'득점':'득점 취소')+'</span>';main=(m[side]||{}).name||''}
      else if(e.type==='card'){var c=e.card;var cls=c==='Y'?'k-y':(c==='R'||c==='W')?'k-r':c==='C'?'k-c':'k-o';chip='<span class="ktl-chip '+cls+'">'+esc(CARDS[c]||c||'제재')+'</span>';if(c==='Y')ic='<span class="ktl-cd y"></span>';else if(c==='R'||c==='W')ic='<span class="ktl-cd r"></span>';
        var tg=e.target||{};main=tg.kind==='coach'?'지도자 '+(tg.name&&tg.name!=='지도자'?tg.name:''):pn(tg);sub=e.note?'('+e.note+')':''}
      else if(e.type==='timeout'){chip='<span class="ktl-chip k-to">작전타임</span>';main=opt.compact?'':((m[side]||{}).name||'');sub=''}
      if(e.void)sub=(sub?sub+' ':'')+'· 취소됨';
      var _ac=opt.act?opt.act(e):'';var act=_ac?'<div class="ktl-act ktl-am">'+_ac+'</div>':'';var actO=_ac?'<div class="ktl-act ktl-ao">'+_ac+'</div>':'';
      var tx=e.type==='goal'?'<div class="tx"><div class="ktl-gl"><span class="ktl-pp"><b>'+esc(main)+'</b><small>득점</small></span>'+(e.assist?'<span class="ktl-pp"><b>'+esc(pn(e.assist))+'</b><small>도움</small></span>':'')+'</div>'+(e.void?'<small>· 취소됨</small>':'')+act+'</div>'
        :'<div class="tx">'+(main?'<b>'+esc(main)+'</b>':'')+(sub?'<small>'+esc(sub)+'</small>':'')+act+'</div>';
      var marks=(ic?'<span class="ktl-ic">'+ic+'</span>':'')+chip;
      return '<div class="ktl-e">'+(side===LS?actO+tx+marks:marks+tx+actO)+'</div>'};
    var body=items.map(function(it){
      if(it.end)return '<div class="ktl-p end"><span class="ck">'+CKSVG+'</span><b>경기 종료</b><small>'+(LS==='a'?sc.a+' : '+sc.b:sc.b+' : '+sc.a)+(win?' · '+esc(teamName(win))+' 승':' · 무승부')+'</small></div>';
      if(it.p!=null)return '<div class="ktl-p"><span class="ck">'+CKSVG+'</span><b>'+esc(it.p||'구간 미정')+'</b>'+(CL[it.p]?'<small>'+esc(CL[it.p])+' 종료</small>':'')+'</div>';
      var e=it.e;return '<div class="ktl-r'+(e.void?' void':'')+'"><div class="ktl-l">'+(e.side===LS?cell(e,LS):'')+'</div><div class="ktl-t"><span>'+esc(evTime(e)||'-')+'</span>'+(it.d?'<em>'+(LS==='a'?it.sa+' : '+it.sb:it.sb+' : '+it.sa)+'</em>':'')+'</div><div class="ktl-rr">'+(e.side===RS?cell(e,RS):'')+'</div></div>'}).join('');
    function teamName(s){var t=m[s]||{};return t.name||t.school||s.toUpperCase()}
    var css=opt.noCss?'':'<style>'+KTLCSS+'</style>';
    var bd='<div class="ktl-bd">'+(body||'<div class="ktl-empty">아직 기록이 없습니다</div>')+'</div>';
    var hd=opt.heads||{};var th=opt.teamsHead?'<div class="ktl-th"><b>'+esc(teamName(LS))+(hd[LS]?'<small>'+esc(hd[LS])+'</small>':'')+'</b><span>시간 · 점수</span><b>'+esc(teamName(RS))+(hd[RS]?'<small>'+esc(hd[RS])+'</small>':'')+'</b></div>':'';
    if(opt.inline)return css+'<div class="ktl'+(opt.compact?' cp':'')+'">'+th+bd+'</div>';
    var kit=function(side,o){var k=((m.kit||{})[side]===1)?1:0;return kitsOf(o||{})[k]};
    var tmH=function(side,o){var t=m[side]||{};var K=kit(side,o);return '<div class="ktl-tm"><div class="dot" style="background:'+esc(K.color)+'"></div><b>'+esc(t.name||t.school||side.toUpperCase())+'</b>'+(t.school&&t.school!==t.name?'<small>'+esc(t.school)+'</small>':'')+(win===side?'<span class="wn">승</span>':'')+'</div>'};
    var dd=m.day?String(m.day).replace(/-/g,'.'):'';
    var offs=offList(m).map(function(x){return (x.role||'')+' '+(x.name||'')}).join(' · ');
    var mv=(m.mvps&&m.mvps.length?m.mvps:(m.mvp?[m.mvp]:[])).map(function(p){return '#'+(p.no||'')+' '+(p.name||'')+(p.team?' ('+p.team+')':'')}).join(', ');
    var fp=m.fairplay?(teamName('a')+' '+(m.fairplay.a!=null?m.fairplay.a:'-')+' · '+teamName('b')+' '+(m.fairplay.b!=null?m.fairplay.b:'-')):'';
    var cA=coachesOf(m,'a',oa||{}).map(function(c){return c.name}).join(', '),cB=coachesOf(m,'b',ob||{}).map(function(c){return c.name}).join(', ');
    return css+'<div class="ktl"><div class="ktl-hd">'+tmH('a',oa)+'<div class="ktl-sc"><div class="n">'+sc.a+'<i>:</i>'+sc.b+'</div><small>'+esc(m.status==='종료'?(m.locked?'경기 종료 · 확정':'경기 종료'):(m.status==='진행'?'진행 중 · '+(m.period||''):'경기 전'))+'</small></div>'+tmH('b',ob)+'</div>'
      +'<div class="ktl-meta">'+esc([m.div,m.stage,m.group||'',m.round].filter(Boolean).join(' · '))+'<br>'+esc([dd,m.time,m.place,m.court].filter(Boolean).join(' · '))+'</div>'+bd
      +'<div class="ktl-ft">'+(mv?'<div><b>최우수선수</b> '+esc(mv)+'</div>':'')+(fp?'<div><b>페어플레이</b> '+esc(fp)+'</div>':'')+((cA||cB)?'<div><b>감독교사</b> '+esc(teamName('a'))+' '+esc(cA||'-')+' · '+esc(teamName('b'))+' '+esc(cB||'-')+'</div>':'')+(offs?'<div><b>심판진</b> '+esc(offs)+'</div>':'')+'<div style="color:#9aa1ad;font-size:11.5px;margin-top:4px">대한민국플라잉디스크연맹 경기 기록 · 시간은 구간 안의 경기 시간(분:초)</div></div></div>'}
  function timelineHtml(m,oa,ob){return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc('경기 기록_'+teamLabel(m.a)+'_'+teamLabel(m.b))+'</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"><style>body{margin:0;background:#fff}@page{size:A4;margin:10mm}</style></head><body>'+timelineBody(m,oa,ob,{})+'</body></html>'}
  function printTimeline(m,oa,ob){var w=pwin('경기 기록_'+teamLabel(m.a)+'_'+teamLabel(m.b));if(!w)return;w.document.write(timelineBody(m,oa,ob,{}));pend(w)}
  function printSheet(m,oa,ob,signs,opt){var w=pwin('경기 기록지_'+teamLabel(m.a)+'_'+teamLabel(m.b));if(!w)return;w.document.write(sheetBody(m,oa,ob,signs,opt));pend(w)}
  // 같은 화면 안(iframe)에서 보여 줄 완성 문서 — 좁은 화면에서는 A4 폭을 화면에 맞춰 축소(인쇄 때는 원래 크기)
  function sheetHtml(m,oa,ob,signs,opt){return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc('경기 기록지_'+teamLabel(m.a)+'_'+teamLabel(m.b))+'</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"><style>'+PCSS+'body{background:#fff}@media print{.zw{zoom:1!important}}</style></head><body><div class="zw">'+sheetBody(m,oa,ob,signs,opt)+'</div><script>(function(){var z=document.querySelector(".zw");function fit(){var w=document.documentElement.clientWidth;var k=Math.min(1,(w-12)/740);z.style.zoom=k<1?k:""}fit();window.addEventListener("resize",fit);window.addEventListener("beforeprint",function(){z.style.zoom=""});window.addEventListener("afterprint",fit)})()<\/script></body></html>'}
  function printGolf(round,title){var w=pwin('디스크골프 스코어_'+(title||''));if(!w)return;var R=golfRank(round);var holes=round.holes||18;var hs='';for(var i=1;i<=holes;i++)hs+='<th style="width:6.5mm">'+i+'</th>';
    var ps='';(round.par||[]).slice(0,holes).forEach(function(p){ps+='<td>'+esc(p)+'</td>'});
    Object.keys(R).forEach(function(dv){w.document.write('<div class="pg"><div class="h1" style="font-size:16pt">디스크골프 스코어카드 · '+esc(dv)+'</div><div class="h2">'+esc(title||'')+' · '+holes+'홀'+(round.playoff&&round.playoff.length?' · 연장 '+round.playoff.length+'홀':'')+'</div>'
      +'<table class="s"><tr><th>순위</th><th class="l">선수</th><th>소속</th>'+hs+'<th>합계</th><th>파 대비</th>'+(round.playoff&&round.playoff.length?'<th>연장</th>':'')+'</tr><tr><td colspan="3" class="lab">PAR</td>'+ps+'<td colspan="2"></td>'+(round.playoff&&round.playoff.length?'<td></td>':'')+'</tr>'
      +R[dv].map(function(p){var h='';for(var i=0;i<holes;i++){var v=(((round.scores||{})[p.pid]||{}).h||[])[i];h+='<td>'+(v==null||v===''?'':esc(v))+'</td>'}return '<tr><td>'+(p.tied?'T':'')+p.rank+'</td><td class="l">'+esc(p.name)+'</td><td>'+esc(p.school||'')+'</td>'+h+'<td style="font-weight:900">'+p.total+'</td><td>'+(p.toPar>0?'+':'')+p.toPar+'</td>'+(round.playoff&&round.playoff.length?'<td>'+p.po.map(function(v){return v==null?'-':v}).join('/')+'</td>':'')+'</tr>'}).join('')+'</table>'
      +'<div class="sl"><div><b>마커:</b><u>&nbsp;</u></div><div><b>경기위원:</b><u>&nbsp;</u></div></div></div>')});pend(w)}

  // ── 순위: 승점(승3·무1·패0) → 득실차 → 다득점 → 승자승(동률 팀끼리 경기 승점·득실) → 제재 수 적은 팀 → 추첨(lots: {팀키:순번}) ──
  function rankTable(teams,fin,lot){
    var sig=function(t){return [t.pts,t.gf-t.ga,t.gf].join('|')};
    teams.sort(function(x,y){return y.pts-x.pts||(y.gf-y.ga)-(x.gf-x.ga)||y.gf-x.gf});
    var out=[],i=0;
    while(i<teams.length){var j=i;while(j+1<teams.length&&sig(teams[j+1])===sig(teams[i]))j++;var grp=teams.slice(i,j+1);
      if(grp.length>1){var keys={};grp.forEach(function(t){keys[t.key]=1;t.h2h=0;t.h2hgd=0});
        fin.forEach(function(m){var ka=(m.a||{}).pid||(m.a||{}).name,kb=(m.b||{}).pid||(m.b||{}).name;if(!keys[ka]||!keys[kb])return;var sc=score(m.events||[]);var A=grp.filter(function(t){return t.key===ka})[0],B=grp.filter(function(t){return t.key===kb})[0];
          A.h2hgd+=sc.a-sc.b;B.h2hgd+=sc.b-sc.a;if(sc.a>sc.b)A.h2h+=3;else if(sc.a<sc.b)B.h2h+=3;else{A.h2h++;B.h2h++}});
        grp.sort(function(x,y){return y.h2h-x.h2h||y.h2hgd-x.h2hgd||(x.sanc||0)-(y.sanc||0)||((lot[x.key]||999)-(lot[y.key]||999))||String(x.name).localeCompare(String(y.name),'ko')});
        grp.forEach(function(t,k){var nb=grp[k-1]||grp[k+1];var nbs=[grp[k-1],grp[k+1]].filter(Boolean);
          t.tb=nbs.every(function(o){return o.h2h!==t.h2h||o.h2hgd!==t.h2hgd})?'승자승':nbs.every(function(o){return o.h2h!==t.h2h||o.h2hgd!==t.h2hgd||(o.sanc||0)!==(t.sanc||0)})?'제재 수':(lot[t.key]?'추첨':'');
          t.needLot=t.p>0&&nbs.some(function(o){return o.p>0&&o.h2h===t.h2h&&o.h2hgd===t.h2hgd&&(o.sanc||0)===(t.sanc||0)&&!(lot[o.key]&&lot[t.key])})})}
      out=out.concat(grp);i=j+1}
    return out.map(function(t,k){return Object.assign({rank:k+1},t)})}

  // ── 엑셀(xlsx) — SheetJS 를 필요할 때 불러옴 ──
  function loadXlsx(){if(window.XLSX)return Promise.resolve(window.XLSX);return new Promise(function(ok,no){var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=function(){ok(window.XLSX)};s.onerror=function(){no(new Error('엑셀 모듈을 불러오지 못했습니다(네트워크 확인)'))};document.head.appendChild(s)})}
  function teamLabel(t){t=t||{};return (t.school&&t.name&&t.school!==t.name)?t.school+' ('+t.name+')':(t.school||t.name||'')}
  function roundLabel(m){var r=String((m&&m.round)||'');return /^d+$/.test(r)?r+'경기':r}
  function matchRows(m){var rows=[];var PO={'전반':0,'후반':1,'연장':2};(m.events||[]).filter(function(e){return e&&!e.void}).slice().sort(function(a,b){return ((PO[a.period]!=null?PO[a.period]:9)-(PO[b.period]!=null?PO[b.period]:9))||((evSec(a)||0)-(evSec(b)||0))}).forEach(function(e){var L=evLine(e);rows.push([e.period||'',evTime(e),teamLabel(m[e.side]||{})||'',e.type==='goal'?'득점':e.type==='card'?'제재':e.type==='timeout'?'작전타임':(e.type||''),L.who,e.type==='goal'?(e.score||''):'',e.note||''])});return rows}
  function xlsxMatchSheet(X,m,oa,ob){var sc=score(m.events||[]);var H=sc.half||{a:{},b:{}};
    var aoa=[[[m.div,m.stage,roundLabel(m)].filter(Boolean).join(' ')+' 결과'],['일시',(m.day||'')+' '+(m.time||''),'장소',(m.place||'')+' '+(m.court||'')],[],['팀','전반','후반','연장','합계','결과','풀(전반/후반)','작전타임']];
    var to=timeouts(m);['a','b'].forEach(function(sd){var me=sd==='a'?sc.a:sc.b,op=sd==='a'?sc.b:sc.a;var h=H[sd]||{};aoa.push([teamLabel(m[sd]),h['전반']||0,h['후반']||0,h['연장']||0,me,m.status==='종료'?(me>op?'승':me<op?'패':'무'):'',((m.pulls||{})['전반']===sd?'전반 ':'')+((m.pulls||{})['후반']===sd?'후반':''),Object.keys(to[sd]).map(function(p){return p+' '+to[sd][p].map(evTime).join(',')}).join(' / ')])});
    aoa.push([],['구간','시간','팀','구분','내용','점수','사유·메모']);matchRows(m).forEach(function(r){aoa.push(r)});
    var ps=playerStats(m);aoa.push([],['팀','배번','선수','득점','어시스트','제재']);['a','b'].forEach(function(sd){Object.keys(ps[sd]).forEach(function(k){var p=ps[sd][k];aoa.push([teamLabel(m[sd]),p.no,p.name,p.g,p.a,(p.c||[]).map(function(c){return CARDS[c]||c}).join(',')])})});
    if(m.mvp)aoa.push([],['최우수선수','#'+(m.mvp.no||'')+' '+(m.mvp.name||''),m.mvp.team||'']);
    var ws=X.utils.aoa_to_sheet(aoa);ws['!cols']=[{wch:22},{wch:10},{wch:22},{wch:10},{wch:28},{wch:8},{wch:24},{wch:24}];return ws}
  function safeName(n){return String(n||'시트').replace(/[\\/?*\[\]:]/g,'').slice(0,31)||'시트'}
  function saveXlsxMatch(m,oa,ob){return loadXlsx().then(function(X){var wb=X.utils.book_new();X.utils.book_append_sheet(wb,xlsxMatchSheet(X,m,oa,ob),'경기 결과');X.writeFile(wb,'경기결과_'+[m.div,m.round,(m.a||{}).name,(m.b||{}).name].filter(Boolean).join('_').replace(/[\\/:*?"<>|]/g,'')+'.xlsx')})}
  // 대회 최종 결과: 부문별 순위표 · 득점/어시스트 · 전체 경기 · 경기별 기록
  function saveXlsxComp(title,st,matches){return loadXlsx().then(function(X){var wb=X.utils.book_new();
    sortStatKeys(Object.keys(st.byDiv||{}),matches).forEach(function(dv){var T=st.byDiv[dv].table||[];var aoa=[[title+' · '+dv+' 순위'],['순위','팀','소속','경기','승','무','패','득점','실점','득실','승점','제재','순위 결정']];T.forEach(function(t){aoa.push([t.rank,t.name,t.school||'',t.p,t.w,t.d,t.l,t.gf,t.ga,t.gf-t.ga,t.pts,t.sanc||0,t.tb||''])});var ws=X.utils.aoa_to_sheet(aoa);ws['!cols']=[{wch:6},{wch:20},{wch:18}];X.utils.book_append_sheet(wb,ws,safeName('순위_'+dv))});
    var sa=[['순위','부문','팀','배번','선수','득점','어시스트']];(st.scorers||[]).forEach(function(p,i){sa.push([i+1,p.div,p.team,p.no,p.name,p.g,p.a])});X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet(sa),'득점·어시스트');
    var ma=[['부문','단계','경기','일자','시각','코트','A팀','A점수','B점수','B팀','상태','확정']];(matches||[]).filter(function(m){return m&&!m.golf}).forEach(function(m){var sc=score(m.events||[]);ma.push([m.div||'',m.stage||'',m.round||'',m.day||'',m.time||'',m.court||'',teamLabel(m.a),sc.a,sc.b,teamLabel(m.b),m.status||'',m.locked?'확정':''])});X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet(ma),'전체 경기');
    var ea=[['부문','경기','A팀','B팀','구간','시간','팀','구분','내용','점수','사유·메모']];(matches||[]).filter(function(m){return m&&!m.golf&&m.status!=='예정'}).forEach(function(m){matchRows(m).forEach(function(r){ea.push([m.div||'',m.round||'',teamLabel(m.a),teamLabel(m.b)].concat(r))})});X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet(ea),'경기 기록');
    X.writeFile(wb,'대회결과_'+String(title||'').replace(/[\\/:*?"<>|]/g,'').slice(0,40)+'.xlsx')})}
  // 대회 최종 결과 PDF(인쇄)
  function printComp(title,st,matches){var KF=statKeyFn(matches);var w=pwin('대회 결과_'+(title||''));if(!w)return;
    sortStatKeys(Object.keys(st.byDiv||{}),matches).forEach(function(dv){var T=st.byDiv[dv].table||[];var M=(matches||[]).filter(function(m){return m&&!m.golf&&KF(m)===dv});
      w.document.write('<div class="pg"><div class="h1" style="font-size:18pt">'+esc(title||'')+'</div><div class="h2">'+esc(dv)+' 최종 결과</div>'
        +'<table><tr><th>순위</th><th>팀</th><th>경기</th><th>승</th><th>무</th><th>패</th><th>득</th><th>실</th><th>득실</th><th>승점</th><th>제재</th><th>비고</th></tr>'+T.map(function(t){return '<tr><td><b>'+t.rank+'</b></td><td class="l">'+esc(teamLabel(t))+'</td><td>'+t.p+'</td><td>'+t.w+'</td><td>'+t.d+'</td><td>'+t.l+'</td><td>'+t.gf+'</td><td>'+t.ga+'</td><td>'+(t.gf-t.ga)+'</td><td><b>'+t.pts+'</b></td><td>'+(t.sanc||0)+'</td><td class="s">'+esc(t.tb||'')+'</td></tr>'}).join('')+'</table>'
        +'<div class="s" style="margin:2mm 0 4mm">※ 순위: 승점(승3·무1·패0) → 득실차 → 다득점 → 승자승 → 제재 수 → 추첨</div>'
        +'<table><tr><th>단계</th><th>경기</th><th>일시·코트</th><th>A팀</th><th>점수</th><th>B팀</th><th>상태</th></tr>'+M.map(function(m){var sc=score(m.events||[]);return '<tr><td>'+esc(m.stage||'')+'</td><td>'+esc(m.round||'')+'</td><td class="s">'+esc([m.day,m.time,m.court].filter(Boolean).join(' '))+'</td><td class="l">'+esc(teamLabel(m.a))+'</td><td><b>'+sc.a+' : '+sc.b+'</b></td><td class="l">'+esc(teamLabel(m.b))+'</td><td>'+esc(m.status||'')+(m.locked?'·확정':'')+'</td></tr>'}).join('')+'</table></div>')});
    var S=(st.scorers||[]).slice(0,40);if(S.length)w.document.write('<div class="pg"><div class="h1" style="font-size:16pt">득점 · 어시스트</div><div class="h2">'+esc(title||'')+'</div><table><tr><th>순위</th><th>부문</th><th>팀</th><th>배번</th><th>선수</th><th>득점</th><th>어시스트</th></tr>'+S.map(function(p,i){return '<tr><td>'+(i+1)+'</td><td>'+esc(p.div)+'</td><td class="l">'+esc(p.team)+'</td><td>'+esc(p.no)+'</td><td>'+esc(p.name)+'</td><td><b>'+p.g+'</b></td><td>'+p.a+'</td></tr>'}).join('')+'</table></div>');
    pend(w)}
  window.KFDF_MR={timelineBody:timelineBody,timelineHtml:timelineHtml,printTimeline:printTimeline,sortStatKeys:sortStatKeys,bracketHtml:bracketHtml,isKnockout:isKnockout,statKeyFn:statKeyFn,offList:offList,offOf:offOf,coachesOf:coachesOf,winnerOf:winnerOf,ROLE_LABEL:ROLE_LABEL,roundLabel:roundLabel,CARD_PICK:CARD_PICK,isOff:isOff,KIT_COLORS:KIT_COLORS,kitTextColor:kitTextColor,kitsOf:kitsOf,noFor:noFor,secOf:secOf,fmtSec:fmtSec,evSec:evSec,evTime:evTime,clockSetMs:clockSetMs,clockAdd:clockAdd,clockFloorMin:clockFloorMin,brkLeft:brkLeft,timeouts:timeouts,sentOff:sentOff,yellowCount:yellowCount,rankTable:rankTable,loadXlsx:loadXlsx,saveXlsxMatch:saveXlsxMatch,saveXlsxComp:saveXlsxComp,printComp:printComp,teamLabel:teamLabel,
    PERIODS:PERIODS,CARDS:CARDS,esc:esc,uid8:uid8,tsMs:tsMs,score:score,goals:goals,clockMs:clockMs,clockTxt:clockTxt,minuteOf:minuteOf,clockSet:clockSet,clockAct:clockAct,
    ctrlState:ctrlState,ctrlLabel:ctrlLabel,CTRL_BEAT:CTRL_BEAT,addEvent:addEvent,voidEvent:voidEvent,editEvent:editEvent,qPush:qPush,qCount:qCount,flush:flush,
    canRecord:canRecord,isStaffUser:isStaffUser,orderId:orderId,orderFromEntry:orderFromEntry,orderCheck:orderCheck,lineup:lineup,playerStats:playerStats,computeStats:computeStats,
    golfTotals:golfTotals,golfRank:golfRank,evLine:evLine,printOrder:printOrder,printSheet:printSheet,sheetHtml:sheetHtml,sheetBody:sheetBody,printGolf:printGolf};
})();
