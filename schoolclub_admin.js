// v20260914c · 관리자 [학교스포츠클럽] 탭 (3단계 발자취 색인 · 4단계 사업 성과·명단 확정 요청 포함) — 학교클럽 등록·목록·통합, 과거 자료 4종 업로드(미리보기→백업→시험 1곳→나머지→되돌리기), 통계 다시 계산, 일반 클럽 연결
//   admin.html 의 전역(DB, esc, CMY, IS_SIDO, ExcelJS, scLoadXlsx, scCell, scDate, scDownload, KFDF)을 씁니다. 계산 규칙은 schoolclub_core.js(SCC)
//   컬렉션: schoolClubs/{학교코드_종목_부} · scSeasons/{ID_학년도}(공개, 이름 가림) · scRosters/{ID_학년도}(비공개 실명) · scMatches/{결정적 ID} · scImports/{업로드 ID}
//           대회 결과는 기존 schoolClubEvents(대회 결과 페이지 공개)에 합칩니다 — 팀마다 scid·rank, 문서에 scids[]·stage·year
(function(){
  var FV=function(){return firebase.firestore.FieldValue};
  var SCH=null,BY_CODE={},BY_CANON={};
  var CLUBS=null;          // [{id,...}]
  var UP=null;             // 업로드 상태 {type,file,importId,rows,pick,backed,tested,testScid}
  function E(s){return SCC.esc(s)}
  window.__sccState=function(){return UP};   // 점검용(읽기 전용)
  function box(){var b=document.getElementById('sccBox');b.style.display='block';return b}
  function isSido(){return (typeof IS_SIDO!=='undefined')&&IS_SIDO}
  function mySido(){return (typeof CMY!=='undefined'&&CMY&&CMY.sido)||''}
  function me(){return (typeof CMY!=='undefined'&&CMY&&CMY.name)||'관리자'}
  function chunk(a,n){var o=[];for(var i=0;i<a.length;i+=n)o.push(a.slice(i,i+n));return o}
  function hash(s){var h=2166136261;s=String(s);for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)+s.length.toString(36)}
  function sidoIn(t){t=String(t||'');var best='',bi=-1;var keys=Object.keys({'서울특별시':1,'부산광역시':1,'대구광역시':1,'인천광역시':1,'광주광역시':1,'대전광역시':1,'울산광역시':1,'세종특별자치시':1,'경기도':1,'강원특별자치도':1,'강원도':1,'충청북도':1,'충청남도':1,'전북특별자치도':1,'전라북도':1,'전라남도':1,'경상북도':1,'경상남도':1,'제주특별자치도':1}).concat(SCC.SIDO_LIST);
    keys.forEach(function(k){var i=t.indexOf(k);if(i>=0&&(bi<0||i<bi)){bi=i;best=k}});return best?SCC.sidoNorm(best):''}
  async function schoolDB(){if(SCH)return;SCH=await new Promise(function(res){try{KFDF.loadSchools(function(a){res(a||[])})}catch(e){res([])}});BY_CODE={};BY_CANON={};SCH.forEach(function(x){BY_CODE[x.code]=x;var k=SCC.canon(x.name);(BY_CANON[k]=BY_CANON[k]||[]).push(x)})}
  function resolve(name,code,sidoHint){
    code=String(code||'').trim().toUpperCase();
    if(/^S\d{9}$/.test(code)&&BY_CODE[code])return {code:code,school:BY_CODE[code],how:'code'};
    var k=SCC.canon(name);if(!k)return {code:'',cands:[],how:'none'};
    var c=(BY_CANON[k]||[]).slice();
    if(sidoHint){var f=c.filter(function(x){return SCC.sidoOf(x.code)===sidoHint});if(f.length)c=f}
    if(c.length===1)return {code:c[0].code,school:c[0],how:'name'};
    if(c.length>1)return {code:'',cands:c,how:'multi'};
    var g=SCH.filter(function(x){var ck=SCC.canon(x.name);return ck.length>=3&&(ck.indexOf(k)>=0||k.indexOf(ck)>=0)});
    if(sidoHint){var h=g.filter(function(x){return SCC.sidoOf(x.code)===sidoHint});if(h.length)g=h}
    return {code:'',cands:g.slice(0,12),how:g.length?'near':'none'};
  }
  async function loadClubs(force){if(CLUBS&&!force)return CLUBS;var s=await DB.collection('schoolClubs').get();CLUBS=s.docs.map(function(d){return Object.assign({id:d.id},d.data())});return CLUBS}
  function defaultTeam(school,sportCode){var s=String(school||'').replace(/(초등학교|중학교|고등학교)$/,function(m){return m==='초등학교'?'초':m==='중학교'?'중':'고'});return s+' '+(sportCode&&sportCode!=='FD'?SCC.sportName(sportCode):'플라잉디스크')+'부'}
  function kindLabel(x){return x?(SCC.LEVEL[x]||x):''}

  // ══════════ ① 목록 ══════════
  var LF={q:'',sido:'',level:'',sport:'',show:'on'};
  window.sccList=async function(){
    var b=box();b.innerHTML='학교클럽 목록을 불러오는 중…';   // 도구줄도 새로 그림
    try{await loadClubs(true)}catch(e){b.innerHTML='<b style="color:#C41E2F">목록 조회 실패: '+E(e.message)+'</b><div style="font-size:12px;color:#6b7280;margin-top:4px">보안 규칙 v27(schoolClubs) 게시 여부를 확인해 주세요.</div>';return}
    if(isSido()&&!LF.sido)LF.sido=mySido();
    renderList();
  };
  function renderList(){
    var b=box();var q=SCC.norm(LF.q).toLowerCase();var keepBar=!!document.getElementById('sccTbl');
    var rows=CLUBS.filter(function(c){if(LF.show==='on'&&(c.mergedInto||c.status==='숨김'||c.status==='반려'))return false;if(LF.sido&&c.sido!==LF.sido)return false;if(LF.level&&c.level!==LF.level)return false;if(LF.sport&&c.sportCode!==LF.sport)return false;
      if(q&&(SCC.norm(c.teamName)+' '+SCC.norm(c.schoolName)+' '+SCC.norm(c.eduOffice)+' '+c.id).toLowerCase().indexOf(q)<0)return false;return true})
      .sort(function(a,z){return ((z.status==='대기')-(a.status==='대기'))||((z.stats&&z.stats.events)||0)-((a.stats&&a.stats.events)||0)||String(a.schoolName||'').localeCompare(String(z.schoolName||''))});
    var sel=function(id,opts,val,fn){return '<select onchange="'+fn+'(this.value)" style="width:auto;padding:6px 10px;font-size:12.5px">'+opts.map(function(o){return '<option value="'+E(o[0])+'"'+(o[0]===val?' selected':'')+'>'+E(o[1])+'</option>'}).join('')+'</select>'};
    var h='<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px"><b style="font-size:15px">📋 학교스포츠클럽 '+rows.length+'팀</b><span style="flex:1"></span>'
      +'<input placeholder="팀명·학교·교육지원청·ID" value="'+E(LF.q)+'" oninput="sccLF(\'q\',this.value)" style="width:200px;padding:6px 10px;font-size:12.5px">'
      +sel('s',[['','시도 전체']].concat(SCC.SIDO_LIST.map(function(s){return [s,s]})),LF.sido,'sccLFs')
      +sel('l',[['','학교급 전체'],['초','초등'],['중','중학'],['고','고등']],LF.level,'sccLFl')
      +sel('p',[['','종목 전체']].concat(SCC.SPORTS),LF.sport,'sccLFp')
      +sel('v',[['on','운영 중만'],['all','통합·숨김 포함']],LF.show,'sccLFv')
      +'<button class="btn-sub" style="background:#0f766e" onclick="sccEdit()">➕ 학교클럽 등록</button></div>';
    var t='';
    if(!rows.length){t='<div class="bempty">조건에 맞는 학교클럽이 없습니다. [➕ 학교클럽 등록] 또는 [📥 과거 자료 업로드]로 만들 수 있습니다.</div>'}
    else t='<div style="overflow-x:auto"><table class="rtbl"><thead><tr><th>팀</th><th>학교</th><th>종목·부</th><th>시도·교육지원청</th><th>창단</th><th>지도교사</th><th>대회·최고 성적</th><th>상태</th><th></th></tr></thead><tbody>'
      +rows.slice(0,300).map(function(c){var st=c.stats||{};var best=st.best?(st.best.stage+' '+st.best.label):'-';
        return '<tr><td><a href="schoolclub.html?id='+encodeURIComponent(c.id)+'" target="_blank" style="font-weight:800;color:#153A77">'+E(c.teamName||'-')+'</a><div style="font-size:11px;color:#8a919d">'+E(c.id)+'</div></td>'
          +'<td>'+E(c.schoolName||'')+' <span style="color:#8a919d">('+E(kindLabel(c.level))+')</span></td><td>'+E(c.sport||SCC.sportName(c.sportCode))+' · '+E(SCC.DIV[c.division]||c.division||'')+'</td>'
          +'<td>'+E(c.sido||'')+(c.gugun?' '+E(c.gugun):'')+(c.eduOffice?'<div style="font-size:11px;color:#6b7280">'+E(c.eduOffice)+'</div>':'')+'</td><td>'+E(c.foundedYear||'')+'</td><td>'+E(c.coachName||'')+'</td>'
          +'<td>'+(st.events||0)+'회 · '+E(best)+'</td><td>'+(c.mergedInto?'<span style="color:#8a919d">통합→'+E(c.mergedInto)+'</span>':(c.status==='숨김'?'<span style="color:#8a919d">숨김</span>':(c.status==='대기'?'<b style="color:#b8860b">승인 대기</b><div style="font-size:11px;color:#6b7280">'+E(routeTxt(c))+'</div>':(c.status==='반려'?'<span style="color:#C41E2F">반려</span>':'운영'))))+(c.fromClubId?'<div style="font-size:11px;color:#7c3aed">일반 클럽 연결</div>':'')+'</td>'
          +'<td style="white-space:nowrap">'+(c.status==='대기'?'<button class="btn-sub" style="padding:3px 10px;font-size:11.5px;background:#0f766e" onclick="sccDecide(\''+c.id+'\',true)">승인</button> <button class="btn-sub" style="padding:3px 10px;font-size:11.5px;background:#fff;color:#C41E2F;border:1px solid #C41E2F" onclick="sccDecide(\''+c.id+'\',false)">반려</button> ':'')+'<button class="btn-sub" style="padding:3px 10px;font-size:11.5px;background:#153A77" onclick="sccEdit(\''+c.id+'\')">수정</button> '
          +(c.mergedInto?'':'<button class="btn-sub" style="padding:3px 10px;font-size:11.5px;background:#7c3aed" onclick="sccMerge(\''+c.id+'\')">통합</button> ')
          +'<button class="btn-sub" style="padding:3px 10px;font-size:11.5px;background:#8a919d" onclick="sccHide(\''+c.id+'\')">'+(c.status==='숨김'?'복원':'숨김')+'</button></td></tr>'}).join('')
      +'</tbody></table></div>'+(rows.length>300?'<div style="font-size:12px;color:#6b7280;margin-top:6px">앞 300팀만 표시 — 검색·필터로 좁혀 주세요.</div>':'');
    if(keepBar){document.getElementById('sccTbl').innerHTML=t;var c0=document.getElementById('sccCnt');if(c0)c0.textContent=rows.length;return}
    b.innerHTML=h.replace('📋 학교스포츠클럽 '+rows.length+'팀','📋 학교스포츠클럽 <span id="sccCnt">'+rows.length+'</span>팀')+'<div id="sccTbl">'+t+'</div>';
  }
  function routeTxt(c){var f=(typeof SIDOFEDS!=='undefined'&&SIDOFEDS)?SIDOFEDS.sidos[c.sido]||[]:null;if(!f)return '';return f.length?('관할 '+c.sido+' 시도연맹 승인 대상'):'중앙 승인 대상 (시도연맹 없음)'}
  window.sccDecide=async function(id,ok){
    var c=CLUBS.find(function(x){return x.id===id});if(!c)return;
    if(isSido()&&!KFDF.sidoMatch(mySido(),c.sido)){alert('관할 시도가 아닙니다.');return}
    var f=(typeof SIDOFEDS!=='undefined'&&SIDOFEDS)?(SIDOFEDS.sidos[c.sido]||[]):[];
    if(!isSido()&&f.length&&!confirm('['+(c.teamName||id)+'] 은(는) 관할 '+c.sido+' 시도연맹('+f.map(function(x){return x.name}).join('·')+') 승인 대상입니다.\n중앙에서 대신 처리할까요?'))return;
    var reason=ok?'':(prompt('반려 사유 (지도교사에게 전달됩니다)','')||'');if(!ok&&!reason.trim())return;
    try{await DB.collection('schoolClubs').doc(id).update(ok?{status:'운영',approvedBy:me(),approvedAt:FV().serverTimestamp()}:{status:'반려',rejectReason:reason.trim(),approvedBy:me()});
      if(c.coachUid)try{KFDF.notify(c.coachUid,ok?'✅ 학교스포츠클럽 ['+(c.teamName||'')+'] 등록이 승인되었습니다 — 대회 학교팀 신청에서 선택할 수 있습니다':'학교스포츠클럽 ['+(c.teamName||'')+'] 등록이 반려되었습니다 — 사유: '+reason.trim(),'schoolclub.html?id='+encodeURIComponent(id))}catch(e){}
      c.status=ok?'운영':'반려';renderList()}catch(e){alert('처리 실패: '+e.message)}
  };
  window.sccLF=function(k,v){LF[k]=v;clearTimeout(window.__sccLFt);window.__sccLFt=setTimeout(renderList,200)};
  window.sccLFs=function(v){LF.sido=v;renderList()};window.sccLFl=function(v){LF.level=v;renderList()};window.sccLFp=function(v){LF.sport=v;renderList()};window.sccLFv=function(v){LF.show=v;renderList()};

  // ══════════ ② 등록·수정 ══════════
  var ED=null;
  window.sccEdit=async function(id,preset){
    await schoolDB();if(!CLUBS)try{await loadClubs()}catch(e){}
    var c=id?(CLUBS||[]).find(function(x){return x.id===id}):null;
    ED={id:id||'',code:c?c.schoolCode:'',fromClubId:(preset&&preset.fromClubId)||(c&&c.fromClubId)||''};
    var b=box();var v=function(k,d){return E(c?(c[k]==null?'':c[k]):((preset&&preset[k])||d||''))};
    var h='<b style="font-size:15px">'+(c?'✏️ 학교클럽 수정 — '+E(c.teamName):'➕ 학교클럽 등록')+'</b>'+(ED.fromClubId?' <span style="font-size:12px;color:#7c3aed;font-weight:800">일반 클럽 연결: '+E(preset&&preset.clubName||ED.fromClubId)+'</span>':'')
      +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:10px">'
      +(c?'<div><label>학교</label><div style="font-weight:800;padding:8px 0">'+E(c.schoolName)+' ('+E(kindLabel(c.level))+' · '+E(c.sido)+')</div><div style="font-size:11px;color:#8a919d">학교·종목·부는 팀 ID라 바꿀 수 없습니다. 잘못 만든 팀은 [통합]으로 합쳐 주세요.</div></div>'
        :'<div><label>학교 *</label><div style="display:flex;gap:6px"><input id="sccSch" value="'+v('schoolName')+'" placeholder="학교명 입력 후 검색" style="flex:1"><button class="btn-sub" style="background:#153A77" onclick="sccSchFind()">검색</button></div><div id="sccSchList" style="font-size:12.5px;margin-top:6px"></div></div>')
      +(c?'':'<div><label>종목</label><select id="sccSport">'+SCC.SPORTS.map(function(s){return '<option value="'+s[0]+'"'+(s[0]==='FD'?' selected':'')+'>'+E(s[1])+'</option>'}).join('')+'</select></div>'
        +'<div><label>부</label><select id="sccDiv"><option value="X">혼성부</option><option value="M">남자부</option><option value="F">여자부</option></select></div>')
      +'<div><label>팀명 (비우면 자동)</label><input id="sccTeam" value="'+v('teamName')+'" placeholder="예: ○○초 플라잉디스크부"></div>'
      +'<div><label>창단 학년도</label><input id="sccFounded" inputmode="numeric" value="'+v('foundedYear')+'" placeholder="예: 2017"></div>'
      +'<div><label>시군구</label><input id="sccGugun" value="'+v('gugun')+'" placeholder="예: 해운대구"></div>'
      +'<div><label>관할 교육지원청</label><input id="sccEdu" value="'+v('eduOffice')+'" placeholder="예: 해운대교육지원청"></div>'
      +'<div><label>지도교사</label><div style="display:flex;gap:6px"><input id="sccCoach" value="'+v('coachName')+'" style="flex:1"><button class="btn-sub" style="background:#153A77" onclick="sccCoachFind()">계정 연결</button></div><div id="sccCoachList" style="font-size:12px;margin-top:4px">'+(c&&c.coachUid?'<span style="color:#0f766e">✓ 계정 연결됨 — 이 교사가 대회 학교팀 신청·명단 관리를 할 수 있습니다</span>':'<span style="color:#8a919d">계정을 연결하면 그 교사가 대회 학교팀 신청과 학년도 명단을 관리할 수 있습니다</span>')+'</div></div>'
      +'<div><label>한 줄 소개</label><input id="sccIntro" value="'+v('intro')+'" placeholder="예: 2017년 창단, 교육감배 3회 우승"></div>'
      +'</div><div style="display:flex;gap:8px;margin-top:12px"><button class="btn-sub" style="background:#0f766e" onclick="sccSave()">저장</button><button class="btn-sub" style="background:#8a919d" onclick="sccList()">목록으로</button></div><div id="sccEdMsg" style="font-size:12.5px;font-weight:700;margin-top:8px"></div>';
    b.innerHTML=h;
  };
  window.sccSchFind=async function(){
    await schoolDB();var q=(document.getElementById('sccSch')||{}).value||'';var el=document.getElementById('sccSchList');
    var list=[];try{list=KFDF.schoolSearch(q,30)||[]}catch(e){}
    if(isSido())list=list.filter(function(x){return SCC.sidoOf(x.code)===mySido()});
    el.innerHTML=list.length?list.map(function(x){return '<label style="display:block;padding:3px 0;cursor:pointer"><input type="radio" name="sccSchPick" value="'+E(x.code)+'" onchange="sccSchPick(this.value)" style="width:auto;margin-right:6px">'+E(x.name)+' <span style="color:#6b7280">('+E(x.kind)+' · '+E(SCC.sidoOf(x.code))+')</span></label>'}).join(''):'<span style="color:#C41E2F">검색 결과가 없습니다</span>';
  };
  window.sccCoachFind=function(){var q=SCC.norm((document.getElementById('sccCoach')||{}).value);var el=document.getElementById('sccCoachList');
    var list=(typeof USERS!=='undefined'?USERS:[]).filter(function(d){var v=d.data()||{};return !v.deleted&&v.status==='approved'&&SCC.norm(v.name)===q}).slice(0,10);
    el.innerHTML=list.length?list.map(function(d){var v=d.data();return '<label style="display:block;cursor:pointer;padding:2px 0"><input type="radio" name="sccCoachPick" value="'+d.id+'" onchange="sccCoachPick(this.value)" style="width:auto;margin-right:6px">'+E(v.name)+' <span style="color:#6b7280">('+E(({teacher:'교사',instructor:'지도자',general:'일반',athlete:'선수'})[v.accountType]||v.accountType||'-')+(v.workSchool?' · '+E(v.workSchool):'')+(v.phone?' · '+E(String(v.phone).slice(-4)):'')+')</span></label>'}).join(''):'<span style="color:#C41E2F">같은 이름의 승인 회원이 없습니다 (회원 목록을 먼저 불러오세요)</span>'};
  window.sccCoachPick=function(uid){ED.coachUid=uid};
  window.sccSchPick=function(code){ED.code=code;var s=BY_CODE[code];if(s){document.getElementById('sccSch').value=s.name}};
  window.sccSave=async function(){
    var m=document.getElementById('sccEdMsg');var g=function(id){var e=document.getElementById(id);return e?String(e.value||'').trim():''};
    try{
      var patch={teamName:g('sccTeam'),foundedYear:g('sccFounded')?(+g('sccFounded')||g('sccFounded')):'',gugun:g('sccGugun'),eduOffice:g('sccEdu'),coachName:g('sccCoach'),intro:g('sccIntro'),updatedAt:FV().serverTimestamp(),by:me()};
      if(ED.coachUid)patch.coachUid=ED.coachUid;
      if(ED.id){if(!patch.teamName)delete patch.teamName;await DB.collection('schoolClubs').doc(ED.id).update(patch);m.textContent='✓ 저장했습니다';m.style.color='#0f766e';await loadClubs(true);return}
      if(!ED.code){m.textContent='학교를 검색해 목록에서 골라 주세요';m.style.color='#C41E2F';return}
      var s=BY_CODE[ED.code];var sp=g('sccSport')||'FD',dv=g('sccDiv')||'X';var id=SCC.scid(ED.code,sp,dv);
      if(isSido()&&SCC.sidoOf(ED.code)!==mySido()){m.textContent='관할 밖 학교입니다';m.style.color='#C41E2F';return}
      var ex=await DB.collection('schoolClubs').doc(id).get();if(ex.exists){m.innerHTML='이미 같은 학교·종목·부 팀이 있습니다: <a href="schoolclub.html?id='+encodeURIComponent(id)+'" target="_blank">'+E(ex.data().teamName||id)+'</a>';m.style.color='#C41E2F';return}
      var doc=Object.assign({scid:id,schoolCode:ED.code,schoolName:s?s.name:g('sccSch'),level:SCC.levelOf(s&&s.kind),sido:SCC.sidoOf(ED.code),sport:SCC.sportName(sp),sportCode:sp,division:dv,status:'운영',source:ED.fromClubId?'club':'manual',importIds:[],createdAt:FV().serverTimestamp()},patch);
      if(!doc.teamName)doc.teamName=defaultTeam(doc.schoolName,sp);
      if(ED.fromClubId)doc.fromClubId=ED.fromClubId;
      await DB.collection('schoolClubs').doc(id).set(doc);
      if(ED.fromClubId){try{await DB.collection('clubs').doc(ED.fromClubId).update({schoolClubId:id,schoolClubLinkedAt:FV().serverTimestamp()})}catch(e){m.textContent='학교클럽은 만들었지만 일반 클럽 연결 표시 실패: '+e.message;m.style.color='#b8860b';await loadClubs(true);return}}
      m.innerHTML='✓ 등록했습니다 — <a href="schoolclub.html?id='+encodeURIComponent(id)+'" target="_blank">팀 홈 보기</a>';m.style.color='#0f766e';await loadClubs(true);
    }catch(e){m.textContent='저장 실패: '+e.message;m.style.color='#C41E2F'}
  };
  window.sccHide=async function(id){var c=CLUBS.find(function(x){return x.id===id});if(!c)return;var to=c.status==='숨김'?'운영':'숨김';
    if(!confirm('['+(c.teamName||id)+'] 을(를) '+(to==='숨김'?'공개 화면에서 숨길까요? (기록은 그대로 남습니다)':'다시 공개할까요?')))return;
    try{await DB.collection('schoolClubs').doc(id).update({status:to,updatedAt:FV().serverTimestamp()});c.status=to;renderList()}catch(e){alert('실패: '+e.message)}};
  window.sccMerge=async function(id){
    var c=CLUBS.find(function(x){return x.id===id});if(!c)return;
    var same=CLUBS.filter(function(x){return x.id!==id&&!x.mergedInto&&x.schoolCode===c.schoolCode});
    var hint=same.length?('\n\n같은 학교의 다른 팀:\n'+same.map(function(x){return '  '+x.id+'  '+(x.teamName||'')}).join('\n')):'';
    var to=prompt('['+(c.teamName||id)+'] 의 기록을 합칠 대상 팀 ID를 입력하세요.\n(이 팀은 「통합」으로 표시되고 공개 화면에서 대상 팀으로 넘어갑니다. 대회 기록은 통계 다시 계산 때 대상 팀에 합산됩니다)'+hint,same[0]?same[0].id:'');
    if(!to)return;to=to.trim();if(to===id)return;var t=CLUBS.find(function(x){return x.id===to});if(!t){alert('대상 팀을 찾을 수 없습니다: '+to);return}
    if(t.mergedInto){alert('대상 팀도 이미 다른 팀에 통합되어 있습니다.');return}
    try{var b=DB.batch();b.update(DB.collection('schoolClubs').doc(id),{mergedInto:to,status:'통합',updatedAt:FV().serverTimestamp()});b.update(DB.collection('schoolClubs').doc(to),{aliases:FV().arrayUnion(id),updatedAt:FV().serverTimestamp()});
      CLUBS.filter(function(x){return x.mergedInto===id}).forEach(function(x){b.update(DB.collection('schoolClubs').doc(x.id),{mergedInto:to});b.update(DB.collection('schoolClubs').doc(to),{aliases:FV().arrayUnion(x.id)})});
      await b.commit();alert('✓ 통합했습니다. [📊 통계 다시 계산]을 누르면 기록이 합산됩니다.');await loadClubs(true);renderList()}catch(e){alert('통합 실패: '+e.message)}
  };

  // ══════════ ③ 과거 자료 업로드 ══════════
  var T={
    reg:{title:'① 학교클럽 등록 현황',file:'학교스포츠클럽_1_등록현황_양식.xlsx',
      head:['학년도','학교명','학교코드(선택)','시도(선택)','시군구(선택)','교육지원청(선택)','종목','부(남/여/혼성)','클럽명(팀명)','인원 남','인원 여','지도교사','창단 학년도(선택)'],
      ex:[2019,'부산○○초등학교','','부산','해운대구','해운대교육지원청','플라잉디스크','혼성','○○초 플라잉디스크부',8,6,'홍길동',2017],
      cols:{year:/^학년도/,school:/^학교명/,code:/^학교코드/,sido:/^시도/,gugun:/^시군구/,edu:/^교육지원청/,sport:/^종목/,div:/^부(\s*\(|$)/,team:/^클럽명|^팀명/,m:/^인원\s*남|^남(\s|$)/,f:/^인원\s*여|^여(\s|$)/,coach:/^지도교사/,founded:/^창단/},need:['year','school']},
    res:{title:'② 대회 결과',file:'학교스포츠클럽_2_대회결과_양식.xlsx',
      head:['대회명','주최','주관','단계(교육지원청/시도/전국)','대회일자(YYYY-MM-DD)','종목','부문','학교명','학교코드(선택)','시도(선택)','팀명(선택)','순위(결과)'],
      ex:['2019 부산광역시교육감배 학교스포츠클럽대회','부산광역시교육청','부산광역시학교체육진흥회','시도','2019-10-12','플라잉디스크','초등부 혼성','부산○○초등학교','','부산','','우승'],
      cols:{comp:/^대회명/,org:/^주최/,coorg:/^주관/,stage:/^단계/,date:/^대회일자|^일자|^날짜/,sport:/^종목/,div:/^부문/,school:/^학교명/,code:/^학교코드/,sido:/^시도/,team:/^팀명/,result:/^순위|^결과|^성적/},need:['comp','date','school','result']},
    mat:{title:'③ 경기 기록',file:'학교스포츠클럽_3_경기기록_양식.xlsx',
      head:['대회명','대회일자(YYYY-MM-DD)','종목','부문','라운드','팀A 학교명','팀A 학교코드(선택)','팀B 학교명','팀B 학교코드(선택)','점수A','점수B','시도(선택)'],
      ex:['2019 부산광역시교육감배 학교스포츠클럽대회','2019-10-12','플라잉디스크','초등부 혼성','결승','부산○○초등학교','','부산△△초등학교','',13,11,'부산'],
      cols:{comp:/^대회명/,date:/^대회일자|^일자|^날짜/,sport:/^종목/,div:/^부문/,round:/^라운드|^경기\s*구분/,aSchool:/^팀\s*A\s*(학교명)?$|^팀\s*A\s*학교명/,aCode:/^팀\s*A\s*학교코드/,bSchool:/^팀\s*B\s*(학교명)?$|^팀\s*B\s*학교명/,bCode:/^팀\s*B\s*학교코드/,sa:/^점수\s*A/,sb:/^점수\s*B/,sido:/^시도/},need:['comp','date','aSchool','bSchool','sa','sb']},
    ros:{title:'④ 참가 명단',file:'학교스포츠클럽_4_참가명단_양식.xlsx',
      head:['학년도','학교명','학교코드(선택)','시도(선택)','종목','부(남/여/혼성)','성명','학년','성별','생년월일(선택)'],
      ex:[2019,'부산○○초등학교','','부산','플라잉디스크','혼성','홍길동',5,'남',''],
      cols:{year:/^학년도/,school:/^학교명/,code:/^학교코드/,sido:/^시도/,sport:/^종목/,div:/^부(\s*\(|$)/,name:/^성명|^이름/,grade:/^학년(?!도)/,gender:/^성별/,birth:/^생년월일/},need:['year','school','name']}
  };
  window.sccUpload=function(){
    var b=box();
    b.innerHTML='<b style="font-size:15px">📥 과거 자료 업로드 (학교체육진흥회 · 교육부 자료)</b>'
      +'<div style="font-size:12.5px;color:#6b7280;line-height:1.75;margin:6px 0 10px">받은 파일을 아래 네 가지 양식 중 하나로 옮겨 올립니다. 순서: <b>미리보기(쓰기 0건) → 학교 확인 → 백업 JSON → 첫 학교클럽 1곳 시험 적용 → 나머지 적용</b>. 모든 기록에 업로드 ID가 붙어 [↩ 되돌리기]로 한 번에 지울 수 있습니다. 한셀·구글시트 저장 파일도 읽습니다.</div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap">'+Object.keys(T).map(function(k,i){return '<label class="btn-sub" style="background:'+(i?'#8a919d':'#153A77')+';cursor:pointer" data-scct="'+k+'"><input type="radio" name="sccType" value="'+k+'"'+(i?'':' checked')+' onchange="sccTypeSel()" style="width:auto;margin-right:5px">'+E(T[k].title)+'</label>'}).join('')+'</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px"><button class="btn-sub" style="background:#153A77" onclick="sccTemplate()">📄 이 양식 내려받기</button><input type="file" id="sccFile" accept=".xlsx" style="font-size:13px"><button class="btn-sub" style="background:#0f766e" onclick="sccPreview()">🔍 미리보기 (쓰기 0건)</button></div>'
      +'<div id="sccUpBox" style="margin-top:12px"></div>';
  };
  function curType(){var r=document.querySelector('input[name=sccType]:checked');return r?r.value:'reg'}
  window.sccTypeSel=function(){document.querySelectorAll('[data-scct]').forEach(function(l){l.style.background=l.querySelector('input').checked?'#153A77':'#8a919d'})};
  window.sccTemplate=async function(){
    var t=T[curType()];
    try{var wb=new ExcelJS.Workbook();var ws=wb.addWorksheet('자료');ws.addRow(t.head);ws.getRow(1).font={bold:true};ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE8EEF8'}};
      ws.addRow(t.ex);ws.getRow(2).font={color:{argb:'FF8A919D'},italic:true};ws.columns=t.head.map(function(h){return {width:Math.max(12,Math.min(40,String(h).length*2+4))}});
      var g=wb.addWorksheet('작성 안내');[[t.title+' 작성 안내'],[''],['· 1행(머리글)은 지우지 마세요. 2행 예시는 지우고 입력합니다. 한 줄에 한 건입니다.'],['· 학교코드는 몰라도 됩니다. 학교명과 시도를 적으면 전국 학교 목록에서 찾습니다(같은 이름 학교가 여러 곳이면 미리보기에서 고릅니다).'],['· 종목을 비우면 「플라잉디스크」, 부를 비우면 「혼성」으로 봅니다. 부문에 「남」「여」「혼성」이 들어 있으면 그대로 나눕니다.'],['· 학년도는 3월 시작입니다 (2020년 2월 대회 = 2019학년도).'],['· 순위 칸에는 우승·준우승·3위·4강·8강·참가 등을 그대로 적습니다.'],['· 참가 명단의 이름은 공개 화면에 가림 표기(홍○동)로만 나오고, 생년월일은 공개되지 않습니다.']].forEach(function(r){g.addRow(r)});g.getColumn(1).width=110;g.getRow(1).font={bold:true,size:14};
      var buf=await wb.xlsx.writeBuffer();scDownload(t.file,new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}))}catch(e){alert('양식 생성 실패: '+e.message)}
  };
  function num(v){var n=parseFloat(String(v==null?'':v).replace(/[^0-9.\-]/g,''));return isNaN(n)?null:n}
  function yearOf(v){if(v==null||v==='')return null;if(v instanceof Date)return SCC.schoolYear(scDate(v));var s=String(v).trim();var m=s.match(/^(\d{4})(학년도)?$/);if(m)return +m[1];var d=scDate(v);return d?SCC.schoolYear(d):null}
  window.sccPreview=async function(){
    var inp=document.getElementById('sccFile');var f=inp&&inp.files&&inp.files[0];var ub=document.getElementById('sccUpBox');
    if(!f){alert('엑셀 파일(.xlsx)을 먼저 선택해 주세요.');return}
    ub.innerHTML='파일과 전국 학교 목록을 읽는 중…';
    try{
      await schoolDB();var type=curType(),t=T[type];
      var wb=await scLoadXlsx(await f.arrayBuffer());var ws=wb.worksheets[0];if(!ws)throw new Error('시트가 없습니다.');
      var hdrRow=0,hdr=[];ws.eachRow(function(row,n){if(hdrRow||n>15)return;var vals=(row.values||[]).map(scCell);var hit=t.need.filter(function(k){return vals.some(function(v){return t.cols[k].test(v||'')})}).length;if(hit===t.need.length){hdrRow=n;hdr=vals}});
      if(!hdrRow)throw new Error('머리글 행을 찾지 못했습니다. 필수 열: '+t.need.map(function(k){return t.head.find(function(h){return t.cols[k].test(h)})||k}).join(', ')+' — [📄 이 양식 내려받기]의 양식을 써 주세요. (위에서 고른 자료 종류가 파일과 같은지도 확인)');
      var C={};Object.keys(t.cols).forEach(function(k){C[k]=-1;for(var i=0;i<hdr.length;i++){if(t.cols[k].test(hdr[i]||'')){C[k]=i;break}}});
      var rows=[];ws.eachRow(function(row,n){if(n<=hdrRow)return;var v=row.values||[];var g=function(k){return C[k]>=0?scCell(v[C[k]]):''};var raw=function(k){return C[k]>=0?v[C[k]]:''};
        var r={n:n,type:type};Object.keys(t.cols).forEach(function(k){r[k]=g(k)});
        if(type==='reg'||type==='ros')r.year=yearOf(raw('year'));
        if(type==='res'||type==='mat'){r.date=scDate(raw('date'));r.year=SCC.schoolYear(r.date)}
        if(type==='reg'){r.m=num(r.m)||0;r.f=num(r.f)||0;r.founded=num(r.founded)||''}
        if(type==='mat'){r.sa=num(r.sa);r.sb=num(r.sb)}
        if(type==='ros'){r.birth=scDate(raw('birth'));r.grade=String(r.grade||'').replace(/[^0-9]/g,'');r.gender=/여/.test(r.gender||'')?'여':(/남/.test(r.gender||'')?'남':'')}
        var any=Object.keys(t.cols).some(function(k){return String(r[k]==null?'':r[k]).trim()});if(!any)return;
        if(/○○|△△/.test(JSON.stringify(r)))return;   // 양식 예시 행
        r.divRaw=String(r.div||'').trim();r.codeRaw=String(r.code||'').trim();
        rows.push(r)});
      if(!rows.length)throw new Error('데이터 행이 없습니다.');
      UP={type:type,file:f.name,importId:'scc'+Date.now().toString(36),rows:rows,pick:{},backed:false,tested:false,testScid:'',done:false};
      build();renderUp();
    }catch(e){ub.innerHTML='<b style="color:#C41E2F">읽기 실패: '+E(e.message)+'</b>'}
  };
  function skey(name,code,sido){return SCC.canon(name)+'|'+String(code||'').toUpperCase()+'|'+(sido||'')}
  function sideResolve(r,name,code,hintSido){
    var k=skey(name,code,hintSido);var rs=resolve(name,code,hintSido);var pickc=UP.pick[k];
    if(pickc==='__skip')return {key:k,rs:rs,code:'',skip:true};
    var c=pickc||rs.code;return {key:k,rs:rs,code:c,school:BY_CODE[c]||null};
  }
  function build(){
    var type=UP.type;UP.schools={};
    UP.rows.forEach(function(r){
      r.err='';r.warn='';
      var hint=SCC.sidoNorm(r.sido)||(type==='res'||type==='mat'?sidoIn(r.comp):'');r.hint=hint;
      var spc=SCC.sportCode(r.sport);r.sportCode=spc;r.sportName=SCC.sportName(spc);
      r.div=SCC.divCode(r.divRaw||'혼성');
      var one=function(name,code,tag){var x=sideResolve(r,name,code,hint);UP.schools[x.key]=UP.schools[x.key]||{key:x.key,name:name,code:code,hint:hint,rs:x.rs,rows:0,chosen:x.code,skip:!!x.skip};UP.schools[x.key].rows++;return x};
      if(type==='mat'){
        var a=one(r.aSchool,r.aCode,'a'),b=one(r.bSchool,r.bCode,'b');
        r.a={code:a.code,school:a.school,scid:a.code?SCC.scid(a.code,spc,r.div):''};r.b={code:b.code,school:b.school,scid:b.code?SCC.scid(b.code,spc,r.div):''};
        if(!r.date)r.err='대회일자 없음·형식 오류';else if(r.sa==null||r.sb==null)r.err='점수 없음';else if(!r.a.code||!r.b.code)r.err='학교 확인 필요';
        r.scid=r.a.scid;r.sido=r.a.code?SCC.sidoOf(r.a.code):'';
      }else{
        var x=one(r.school,r.codeRaw,'');r.code=x.code;r.schoolObj=x.school;r.scid=x.code?SCC.scid(x.code,spc,r.div):'';r.sido=x.code?SCC.sidoOf(x.code):'';r.level=x.school?SCC.levelOf(x.school.kind):'';
        if(!x.code)r.err=x.skip?'건너뜀':'학교 확인 필요';
        if(type==='res'){if(!r.comp)r.err='대회명 없음';else if(!r.date)r.err='대회일자 없음·형식 오류';r.rank=SCC.rankOf(r.result);r.stage=SCC.stageOf(r.stage,r.comp)}
        if((type==='reg'||type==='ros')&&!r.year&&!r.err)r.err='학년도 없음';
        if(type==='ros'&&!r.name&&!r.err)r.err='성명 없음';
        if(type==='ros'&&!r.birth&&!r.err)r.warn='생년월일 없음 (개인 발자취 연결은 가입 후 본인 확인)';
      }
      if(!r.err&&isSido()&&r.sido&&!KFDF.sidoMatch(mySido(),r.sido))r.err='관할 밖('+r.sido+')';
    });
  }
  window.sccPick=function(k,v){UP.pick[k]=v;build();renderUp()};
  function renderUp(){
    var ub=document.getElementById('sccUpBox');if(!ub)return;var type=UP.type;
    var ok=UP.rows.filter(function(r){return !r.err}),bad=UP.rows.filter(function(r){return r.err});
    var scids={};ok.forEach(function(r){if(r.scid)scids[r.scid]=1;if(type==='mat'&&r.b&&r.b.scid)scids[r.b.scid]=1});
    var existing={};(CLUBS||[]).forEach(function(c){existing[c.id]=1});
    var nNew=Object.keys(scids).filter(function(s){return !existing[s]}).length;
    var ev={};if(type==='res')ok.forEach(function(r){ev[r.comp+'|'+r.date]=1});
    var sch=Object.keys(UP.schools).map(function(k){return UP.schools[k]});
    var need=sch.filter(function(s){return !s.chosen&&!s.skip});
    var h='<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:13.5px;margin-bottom:8px"><span>자료 <b>'+E(T[type].title)+'</b></span><span>행 <b>'+UP.rows.length+'</b></span><span style="color:#0f766e">적용 가능 <b>'+ok.length+'</b></span><span style="color:#C41E2F">확인 필요·오류 <b>'+bad.length+'</b></span><span>학교클럽 <b>'+Object.keys(scids).length+'</b>팀 (새로 생김 '+(CLUBS?nNew:'?')+')</span>'+(type==='res'?'<span>대회 <b>'+Object.keys(ev).length+'</b>건</span>':'')+'<span style="color:#6b7280">업로드 ID '+E(UP.importId)+'</span></div>';
    if(!CLUBS)h+='<div style="font-size:12px;color:#b8860b">※ 학교클럽 목록을 아직 못 읽어 「새로 생김」 수를 셀 수 없습니다 — 보안 규칙 v27 게시 후 다시 미리보기 하세요.</div>';
    h+='<details'+(need.length?' open':'')+' style="margin:8px 0"><summary style="cursor:pointer;font-weight:800">🏫 학교 확인 '+sch.length+'곳'+(need.length?' — <span style="color:#C41E2F">직접 골라야 할 학교 '+need.length+'곳</span>':' — 모두 확인됨')+'</summary><div style="overflow-x:auto;margin-top:6px"><table class="rtbl"><thead><tr><th>파일의 학교명</th><th>시도 힌트</th><th>행</th><th>판정</th><th>선택</th></tr></thead><tbody>'
      +sch.sort(function(a,z){return (a.chosen?1:0)-(z.chosen?1:0)}).map(function(s){var how=s.rs.how;var cands=(s.rs.cands||[]).slice();if(s.rs.school)cands.unshift(s.rs.school);
        var lab=how==='code'?'학교코드 일치':how==='name'?'이름 일치':how==='multi'?'<b style="color:#b8860b">같은 이름 여러 곳</b>':how==='near'?'<b style="color:#b8860b">비슷한 이름</b>':'<b style="color:#C41E2F">못 찾음</b>';
        var opts='<option value="">— 고르기 —</option>'+cands.map(function(c){return '<option value="'+E(c.code)+'"'+(c.code===s.chosen?' selected':'')+'>'+E(c.name+' ('+c.kind+' · '+SCC.sidoOf(c.code)+')')+'</option>'}).join('')+'<option value="__skip"'+(s.skip?' selected':'')+'>이 학교 건너뛰기</option>';
        return '<tr><td>'+E(s.name)+(s.code?'<div style="font-size:11px;color:#8a919d">'+E(s.code)+'</div>':'')+'</td><td>'+E(s.hint||'-')+'</td><td>'+s.rows+'</td><td>'+lab+'</td><td>'+((how==='code'||how==='name')&&!UP.pick[s.key]?'<span style="color:#0f766e">'+E((BY_CODE[s.chosen]||{}).name||'')+'</span> <a href="javascript:void(0)" onclick="sccPick(\''+E(s.key).replace(/'/g,"\\'")+'\',\'__skip\')" style="font-size:11px;color:#8a919d">건너뛰기</a>':'<select onchange="sccPick(\''+E(s.key).replace(/'/g,"\\'")+'\',this.value)" style="width:auto;max-width:320px;padding:4px 8px;font-size:12px">'+opts+'</select>')+'</td></tr>'}).join('')
      +'</tbody></table></div></details>';
    var cols=type==='reg'?['year','school','sportName','div','team','m','f','coach']:type==='res'?['comp','date','stage','div','school','team','result']:type==='mat'?['comp','date','round','div','aSchool','sa','sb','bSchool']:['year','school','sportName','div','name','grade','gender','birth'];
    var lab={year:'학년도',school:'학교',sportName:'종목',div:'부',team:'팀명',m:'남',f:'여',coach:'지도교사',comp:'대회',date:'일자',stage:'단계',result:'순위',round:'라운드',aSchool:'팀A',sa:'A',sb:'B',bSchool:'팀B',name:'성명',grade:'학년',gender:'성별',birth:'생년월일'};
    var show=bad.concat(ok).slice(0,60);
    h+='<div style="overflow-x:auto"><table class="rtbl"><thead><tr><th>행</th>'+cols.map(function(c){return '<th>'+lab[c]+'</th>'}).join('')+'<th>팀 ID</th><th>상태</th></tr></thead><tbody>'
      +show.map(function(r){return '<tr><td>'+r.n+'</td>'+cols.map(function(c){var v=r[c];if(c==='div')v=SCC.DIV[v]||v;if(c==='name')v=v;return '<td>'+E(v==null?'':v)+'</td>'}).join('')+'<td style="font-size:11px">'+E(r.scid||'')+'</td><td>'+(r.err?'<b style="color:#C41E2F">'+E(r.err)+'</b>':(r.warn?'<span style="color:#b8860b">'+E(r.warn)+'</span>':'<span style="color:#0f766e">적용 가능</span>'))+'</td></tr>'}).join('')
      +'</tbody></table></div>'+(UP.rows.length>60?'<div style="font-size:12px;color:#6b7280">앞 60행만 표시 (확인 필요 행 먼저)</div>':'');
    var first=ok[0];
    h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center">'
      +'<button class="btn-sub" style="background:#153A77" onclick="sccBackup()">💾 1. 백업 JSON 받기'+(UP.backed?' ✓':'')+'</button>'
      +'<button class="btn-sub" style="background:#b8860b" onclick="sccApply(\'test\')"'+(ok.length?'':' disabled')+'>🧪 2. 시험 적용 — 첫 학교클럽 1곳'+(first?' ('+E((first.schoolObj&&first.schoolObj.name)||first.aSchool||'')+')':'')+(UP.tested?' ✓':'')+'</button>'
      +'<button class="btn-sub" style="background:#0f766e" onclick="sccApply(\'rest\')"'+(ok.length?'':' disabled')+'>✅ 3. 나머지 전체 적용</button>'
      +'<span style="font-size:12px;color:#6b7280">「확인 필요」 행은 적용되지 않습니다. 위 학교 표에서 고르면 바로 반영됩니다.</span></div><div id="sccApplyMsg" style="margin-top:10px;font-size:13px"></div>';
    ub.innerHTML=h;
  }
  function okRows(){return UP.rows.filter(function(r){return !r.err})}
  function touchedIds(rows){var clubs={},seasons={},events={},matches={};
    rows.forEach(function(r){if(r.scid)clubs[r.scid]=1;if(UP.type==='mat'&&r.b.scid)clubs[r.b.scid]=1;
      if(UP.type==='reg'||UP.type==='ros')seasons[r.scid+'_'+r.year]=1;if(UP.type==='res')events[r.comp+'|'+r.date]=1;if(UP.type==='mat')matches[matchId(r)]=1});
    return {clubs:Object.keys(clubs),seasons:Object.keys(seasons),events:Object.keys(events),matches:Object.keys(matches)}}
  function matchId(r){return 'M'+hash([SCC.norm(r.comp),r.date,SCC.norm(r.round),r.a.scid,r.b.scid,r.sa,r.sb].join('|'))}
  async function getDocs(col,ids){var out={};for(var c of chunk(ids,20)){var ds=await Promise.all(c.map(function(id){return DB.collection(col).doc(id).get()}));ds.forEach(function(d){out[d.id]=d.exists?d.data():null})}return out}
  async function findEvent(comp,date){var q=await DB.collection('schoolClubEvents').where('competitionName','==',comp).where('date','==',date).limit(1).get();return q.empty?null:{id:q.docs[0].id,data:q.docs[0].data()}}
  window.sccBackup=async function(){
    if(!UP)return;var msg=document.getElementById('sccApplyMsg');msg.textContent='백업할 기존 자료를 읽는 중…';
    try{var ids=touchedIds(okRows());var bk={importId:UP.importId,type:UP.type,file:UP.file,at:new Date().toISOString(),by:me(),schoolClubs:await getDocs('schoolClubs',ids.clubs),scSeasons:await getDocs('scSeasons',ids.seasons),scRosters:UP.type==='ros'?await getDocs('scRosters',ids.seasons):{},scMatches:await getDocs('scMatches',ids.matches),schoolClubEvents:{}};
      for(var k of ids.events){var p=k.split('|');var e=await findEvent(p[0],p[1]);if(e)bk.schoolClubEvents[e.id]=e.data}
      scDownload('학교스포츠클럽_업로드백업_'+UP.importId+'.json',new Blob([JSON.stringify(bk,null,1)],{type:'application/json'}));
      UP.backed=true;renderUp();document.getElementById('sccApplyMsg').innerHTML='<b style="color:#0f766e">✓ 백업 파일을 받았습니다.</b> 이제 시험 적용을 할 수 있습니다.';
    }catch(e){msg.innerHTML='<b style="color:#C41E2F">백업 실패: '+E(e.message)+'</b> (보안 규칙 v27 게시 확인)'}
  };
  window.sccApply=async function(mode){
    if(!UP||UP.busy)return;if(!UP.backed){alert('먼저 [💾 1. 백업 JSON 받기]를 눌러 주세요.');return}
    var rows=okRows();if(!rows.length)return;
    if(mode==='test'){UP.testScid=rows[0].scid;rows=rows.filter(function(r){return r.scid===UP.testScid||(UP.type==='mat'&&r.b.scid===UP.testScid)})}
    else{if(!UP.tested&&!confirm('시험 적용을 하지 않았습니다. 바로 전체 적용할까요?'))return;if(UP.testScid)rows=rows.filter(function(r){return !(r.scid===UP.testScid||(UP.type==='mat'&&r.b.scid===UP.testScid))});
      if(!confirm(rows.length+'행을 적용합니다. 진행할까요?'))return}
    var msg=document.getElementById('sccApplyMsg');UP.busy=true;msg.textContent='적용 중…';
    try{var log=await applyRows(rows,function(t){msg.textContent=t});
      await DB.collection('scImports').doc(UP.importId).set({importId:UP.importId,type:UP.type,title:T[UP.type].title,file:UP.file,by:me(),at:FV().serverTimestamp(),rows:FV().increment(rows.length),clubsCreated:FV().increment(log.clubsCreated),events:FV().increment(log.events),matches:FV().increment(log.matches),seasons:FV().increment(log.seasons)},{merge:true});
      if(mode==='test')UP.tested=true;else UP.done=true;renderUp();
      msg=document.getElementById('sccApplyMsg');
      msg.innerHTML='<b style="color:#0f766e">✓ '+(mode==='test'?'시험 적용':'적용')+' 완료</b> — 학교클럽 새로 '+log.clubsCreated+' · 갱신 '+log.clubsUpdated+(log.events?' · 대회 '+log.events+'건':'')+(log.matches?' · 경기 '+log.matches+'건 (중복 건너뜀 '+log.matchDup+')':'')+(log.seasons?' · 학년도 명단 '+log.seasons+'건':'')
        +(mode==='test'?'<div style="margin-top:6px"><a href="schoolclub.html?id='+encodeURIComponent(UP.testScid)+'" target="_blank" style="font-weight:800">팀 홈에서 확인 →</a> 이상 없으면 [✅ 3. 나머지 전체 적용]을 누르세요.</div>':'<div style="margin-top:6px">이어서 [📊 통계 다시 계산]을 누르면 팀별 전적·최고 성적이 공개 화면에 반영됩니다. 되돌리려면 업로드 ID <b>'+E(UP.importId)+'</b></div>');
      loadClubs(true).catch(function(){});
    }catch(e){msg.innerHTML='<b style="color:#C41E2F">적용 중 오류: '+E(e.message)+'</b><div style="font-size:12px">이미 쓴 부분은 업로드 ID '+E(UP.importId)+' 로 되돌릴 수 있습니다.</div>'}
    finally{UP.busy=false}
  };
  async function applyRows(rows,say){
    var type=UP.type,iid=UP.importId,log={clubsCreated:0,clubsUpdated:0,events:0,matches:0,matchDup:0,seasons:0};
    // 1) 학교클럽 만들기·빈 칸 채우기
    var need={};var add=function(scid,code,school,sp,div,extra){if(!scid)return;var n=need[scid]=need[scid]||{scid:scid,schoolCode:code,schoolName:school?school.name:'',level:school?SCC.levelOf(school.kind):'',sido:SCC.sidoOf(code),sport:SCC.sportName(sp),sportCode:sp,division:div};
      Object.keys(extra||{}).forEach(function(k){if(extra[k]!==''&&extra[k]!=null&&(n[k]==null||n[k]===''))n[k]=extra[k]})};
    rows.forEach(function(r){
      if(type==='mat'){add(r.a.scid,r.a.code,r.a.school,r.sportCode,r.div,{});add(r.b.scid,r.b.code,r.b.school,r.sportCode,r.div,{});return}
      add(r.scid,r.code,r.schoolObj,r.sportCode,r.div,type==='reg'?{teamName:r.team,gugun:r.gugun,eduOffice:r.edu,coachName:r.coach,foundedYear:r.founded}:{})});
    var ids=Object.keys(need);say('학교클럽 '+ids.length+'팀 확인 중…');
    var cur=await getDocs('schoolClubs',ids);var ops=[];
    ids.forEach(function(id){var n=need[id],c=cur[id];
      if(!c){var d=Object.assign({},n,{teamName:n.teamName||defaultTeam(n.schoolName,n.sportCode),status:'운영',source:'import',importIds:[iid],createdImport:iid,createdAt:FV().serverTimestamp(),updatedAt:FV().serverTimestamp(),by:me()});ops.push(['set','schoolClubs',id,d]);log.clubsCreated++}
      else{var p={importIds:FV().arrayUnion(iid),updatedAt:FV().serverTimestamp()};['teamName','gugun','eduOffice','coachName','foundedYear'].forEach(function(k){if(n[k]&&!c[k])p[k]=n[k]});ops.push(['update','schoolClubs',id,p]);log.clubsUpdated++}});
    await commit(ops,say);
    // 2) 종류별 기록
    if(type==='reg'){
      var g={};rows.forEach(function(r){var k=r.scid+'_'+r.year;var x=g[k]=g[k]||{scid:r.scid,year:r.year,m:0,f:0,coach:''};x.m+=r.m||0;x.f+=r.f||0;if(r.coach&&!x.coach)x.coach=r.coach});
      var ks=Object.keys(g);var cs=await getDocs('scSeasons',ks);ops=[];
      ks.forEach(function(k){var x=g[k],c=cs[k];if(!c)ops.push(['set','scSeasons',k,{scid:x.scid,year:x.year,countM:x.m,countF:x.f,count:x.m+x.f,countImp:iid,coachName:x.coach,roster:[],importIds:[iid],createdImport:iid,updatedAt:FV().serverTimestamp()}]);
        else{var p={importIds:FV().arrayUnion(iid),updatedAt:FV().serverTimestamp()};if(!c.count&&(x.m+x.f)){p.countM=x.m;p.countF=x.f;p.count=x.m+x.f;p.countImp=iid}if(!c.coachName&&x.coach)p.coachName=x.coach;ops.push(['update','scSeasons',k,p])}log.seasons++});
      await commit(ops,say);
    }
    if(type==='ros'){
      var g2={};rows.forEach(function(r){var k=r.scid+'_'+r.year;(g2[k]=g2[k]||{scid:r.scid,year:r.year,list:[]}).list.push(r)});
      var ks2=Object.keys(g2);var pr=await getDocs('scRosters',ks2),ps=await getDocs('scSeasons',ks2);ops=[];
      ks2.forEach(function(k){var x=g2[k],c=pr[k],s=ps[k];var mem=((c&&c.members)||[]).slice();var have={};mem.forEach(function(m){have[SCC.norm(m.name)+'|'+(m.birth||'')+'|'+(m.grade||'')]=1});
        x.list.forEach(function(r){var key=SCC.norm(r.name)+'|'+(r.birth||'')+'|'+(r.grade||'');if(have[key])return;have[key]=1;mem.push({name:r.name,birth:r.birth||'',grade:r.grade||'',gender:r.gender||'',imp:iid})});
        var roster=mem.map(function(m){return {n:SCC.mask(m.name),g:m.grade||'',s:m.gender||'',imp:m.imp||''}});
        ops.push([c?'update':'set','scRosters',k,c?{members:mem,importIds:FV().arrayUnion(iid),updatedAt:FV().serverTimestamp()}:{scid:x.scid,year:x.year,members:mem,importIds:[iid],createdImport:iid,updatedAt:FV().serverTimestamp()}]);
        var sp={roster:roster,rosterN:roster.length,updatedAt:FV().serverTimestamp()};
        if(s){sp.importIds=FV().arrayUnion(iid);if(!s.count)sp.count=roster.length;ops.push(['update','scSeasons',k,sp])}
        else ops.push(['set','scSeasons',k,Object.assign(sp,{scid:x.scid,year:x.year,count:roster.length,importIds:[iid],createdImport:iid})]);log.seasons++});
      await commit(ops,say);
    }
    if(type==='res'){
      var g3={};rows.forEach(function(r){(g3[r.comp+'|'+r.date]=g3[r.comp+'|'+r.date]||[]).push(r)});
      var keys=Object.keys(g3);var i=0;
      for(var k3 of keys){i++;say('대회 '+i+'/'+keys.length+' 반영 중…');var rs=g3[k3];var p=k3.split('|');var ex=await findEvent(p[0],p[1]);var d=ex?ex.data:{};
        var dvs=JSON.parse(JSON.stringify(d.divisions||{}));var scids={};(d.scids||[]).forEach(function(s){scids[s]=1});
        rs.forEach(function(r){var dvName=rowDivName(r);var D=dvs[dvName]=dvs[dvName]||{teams:{}};D.teams=D.teams||{};
          var school=(r.schoolObj&&r.schoolObj.name)||r.school;var tk=school+(r.team&&r.team!==school?'|'+r.team:'');
          var T0=D.teams[tk];if(!T0){D.teams[tk]={school:school,team:r.team||'',result:r.result||'',members:[],scid:r.scid,rank:r.rank,code:r.code,imp:iid}}
          else{if(!T0.scid)T0.scid=r.scid;if(!T0.code)T0.code=r.code;if(!T0.result&&r.result)T0.result=r.result;if(T0.rank==null)T0.rank=SCC.rankOf(T0.result)}
          scids[r.scid]=1});
        var sd={};rs.forEach(function(r){if(r.sido)sd[r.sido]=(sd[r.sido]||0)+1});var sido=Object.keys(sd).sort(function(a,z){return sd[z]-sd[a]})[0]||'';
        var doc={divisions:dvs,scids:Object.keys(scids),importIds:FV().arrayUnion(iid),updatedAt:FV().serverTimestamp()};
        var r0=rs[0];
        if(ex){if(!d.stage)doc.stage=r0.stage;if(!d.year)doc.year=r0.year;if(!d.organizer&&r0.org)doc.organizer=r0.org;if(!d.coorganizer&&r0.coorg)doc.coorganizer=r0.coorg;if(!d.sido&&sido)doc.sido=sido;if(!d.sport)doc.sport=r0.sportName;
          await DB.collection('schoolClubEvents').doc(ex.id).update(doc)}
        else{Object.assign(doc,{competitionName:p[0],date:p[1],year:r0.year,stage:r0.stage,organizer:r0.org||'',coorganizer:r0.coorg||'',sport:r0.sportName,sido:sido,status:'published',source:'sccImport',importIds:[iid],createdImport:iid,createdAt:FV().serverTimestamp(),by:me()});
          await DB.collection('schoolClubEvents').add(doc)}
        log.events++}
    }
    if(type==='mat'){
      var mids=rows.map(matchId);var ex2=await getDocs('scMatches',mids);ops=[];
      rows.forEach(function(r,j){var id=mids[j];if(ex2[id]){log.matchDup++;return}ex2[id]={};
        ops.push(['set','scMatches',id,{eventName:r.comp,date:r.date,year:r.year,sport:r.sportName,division:rowDivName(r),divCode:r.div,round:r.round||'',
          a:{scid:r.a.scid,school:r.a.school?r.a.school.name:r.aSchool,score:r.sa},b:{scid:r.b.scid,school:r.b.school?r.b.school.name:r.bSchool,score:r.sb},
          scids:[r.a.scid,r.b.scid],winner:r.sa>r.sb?'a':(r.sa<r.sb?'b':'d'),source:'import',verified:true,importId:iid,sido:r.sido||'',createdAt:FV().serverTimestamp()}]);log.matches++});
      await commit(ops,say);
    }
    return log;
  }
  function rowDivName(r){var raw=(UP.type==='res'||UP.type==='mat')?String(r.divRaw||'').trim():'';return raw||((r.level?SCC.LEVEL[r.level]+'부 ':'')+(SCC.DIV[r.div]||'혼성부')).trim()}
  async function commit(ops,say){var groups=chunk(ops,400);for(var i=0;i<groups.length;i++){var b=DB.batch();groups[i].forEach(function(o){var ref=DB.collection(o[1]).doc(o[2]);if(o[0]==='set')b.set(ref,o[3]);else if(o[0]==='update')b.update(ref,o[3]);else if(o[0]==='delete')b.delete(ref)});if(say&&groups.length>1)say('저장 중… '+(i+1)+'/'+groups.length);await b.commit()}}

  // ══════════ ④ 되돌리기 ══════════
  window.sccUndo=async function(){
    var b=box();var list=[];try{var s=await DB.collection('scImports').orderBy('at','desc').limit(30).get();list=s.docs.map(function(d){return Object.assign({id:d.id},d.data())})}catch(e){}
    var id=prompt('되돌릴 업로드 ID를 입력하세요 (scc 로 시작)\n\n최근 업로드:\n'+(list.length?list.map(function(x){return '  '+x.id+'  '+(x.title||'')+' · '+(x.file||'')+' · '+(x.rows||0)+'행'+(x.undone?' (되돌림)':'')}).join('\n'):'  (기록 없음)'),list[0]&&!list[0].undone?list[0].id:'');
    if(!id)return;id=id.trim();b.innerHTML='업로드 ['+E(id)+'] 로 기록된 자료를 찾는 중…';
    try{
      var q=function(col,f){return DB.collection(col).where(f||'importIds',f==='importId'?'==':'array-contains',id).get()};
      var cl=await q('schoolClubs'),ev=await q('schoolClubEvents'),se=await q('scSeasons'),ro=await q('scRosters'),ma=await q('scMatches','importId');
      if(!confirm('업로드 ['+id+'] 되돌리기\n· 학교클럽 '+cl.size+'팀 (이 업로드로 생긴 팀은 삭제, 기존 팀은 표시만 해제)\n· 대회 '+ev.size+'건 (이 업로드로 넣은 팀 결과만 제거, 새로 만든 대회는 삭제)\n· 학년도 명단 '+se.size+'건 · 경기 '+ma.size+'건 삭제\n\n진행할까요?'))return;
      var ops=[];
      cl.docs.forEach(function(d){var x=d.data();if(x.createdImport===id&&(x.importIds||[]).length<=1)ops.push(['delete','schoolClubs',d.id]);else ops.push(['update','schoolClubs',d.id,{importIds:FV().arrayRemove(id)}])});
      ma.docs.forEach(function(d){ops.push(['delete','scMatches',d.id])});
      [['scSeasons',se,'roster'],['scRosters',ro,'members']].forEach(function(z){z[1].docs.forEach(function(d){var x=d.data();var arr=(x[z[2]]||[]).filter(function(m){return m.imp!==id});
        if(x.createdImport===id&&(x.importIds||[]).length<=1)ops.push(['delete',z[0],d.id]);else{var p={importIds:FV().arrayRemove(id)};p[z[2]]=arr;if(z[0]==='scSeasons'){p.rosterN=arr.length;if(x.countImp===id){p.countM=0;p.countF=0;p.count=arr.length;p.countImp=''}}ops.push(['update',z[0],d.id,p])}})});
      ev.docs.forEach(function(d){var x=d.data();if(x.createdImport===id&&(x.importIds||[]).length<=1){ops.push(['delete','schoolClubEvents',d.id]);return}
        var dvs=JSON.parse(JSON.stringify(x.divisions||{}));var sc={};Object.keys(dvs).forEach(function(k){var T0=(dvs[k]||{}).teams||{};Object.keys(T0).forEach(function(t){if(T0[t].imp===id)delete T0[t];else if(T0[t].scid)sc[T0[t].scid]=1});if(!Object.keys(T0).length)delete dvs[k]});
        ops.push(['update','schoolClubEvents',d.id,{divisions:dvs,scids:Object.keys(sc),importIds:FV().arrayRemove(id)}])});
      await commit(ops,function(t){b.textContent=t});
      try{await DB.collection('scImports').doc(id).set({undone:true,undoneAt:FV().serverTimestamp(),undoneBy:me()},{merge:true})}catch(e){}
      b.innerHTML='<b style="color:#0f766e">✓ 되돌렸습니다</b> — [📊 통계 다시 계산]을 누르면 팀 전적이 다시 맞춰집니다.';loadClubs(true).catch(function(){});
    }catch(e){b.innerHTML='<b style="color:#C41E2F">되돌리기 실패: '+E(e.message)+'</b>'}
  };

  // ══════════ ⑤ 통계 다시 계산 ══════════
  var RC=null;
  window.sccRecompute=async function(){
    if(isSido()){alert('통계 다시 계산은 중앙 사무국만 할 수 있습니다.');return}
    var b=box();b.innerHTML='학교클럽·대회·경기 기록을 읽는 중…';
    try{
      await schoolDB();await loadClubs(true);
      var evs=(await DB.collection('schoolClubEvents').limit(3000).get()).docs.map(function(d){return {id:d.id,data:d.data()}});
      var mts=(await DB.collection('scMatches').limit(10000).get()).docs.map(function(d){return d.data()});
      var byId={};CLUBS.forEach(function(c){byId[c.id]=c});
      var root=function(id){var seen=0;while(byId[id]&&byId[id].mergedInto&&seen<10){id=byId[id].mergedInto;seen++}return id};
      var rows={},evPatch=[],unresolved={},create={};
      evs.forEach(function(e){var x=e.data;var dvs=x.divisions||{};var changed=false;var sc={};(x.scids||[]).forEach(function(s){sc[s]=1});
        var sp=SCC.sportCode(String(x.sport||'').split(' · ')[0]);var st=x.stage||SCC.stageOf('',x.competitionName);var yr=x.year||SCC.schoolYear(x.date);
        Object.keys(dvs).forEach(function(dv){var T0=(dvs[dv]||{}).teams||{};Object.keys(T0).forEach(function(tk){var t=T0[tk];var id=t.scid;
          if(!id){var rs=resolve(t.school||tk.split('|')[0],t.code,x.sido||sidoIn(x.competitionName));if(rs.code){id=SCC.scid(rs.code,sp,SCC.divCode(dv));t.scid=id;t.code=rs.code;changed=true;if(!byId[id])create[id]={scid:id,schoolCode:rs.code,schoolName:rs.school.name,level:SCC.levelOf(rs.school.kind),sido:SCC.sidoOf(rs.code),sport:SCC.sportName(sp),sportCode:sp,division:SCC.divCode(dv)}}
            else{unresolved[(t.school||tk)+' · '+(x.sido||'시도 미상')]=(unresolved[(t.school||tk)+' · '+(x.sido||'시도 미상')]||0)+1;return}}
          if(t.rank==null){t.rank=SCC.rankOf(t.result);changed=true}
          if(!sc[id]){sc[id]=1;changed=true}
          var r=root(id);(rows[r]=rows[r]||[]).push({eventId:e.id,name:x.competitionName||'',date:x.date||'',year:yr,stage:st,div:dv,result:t.result||'',rank:t.rank})})});
        if(changed||!x.stage||!x.year)evPatch.push({id:e.id,patch:{divisions:dvs,scids:Object.keys(sc),stage:st,year:yr}})});
      RC={rows:rows,mts:mts,evPatch:evPatch,create:create,root:root};
      var nc=Object.keys(create).length,un=Object.keys(unresolved);
      b.innerHTML='<b style="font-size:15px">📊 통계 다시 계산 — 미리보기 (쓰기 0건)</b>'
        +'<div style="display:flex;gap:14px;flex-wrap:wrap;margin:8px 0;font-size:13.5px"><span>학교클럽 <b>'+CLUBS.length+'</b></span><span>대회 <b>'+evs.length+'</b>건</span><span>경기 <b>'+mts.length+'</b>건</span><span>팀 연결을 새로 채울 대회 <b>'+evPatch.length+'</b>건</span><span style="color:#b8860b">목록에 없는 학교클럽 <b>'+nc+'</b>팀</span><span style="color:#C41E2F">학교 판정 불가 <b>'+un.length+'</b>곳</span></div>'
        +(nc?'<label style="display:flex;gap:6px;align-items:center;font-size:13px;margin:6px 0"><input type="checkbox" id="sccRcCreate" checked style="width:auto"> 대회 기록에만 있고 목록에 없는 학교클럽 '+nc+'팀을 자동 등록 (예: 기존 결과 업로드 도구로 올린 학교)</label>':'')
        +(un.length?'<details style="margin:6px 0"><summary style="cursor:pointer;font-size:13px">학교 판정 불가 목록 — 같은 이름 학교가 여러 곳이거나 목록에 없음 (학교클럽을 직접 등록하면 다음 계산 때 연결)</summary><div style="font-size:12.5px;line-height:1.8;margin-top:4px">'+un.slice(0,200).map(function(k){return E(k)+' ('+unresolved[k]+'건)'}).join('<br>')+'</div></details>':'')
        +'<button class="btn-sub" style="background:#0f766e;margin-top:8px" onclick="sccRecomputeApply()">✅ 계산 결과 저장</button><div id="sccRcMsg" style="margin-top:8px;font-size:13px"></div>';
    }catch(e){b.innerHTML='<b style="color:#C41E2F">계산 실패: '+E(e.message)+'</b>'}
  };
  window.sccRecomputeApply=async function(){
    if(!RC)return;var m=document.getElementById('sccRcMsg');var cr=document.getElementById('sccRcCreate');var doCreate=cr?cr.checked:false;
    try{var ops=[];
      if(doCreate)Object.keys(RC.create).forEach(function(id){var n=RC.create[id];ops.push(['set','schoolClubs',id,Object.assign({},n,{teamName:defaultTeam(n.schoolName,n.sportCode),status:'운영',source:'events',importIds:[],createdAt:FV().serverTimestamp(),updatedAt:FV().serverTimestamp(),by:me()})])});
      RC.evPatch.forEach(function(p){ops.push(['update','schoolClubEvents',p.id,p.patch])});
      var all=CLUBS.map(function(c){return c.id}).concat(doCreate?Object.keys(RC.create):[]);var ali={};CLUBS.forEach(function(c){if(c.mergedInto){var r=RC.root(c.id);(ali[r]=ali[r]||[]).push(c.id)}});
      all.forEach(function(id){if(RC.root(id)!==id)return;var ids=[id].concat(ali[id]||[]);var st=SCC.statsOf(ids,RC.rows[id]||[],RC.mts);ops.push(['update','schoolClubs',id,{stats:st,statsAt:FV().serverTimestamp()}])});
      m.textContent='저장 중…';await commit(ops,function(t){m.textContent=t});
      m.innerHTML='<b style="color:#0f766e">✓ 저장했습니다</b> — 학교클럽 '+all.length+'팀 통계'+(doCreate?' · 자동 등록 '+Object.keys(RC.create).length+'팀':'')+' · 대회 '+RC.evPatch.length+'건 연결. <a href="schoolclub.html" target="_blank">공개 화면 보기 →</a><div style="font-size:12.5px;color:#6b7280;margin-top:4px">학년도 명단을 새로 올렸다면 [👣 발자취 색인]도 눌러 학생 발자취를 갱신하세요.</div>';
      loadClubs(true).catch(function(){});
    }catch(e){m.innerHTML='<b style="color:#C41E2F">저장 실패: '+E(e.message)+'</b>'}
  };

  // ══════════ ⑦ [3단계] 발자취 색인 scPersons/{성명|생년월일} — 학년도 실명 명단(scRosters)에서 사람별 학교클럽 이력을 모읍니다 ══════════
  //   · 본인·보호자는 마이페이지 [나의 발자취]에서 자기(자녀) 키로만 읽고 「내 기록으로 연결」(links.{uid})만 쓸 수 있습니다(보안 규칙 v31).
  //   · 다시 만들 때 연결 정보(links)는 그대로 두고 이력(stints)만 새로 씁니다. 명단에서 빠진 사람은 이력만 비웁니다.
  //   · 생년월일이 없는 명단 줄은 사람을 특정할 수 없어 넣지 않습니다(동명이인 오연결 방지).
  var PR=null;
  async function buildPersons(){
    await loadClubs(true);var byId={};CLUBS.forEach(function(c){byId[c.id]=c});
    var root=function(id){var seen=0;while(byId[id]&&byId[id].mergedInto&&seen<10){id=byId[id].mergedInto;seen++}return id};
    var ro=(await DB.collection('scRosters').limit(5000).get()).docs;var P={},skip=0;
    ro.forEach(function(d){var x=d.data();var m0=String(d.id).match(/^(.*)_(\d{4})$/);var sc=root(x.scid||(m0?m0[1]:d.id));var c=byId[sc]||{};var yr=+x.year||(m0?+m0[2]:0);
      (x.members||[]).forEach(function(m){if(!m||!m.name)return;if(!m.birth){skip++;return}var k=SCC.personKey(m.name,m.birth);
        var p=P[k]=P[k]||{name:String(m.name).trim(),birth:m.birth,gender:m.gender||'',stints:[]};
        if(!p.gender&&m.gender)p.gender=m.gender;
        if(!p.stints.some(function(s){return s.scid===sc&&s.year===yr}))p.stints.push({scid:sc,year:yr,grade:String(m.grade||SCC.gradeOf(yr,m.birth,c.level||'')||''),school:c.schoolName||'',team:c.teamName||'',level:c.level||'',sport:c.sport||'',div:c.division||'',sido:c.sido||''})})});
    Object.keys(P).forEach(function(k){P[k].stints.sort(function(a,b){return (a.year-b.year)||String(a.scid).localeCompare(String(b.scid))})});
    var ex={};(await DB.collection('scPersons').limit(20000).get()).docs.forEach(function(d){ex[d.id]=d.data()});
    return {P:P,ex:ex,rosters:ro.length,skip:skip};
  }
  window.sccPersons=async function(){
    if(isSido()){alert('발자취 색인은 중앙 사무국만 만들 수 있습니다.');return}
    var b=box();b.innerHTML='학년도 실명 명단을 읽는 중…';
    try{PR=await buildPersons();var ks=Object.keys(PR.P);
      var nNew=ks.filter(function(k){return !PR.ex[k]}).length;
      var gone=Object.keys(PR.ex).filter(function(k){return !PR.P[k]&&(PR.ex[k].stints||[]).length}).length;
      var linked=Object.keys(PR.ex).filter(function(k){return PR.ex[k].links&&Object.keys(PR.ex[k].links).length}).length;
      var multi=ks.filter(function(k){var s={};PR.P[k].stints.forEach(function(x){s[x.scid]=1});return Object.keys(s).length>1}).length;
      b.innerHTML='<b style="font-size:15px">👣 발자취 색인 — 미리보기 (쓰기 0건)</b>'
        +'<div style="font-size:12.5px;color:#6b7280;line-height:1.7;margin:6px 0">학년도별 실명 명단에서 사람마다 학교클럽 이력을 모읍니다. 학생·보호자는 마이페이지 <b>[경력 여정 › 나의 발자취]</b>에서 성명+생년월일이 같은 자기(자녀) 기록만 볼 수 있고, 「내 기록으로 연결」을 누르면 이어집니다. 생년월일이 없는 명단 줄은 넣지 않습니다.</div>'
        +'<div style="display:flex;gap:14px;flex-wrap:wrap;margin:8px 0;font-size:13.5px"><span>명단 <b>'+PR.rosters+'</b>건</span><span>사람 <b>'+ks.length+'</b>명</span><span>새로 생김 <b>'+nNew+'</b></span><span>두 팀 이상 이어진 사람 <b>'+multi+'</b></span><span>이미 연결 <b>'+linked+'</b></span>'
        +(PR.skip?'<span style="color:#8a919d">생년월일 없어 제외 <b>'+PR.skip+'</b>줄</span>':'')+(gone?'<span style="color:#b8860b">명단에서 빠져 이력 비움 <b>'+gone+'</b></span>':'')+'</div>'
        +'<button class="btn-sub" style="background:#0f766e;margin-top:6px" onclick="sccPersonsApply()">✅ 색인 저장</button><div id="sccPrMsg" style="margin-top:8px;font-size:13px"></div>';
    }catch(e){b.innerHTML='<b style="color:#C41E2F">읽기 실패: '+E(e.message)+'</b>'+(String(e.message).indexOf('permission')>=0?'<div style="font-size:12.5px;margin-top:4px">보안 규칙 v31(scPersons) 게시 전에는 색인을 만들 수 없습니다.</div>':'')}
  };
  window.sccPersonsApply=async function(){
    if(!PR)return;var m=document.getElementById('sccPrMsg');
    try{var ops=[];var n=0;
      Object.keys(PR.P).forEach(function(k){var p=PR.P[k];var old=PR.ex[k];
        if(old&&JSON.stringify(old.stints||[])===JSON.stringify(p.stints)&&old.name===p.name&&(old.gender||'')===p.gender)return;
        ops.push(old?['update','scPersons',k,{name:p.name,birth:p.birth,gender:p.gender,stints:p.stints,updatedAt:FV().serverTimestamp()}]
          :['set','scPersons',k,{name:p.name,birth:p.birth,gender:p.gender,stints:p.stints,links:{},createdAt:FV().serverTimestamp(),updatedAt:FV().serverTimestamp()}]);n++});
      Object.keys(PR.ex).forEach(function(k){if(!PR.P[k]&&(PR.ex[k].stints||[]).length){ops.push(['update','scPersons',k,{stints:[],updatedAt:FV().serverTimestamp()}]);n++}});
      if(!ops.length){m.innerHTML='<b style="color:#0f766e">바뀐 것이 없습니다.</b>';return}
      m.textContent='저장 중…';await commit(ops,function(t){m.textContent=t});
      m.innerHTML='<b style="color:#0f766e">✓ 저장했습니다</b> — '+n+'명 갱신';PR=null;
    }catch(e){m.innerHTML='<b style="color:#C41E2F">저장 실패: '+E(e.message)+'</b>'}
  };

  // ══════════ ⑧ [4단계] 사업 성과 지표 · 학년도 명단 확정 요청 ══════════
  //   성과 지표는 저장하지 않고 그때그때 모읍니다(쓰기 0건). 발자취·출신 회원 지표는 [👣 발자취 색인]과 학생·보호자의 「내 기록으로 연결」이 쌓일수록 정확해집니다.
  var PF=null,RR=null;
  function curYear(){return SCC.schoolYear(new Date().toISOString().slice(0,10))}
  function liveClub(c){return !c.mergedInto&&['숨김','반려','대기','통합'].indexOf(c.status)<0}
  function ageB(b){var d=new Date(String(b||'')+'T00:00:00');if(isNaN(d))return -1;var n=new Date();var a=n.getFullYear()-d.getFullYear();if(n.getMonth()<d.getMonth()||(n.getMonth()===d.getMonth()&&n.getDate()<d.getDate()))a--;return a}
  function seasonN(s){return +(s.count||s.rosterN||(s.roster||[]).length||0)}
  async function allDocs(col,lim){try{return (await DB.collection(col).limit(lim||20000).get()).docs.map(function(d){return Object.assign({id:d.id},d.data())})}catch(e){return null}}
  window.sccPerf=async function(){
    if(isSido()){alert('사업 성과 지표는 중앙 사무국 화면입니다.');return}
    var b=box();b.innerHTML='학교클럽·명단·대회·발자취 기록을 모으는 중…';
    try{
      await loadClubs(true);var cy=curYear();var L=CLUBS.filter(liveClub);var byId={};CLUBS.forEach(function(c){byId[c.id]=c});
      var se=await allDocs('scSeasons'),ev=await allDocs('schoolClubEvents',5000),pe=await allDocs('scPersons'),al=await allDocs('scAlumni');
      var byY={};(se||[]).forEach(function(s){var y=+s.year;if(!y)return;var n=seasonN(s);if(!n)return;var x=byY[y]=byY[y]||{n:0,teams:0,conf:0,m:0,f:0};x.n+=n;x.teams++;if(s.confirmedAt)x.conf++;x.m+=+(s.countM||0);x.f+=+(s.countF||0)});
      var hasCur={};(se||[]).forEach(function(s){if(+s.year===cy&&seasonN(s))hasCur[s.scid]=1});
      var withRoster=L.filter(function(c){return hasCur[c.id]}).length;
      var schools={};L.forEach(function(c){if(c.schoolCode)schools[c.schoolCode]=1});
      var bySido={};L.forEach(function(c){var k=c.sido||'미상';var x=bySido[k]=bySido[k]||{teams:0,schools:{},roster:0,students:0,coach:0};x.teams++;if(c.schoolCode)x.schools[c.schoolCode]=1;if(hasCur[c.id])x.roster++;if(c.coachUid)x.coach++});
      (se||[]).forEach(function(s){if(+s.year!==cy)return;var c=byId[s.scid];var k=(c&&c.sido)||'미상';if(bySido[k])bySido[k].students+=seasonN(s)});
      var evY=(ev||[]).filter(function(e){return +(e.year||SCC.schoolYear(e.date))===cy});var ent=0,aw=0,win=0;
      evY.forEach(function(e){Object.keys(e.divisions||{}).forEach(function(dv){var T=(e.divisions[dv]||{}).teams||{};Object.keys(T).forEach(function(k){var t=T[k];ent++;var r=t.rank!=null?t.rank:SCC.rankOf(t.result);if(r&&r<=3)aw++;if(r===1)win++})})});
      var P=(pe||[]).filter(function(p){return (p.stints||[]).length});
      var multi=P.filter(function(p){var s={};p.stints.forEach(function(x){if(x.level)s[x.level]=1});return Object.keys(s).length>=2}).length;
      var linked=P.filter(function(p){return p.links&&Object.keys(p.links).length}).length;
      var grown=P.filter(function(p){return ageB(p.birth)>=19}).length;
      var A=al||[];var inClub=A.filter(function(a){return (a.clubs||[]).length}).length;
      var lead={},ref={};var au=A.map(function(a){return a.uid||a.id}).filter(Boolean);
      for(var i=0;i<au.length;i+=10){try{var ls=await DB.collection('licenses').where('uid','in',au.slice(i,i+10)).get();ls.docs.forEach(function(d){var x=d.data();if(x.status&&x.status!=='유효')return;if(/심판/.test(x.type||''))ref[x.uid]=1;else lead[x.uid]=1})}catch(e){}}
      var nLead=Object.keys(lead).length,nRef=Object.keys(ref).length;
      var pct=function(a,z){return z?(Math.round(a/z*1000)/10)+'%':'-'};
      var K=[
        ['운영 학교클럽',L.length+'팀','참여 학교 '+Object.keys(schools).length+'교 · 지도교사 연결 '+L.filter(function(c){return c.coachUid}).length+'팀'],
        [cy+'학년도 명단 확정',withRoster+' / '+L.length+'팀',pct(withRoster,L.length)+' — 명단이 올라온 팀'],
        [cy+'학년도 등록 학생',((byY[cy]||{}).n||0)+'명',(byY[cy]?'남 '+byY[cy].m+' · 여 '+byY[cy].f:'명단 정리 전')],
        [cy+'학년도 대회 출전',ent+'팀·회','대회 '+evY.length+'건 · 입상 '+aw+' (우승 '+win+')'],
        ['발자취 학생',P.length+'명','본인·보호자 연결 '+linked+'명 ('+pct(linked,P.length)+')'],
        ['진학 연계',multi+'명',pct(multi,P.length)+' — 두 학교급 이상 학교클럽에서 뛴 학생'],
        ['학교클럽 출신 연맹 회원',A.length+'명','본인이 발자취를 연결한 회원'],
        ['성인 연계 (일반 클럽 활동)',inClub+'명','출신 회원 중 '+pct(inClub,A.length)+' · 만 19세 이상 발자취 학생 '+grown+'명 대비 '+pct(inClub,grown)],
        ['학교클럽 출신 지도자 · 심판',nLead+' · '+nRef+'명','유효 자격 보유 (연맹 자격 대장 기준)']];
      var ys=Object.keys(byY).map(Number).sort(function(a,z){return z-a});
      var sk=Object.keys(bySido).sort(function(a,z){return bySido[z].teams-bySido[a].teams});
      PF={cy:cy,K:K,byY:byY,ys:ys,bySido:bySido,sk:sk};
      var th='style="padding:6px 8px;background:#f6f8fb;text-align:left"',td='style="padding:6px 8px;border-top:1px solid #eef1f5"';
      b.innerHTML='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b style="font-size:15px">📈 학교스포츠클럽 사업 성과 — '+cy+'학년도 기준</b><span style="flex:1"></span><button class="btn-sub" style="background:#0f766e" onclick="sccPerfCsv()">⬇ CSV</button></div>'
        +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;margin:10px 0">'+K.map(function(k){return '<div style="border:1.5px solid #e2e7f0;border-radius:12px;padding:10px 12px;background:#fbfcfe"><div style="font-size:11.5px;font-weight:800;color:#6b7280">'+E(k[0])+'</div><div style="font-size:20px;font-weight:900;color:#141d51;margin:2px 0">'+E(k[1])+'</div><div style="font-size:11.5px;color:#6b7280">'+E(k[2])+'</div></div>'}).join('')+'</div>'
        +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px">'
        +'<div><b style="font-size:13px">학년도별 등록 학생</b><table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-top:4px"><tr><th '+th+'>학년도</th><th '+th+'>명단 팀</th><th '+th+'>학생</th><th '+th+'>남 · 여</th><th '+th+'>지도교사 확정</th></tr>'
          +(ys.length?ys.map(function(y){var x=byY[y];return '<tr><td '+td+'>'+y+'</td><td '+td+'>'+x.teams+'</td><td '+td+'><b>'+x.n+'</b></td><td '+td+'>'+x.m+' · '+x.f+'</td><td '+td+'>'+x.conf+'</td></tr>'}).join(''):'<tr><td '+td+' colspan="5">명단 자료가 아직 없습니다</td></tr>')+'</table></div>'
        +'<div><b style="font-size:13px">시도별 ('+cy+'학년도)</b><table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-top:4px"><tr><th '+th+'>시도</th><th '+th+'>팀</th><th '+th+'>학교</th><th '+th+'>명단 확정</th><th '+th+'>학생</th><th '+th+'>지도교사</th></tr>'
          +sk.map(function(k){var x=bySido[k];return '<tr><td '+td+'>'+E(k)+'</td><td '+td+'>'+x.teams+'</td><td '+td+'>'+Object.keys(x.schools).length+'</td><td '+td+'>'+x.roster+' ('+pct(x.roster,x.teams)+')</td><td '+td+'>'+x.students+'</td><td '+td+'>'+x.coach+'</td></tr>'}).join('')+'</table></div></div>'
        +'<div style="font-size:12px;color:#6b7280;line-height:1.7;margin-top:10px">· 저장하지 않고 지금 기록으로 계산합니다. 명단은 지도교사 확정·과거 자료 업로드·연맹 대회 단체전 명단이 모두 들어갑니다.<br>· 발자취·진학 연계는 [👣 발자취 색인]을 갱신한 시점 기준입니다. 출신 회원·성인 연계·출신 지도자·심판은 본인이 마이페이지에서 「내 기록으로 연결」한 회원만 셉니다.'+(se===null||pe===null||al===null?'<br><b style="color:#C41E2F">일부 자료를 읽지 못했습니다 — 보안 규칙 v31 게시 여부를 확인하세요.</b>':'')+'</div>';
    }catch(e){b.innerHTML='<b style="color:#C41E2F">계산 실패: '+E(e.message)+'</b>'}
  };
  window.sccPerfCsv=function(){
    if(!PF)return;var rows=[['구분','항목','값','비고']];
    PF.K.forEach(function(k){rows.push(['핵심 지표',k[0],k[1],k[2]])});
    PF.ys.forEach(function(y){var x=PF.byY[y];rows.push(['학년도별',y+'학년도','학생 '+x.n+'명','명단 팀 '+x.teams+' · 남 '+x.m+' · 여 '+x.f+' · 지도교사 확정 '+x.conf])});
    PF.sk.forEach(function(k){var x=PF.bySido[k];rows.push(['시도별('+PF.cy+')',k,'팀 '+x.teams,'학교 '+Object.keys(x.schools).length+' · 명단 확정 '+x.roster+' · 학생 '+x.students+' · 지도교사 '+x.coach])});
    var csv='﻿'+rows.map(function(r){return r.map(function(c){return '"'+String(c==null?'':c).replace(/"/g,'""')+'"'}).join(',')}).join('\n');
    var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='학교스포츠클럽_사업성과_'+PF.cy+'학년도.csv';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000);
  };
  window.sccRosterRemind=async function(){
    if(isSido()){alert('명단 확정 요청은 중앙 사무국이 보냅니다.');return}
    var b=box();b.innerHTML='올해 학년도 명단을 확인하는 중…';
    try{await loadClubs(true);var cy=curYear();var se=await allDocs('scSeasons');var has={};(se||[]).forEach(function(s){if(+s.year===cy&&seasonN(s))has[s.scid]=1});
      var L=CLUBS.filter(liveClub).filter(function(c){return !has[c.id]});
      var wc=L.filter(function(c){return c.coachUid}),nc=L.filter(function(c){return !c.coachUid});
      RR={cy:cy,list:wc};
      var row=function(c){return '<tr><td><a href="schoolclub.html?id='+encodeURIComponent(c.id)+'" target="_blank" style="font-weight:800">'+E(c.teamName||c.schoolName||c.id)+'</a></td><td>'+E(c.schoolName||'')+'</td><td>'+E(c.sido||'')+'</td><td>'+E(c.coachName||'-')+'</td><td>'+(c.rosterRemindAt?E(String(c.rosterRemindAt).slice(0,10)):'-')+'</td></tr>'};
      b.innerHTML='<b style="font-size:15px">📣 '+cy+'학년도 명단 확정 요청</b>'
        +'<div style="font-size:12.5px;color:#6b7280;line-height:1.7;margin:6px 0">올해 학년도 명단이 아직 없는 운영 팀입니다. 지도교사 계정이 연결된 팀에는 알림을 보내 팀 홈의 「학년도 명단 관리」에서 지난 학년도 명단을 가져와(학년 올리기) 확정하도록 안내합니다.</div>'
        +'<div style="font-size:13.5px;margin:6px 0">알림 대상 <b>'+wc.length+'</b>팀 · 지도교사 미연결 <b style="color:#b8860b">'+nc.length+'</b>팀 (학교클럽 목록에서 지도교사를 연결하거나 과거 자료로 명단을 올려 주세요)</div>'
        +(wc.length?'<div style="overflow-x:auto;max-height:320px"><table class="rtbl"><thead><tr><th>팀</th><th>학교</th><th>시도</th><th>지도교사</th><th>지난 요청</th></tr></thead><tbody>'+wc.map(row).join('')+'</tbody></table></div>'
          +'<button class="btn-sub" style="background:#b8860b;margin-top:8px" onclick="sccRosterRemindGo()">📣 '+wc.length+'팀 지도교사에게 알림 보내기</button>':'<div class="bempty">알림을 보낼 팀이 없습니다.</div>')
        +(nc.length?'<details style="margin-top:10px"><summary style="cursor:pointer;font-size:13px">지도교사 미연결 '+nc.length+'팀</summary><div style="overflow-x:auto"><table class="rtbl"><tbody>'+nc.map(row).join('')+'</tbody></table></div></details>':'')
        +'<div id="sccRrMsg" style="margin-top:8px;font-size:13px"></div>';
    }catch(e){b.innerHTML='<b style="color:#C41E2F">확인 실패: '+E(e.message)+'</b>'}
  };
  window.sccRosterRemindGo=async function(){
    if(!RR||!RR.list.length)return;var m=document.getElementById('sccRrMsg');
    if(!confirm(RR.list.length+'팀 지도교사에게 '+RR.cy+'학년도 명단 확정 요청 알림을 보낼까요?'))return;
    var ok=0,fail=0,now=new Date().toISOString();
    for(var i=0;i<RR.list.length;i++){var c=RR.list[i];if(m)m.textContent='보내는 중… '+(i+1)+'/'+RR.list.length;
      try{await KFDF.notify(c.coachUid,'🏫 ['+(c.teamName||c.schoolName||'')+'] '+RR.cy+'학년도 선수 명단을 확정해 주세요 — 팀 홈 › 지도교사 도구 › 「학년도 명단 관리」에서 지난 학년도 명단을 가져와 학년을 올릴 수 있습니다','schoolclub.html?id='+encodeURIComponent(c.id));
        await DB.collection('schoolClubs').doc(c.id).update({rosterRemindAt:now}).catch(function(){});ok++}catch(e){fail++}}
    if(m)m.innerHTML='<b style="color:#0f766e">✓ '+ok+'팀에 보냈습니다</b>'+(fail?' · 실패 '+fail:'');
  };

  // ══════════ ⑥ 일반 클럽 중 학교 동아리 ══════════
  window.sccClubCands=async function(){
    var b=box();b.innerHTML='일반 클럽 목록을 읽는 중…';
    try{var s=await DB.collection('clubs').get();var all=s.docs.map(function(d){return Object.assign({id:d.id},d.data())});
      var re=/(초|중|고)(등학교|학교)?(\s|$|스포츠|플라잉|얼티|디스크|클럽|부)|초등|중학|고등|학교|스포츠클럽/;
      var cands=all.filter(function(c){return c.clubType!=='external'&&!c.schoolClubId&&re.test(String(c.name||'')+' '+String(c.intro||'').slice(0,60))});
      var linked=all.filter(function(c){return c.schoolClubId});
      b.innerHTML='<b style="font-size:15px">🔁 일반 클럽으로 등록된 학교 동아리 후보 '+cands.length+'곳</b>'
        +'<div style="font-size:12.5px;color:#6b7280;line-height:1.7;margin:6px 0 10px">클럽 이름·소개에 학교 관련 말이 들어간 클럽입니다. <b>클럽장에게 먼저 확인</b>한 뒤 [학교스포츠클럽으로 연결]을 누르세요. 연결하면 학교스포츠클럽 팀이 생기고, 일반 클럽은 「클럽 찾기」 목록에서 빠지되 회원·교류전·입상 기록은 그대로 남아 팀 홈에 함께 표시됩니다.</div>'
        +(cands.length?'<div style="overflow-x:auto"><table class="rtbl"><thead><tr><th>클럽</th><th>지역</th><th>클럽장</th><th>회원</th><th>상태</th><th></th></tr></thead><tbody>'+cands.map(function(c){return '<tr><td><a href="clubhome.html?id='+encodeURIComponent(c.id)+'" target="_blank" style="font-weight:800">'+E(c.name)+'</a>'+(c.schoolClubAsked?'<div style="font-size:11px;color:#b8860b">확인 요청함</div>':'')+'</td><td>'+E((c.sido||'')+' '+(c.gugun||''))+'</td><td>'+E(c.ownerName||'')+'</td><td>'+((c.memberUids||[]).length)+'</td><td>'+E(c.status||'')+'</td>'
          +'<td style="white-space:nowrap"><button class="btn-sub" style="padding:3px 10px;font-size:11.5px;background:#b8860b" onclick="sccAskOwner(\''+c.id+'\')">클럽장에게 확인 요청</button> <button class="btn-sub" style="padding:3px 10px;font-size:11.5px;background:#0f766e" onclick="sccLinkClub(\''+c.id+'\',\''+E(String(c.name||'').replace(/'/g,''))+'\')">학교스포츠클럽으로 연결</button></td></tr>'}).join('')+'</tbody></table></div>':'<div class="bempty">후보가 없습니다.</div>')
        +(linked.length?'<div style="margin-top:12px;font-size:13px"><b>이미 연결된 클럽 '+linked.length+'곳</b><br>'+linked.map(function(c){return E(c.name)+' → <a href="schoolclub.html?id='+encodeURIComponent(c.schoolClubId)+'" target="_blank">'+E(c.schoolClubId)+'</a>'}).join('<br>')+'</div>':'');
      window.__sccClubs=all;
    }catch(e){b.innerHTML='<b style="color:#C41E2F">조회 실패: '+E(e.message)+'</b>'}
  };
  window.sccAskOwner=async function(id){var c=(window.__sccClubs||[]).find(function(x){return x.id===id});if(!c||!c.ownerUid){alert('클럽장 계정을 찾을 수 없습니다.');return}
    if(!confirm('['+c.name+'] 클럽장('+(c.ownerName||'')+')에게 학교스포츠클럽으로 옮길지 확인 요청 알림을 보낼까요?'))return;
    try{await KFDF.notify(c.ownerUid,'🏫 ['+c.name+'] 클럽을 「학교스포츠클럽」으로 옮겨 관리하려고 합니다. 학교 동아리가 맞는지 사무국(031-984-3248)에 알려 주세요. (회원·교류전·입상 기록은 그대로 유지됩니다)','clubhome.html?id='+id);
      await DB.collection('clubs').doc(id).update({schoolClubAsked:FV().serverTimestamp()}).catch(function(){});alert('✓ 알림을 보냈습니다.');sccClubCands()}catch(e){alert('실패: '+e.message)}};
  window.sccLinkClub=function(id,name){var c=(window.__sccClubs||[]).find(function(x){return x.id===id})||{};sccEdit(null,{fromClubId:id,clubName:name,teamName:name,gugun:c.gugun||'',intro:c.intro?String(c.intro).slice(0,60):'',schoolName:String(name||'').replace(/(플라잉디스크|얼티미트|스포츠클럽|클럽|동아리|부)$/,'').trim()})};
})();
