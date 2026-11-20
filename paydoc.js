// ══════════ 지도자 수당 서류 (completed.html 전용 · 중앙) ══════════
//   「수당 등 수수료 집행 내역서」 = 국민체육진흥기금 보조금 사용 및 정산 기준 [별첨 1] 서식 그대로.
//   근거: 2026 유소년스포츠기반구축 사업 지침 ② 수당 지급 공통 사항(본인 명의 계좌 · 월 합산 125,000원 이상 원천징수 · 집행 내역서 작성),
//         정산 기준 일반수용비 정산 시 첨부서류(내부결재 · 원천징수영수증 · 집행 내역서 · 이력서/자격증).
//   completed.html 의 APPS·USERS·DB·digits·telFmt·periodOf·xlNeed·xlSave·ymd·filtered 를 그대로 씁니다. 읽기만 하고 아무것도 저장하지 않습니다.
//   주민번호는 서식이 요구하는 앞 6자리만 넣습니다(뒷자리는 읽어도 버림).
var PAY_UNIT=50000,PAY_CAP=24;
function payTaxOf(amt){if(!amt||amt<=125000)return 0;var tax=Math.floor(amt*0.4*0.2/10)*10;return tax+Math.floor(tax*0.1/10)*10}
function payTs(t){try{var d=t&&t.toDate?t.toDate():(t?new Date(t):null);if(!d||isNaN(d))return '';var p=function(n){return String(n).padStart(2,'0')};return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes())}catch(e){return ''}}
function payDow(d){var t=new Date(String(d).slice(0,10)+'T00:00:00');return isNaN(t)?'':['일','월','화','수','목','금','토'][t.getDay()]}
function payMsg(t,keep){var m=document.getElementById('cpMsg');if(!m)return;m.textContent=t;if(!keep)setTimeout(function(){if(m.textContent===t)m.textContent=''},15000)}
function xlsPayIns(i){var I=window.__PAY_INS||[];if(!I[i])return;xlsPay(I[i].schools.map(function(a){return a.id}))}
function xlsPayAll(){var list=filtered();if(list.length>30&&!confirm('지금 보이는 '+list.length+'건 전체의 수당 서류를 한 파일로 만듭니다. 계속할까요?'))return;xlsPay(list.map(function(a){return a.id}))}
async function xlsPay(ids){
  if(!xlNeed())return;
  var list=APPS.filter(function(a){return ids.indexOf(a.id)>=0});
  if(!list.length){alert('수당 서류를 만들 학교가 없습니다.');return}
  payMsg('수당 서류를 만드는 중… (일지 · 계좌 정보를 읽고 있습니다)',true);
  try{
    // 1) 지도자별로 묶기
    var G={};list.forEach(function(a){var k=a.insUid||('name:'+a.instructor);(G[k]=G[k]||{uid:a.insUid||'',name:a.instructor||'',apps:[]}).apps.push(a)});
    var P=Object.keys(G).map(function(k){return G[k]}).sort(function(x,y){return String(x.name).localeCompare(String(y.name),'ko')});
    for(var pi=0;pi<P.length;pi++){var p=P[pi],u=USERS[p.uid]||{};
      p.name=u.name||p.name;p.phone=u.phone||'';p.bank=u.bank||'';p.acct=u.accountNum||'';p.holder=u.accountHolder||'';p.contracts=u.contracts||{};
      var id6='';
      try{if(p.uid){var pd=await DB.collection('privateInfo').doc(p.uid).get();if(pd.exists)id6=digits((pd.data()||{}).rrn).slice(0,6)}}catch(e){}
      if(id6.length<6&&u.birth){var b=digits(u.birth);id6=b.length>=8?b.slice(2,8):b.slice(0,6)}
      p.id6=id6.length===6?id6:'';
      // 이력·자격 — 홈페이지에 등록된 것만(자격 대장은 회원에 연결된 것, 이관·승급된 옛 번호 제외). 없으면 없는 대로 둡니다.
      p.u=u;p.lics=[];p.career=[];
      try{if(p.uid){var lq=await DB.collection('licenses').where('uid','==',p.uid).get();p.lics=lq.docs.map(function(d){return Object.assign({no:d.id},d.data()||{})}).filter(function(l){return l.status!=='이관'&&l.status!=='승급'})
        .sort(function(x,y){return String(x.type||'').localeCompare(String(y.type||''),'ko')||String(x.grade||'').localeCompare(String(y.grade||''),'ko')})}}catch(e){}
      try{if(p.uid){var cq=await DB.collection('staffCareer').where('uid','==',p.uid).limit(500).get();p.career=cq.docs.map(function(d){return d.data()||{}}).sort(function(x,y){return String(y.date||'').localeCompare(String(x.date||''))})}}catch(e){}
      var qz=u.quals||{};p.selfQual=[qz.leader?'지도자 '+qz.leader:'',qz.referee?'심판 '+qz.referee:'',qz.youth?'유소년스포츠지도사':''].filter(Boolean);
      p.qualDocs=(u.qualDocs||[]).filter(function(x){return /^https?:/.test(String(x))});
      p.apps.sort(function(x,y){return String(x.school).localeCompare(String(y.school),'ko')||String(x.type).localeCompare(String(y.type),'ko')});
      for(var ai=0;ai<p.apps.length;ai++){var a=p.apps[ai];
        var q=await DB.collection('sessionLogs').where('appId','==',a.id).get();
        a._logs=q.docs.map(function(d){return d.data()||{}}).filter(function(l){return /^\d{4}-\d{2}-\d{2}/.test(String(l.date||''))})
          .sort(function(x,y){return (+x.session||0)-(+y.session||0)||String(x.date).localeCompare(String(y.date))});
        a._pay=Math.min(a.done,PAY_CAP);a._amt=a._pay*PAY_UNIT;
        var c=p.contracts[a.id]||{};a._contract=c.sign?'서명 완료':(c.agreedAt?'동의(서명 없음)':'없음')}
      p.sess=p.apps.reduce(function(n,a){return n+a._pay},0);p.amt=p.sess*PAY_UNIT;p.tax=payTaxOf(p.amt)}
    // 2) 엑셀
    var wb=new ExcelJS.Workbook();wb.creator='대한민국플라잉디스크연맹';
    var F='맑은 고딕',thin={style:'thin',color:{argb:'FF000000'}},bAll={top:thin,left:thin,bottom:thin,right:thin},NUM='#,##0';
    var cellSet=function(c,v,o){o=o||{};c.value=v;c.font={name:F,size:o.size||10,bold:!!o.bold,color:o.color?{argb:o.color}:undefined};
      c.alignment={horizontal:o.h||'center',vertical:'middle',wrapText:true};if(o.border!==false)c.border=bAll;if(o.fill)c.fill={type:'pattern',pattern:'solid',fgColor:{argb:o.fill}};if(o.fmt)c.numFmt=o.fmt};
    var today=(function(){var d=new Date();return d.getFullYear()+'. '+(d.getMonth()+1)+'. '+d.getDate()+'.'})();
    var totalSess=P.reduce(function(n,p){return n+p.sess},0);
    var subject=P.length===1?(P[0].apps.map(function(a){return a.school+' '+a.type+' '+a._pay+'회'}).join(' · ')+' 지도자 수당')
      :('학교 강습·방과후 지도자 수당 '+P.length+'명 · '+list.length+'건 · '+totalSess+'회');
    // ── ① 수당 등 수수료 집행 내역서 [별첨 1] ──
    var ws=wb.addWorksheet('수당 집행 내역서',{pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:0.5,right:0.5,top:0.6,bottom:0.6,header:0.2,footer:0.2}}});
    ws.columns=[6,12,14,17,36,15,15,15,16].map(function(w){return {width:w}});
    ws.mergeCells('A1:I1');cellSet(ws.getCell('A1'),'수당 등 수수료 집행 내역서',{size:16,bold:true,border:false});ws.getRow(1).height=34;
    ws.mergeCells('A2:I2');cellSet(ws.getCell('A2'),'사업명: 2026 유소년 스포츠 기반구축사업 (유형3·5 학교 강습·방과후 지도자 수당 · 1회 '+PAY_UNIT.toLocaleString()+'원)',{h:'left',border:false});
    ws.mergeCells('A3:I3');cellSet(ws.getCell('A3'),'집행 내용: '+subject,{h:'left',border:false});
    ws.mergeCells('A4:I4');cellSet(ws.getCell('A4'),'지급일: 2026.      .      .                                작성일: '+today,{h:'left',border:false});
    ['A','B','C','D','E','I'].forEach(function(col){ws.mergeCells(col+'5:'+col+'6')});ws.mergeCells('F5:H5');
    [['A5','순번'],['B5','이름'],['C5','주민번호\n(앞6자리)'],['D5','전화번호'],['E5','통장계좌'],['F5','수당 등 지급액'],['I5','서명'],['F6','지급액\n(A)'],['G6','원천징수액\n(B)'],['H6','차인지급액\n(A-B)']]
      .forEach(function(h){cellSet(ws.getCell(h[0]),h[1],{bold:true,fill:'FFEDEDED'})});
    ['A6','B6','C6','D6','E6','G5','H5','I6'].forEach(function(k){ws.getCell(k).border=bAll});
    ws.getRow(5).height=22;ws.getRow(6).height=30;
    var r0=7;
    P.forEach(function(p,i){var r=r0+i,row=ws.getRow(r);row.height=30;
      cellSet(row.getCell(1),i+1);cellSet(row.getCell(2),p.name);cellSet(row.getCell(3),p.id6);cellSet(row.getCell(4),telFmt(p.phone));
      cellSet(row.getCell(5),p.bank?(p.bank+' '+p.acct+(p.holder&&p.holder!==p.name?' (예금주 '+p.holder+')':'')):'',{h:'left'});
      cellSet(row.getCell(6),p.amt,{fmt:NUM,h:'right'});cellSet(row.getCell(7),p.tax,{fmt:NUM,h:'right'});
      cellSet(row.getCell(8),{formula:'F'+r+'-G'+r,result:p.amt-p.tax},{fmt:NUM,h:'right'});cellSet(row.getCell(9),'')});
    var rT=r0+P.length,rowT=ws.getRow(rT),rL=rT-1;rowT.height=26;ws.mergeCells('A'+rT+':E'+rT);cellSet(rowT.getCell(1),'합  계',{bold:true,fill:'FFEDEDED'});
    var sumA=P.reduce(function(n,p){return n+p.amt},0),sumB=P.reduce(function(n,p){return n+p.tax},0);
    cellSet(rowT.getCell(6),{formula:'SUM(F'+r0+':F'+rL+')',result:sumA},{fmt:NUM,h:'right',bold:true});cellSet(rowT.getCell(7),{formula:'SUM(G'+r0+':G'+rL+')',result:sumB},{fmt:NUM,h:'right',bold:true});
    cellSet(rowT.getCell(8),{formula:'SUM(H'+r0+':H'+rL+')',result:sumA-sumB},{fmt:NUM,h:'right',bold:true});cellSet(rowT.getCell(9),'');
    ['※ 예탁계좌에서 보조금 계좌로 통합 이체 후 다수의 대상자에게 지출된 건인 경우 계좌이체 확인증 필수 첨부',
     '※ 원천징수(기타소득): 필요경비 60% → 소득세 20% + 지방소득세 10% = 지급액의 8.8%. 한 달 합산 지급액 125,000원 이하는 0원(사업 지침 ② 수당 지급 공통 사항)',
     '※ 지급액 = 운영일지 회차(같은 회차 중복 제외, 프로그램당 '+PAY_CAP+'회까지) × '+PAY_UNIT.toLocaleString()+'원 — 산출은 「산출 내역」 시트, 회차별 수업일은 「강습 실시 내역」 시트']
      .forEach(function(t,i){var r=rT+1+i;ws.mergeCells('A'+r+':I'+r);cellSet(ws.getCell('A'+r),t,{h:'left',size:9,border:false,color:'FF444444'})});
    // ── ② 산출 내역 ──
    var w2=wb.addWorksheet('산출 내역',{pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0}});
    var H2=[['순번',6],['지도자',11],['시도',8],['학교',20],['유형',12],['기간',17],['요일·시간',16],['일지 회차',9],['지급 회차',9],['단가',10],['금액',13],['담당교사 확인',12],['위촉계약서',13],['비고',22]];
    w2.columns=H2.map(function(h){return {width:h[1]}});w2.mergeCells('A1:N1');cellSet(w2.getCell('A1'),'지도자 수당 산출 내역 — '+subject,{size:13,bold:true,border:false});w2.getRow(1).height=28;
    H2.forEach(function(h,i){cellSet(w2.getRow(2).getCell(i+1),h[0],{bold:true,fill:'FFEDEDED'})});w2.getRow(2).height=26;
    var r2=3,n2=0;P.forEach(function(p){p.apps.forEach(function(a){n2++;var row=w2.getRow(r2);
      var note=[a.selfTeach?'본인 지도(담당교사가 직접 지도)':'',a.done>PAY_CAP?'일지 '+a.done+'회 중 '+PAY_CAP+'회만 지급':'',a.conf<a.n?'담당교사 확인 '+(a.n-a.conf)+'회 없음':''].filter(Boolean).join(' · ');
      [n2,p.name,a.sido,a.school,a.type,periodOf(a),(a.dows.length?a.dows.join('·'):'')+(a.ctime?' '+a.ctime:''),a.done,a._pay,PAY_UNIT,{formula:'I'+r2+'*J'+r2,result:a._amt},a.conf+' / '+a.n,a._contract,note]
        .forEach(function(v,i){cellSet(row.getCell(i+1),v,{h:(i===3||i===13)?'left':(i>=9&&i<=10?'right':'center'),fmt:(i>=9&&i<=10)?NUM:undefined})});r2++})});
    w2.mergeCells('A'+r2+':H'+r2);cellSet(w2.getCell('A'+r2),'합  계',{bold:true,fill:'FFEDEDED'});cellSet(w2.getCell('I'+r2),{formula:'SUM(I3:I'+(r2-1)+')',result:totalSess},{bold:true});cellSet(w2.getCell('J'+r2),'');
    cellSet(w2.getCell('K'+r2),{formula:'SUM(K3:K'+(r2-1)+')',result:sumA},{bold:true,fmt:NUM,h:'right'});['L','M','N'].forEach(function(c){cellSet(w2.getCell(c+r2),'')});
    // ── ③ 강습 실시 내역 (운영일지) ──
    var w3=wb.addWorksheet('강습 실시 내역',{pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0},views:[{state:'frozen',ySplit:2}]});
    var H3=[['지도자',10],['학교',18],['유형',12],['회차',6],['수업일',12],['요일',6],['교시',12],['참여 인원',9],['수업 내용',46],['담당교사 확인',13],['확인 일시',17],['비고',14]];
    w3.columns=H3.map(function(h){return {width:h[1]}});w3.mergeCells('A1:L1');cellSet(w3.getCell('A1'),'강습 실시 내역 — 홈페이지 운영일지 ('+today+' 기준)',{size:13,bold:true,border:false});w3.getRow(1).height=28;
    H3.forEach(function(h,i){cellSet(w3.getRow(2).getCell(i+1),h[0],{bold:true,fill:'FFEDEDED'})});w3.getRow(2).height=24;
    var r3=3;P.forEach(function(p){p.apps.forEach(function(a){a._logs.forEach(function(l){var tc=l.teacherConfirm||null,row=w3.getRow(r3++);
      [p.name,a.school,a.type,+l.session||'',String(l.date).slice(0,10),payDow(l.date),l.classTime||'',+l.count||'',String(l.content||'').replace(/\s+/g,' ').slice(0,120),tc?(tc.name||tc.byName||'확인'):'미확인',tc?payTs(tc.at):'',tc&&tc.via==='self'?'본인 서명':'']
        .forEach(function(v,i){cellSet(row.getCell(i+1),v,{h:i===8?'left':'center',size:9,color:(i===9&&!tc)?'FFC41E2F':undefined})})})})});
    w3.pageSetup.printTitlesRow='2:2';
    // ── ④ 붙임 서류 점검 ──
    var w4=wb.addWorksheet('붙임 서류 점검',{pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0}});
    w4.columns=[5,34,44,40,10].map(function(w){return {width:w}});w4.mergeCells('A1:E1');cellSet(w4.getCell('A1'),'수당 이체 붙임 서류 점검 — '+subject,{size:13,bold:true,border:false});w4.getRow(1).height=28;
    ['번호','붙일 서류','근거','지금 상태 (홈페이지 기준)','확인'].forEach(function(h,i){cellSet(w4.getRow(2).getCell(i+1),h,{bold:true,fill:'FFEDEDED'})});
    var st=function(fn){return P.map(function(p){return p.name+': '+fn(p)}).join('\n')};
    var CK=[['내부결재문서 (수당 지급 결재)','정산 기준 운영비 공통 제출서류 1','직접 작성'],
      ['수당 등 수수료 집행 내역서 — 이 파일 첫 시트, 본인 서명','사업 지침 ② · 정산 기준 [별첨 1]',st(function(p){return (p.id6?'':'주민번호 앞자리 없음 · ')+(p.phone?'':'전화 없음 · ')+'서명 받기'})],
      ['본인 명의 통장 사본','사업 지침 ② 본인 명의 계좌이체 원칙',st(function(p){return !p.bank?'계좌 미등록':(p.holder&&p.holder!==p.name?'예금주가 다름('+p.holder+') — 본인 계좌로':'계좌 등록됨(예금주 '+(p.holder||'미기재')+')')})],
      ['원천징수영수증 또는 원천징수이행상황신고서','정산 기준 일반수용비 정산 시 첨부서류 3',st(function(p){return p.tax?'원천징수 '+p.tax.toLocaleString()+'원 — 지급 다음 달 10일까지 신고·납부':'원천징수 없음(125,000원 이하)'})],
      ['이력서 · 자격증 등 자격 확인 서류','정산 기준 일반수용비 첨부서류 3 · 사업 지침 ③ 강사 자격 요건',st(function(p){var a=[];a.push(p.lics.length?'연맹 자격 '+p.lics.map(function(l){return (l.type||'')+' '+(l.grade||'')}).join(', '):'연맹 자격 대장 없음');
        if(p.selfQual.length)a.push('본인 신고 '+p.selfQual.join(', '));a.push(p.qualDocs.length?'자격증 파일 '+p.qualDocs.length+'장':'자격증 파일 없음');
        a.push(p.u.degree?'학위 '+p.u.degree+(p.u.degreeDoc?(p.u.degreeApproved?'(증빙 확인)':'(증빙 확인 대기)'):'(증빙 없음)'):'학위 미등록');return a.join(' · ')})+'\n→ 「이력·자격」 시트. 없는 것은 본인에게 받아 붙이기'],
      ['강습 실시 확인 — 운영일지(이 파일 「강습 실시 내역」)','사업 지침 ⑦ 강습 실시·출결 현장점검',st(function(p){return p.apps.map(function(a){return a.school+' '+a.type+' 일지 '+a.done+'회 · 담당교사 확인 '+a.conf+'/'+a.n+(a.selfTeach?' · 본인 지도':'')}).join(' / ')})],
      ['강사 위촉계약서','연맹 자체 서류 (지침에 이름은 없음)',st(function(p){return p.apps.map(function(a){return a.school+' '+a.type+' '+a._contract}).join(' / ')})],
      ['계좌이체 확인증 (개인별)','정산 기준 [별첨 1] ※','이체 후 첨부']];
    CK.forEach(function(c,i){var row=w4.getRow(3+i);[i+1,c[0],c[1],c[2],'□'].forEach(function(v,j){cellSet(row.getCell(j+1),v,{h:(j===0||j===4)?'center':'left'})});row.height=Math.max(24,16*String(c[2]).split('\n').length+8)});
    var rN=3+CK.length+1;w4.mergeCells('A'+rN+':E'+rN);cellSet(w4.getCell('A'+rN),'※ 주관단체(연맹) 소속 임직원에게는 수당을 지급할 수 없습니다(사업 지침 ④ · 정산 기준 일반수용비 부당집행 사례 4). 지급 전에 대상자가 연맹 임직원이 아닌지 확인하세요.',{h:'left',size:9,border:false,color:'FFC41E2F'});
    // ── ⑤ 이력·자격 (홈페이지 회원정보 · 자격 대장 · 활동 이력) ──
    var w5=wb.addWorksheet('이력·자격',{pageSetup:{paperSize:9,orientation:'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:0.5,right:0.5,top:0.6,bottom:0.6,header:0.2,footer:0.2}}});
    w5.columns=[14,20,18,14,14,12].map(function(w){return {width:w}});
    var r5=1,NONE='등록된 내용 없음',td=new Date().toISOString().slice(0,10);
    var lab=function(r,c,t){cellSet(w5.getRow(r).getCell(c),t,{bold:true,fill:'FFEDEDED'})};
    var val=function(r,c1,c2,v,o){if(c2>c1)w5.mergeCells(r,c1,r,c2);cellSet(w5.getRow(r).getCell(c1),v,Object.assign({h:'left'},o||{}));for(var c=c1+1;c<=c2;c++)w5.getRow(r).getCell(c).border=bAll};
    var link=function(text,url){return {text:text,hyperlink:url}};
    P.forEach(function(p,pi){var u=p.u||{};
      if(pi)r5+=2;
      w5.mergeCells(r5,1,r5,6);cellSet(w5.getRow(r5).getCell(1),'지도자 이력 · 자격 확인서',{size:15,bold:true,border:false});w5.getRow(r5).height=30;r5++;
      w5.mergeCells(r5,1,r5,6);cellSet(w5.getRow(r5).getCell(1),'홈페이지 회원정보 · 자격 대장 · 활동 이력 ('+today+' 기준) — 빈 곳은 등록된 자료가 없는 것입니다',{h:'right',size:9,border:false,color:'FF555555'});r5++;
      lab(r5,1,'성명');val(r5,2,3,p.name);lab(r5,4,'활동 지역');val(r5,5,6,[u.region,u.baseCity].filter(Boolean).join(' · '));r5++;
      lab(r5,1,'소속');val(r5,2,3,[].concat(u.affiliation||[],u.org||[],u.orgTitle||[]).filter(Boolean).join(' · '));lab(r5,4,'2026 연수');val(r5,5,6,u.edu2026?'이수':'이수 기록 없음');r5++;
      lab(r5,1,'학력(학위)');val(r5,2,3,u.degree?(u.degree+(u.degreeDoc?(u.degreeApproved?' — 사무국 확인 완료':' — 사무국 확인 대기'):' — 증빙 없음')):NONE);lab(r5,4,'학위 증빙');
      val(r5,5,6,u.degreeDoc?link('첨부 파일 열기',u.degreeDoc):'없음',u.degreeDoc?{h:'left',color:'FF153A77'}:{h:'left'});r5++;
      r5++;w5.mergeCells(r5,1,r5,6);cellSet(w5.getRow(r5).getCell(1),'■ 자격',{h:'left',bold:true,border:false});r5++;
      ['구분','종류 · 급수','자격번호','발급일','유효기간','상태'].forEach(function(h,i){lab(r5,i+1,h)});r5++;
      if(p.lics.length)p.lics.forEach(function(l){var ex=(l.status==='만료')||(l.expireAt?String(l.expireAt)<td:false);
        ['연맹 자격 대장',(l.type||'')+' '+(l.grade||''),l.no,String(l.issuedAt||'').slice(0,10),l.expireAt?'~ '+l.expireAt:'',ex?'만료':(l.status||'유효')].forEach(function(v,i){cellSet(w5.getRow(r5).getCell(i+1),v,{color:(i===5&&ex)?'FFC41E2F':undefined})});r5++});
      else{cellSet(w5.getRow(r5).getCell(1),'연맹 자격 대장');val(r5,2,6,'회원에 연결된 연맹 자격 없음');r5++}
      cellSet(w5.getRow(r5).getCell(1),'본인 신고');val(r5,2,6,p.selfQual.length?p.selfQual.join(' · ')+' (본인 신고 · 자격증으로 확인 필요)':NONE);r5++;
      cellSet(w5.getRow(r5).getCell(1),'자격증 파일');
      if(p.qualDocs.length){p.qualDocs.slice(0,5).forEach(function(x,i){cellSet(w5.getRow(r5).getCell(2+i),link('자격증 '+(i+1)+' 열기',x),{color:'FF153A77'})});for(var c=2+Math.min(5,p.qualDocs.length);c<=6;c++)cellSet(w5.getRow(r5).getCell(c),'')}
      else val(r5,2,6,'홈페이지에 올린 자격증 파일 없음 — 본인에게 사본 받기');r5++;
      r5++;w5.mergeCells(r5,1,r5,6);cellSet(w5.getRow(r5).getCell(1),'■ 경력',{h:'left',bold:true,border:false});r5++;
      lab(r5,1,'본인 기재');val(r5,2,6,String(u.career||'').trim()||NONE);w5.getRow(r5).height=Math.max(22,15*Math.ceil(String(u.career||'').length/40)+8);r5++;
      lab(r5,1,'2026 강습');val(r5,2,6,p.apps.map(function(a){return a.school+' '+a.type+' '+a.done+'회 ('+periodOf(a)+')'}).join('\n'));w5.getRow(r5).height=Math.max(22,16*p.apps.length+8);r5++;
      ['일자','대회 · 행사','','역할','구분','비고'].forEach(function(h,i){lab(r5,i+1,h)});w5.mergeCells(r5,2,r5,3);r5++;
      if(p.career.length){p.career.slice(0,20).forEach(function(k){w5.mergeCells(r5,2,r5,3);
        [String(k.date||'').slice(0,10),k.competitionName||'','',k.role||'',k.group||k.kind||'',k.result||k.team||''].forEach(function(v,i){if(i!==2)cellSet(w5.getRow(r5).getCell(i+1),v,{h:i===1?'left':'center',size:9})});w5.getRow(r5).getCell(3).border=bAll;r5++});
        if(p.career.length>20){val(r5,1,6,'… 활동 이력 모두 '+p.career.length+'건 중 최근 20건만 표시',{h:'left',size:9});r5++}}
      else{val(r5,1,6,'홈페이지 활동 이력(대회 심판·운영·입상) '+NONE,{h:'center'});r5++}
    });
    await xlSave(wb,'지도자수당_집행내역서_'+(P.length===1?P[0].name+'_':'')+ymd()+'.xlsx');
    // 3) 화면 안내
    var warn=[];P.forEach(function(p){if(!p.bank)warn.push(p.name+' 계좌 미등록');else if(p.holder&&p.holder!==p.name)warn.push(p.name+' 예금주 다름');if(!p.id6)warn.push(p.name+' 주민번호 앞자리 없음');
      p.apps.forEach(function(a){if(a.conf<a.n)warn.push(a.school+' '+a.type+' 담당교사 확인 '+(a.n-a.conf)+'회 없음');if(a._contract!=='서명 완료')warn.push(a.school+' '+a.type+' 위촉계약서 '+a._contract)})});
    payMsg('수당 서류: '+P.length+'명 · '+totalSess+'회 · '+sumA.toLocaleString()+'원 (원천징수 '+sumB.toLocaleString()+'원)'+(warn.length?' — 확인: '+warn.join(', '):''));
  }catch(e){payMsg('');alert('수당 서류를 만들지 못했습니다: '+(e.code||e.message||e))}
}
