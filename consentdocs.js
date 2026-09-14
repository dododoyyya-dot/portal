// consentdocs.js v20260914a · 회원 동의서·계약서 출력(인쇄 → PDF로 저장) — 관리자 전용
//   회원이 홈페이지에서 동의·서명한 기록을 당시 문안 그대로 A4 문서로 다시 만듭니다.
//   ① 회원가입 개인정보 수집·이용 동의 확인서   (가입 필수 동의 — signupConsents.at 이 있으면 그 시각, 없으면 가입일 기준)
//   ② 위촉 전자동의서 (강사·심판·운영요원)      (users.consents: privacy·rrn·crimCheck·agreedAt — 마이페이지 [위촉 전자동의] 3항목)
//   ③ 아동학대·성범죄 경력 조회 동의 확인서      (위 ③항 동의 + 조회 대상자 인적사항 + 연맹 확인(crimDoc·crimDocAt))
//   ④ 강습 강사 위촉계약서 · 대회요원 위촉계약서 (users.contracts[강습신청ID] · contracts['comp_'+공고ID] — 전자서명 이미지 포함)
//   ⑤ 대회 참가 신청·동의 기록                   (contracts['compapply_…'] · ['compconsent_…'] — 문서명·대상자·일시·서명)
//   사용: var w=KFDF_CDOCS.prep(); KFDF_CDOCS.render(w,DB,[{uid,v}],{include:{signup,hire,crim,contract,comp},by,role})
//   주민등록번호는 앞 6자리와 성별 자리만 보이게 가립니다. 문안을 바꾸면 이 파일의 문안도 함께 바꿔야 과거 동의서와 어긋나지 않습니다.
(function(){
  'use strict';
  var ORG='사단법인 대한민국플라잉디스크연맹';
  var TYPE={instructor:'지도자·강사',teacher:'교사(교원)',natcert:'국가공인자격증 취득회원',athlete:'선수회원',general:'일반회원',student:'학생회원'};
  // 가입 화면(login.html) 문안
  var SIGNUP_PRIVACY='이름·연락처·주소 등 수집 정보는 연맹 회원 관리, 사업 운영, 물품 발송 목적으로 수집·이용되며, 법령에 따라 보관됩니다. 동의 철회 시 사무국(031-984-3248)으로 문의하시면 됩니다.';
  // 마이페이지 [위촉 전자동의] 문안 (c1·c2·c3)
  var HIRE=[
    ['개인정보(성명·연락처·주소·계좌) 수집·이용 동의','위촉, 활동 배정, 수당 지급, 사업 정산 목적. 사업 종료 후 5년 보존 후 파기','privacy'],
    ['고유식별정보(주민등록번호) 수집·이용 동의','소득세법에 따른 원천징수 신고·지급명세서 제출 목적에 한함','rrn'],
    ['아동학대·성범죄 결격사유 없음 확인 및 조회 협조 동의','본인은 아동학대·성범죄 등 관련 법령상 결격사유가 없음을 확인하며, 연맹 또는 배정 학교가 관계 법령에 따라 경력조회를 실시하는 것에 동의하고 협조합니다 (허위 확인 시 위촉 즉시 해지)','crimCheck']];
  var HIRE_NOTE='※ 위 동의를 거부할 권리가 있으나, 필수 항목에 동의하지 않으실 경우 강사·심판 등 위촉 및 수당 지급이 제한됩니다.';
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function src(u){u=String(u||'');return /^(https:\/\/|data:image\/)/i.test(u)?esc(u):''}
  function abs(p){try{return new URL(p,location.href).href}catch(e){return p}}
  function p2(n){return String(n).padStart(2,'0')}
  function toD(x){if(!x)return null;try{var d=x.toDate?x.toDate():(x.seconds?new Date(x.seconds*1000):new Date(x));return isNaN(d)?null:d}catch(e){return null}}
  function ts(x){var d=toD(x);return d?d.getFullYear()+'. '+(d.getMonth()+1)+'. '+d.getDate()+'. '+p2(d.getHours())+':'+p2(d.getMinutes()):''}
  function dt(x){var d=toD(x);return d?d.getFullYear()+'. '+(d.getMonth()+1)+'. '+d.getDate()+'.':''}
  function maskRrn(r){r=String(r||'').replace(/[^0-9]/g,'');return r.length===13?r.slice(0,6)+'-'+r[6]+'******':''}
  function ymd(d){return d.getFullYear()+p2(d.getMonth()+1)+p2(d.getDate())}
  function rrnTxt(g){return g.rrn===null?'열람 권한 없음 (중앙 사무국이 출력하면 표시)':(maskRrn(g.rrn)||'미등록')}

  function prep(){
    var w=window.open('','_blank');
    if(!w){alert('팝업이 차단되어 동의서 창을 열 수 없습니다.\n주소창 오른쪽의 팝업 차단 표시에서 이 사이트를 허용한 뒤 다시 눌러 주세요.');return null}
    w.document.write('<!doctype html><meta charset="utf-8"><title>동의서 준비 중…</title><body style="margin:0;font-family:\'Malgun Gothic\',sans-serif;display:flex;align-items:center;justify-content:center;height:90vh;color:#555;font-size:15px"><div id="pg">📄 동의서를 만드는 중입니다…</div></body>');
    return w;
  }
  function say(w,t){try{var e=w.document.getElementById('pg');if(e)e.textContent=t}catch(_){}}
  function fail(w,e){try{w.document.body.innerHTML='<div style="padding:40px;font-family:sans-serif;color:#C41E2F;font-size:15px">동의서를 만들지 못했습니다: '+esc(e&&(e.message||e))+'</div>'}catch(_){}}

  async function getDoc(DB,col,id,cache){
    var k=col+'/'+id;if(k in cache)return cache[k];
    try{var d=await DB.collection(col).doc(id).get();cache[k]=d.exists?d.data():null}catch(e){cache[k]=null}
    return cache[k];
  }
  async function gather(DB,m,cache,need){
    var g={rrn:'',school:[],comp:[],recs:[]};
    if(need.rrn){try{var p=await DB.collection('privateInfo').doc(m.uid).get();if(p.exists)g.rrn=p.data().rrn||''}catch(e){g.rrn=null}}   // null = 열람 권한 없음(중앙 사무국만)
    var C=m.v.contracts||{};
    for(var k in C){var a=C[k]||{};
      if(/^compapply_|^compconsent_/.test(k)){if(need.comp)g.recs.push(Object.assign({key:k},a));continue}
      if(!need.contract)continue;
      if(/^comp_/.test(k)){var s=await getDoc(DB,'compSlots',k.slice(5),cache);g.comp.push({key:k,ag:a,s:s||{}});continue}
      var ap=await getDoc(DB,'schoolApplications',k,cache);
      if(ap)g.school.push({key:k,ag:a,a:ap});else if(need.comp)g.recs.push(Object.assign({key:k,doc:a.doc||'위촉계약(대상 문서 없음)'},a));
    }
    g.recs.sort(function(x,y){return String(ts(x.agreedAt)).localeCompare(String(ts(y.agreedAt)))});
    return g;
  }

  // ── 공통 조각 ──
  function head(kind){return '<div class="hd"><span><img src="'+esc(abs('kfdf_logo.png'))+'" alt="">'+ORG+'</span><span>'+esc(kind)+'</span></div>'}
  function foot(m,no,ctx){return '<div class="ft"><span>전자 동의 기록 출력본 · 문서번호 '+esc(no)+'</span><span>출력 '+esc(ctx.nowTxt)+(ctx.by?' · '+esc(ctx.role||'')+' '+esc(ctx.by):'')+'</span></div>'}
  function who(m,g,extra){var v=m.v;
    return '<table class="t"><tr><th>성명</th><td>'+esc(v.name||'')+'</td><th>생년월일</th><td>'+esc(v.birth||'-')+'</td></tr>'
      +'<tr><th>회원 유형</th><td>'+esc(TYPE[v.accountType]||v.accountType||'-')+'</td><th>성별</th><td>'+esc(v.gender||'-')+'</td></tr>'
      +'<tr><th>아이디 · 이메일</th><td colspan="3">'+esc([v.loginId,v.email].filter(Boolean).join(' · ')||'-')+'</td></tr>'
      +(extra||'')+'</table>';}
  function docNo(ctx,m,k){return 'KFDF-CD-'+ctx.ymd+'-'+String(m.uid||'').slice(0,6).toUpperCase()+'-'+k}
  function sigImg(u){var s=src(u);return s?'<img class="sg" src="'+s+'" alt="서명">':''}
  function seal(){return '<div class="org"><span class="orgwrap"><img class="lg" src="'+esc(abs('kfdf_logo.png'))+'" alt="">대한민국플라잉디스크연맹<img class="seal" src="'+esc(abs('직인.png'))+'" alt="" onerror="this.style.display=\'none\'"></span></div>'}

  // ① 회원가입 동의 확인서
  function pgSignup(m,g,ctx){var v=m.v,sc=v.signupConsents||null;
    var rrnReq=sc?!!sc.rrn:(['instructor','teacher','athlete'].indexOf(v.accountType)>=0);
    var at=sc&&sc.at?ts(sc.at):'';var joined=ts(v.createdAt);
    return '<section class="doc">'+head('회원가입 동의')
      +'<h1>회원가입 개인정보 수집·이용 동의 확인서</h1>'
      +who(m,g,'<tr><th>가입 일시</th><td colspan="3">'+esc(joined||'-')+'</td></tr>')
      +'<div class="lab">동의 항목</div>'
      +'<div class="item"><div class="it"><span class="chk">☑ 동의</span> (필수) 개인정보 수집·이용에 동의합니다.</div><div class="tx">'+esc(SIGNUP_PRIVACY)+'</div></div>'
      +(rrnReq?'<div class="item"><div class="it"><span class="chk">☑ 동의</span> (필수) 고유식별정보(주민등록번호) 수집·이용에 동의합니다.</div><div class="tx">지도자·강사, 교사, 선수회원 유형은 가입할 때 주민등록번호를 입력하며, 입력한 번호는 본인과 중앙 사무국만 열람할 수 있는 별도 보관함에 저장됩니다.</div></div>':'')
      +'<div class="rec"><b>동의 기록</b><br>'
        +(at?'동의 일시: <b>'+esc(at)+'</b> (가입 화면 체크 기록)':'동의 일시: 가입 일시 <b>'+esc(joined||'-')+'</b> 기준 — 가입 화면에서 위 필수 항목에 체크해야만 가입 신청이 완료됩니다.')
        +'<br>동의 방식: 연맹 홈페이지 회원가입 화면에서 휴대폰 본인인증 후 동의 항목에 체크하고 가입 신청</div>'
      +'<p class="fine">개인정보 처리방침 전문: 연맹 홈페이지 「개인정보처리방침」(privacy.html). 동의 철회·열람·정정 요청은 사무국(031-984-3248)으로 할 수 있습니다.</p>'
      +foot(m,docNo(ctx,m,'SU'),ctx)+'</section>';}

  // ② 위촉 전자동의서
  function pgHire(m,g,ctx){var c=m.v.consents||{};
    return '<section class="doc">'+head('위촉 전자동의')
      +'<h1>강사·심판·운영요원 위촉 전자동의서</h1>'
      +who(m,g,'<tr><th>휴대전화</th><td>'+esc(m.v.phone||'-')+'</td><th>동의 일시</th><td><b>'+esc(ts(c.agreedAt)||'-')+'</b></td></tr>')
      +'<div class="lab">동의 항목 (모두 필수)</div>'
      +HIRE.map(function(h,i){var ok=!!c[h[2]];return '<div class="item"><div class="it"><span class="'+(ok?'chk':'no')+'">'+(ok?'☑ 동의':'☐ 기록 없음')+'</span> ('+(i+1)+') '+esc(h[0])+'</div><div class="tx">'+esc(h[1])+'</div></div>'}).join('')
      +'<p class="fine">'+esc(HIRE_NOTE)+'</p>'
      +'<div class="rec"><b>동의 기록</b><br>동의 일시: <b>'+esc(ts(c.agreedAt)||'-')+'</b><br>동의 방식: 연맹 홈페이지에 본인 계정으로 로그인한 상태에서 마이페이지 [위촉 전자동의] 세 항목에 모두 체크하고 「전자 동의하기」를 누름 (위촉 시 서면 동의서 제출을 갈음)</div>'
      +'<div class="sign"><span>'+esc(dt(c.agreedAt)||ctx.today)+'</span><span>동의자 <b>'+esc(m.v.name||'')+'</b> (전자 동의)</span></div>'
      +foot(m,docNo(ctx,m,'HR'),ctx)+'</section>';}

  // ③ 아동학대·성범죄 경력 조회 동의 확인서
  function pgCrim(m,g,ctx){var v=m.v,c=v.consents||{};
    return '<section class="doc">'+head('경력 조회 동의')
      +'<h1>아동학대·성범죄 경력 조회 동의 확인서</h1>'
      +'<div class="lab">조회 대상자</div>'
      +'<table class="t"><tr><th>성명</th><td>'+esc(v.name||'')+'</td><th>생년월일</th><td>'+esc(v.birth||'-')+'</td></tr>'
      +'<tr><th>주민등록번호</th><td>'+esc(rrnTxt(g))+'</td><th>성별</th><td>'+esc(v.gender||'-')+'</td></tr>'
      +'<tr><th>주소</th><td colspan="3">'+esc(((v.address||'')+' '+(v.addrDetail||'')).trim()||'-')+'</td></tr>'
      +'<tr><th>휴대전화</th><td>'+esc(v.phone||'-')+'</td><th>활동 분야</th><td>'+esc(['school','after','referee','staff'].filter(function(k){return (v.instructorFor||{})[k]}).map(function(k){return {school:'학교체육 강습',after:'방과후·늘봄',referee:'심판요원',staff:'운영요원'}[k]}).join(' · ')||'-')+'</td></tr></table>'
      +'<div class="lab">동의 내용</div>'
      +'<div class="item"><div class="it"><span class="'+(c.crimCheck?'chk':'no')+'">'+(c.crimCheck?'☑ 동의':'☐ 기록 없음')+'</span> '+esc(HIRE[2][0])+'</div><div class="tx">'+esc(HIRE[2][1])+'</div></div>'
      +'<div class="rec"><b>동의 기록</b><br>동의 일시: <b>'+esc(ts(c.agreedAt)||'-')+'</b> — 마이페이지 [위촉 전자동의] ③항 (본인 계정 로그인 후 전자 동의)'
        +'<br>연맹 확인: '+(v.crimDoc?'<b style="color:#0f766e">확인 완료</b>'+(v.crimDocAt?' ('+esc(ts(v.crimDocAt))+')':'')+' — 학교 조회 협조 확인 또는 회보서 수령':'<b>확인 대기</b>')+'</div>'
      +'<div class="sign"><span>'+esc(dt(c.agreedAt)||ctx.today)+'</span><span>동의자 <b>'+esc(v.name||'')+'</b> (전자 동의)</span></div>'
      +foot(m,docNo(ctx,m,'CR'),ctx)+'</section>';}

  // ④-1 강습 강사 위촉계약서 (마이페이지 printContract 문안)
  function pgSchool(m,g,ctx,x){var v=m.v,a=x.a||{},ag=x.ag||{};
    var period=(a.start&&String(a.start).indexOf('8월')>=0)?'2026. 8. ~ 2026. 12.':'2026. 9. ~ 2026. 12.';
    return '<section class="doc ct">'+'<div class="sub0">2026년 유소년 스포츠 기반구축사업</div>'
      +'<h1>강습 강사 위촉계약서</h1>'
      +'<p>사단법인 대한민국플라잉디스크연맹(이하 "갑")과 강사 <b>'+esc(v.name)+'</b>(이하 "을")은 다음과 같이 계약을 체결한다.</p>'
      +'<h2>제1조 (위촉 업무)</h2><p>갑은 을을 아래 학교의 플라잉디스크 강습 강사로 위촉하고, 을은 해당 프로그램(24회차) 강습 및 이에 부수하는 안전관리·출석 확인·운영일지 작성을 성실히 수행한다.<br>• 배정 학교: <b>'+esc(a.school||'')+'</b> ('+esc(a.type||'')+')<br>• 운영 기간: '+period+' (세부 일정은 학교와 협의)</p>'
      +'<h2>제2조 (수당)</h2><p>① 수당은 시간당 50,000원으로 하며, 월별 운영일지(강의확인서)를 기준으로 산정하여 익월 을이 지정하는 계좌로 지급한다.<br>② 월 합산 지급액이 125,000원 이상인 경우 기타소득세 및 지방소득세(합계 8.8%)를 원천징수한 후 지급하며, 교통비·식비는 본 수당에 포함된 것으로 본다.</p>'
      +'<h2>제3조 (강사의 의무)</h2><p>① 을은 배정 학교와 협의된 일정을 준수하며, 불가피한 일정 변경 시 최소 3일 전 학교와 갑에게 통보한다.<br>② 을은 유소년 안전을 최우선으로 하며, 수업 중 안전사고 발생 시 즉시 학교와 갑에게 보고한다.<br>③ 을은 아동학대·성범죄 경력조회에 동의하며, 결격사유가 확인될 경우 본 계약은 즉시 해지된다.<br>④ 을은 업무상 알게 된 학생·교직원 등의 개인정보를 누설하지 아니한다.</p>'
      +'<h2>제4조 (교원의 겸직·근무시간 준수)</h2><p>을이 현직 교원인 경우, 소속 학교장의 겸직허가를 받은 후 활동하며, 강습은 정규 근무시간 외(방과후·늘봄·0교시·스포츠클럽 등)에 운영한다. 정규 수업시간 내 본인 담당 수업 지도에 대해서는 강사료가 지급되지 않는다. (교원이 아닌 외부 강사는 본 조항을 적용받지 않는다.)</p>'
      +'<h2>제5조 (계약 해지)</h2><p>정당한 사유 없는 강습 불이행, 학교 운영에 중대한 지장 초래, 품위 손상 행위가 있는 경우 갑은 본 계약을 해지할 수 있으며, 이 경우 미수행 회차의 수당은 지급하지 아니한다.</p>'
      +'<h2>제6조 (개인정보)</h2><p>갑은 수당 지급·원천징수 신고에 필요한 최소한의 개인정보를 수집·이용하며, 보존기간(사업 종료 후 5년) 경과 후 지체 없이 파기한다.</p>'
      +'<h2>제7조 (전자서명)</h2><p>본 계약은 을이 연맹 홈페이지에서 본인 인증 후 전자적으로 서명한 시점에 성립하며, 기록된 서명·동의 일시는 서면 서명을 갈음한다. 본 계약에 명시되지 아니한 사항은 관계 법령 및 보조사업 지침에 따른다.</p>'
      +'<table class="t"><tr><th>성명</th><td>'+esc(v.name)+'</td><th>주민등록번호</th><td>'+esc(rrnTxt(g))+'</td></tr>'
      +'<tr><th>배정 학교</th><td>'+esc(a.school||'')+' ('+esc(a.type||'')+')</td><th>배정 권역</th><td>'+esc(a.region||'')+'</td></tr>'
      +'<tr><th>위촉 기간</th><td>'+period+'</td><th>담당 회차</th><td>학교당 24회차</td></tr>'
      +'<tr><th>입금 계좌</th><td colspan="3">'+(v.bank?esc(v.bank)+' '+esc(v.accountNum||'')+' (예금주: '+esc(v.accountHolder||'')+')':'미등록')+'</td></tr></table>'
      +'<table class="t"><tr><th>갑</th><td>사단법인 대한민국플라잉디스크연맹 회장 &nbsp;(직인)</td></tr>'
      +'<tr><th>을</th><td>'+esc(v.name)+sigImg(ag.sign)+' &nbsp;—&nbsp; '+(ag.sign?'<b style="color:#0f766e">전자 서명 완료: '+esc(ts(ag.agreedAt))+'</b>':'<b style="color:#b8860b">(이전 방식으로 동의만 기록됨 · 서명 이미지 없음 '+esc(ts(ag.agreedAt))+')</b>')+'</td></tr></table>'
      +seal()+foot(m,docNo(ctx,m,'SC'),ctx)+'</section>';}

  // ④-2 대회요원 위촉계약서 (마이페이지 printCompContract 문안)
  function pgComp(m,g,ctx,x){var v=m.v,c=x.s||{},ag=x.ag||{};
    var pay=(c.role==='심판')?'심판 수당은 1일 70,000원 이내로 하며, 참여 시간이 4시간 이내인 경우 40,000원을 지급한다.':'운영요원 수당은 사업 예산 기준에 따라 산정하여 지급한다.';
    return '<section class="doc ct">'+'<div class="sub0">2026년 유소년 스포츠 기반구축사업</div>'
      +'<h1>대회요원 위촉계약서</h1>'
      +'<p>사단법인 대한민국플라잉디스크연맹(이하 "갑")과 '+esc(c.role||'')+' <b>'+esc(v.name)+'</b>(이하 "을")은 다음과 같이 계약을 체결한다.</p>'
      +'<h2>제1조 (위촉 업무)</h2><p>갑은 을을 아래 대회의 '+esc(c.role||'')+'(으)로 위촉하고, 을은 해당 업무 및 이에 부수하는 안전관리·현장 협조를 성실히 수행한다.<br>• 대회명: <b>'+esc(c.title||'')+'</b><br>• 일자: '+esc(c.date||'')+'<br>• 권역: '+esc(c.region||'')+' (세부 장소는 사무국이 개별 안내)</p>'
      +'<h2>제2조 (수당)</h2><p>① '+pay+'<br>② 월 합산 지급액이 125,000원 이상인 경우 기타소득세 및 지방소득세(합계 8.8%)를 원천징수한 후 을이 지정하는 계좌로 지급하며, 교통비·식비는 본 수당에 포함된 것으로 본다.</p>'
      +'<h2>제3조 (을의 의무)</h2><p>① 을은 대회 일정·장소 등 안내사항을 준수하며, 불가피한 불참 시 최소 3일 전(부득이한 경우 사전) 갑에게 통보한다.<br>② 을은 유소년 안전을 최우선으로 하며, 현장에서 안전사고 발생 시 즉시 갑에게 보고한다.<br>③ 을은 아동학대·성범죄 경력조회에 동의하며, 결격사유가 확인될 경우 본 계약은 즉시 해지된다.<br>④ 을은 업무상 알게 된 참가자 등의 개인정보를 누설하지 아니한다.</p>'
      +'<h2>제4조 (계약 해지)</h2><p>정당한 사유 없는 업무 불이행, 대회 운영에 중대한 지장 초래, 품위 손상 행위가 있는 경우 갑은 본 계약을 해지할 수 있다.</p>'
      +'<h2>제5조 (개인정보)</h2><p>갑은 수당 지급·원천징수 신고에 필요한 최소한의 개인정보를 수집·이용하며, 보존기간(사업 종료 후 5년) 경과 후 지체 없이 파기한다.</p>'
      +'<h2>제6조 (전자서명)</h2><p>본 계약은 을이 연맹 홈페이지에서 본인 인증 후 전자적으로 서명한 시점에 성립하며, 기록된 서명·동의 일시는 서면 서명을 갈음한다. 본 계약에 명시되지 아니한 사항은 관계 법령 및 보조사업 지침에 따른다.</p>'
      +'<table class="t"><tr><th>성명</th><td>'+esc(v.name)+'</td><th>주민등록번호</th><td>'+esc(rrnTxt(g))+'</td></tr>'
      +'<tr><th>대회명 · 역할</th><td colspan="3">'+esc(c.title||'')+' ('+esc(c.role||'')+')</td></tr>'
      +'<tr><th>일자 · 권역</th><td>'+esc(c.date||'')+' · '+esc(c.region||'')+'</td><th>입금 계좌</th><td>'+(v.bank?esc(v.bank)+' '+esc(v.accountNum||'')+' (예금주: '+esc(v.accountHolder||'')+')':'미등록')+'</td></tr></table>'
      +'<table class="t"><tr><th>갑</th><td>사단법인 대한민국플라잉디스크연맹 회장 &nbsp;(직인)</td></tr>'
      +'<tr><th>을</th><td>'+esc(v.name)+sigImg(ag.sign)+' &nbsp;—&nbsp; '+(ag.sign?'<b style="color:#0f766e">전자 서명 완료: '+esc(ts(ag.agreedAt))+'</b>':'<b style="color:#b8860b">(서명 이미지 없음 '+esc(ts(ag.agreedAt))+')</b>')+'</td></tr></table>'
      +seal()+foot(m,docNo(ctx,m,'CP'),ctx)+'</section>';}

  // ⑤ 대회 참가 신청·동의 기록
  function pgRecs(m,g,ctx){
    var rows=g.recs.map(function(r,i){return '<tr><td class="c">'+(i+1)+'</td><td>'+esc(r.doc||(/^compconsent_/.test(r.key)?'개인정보 수집·이용 동의서':'신청서'))+'</td><td>'+esc(r.title||'')+'</td><td>'+esc(r.who||m.v.name||'')+(r.kid?' <small>(자녀 · 보호자 서명)</small>':'')+(r.prefs&&r.prefs.length?'<div><small>'+esc(r.prefs.join(' · '))+'</small></div>':'')+'</td><td class="c">'+esc(ts(r.agreedAt)||'-')+'</td><td class="c">'+(sigImg(r.sign)||'<small>-</small>')+'</td></tr>'}).join('');
    return '<section class="doc">'+head('대회 신청·동의 기록')
      +'<h1>대회 신청서 · 동의서 전자서명 기록</h1>'
      +who(m,g,'')
      +'<table class="t lst"><tr><th style="width:9mm">#</th><th>문서</th><th>대회</th><th>대상자</th><th style="width:30mm">서명 일시</th><th style="width:30mm">서명</th></tr>'+rows+'</table>'
      +'<p class="fine">연맹 홈페이지 대회 신청 화면에서 본인(자녀는 보호자)이 로그인한 상태로 동의 항목에 체크하고 서명한 기록입니다. 각 문서의 원문 신청서는 대회 담당자 화면에서도 확인할 수 있습니다.</p>'
      +foot(m,docNo(ctx,m,'CM'),ctx)+'</section>';}

  var CSS='@page{size:A4;margin:0}*{box-sizing:border-box}'
    +'html,body{margin:0;background:#e6e9ef;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    +'body{font-family:"Malgun Gothic","Noto Sans KR",sans-serif;color:#222}'
    +'.bar{position:sticky;top:0;z-index:5;background:#16181d;color:#fff;padding:10px 18px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;font-size:13px}'
    +'.bar button{background:#C41E2F;color:#fff;border:0;border-radius:9px;padding:9px 18px;font:inherit;font-weight:800;cursor:pointer}.bar .tip{color:#b9bfca;font-size:12px}'
    +'.doc{width:210mm;min-height:297mm;margin:16px auto;background:#fff;padding:18mm 20mm 24mm;font-size:13px;line-height:1.8;position:relative;word-break:keep-all;box-shadow:0 6px 24px rgba(0,0,0,.12);break-after:page;page-break-after:always}'
    +'.doc:last-child{break-after:auto;page-break-after:auto}'
    +'@media print{html,body{background:#fff}.bar{display:none}.doc{margin:0;box-shadow:none}}'
    +'@media screen and (max-width:840px){.doc{zoom:.46}}'
    +'.hd{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#555;border-bottom:1.4pt solid #222;padding-bottom:2mm}.hd img{height:5.5mm;vertical-align:middle;margin-right:5px}'
    +'h1{text-align:center;font-size:21px;margin:9mm 0 7mm;letter-spacing:.5px}'
    +'.sub0{text-align:center;color:#666;font-size:12.5px;margin-bottom:1mm}.ct h1{margin-top:3mm}'
    +'h2{font-size:14px;color:#1F4E9C;margin:5mm 0 1mm}.ct p{margin:0 0 2mm}'
    +'table.t{width:100%;border-collapse:collapse;margin:4mm 0}.t td,.t th{border:1px solid #999;padding:2mm 3mm;font-size:12.5px;text-align:left;vertical-align:middle}'
    +'.t th{background:#f2f5fa;width:30mm;text-align:center;font-weight:700}.t td.c{text-align:center}.lst th{width:auto}'
    +'.lab{font-weight:800;font-size:13px;margin:6mm 0 1mm}'
    +'.item{border:1px solid #bbb;border-radius:2mm;padding:3mm 4mm;margin:2.5mm 0}.it{font-weight:700}.tx{font-size:12.3px;color:#444;margin-top:1mm}'
    +'.chk{color:#0f766e;font-weight:900;margin-right:3px}.no{color:#C41E2F;font-weight:900;margin-right:3px}'
    +'.rec{background:#f5f7fb;border-left:3px solid #153A77;padding:3mm 4mm;font-size:12.3px;margin-top:5mm;line-height:1.75}'
    +'.fine{font-size:11.5px;color:#666;margin-top:4mm}'
    +'.sign{display:flex;justify-content:flex-end;gap:12mm;margin-top:10mm;font-size:14px}'
    +'.sg{height:11mm;max-width:40mm;vertical-align:middle;margin:0 5px;object-fit:contain}'
    +'.org{display:flex;justify-content:center;font-size:19px;font-weight:800;letter-spacing:3px;margin-top:7mm}'
    +'.orgwrap{position:relative;display:inline-flex;align-items:center;gap:10px;white-space:nowrap}.org img.lg{width:42px;height:42px;object-fit:contain}'
    +'.seal{position:absolute;right:-34px;top:50%;transform:translateY(-52%);width:62px;height:62px;object-fit:contain;mix-blend-mode:multiply;opacity:.92}'
    +'.ft{position:absolute;left:20mm;right:20mm;bottom:9mm;display:flex;justify-content:space-between;gap:10px;font-size:9.5px;color:#888;border-top:1px solid #ddd;padding-top:2mm}'
    // 계약서 쪽: 조문이 길어 A4 한 장에 들어가도록 촘촘하게
    +'.doc.ct{font-size:11.6px;line-height:1.58;padding:14mm 18mm 20mm}.ct h1{font-size:19px;margin:2mm 0 4mm}.ct h2{font-size:12.6px;margin:2.6mm 0 .3mm}.ct p{margin:0 0 1mm}'
    +'.ct .t{margin:2.5mm 0}.ct .t td,.ct .t th{padding:1.3mm 2.6mm;font-size:11.6px}.ct .t th{width:24mm}.ct .org{margin-top:4mm}.ct .ft{left:18mm;right:18mm}';

  async function render(w,DB,members,opt){
    if(!w||w.closed)return;opt=opt||{};
    var inc=opt.include||{signup:1,hire:1,crim:1,contract:1,comp:1};
    var now=new Date();
    var ctx={nowTxt:ts(now),today:dt(now),ymd:ymd(now),by:opt.by||'',role:opt.role||''};
    var cache={},pages=[],cnt={signup:0,hire:0,crim:0,contract:0,comp:0};
    for(var i=0;i<members.length;i++){var m=members[i];if(!m||!m.v)continue;
      if(members.length>1)say(w,'📄 동의서를 만드는 중입니다… '+(i+1)+' / '+members.length+' ('+(m.v.name||'')+')');
      var c=m.v.consents||{};
      var need={rrn:!!((inc.crim&&c.crimCheck)||(inc.contract&&m.v.contracts&&Object.keys(m.v.contracts).length)),contract:!!inc.contract,comp:!!inc.comp};
      var g=await gather(DB,m,cache,need);
      if(inc.signup){pages.push(pgSignup(m,g,ctx));cnt.signup++}
      if(inc.hire&&c.agreedAt){pages.push(pgHire(m,g,ctx));cnt.hire++}
      if(inc.crim&&c.crimCheck){pages.push(pgCrim(m,g,ctx));cnt.crim++}
      if(inc.contract){g.school.forEach(function(x){pages.push(pgSchool(m,g,ctx,x));cnt.contract++});g.comp.forEach(function(x){pages.push(pgComp(m,g,ctx,x));cnt.contract++})}
      if(inc.comp&&g.recs.length){pages.push(pgRecs(m,g,ctx));cnt.comp++}
    }
    if(!pages.length){fail(w,'고른 조건에 맞는 동의·서명 기록이 없습니다.');return cnt}
    var one=members.length===1?members[0].v.name||'':'';
    var fname=(one?'동의서_'+String(one).replace(/\s+/g,''):'동의서_일괄_'+members.length+'명')+'_'+ctx.ymd;
    var sum='회원가입 '+cnt.signup+' · 위촉 전자동의 '+cnt.hire+' · 경력 조회 동의 '+cnt.crim+' · 위촉계약 '+cnt.contract+' · 대회 기록 '+cnt.comp;
    var boot='(function(){var im=[].slice.call(document.images),n=im.length,d=0,st=document.getElementById("st"),f=false;function go(){if(f)return;f=true;st.textContent="준비 완료 — 인쇄 창에서 대상을 「PDF로 저장」으로 고르세요";setTimeout(function(){window.print()},350)}'
      +'function up(){d++;st.textContent="서명 이미지 불러오는 중 "+d+"/"+n;if(d>=n)go()}im.forEach(function(i){if(i.complete)up();else{i.addEventListener("load",up);i.addEventListener("error",up)}});if(!n)go();setTimeout(go,20000)})();';
    w.document.open();
    w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(fname)+'</title><style>'+CSS+'</style></head><body>'
      +'<div class="bar"><button onclick="window.print()">🖨 인쇄 · PDF로 저장</button><span id="st">준비 중…</span><span class="tip">'+esc(sum)+' · 총 '+pages.length+'쪽 · 용지 A4 · 여백 없음 · 「배경 그래픽」 켜기</span></div>'
      +pages.join('')+'<script>'+boot+'<'+'/script></body></html>');
    w.document.close();
    return cnt;
  }
  window.KFDF_CDOCS={prep:prep,render:render,fail:fail};
})();
