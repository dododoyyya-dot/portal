// v20260914a · 학교스포츠클럽 공용 계산 (schoolclub.html 공개 화면 · admin.html 관리 도구가 함께 씁니다)
//   팀 단위 = 학교 × 종목 × 부(남·여·혼성)  ·  ID = 학교코드_종목코드_부코드  (예: S160001234_UL_M)
//   학년도 = 3월 시작 (2027-02 대회는 2026학년도)
(function(){
  var SIDO={S01:'서울',S02:'부산',S03:'대구',S04:'인천',S05:'광주',S06:'대전',S07:'울산',S08:'세종',S09:'경기',S10:'강원',S11:'충북',S12:'충남',S13:'전북',S14:'전남',S15:'경북',S16:'경남',S17:'제주'};
  var SIDO_LIST=['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주'];
  var SIDO_ALIAS={'서울특별시':'서울','부산광역시':'부산','대구광역시':'대구','인천광역시':'인천','광주광역시':'광주','대전광역시':'대전','울산광역시':'울산','세종특별자치시':'세종','경기도':'경기','강원도':'강원','강원특별자치도':'강원','충청북도':'충북','충청남도':'충남','전라북도':'전북','전북특별자치도':'전북','전라남도':'전남','경상북도':'경북','경상남도':'경남','제주특별자치도':'제주','제주도':'제주'};
  var SPORTS=[['UL','얼티미트',/얼티|ultimate/i],['DG','디스크골프',/골프|golf/i],['GT','거츠',/거츠|가츠|guts/i],['AC','어큐러시',/어큐|정확|accuracy/i],['DS','디스턴스',/디스턴스|거리|distance/i],['FS','프리스타일',/프리스타일|freestyle/i],['DD','디스크도그',/도그|dog/i],['DC','더블디스크코트',/더블|ddc/i],['YT','원반윷놀이',/윷/],['CR','원반컬링',/컬링/],['FD','플라잉디스크',/./]];
  var DIV={M:'남자부',F:'여자부',X:'혼성부'};
  var LEVEL={'초':'초등','중':'중학','고':'고등'};
  var STAGE_ORDER={'전국':3,'시도':2,'교육지원청':1,'기타':0};
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function norm(s){return String(s==null?'':s).replace(/\s+/g,'').trim()}
  function canon(s){return norm(s).replace(/(초등학교|초교)$/,'초').replace(/중학교$/,'중').replace(/(고등학교|고교)$/,'고')}
  function sidoOf(code){return SIDO[String(code||'').slice(0,3)]||''}
  function sidoNorm(s){s=norm(s);if(!s)return '';if(SIDO_ALIAS[s])return SIDO_ALIAS[s];for(var k in SIDO_ALIAS){if(s.indexOf(k)===0)return SIDO_ALIAS[k]}for(var i=0;i<SIDO_LIST.length;i++){if(s.indexOf(SIDO_LIST[i])===0)return SIDO_LIST[i]}return ''}
  function sportCode(name){var s=String(name||'');if(!norm(s))return 'FD';for(var i=0;i<SPORTS.length;i++){if(SPORTS[i][2].test(s))return SPORTS[i][0]}return 'FD'}
  function sportName(code){for(var i=0;i<SPORTS.length;i++){if(SPORTS[i][0]===code)return SPORTS[i][1]}return '플라잉디스크'}
  function divCode(t){t=String(t||'');if(/혼성|혼합|남녀|통합/.test(t))return 'X';if(/여/.test(t))return 'F';if(/남/.test(t))return 'M';return 'X'}
  function levelOf(kindOrName){var s=String(kindOrName||'');if(/초등|초$|초등학교/.test(s))return '초';if(/중학|중$|중학교/.test(s))return '중';if(/고등|고$|고등학교/.test(s))return '고';return ''}
  function scid(code,sport,div){return String(code||'')+'_'+String(sport||'FD')+'_'+String(div||'X')}
  function parseId(id){var p=String(id||'').split('_');return {code:p[0]||'',sport:p[1]||'FD',div:p[2]||'X'}}
  function schoolYear(d){var m=String(d||'').match(/^(\d{4})-(\d{2})/);if(!m)return null;var y=+m[1],mo=+m[2];return mo>=3?y:y-1}
  // 결과 문구 → 순위 (1~3 입상, 4 = 4위, 5 = 8강 등 본선, 9 = 참가)
  function rankOf(r){r=String(r||'').replace(/\s+/g,'');if(!r)return 9;
    if(/준우승|2위|은상|은메달|^은$/.test(r))return 2;
    if(/우승|1위|대상|금상|금메달|^금$/.test(r))return 1;
    if(/3위|4강|동상|동메달|^동$|공동3/.test(r))return 3;
    if(/4위/.test(r))return 4;
    if(/8강|5위|6위|7위|8위|본선|16강|장려|우수/.test(r))return 5;
    return 9}
  function rankLabel(n){return n===1?'우승':n===2?'준우승':n===3?'3위':n===4?'4위':n===5?'본선·입상':'참가'}
  function stageOf(stage,comp){var s=norm(stage);if(/전국/.test(s))return '전국';if(/교육지원청|지역|교육장/.test(s))return '교육지원청';if(/시도|시·도|광역|교육감/.test(s))return '시도';
    var c=norm(comp);if(/전국|대한민국|교육부장관|협회장배|연맹회장배전국/.test(c))return '전국';if(/교육지원청|교육장배|지역교육청/.test(c))return '교육지원청';if(/교육감배|시장배|도지사배|광역|특별|시도|도대회|시대회/.test(c))return '시도';return '시도'}
  function mask(n){n=String(n||'').trim();if(n.length<2)return n;if(n.length===2)return n[0]+'○';return n[0]+'○'.repeat(n.length-2)+n[n.length-1]}
  function stageBadge(st){return st==='전국'?'#b3202e':st==='시도'?'#153A77':st==='교육지원청'?'#0f766e':'#6b7280'}
  // ── 통계: 한 학교클럽(통합된 옛 ID 포함)의 대회·경기 기록 요약 ──
  //   evRows = [{eventId,name,date,year,stage,div,result,rank}]  ·  matches = scMatches 문서 데이터 배열
  // ── 공개 순위 = 입상 점수제 (단계 × 순위). 참가만 해도 조금씩 쌓입니다 ──
  var POINTS={'전국':{1:10,2:7,3:5,4:4,5:3,9:1},'시도':{1:6,2:4,3:3,4:2,5:2,9:1},'교육지원청':{1:3,2:2,3:1.5,4:1,5:1,9:0.5},'기타':{1:2,2:1.5,3:1,4:1,5:0.5,9:0.5}};
  function pointsOf(stage,rank){var t=POINTS[stage]||POINTS['기타'];return t[rank]!=null?t[rank]:t[9]}
  // ── 통계: 한 학교클럽(통합된 옛 ID 포함)의 대회·경기 기록 요약 ──
  //   evRows = [{eventId,name,date,year,stage,div,result,rank}]  ·  matches = scMatches 문서 데이터 배열
  //   공식 경기(연맹·교육청 대회·이관 자료)와 교사 입력 비공식 경기(source teacher·미검증)를 나눠 셉니다
  function statsOf(ids,evRows,matches){
    var S={events:0,titles:{1:0,2:0,3:0},best:null,stageCounts:{'전국':0,'시도':0,'교육지원청':0},years:[],firstYear:null,lastYear:null,recent:[],w:0,l:0,d:0,gf:0,ga:0,games:0,uw:0,ul:0,ud:0,ugames:0,
      close:0,closeW:0,bigStage:0,points:0,streak:0,trend:null};
    var ys={},byYearPts={};
    (evRows||[]).forEach(function(e){S.events++;if(e.rank>=1&&e.rank<=3)S.titles[e.rank]++;if(S.stageCounts[e.stage]!=null)S.stageCounts[e.stage]++;if(e.year)ys[e.year]=1;
      if((e.stage==='전국'||e.stage==='시도')&&e.rank<=5)S.bigStage++;
      var p=pointsOf(e.stage,e.rank);S.points+=p;if(e.year){var yy=byYearPts[e.year]=byYearPts[e.year]||{p:0,n:0};yy.p+=p;yy.n++}
      var better=!S.best||(e.rank<S.best.rank)||(e.rank===S.best.rank&&(STAGE_ORDER[e.stage]||0)>(STAGE_ORDER[S.best.stage]||0))||(e.rank===S.best.rank&&e.stage===S.best.stage&&String(e.date)>String(S.best.date));
      if(better)S.best={rank:e.rank,label:rankLabel(e.rank),stage:e.stage,name:e.name,date:e.date,year:e.year,eventId:e.eventId}});
    S.years=Object.keys(ys).map(Number).sort();S.firstYear=S.years[0]||null;S.lastYear=S.years.length?S.years[S.years.length-1]:null;
    // 꾸준함: 최근 학년도까지 끊기지 않고 이어진 학년도 수
    if(S.lastYear){var k=S.lastYear;while(ys[k]){S.streak++;k--}}
    // 성장세: 최근 2개 학년도의 대회당 점수 ÷ 그 이전 학년도들의 대회당 점수 (이전 기록이 없으면 계산하지 않음)
    if(S.lastYear){var rp=0,rn=0,pp=0,pn=0;Object.keys(byYearPts).forEach(function(y){var v=byYearPts[y];if(+y>=S.lastYear-1){rp+=v.p;rn+=v.n}else{pp+=v.p;pn+=v.n}});if(rn&&pn){var ar=rp/rn,ap=pp/pn;S.trend=Math.max(-2,Math.min(2,(ar-ap)/Math.max(0.5,ap)))}}
    S.recent=(evRows||[]).slice().sort(function(a,b){return String(b.date).localeCompare(String(a.date))}).slice(0,5).map(function(e){return {eventId:e.eventId,name:e.name,date:e.date,stage:e.stage,div:e.div,result:e.result,rank:e.rank}});
    var idset={};(ids||[]).forEach(function(x){idset[x]=1});
    (matches||[]).forEach(function(m){var side=idset[(m.a||{}).scid]?'a':(idset[(m.b||{}).scid]?'b':'');if(!side)return;var me=m[side]||{},op=m[side==='a'?'b':'a']||{};
      var mf=+me.score,ma=+op.score;if(isNaN(mf)||isNaN(ma))return;var off=(m.source==='teacher'&&!m.verified);
      if(off){S.ugames++;if(mf>ma)S.uw++;else if(mf<ma)S.ul++;else S.ud++;return}
      S.games++;S.gf+=mf;S.ga+=ma;if(mf>ma)S.w++;else if(mf<ma)S.l++;else S.d++;
      if(Math.abs(mf-ma)<=2){S.close++;if(mf>ma)S.closeW++}});
    return S}
  // ── 라이벌: 공식 맞대결(점수) + 같은 대회·부문 동반 출전(순위 비교) ──
  //   후보 = 맞대결 3회 이상 또는 동반 출전 3회 이상. 지수는 만난 횟수·승률 균형(40~60%)·점수차(작을수록)·최근성으로 높아집니다
  //   evDocs = [{id, date, divisions}] (이 팀이 나온 대회 문서)
  function rivalsOf(ids,matches,evDocs){
    var idset={};(ids||[]).forEach(function(x){idset[x]=1});var R={};
    function get(op,name){var r=R[op]=R[op]||{scid:op,name:'',games:0,w:0,l:0,d:0,diff:0,co:0,pw:0,pl:0,last:''};if(name&&!r.name)r.name=name;return r}
    (matches||[]).forEach(function(m){if(m.source==='teacher'&&!m.verified)return;var side=idset[(m.a||{}).scid]?'a':(idset[(m.b||{}).scid]?'b':'');if(!side)return;
      var me=m[side]||{},op=m[side==='a'?'b':'a']||{};if(!op.scid||idset[op.scid])return;var mf=+me.score,ma=+op.score;if(isNaN(mf)||isNaN(ma))return;
      var r=get(op.scid,op.school);r.games++;r.diff+=Math.abs(mf-ma);if(mf>ma)r.w++;else if(mf<ma)r.l++;else r.d++;if(String(m.date||'')>r.last)r.last=String(m.date||'')});
    (evDocs||[]).forEach(function(e){var dvs=e.divisions||{};Object.keys(dvs).forEach(function(dv){var T=(dvs[dv]||{}).teams||{};var mine=null,others=[];
      Object.keys(T).forEach(function(k){var t=T[k];if(idset[t.scid])mine=t;else if(t.scid)others.push(t)});if(!mine)return;
      var mr=mine.rank!=null?mine.rank:rankOf(mine.result);
      others.forEach(function(o){var or=o.rank!=null?o.rank:rankOf(o.result);var r=get(o.scid,o.school);r.co++;if(mr<or)r.pw++;else if(mr>or)r.pl++;if(String(e.date||'')>r.last)r.last=String(e.date||'')})})});
    var nowY=new Date().getFullYear();
    return Object.keys(R).map(function(k){var r=R[k];var dec=r.w+r.l;var pdec=r.pw+r.pl;
      r.wr=dec?r.w/dec:(pdec?r.pw/pdec:0.5);r.avgDiff=r.games?r.diff/r.games:null;
      var n=r.games+0.6*r.co,bal=1-Math.abs(r.wr-0.5)*2,close=r.games?1/(1+r.avgDiff/3):0.7,rec=(r.last&&(nowY-parseInt(r.last.slice(0,4),10))<=2)?1:0.6;
      r.score=n*(0.4+0.6*bal)*close*rec;r.cand=(r.games>=3||r.co>=3);r.fated=(r.games>=5&&r.wr>=0.4&&r.wr<=0.6);return r})
      .sort(function(a,b){return (b.cand-a.cand)||(b.score-a.score)});
  }
  // ── 전술 성향 지표 (0~100). 계산에 필요한 기록이 없으면 그 지표는 빼고 보여 줍니다 ──
  //   peer = 같은 학교급 공식 경기 평균 {gf, ga} (경기당)
  function styleOf(S,peer){
    var M=[],cl=function(x){return Math.max(0,Math.min(100,Math.round(x)))};
    if(S.games>=3&&peer&&peer.gf>0&&peer.ga>0){var gf=S.gf/S.games,ga=S.ga/S.games;
      M.push({k:'공격력',v:cl(50+(gf-peer.gf)/peer.gf*50),hint:'경기당 '+gf.toFixed(1)+'점 (평균 '+peer.gf.toFixed(1)+')'});
      M.push({k:'수비력',v:cl(50+(peer.ga-ga)/peer.ga*50),hint:'경기당 '+ga.toFixed(1)+'실점 (평균 '+peer.ga.toFixed(1)+')'})}
    if(S.close>=2)M.push({k:'접전 강도',v:cl(S.closeW/S.close*100),hint:'2점차 이내 '+S.close+'경기 중 '+S.closeW+'승'});
    if(S.events)M.push({k:'큰 무대',v:cl(S.bigStage/S.events*100),hint:'시도·전국 본선 '+S.bigStage+'회 / 출전 '+S.events+'회'});
    if(S.streak)M.push({k:'꾸준함',v:cl(S.streak/5*100),hint:'연속 '+S.streak+'개 학년도 출전'});
    if(S.trend!=null)M.push({k:'성장세',v:cl(50+S.trend*25),hint:S.trend>0.1?'최근 2개 학년도 성적 상승':(S.trend<-0.1?'최근 2개 학년도 성적 하락':'최근 성적 비슷')});
    return M;
  }
  // ── 전술 태그 (지도교사가 고름) — 팀 경기 종목은 공격 대형·수비 방식, 기록 종목은 강점 ──
  var TACTICS={team:{'공격':['수직 스택','수평 스택','사이드 스택','헥스','빠른 전개','롱패스 위주','짧은 패스 연결'],'수비':['맨투맨','존 수비','컵 수비','포스 백핸드','포스 포핸드','압박 수비']},record:{'강점':['거리형','정확도형','안정형','기술형','퍼팅 강점','바람 대응']}};
  function tacticsFor(code){return ['DG','AC','DS','FS','DD'].indexOf(code)>=0?TACTICS.record:TACTICS.team}
  // ── [승인 경로 2026-09-11] 클럽·학교클럽 승인은 관할 시도연맹(담당자 있음)이, 시도연맹이 없는 곳은 중앙이 합니다 ──
  //   siteContent/sidoFeds = {sidos:{부산:[{uid,name,kind}]}, central:[uid]} — 관리자 화면이 열릴 때 회원 명단에서 자동 갱신
  function loadFeds(DB){return DB.collection('siteContent').doc('sidoFeds').get().then(function(d){return d.exists?(d.data()||{}):{}}).catch(function(){return {}})}
  function approversOf(DB,sido){return loadFeds(DB).then(function(f){var k=sidoNorm(sido)||sido;var list=((f.sidos||{})[k]||[]);return {sido:k,fed:list.length>0,list:list,central:f.central||[]}})}
  function notifyApprovers(DB,sido,title,sidoLink,centralLink){return approversOf(DB,sido).then(function(a){var to=a.fed?a.list.map(function(x){return x.uid}):a.central;var seen={};
    var ps=to.filter(function(u){if(!u||seen[u])return false;seen[u]=1;return true}).map(function(u){try{return window.KFDF&&KFDF.notify?KFDF.notify(u,title,a.fed?sidoLink:centralLink):null}catch(e){return null}});
    return Promise.all(ps).then(function(){return a})})}
  // 학년 추정 (학년도 · 생년 · 학교급) — 3월 입학 기준, 범위를 벗어나면 ''
  // [3단계 발자취] 개인 키(성명 공백 제거|생년월일) — 회원 색인(memberKeys)·자녀 키(childKeys)와 같은 형식
  function personKey(name,birth){return String(name||'').replace(/\s+/g,'')+'|'+String(birth||'')}
  function maxGrade(level){return level==='초'?6:((level==='중'||level==='고')?3:0)}
  function nextLevel(level){return level==='초'?'중':(level==='중'?'고':'')}
  function gradeOf(year,birth,level){var by=parseInt(String(birth||'').slice(0,4),10);if(!year||!by)return '';var g=year-by-6;if(level==='중')g-=6;else if(level==='고')g-=9;var max=level==='초'?6:3;return (g>=1&&g<=max)?String(g):''}
  window.SCC={SIDO:SIDO,SIDO_LIST:SIDO_LIST,SPORTS:SPORTS.map(function(x){return [x[0],x[1]]}),DIV:DIV,LEVEL:LEVEL,STAGE_ORDER:STAGE_ORDER,
    esc:esc,norm:norm,canon:canon,sidoOf:sidoOf,sidoNorm:sidoNorm,sportCode:sportCode,sportName:sportName,divCode:divCode,levelOf:levelOf,
    scid:scid,parseId:parseId,loadFeds:loadFeds,approversOf:approversOf,notifyApprovers:notifyApprovers,gradeOf:gradeOf,personKey:personKey,maxGrade:maxGrade,nextLevel:nextLevel,schoolYear:schoolYear,rankOf:rankOf,rankLabel:rankLabel,stageOf:stageOf,mask:mask,stageBadge:stageBadge,statsOf:statsOf,POINTS:POINTS,pointsOf:pointsOf,rivalsOf:rivalsOf,styleOf:styleOf,TACTICS:TACTICS,tacticsFor:tacticsFor};
})();
