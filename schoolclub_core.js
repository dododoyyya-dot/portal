// v20260911a · 학교스포츠클럽 공용 계산 (schoolclub.html 공개 화면 · admin.html 관리 도구가 함께 씁니다)
//   팀 단위 = 학교 × 종목 × 부(남·여·혼성)  ·  ID = 학교코드_종목코드_부코드  (예: S160001234_UL_M)
//   학년도 = 3월 시작 (2027-02 대회는 2026학년도)
(function(){
  var SIDO={S01:'서울',S02:'부산',S03:'대구',S04:'인천',S05:'광주',S06:'대전',S07:'울산',S08:'세종',S09:'경기',S10:'강원',S11:'충북',S12:'충남',S13:'전북',S14:'전남',S15:'경북',S16:'경남',S17:'제주'};
  var SIDO_LIST=['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주'];
  var SIDO_ALIAS={'서울특별시':'서울','부산광역시':'부산','대구광역시':'대구','인천광역시':'인천','광주광역시':'광주','대전광역시':'대전','울산광역시':'울산','세종특별자치시':'세종','경기도':'경기','강원도':'강원','강원특별자치도':'강원','충청북도':'충북','충청남도':'충남','전라북도':'전북','전북특별자치도':'전북','전라남도':'전남','경상북도':'경북','경상남도':'경남','제주특별자치도':'제주','제주도':'제주'};
  var SPORTS=[['UL','얼티미트',/얼티|ultimate/i],['DG','디스크골프',/골프|golf/i],['GT','가츠',/가츠|guts/i],['AC','어큐러시',/어큐|정확|accuracy/i],['DS','디스턴스',/디스턴스|거리|distance/i],['FS','프리스타일',/프리스타일|freestyle/i],['DD','디스크도그',/도그|dog/i],['DC','더블디스크코트',/더블|ddc/i],['YT','원반윷놀이',/윷/],['CR','원반컬링',/컬링/],['FD','플라잉디스크',/./]];
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
  function statsOf(ids,evRows,matches){
    var S={events:0,titles:{1:0,2:0,3:0},best:null,stageCounts:{'전국':0,'시도':0,'교육지원청':0},years:[],firstYear:null,lastYear:null,recent:[],w:0,l:0,d:0,gf:0,ga:0,games:0,uw:0,ul:0,ud:0};
    var ys={};
    (evRows||[]).forEach(function(e){S.events++;if(e.rank>=1&&e.rank<=3)S.titles[e.rank]++;if(S.stageCounts[e.stage]!=null)S.stageCounts[e.stage]++;if(e.year)ys[e.year]=1;
      var better=!S.best||(e.rank<S.best.rank)||(e.rank===S.best.rank&&(STAGE_ORDER[e.stage]||0)>(STAGE_ORDER[S.best.stage]||0))||(e.rank===S.best.rank&&e.stage===S.best.stage&&String(e.date)>String(S.best.date));
      if(better)S.best={rank:e.rank,label:rankLabel(e.rank),stage:e.stage,name:e.name,date:e.date,year:e.year,eventId:e.eventId}});
    S.years=Object.keys(ys).map(Number).sort();S.firstYear=S.years[0]||null;S.lastYear=S.years.length?S.years[S.years.length-1]:null;
    S.recent=(evRows||[]).slice().sort(function(a,b){return String(b.date).localeCompare(String(a.date))}).slice(0,5).map(function(e){return {eventId:e.eventId,name:e.name,date:e.date,stage:e.stage,div:e.div,result:e.result,rank:e.rank}});
    var idset={};(ids||[]).forEach(function(x){idset[x]=1});
    (matches||[]).forEach(function(m){var side=idset[(m.a||{}).scid]?'a':(idset[(m.b||{}).scid]?'b':'');if(!side)return;var me=m[side]||{},op=m[side==='a'?'b':'a']||{};
      var mf=+me.score,ma=+op.score;if(isNaN(mf)||isNaN(ma))return;var off=(m.source==='teacher'&&!m.verified);
      if(off){if(mf>ma)S.uw++;else if(mf<ma)S.ul++;else S.ud++;return}
      S.games++;S.gf+=mf;S.ga+=ma;if(mf>ma)S.w++;else if(mf<ma)S.l++;else S.d++});
    return S}
  window.SCC={SIDO:SIDO,SIDO_LIST:SIDO_LIST,SPORTS:SPORTS.map(function(x){return [x[0],x[1]]}),DIV:DIV,LEVEL:LEVEL,STAGE_ORDER:STAGE_ORDER,
    esc:esc,norm:norm,canon:canon,sidoOf:sidoOf,sidoNorm:sidoNorm,sportCode:sportCode,sportName:sportName,divCode:divCode,levelOf:levelOf,
    scid:scid,parseId:parseId,schoolYear:schoolYear,rankOf:rankOf,rankLabel:rankLabel,stageOf:stageOf,mask:mask,stageBadge:stageBadge,statsOf:statsOf};
})();
