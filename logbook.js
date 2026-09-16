// logbook.js v20260916a · 학교강습 운영일지 보고서(인쇄 → PDF로 저장) + 일지 삭제·복원(기록 보존)
//   관리자 강습신청관리 › 📒 일지 패널, 강사 마이페이지 › 운영일지 에서 학교 단위로 엽니다.
//   홈페이지에 입력된 일지(sessionLogs) 항목만 씁니다: 회차·수업일·인원(남/여)·수업 내용·특이사항·안전 지도 점검 4항목·
//   활동 사진(최대 3장)·담당교사 확인(성명·시각·전자서명)·정정 이력 + 강습 신청(schoolApplications) 기본 정보.
//   구성: 표지(요약 지표·회차별 참여 그래프·24회차 진행) → 회차별 운영 현황표 → 회차별 활동 기록(한 쪽 2회차, 사진 포함) → 운영 결과 요약·확인.
//   사용: var w=KFDF_LOGBOOK.prep();  (클릭 직후 동기 호출 — 팝업 차단 방지)  → 자료를 모은 뒤 KFDF_LOGBOOK.render(w,{app,appId,logs,instructor,printedBy,printedRole})
(function(){
  'use strict';
  var TOTAL=24;
  var SAFE=['level','fit','time','notice'];
  var SAFE_LB={level:'수준·속도에 맞춘 안전 지도',fit:'수업 장소·방식 적합(장소 안전)',time:'정해진 수업 시간 준수',notice:'국민체육진흥공단 지원 사업 안내'};
  var WD='일월화수목금토';
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function src(u){u=String(u||'');return /^(https:\/\/|data:image\/)/i.test(u)?esc(u):''}
  function abs(p){try{return new URL(p,location.href).href}catch(e){return p}}
  function pd(s){var m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?new Date(+m[1],+m[2]-1,+m[3]):null}
  function fd(s,wd){var d=pd(s);if(!d)return esc(s||'-');return d.getFullYear()+'. '+(d.getMonth()+1)+'. '+d.getDate()+'.'+(wd?' ('+WD[d.getDay()]+')':'')}
  function fds(s){var d=pd(s);return d?(d.getMonth()+1)+'. '+d.getDate()+'. <small>('+WD[d.getDay()]+')</small>':'-'}
  function p2(n){return String(n).padStart(2,'0')}
  function ts(x){
    if(!x)return '';
    try{var d=x.toDate?x.toDate():new Date(x);if(isNaN(d))return '';
      return d.getFullYear()+'. '+(d.getMonth()+1)+'. '+d.getDate()+'. '+p2(d.getHours())+':'+p2(d.getMinutes())}catch(e){return ''}
  }
  function tms(x){try{var d=x&&x.toDate?x.toDate():new Date(x);return isNaN(d)?0:d.getTime()}catch(e){return 0}}
  function num(v){return v==null||v===''||isNaN(+v)?null:+v}
  function edits(l){return ((l&&l.adminEdit)?[l.adminEdit]:[]).concat((l&&l.editHistory)||[])}
  function reconfirm(l){return !l.teacherConfirm&&edits(l).some(function(x){return x&&x.voidedConfirm})}

  function prep(){
    var w=window.open('','_blank');
    if(!w){alert('팝업이 차단되어 운영일지 창을 열 수 없습니다.\n주소창 오른쪽의 팝업 차단 표시에서 이 사이트를 허용한 뒤 다시 눌러 주세요.');return null}
    w.document.write('<!doctype html><meta charset="utf-8"><title>운영일지 준비 중…</title><body style="margin:0;font-family:Pretendard,\'Malgun Gothic\',sans-serif;display:flex;align-items:center;justify-content:center;height:90vh;color:#555;font-size:15px">📒 운영일지를 만드는 중입니다…</body>');
    return w;
  }
  function fail(w,e){try{w.document.body.innerHTML='<div style="padding:40px;font-family:sans-serif;color:#C41E2F;font-size:15px">운영일지를 만들지 못했습니다: '+esc(e&&(e.message||e))+'</div>'}catch(_){}}

  var CSS=''
  +'@page{size:A4;margin:0}'
  +'*{box-sizing:border-box}'
  +'html,body{margin:0;background:#e6e9ef;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
  +'body{font-family:Pretendard,"Noto Sans KR","Malgun Gothic",sans-serif;color:#16181d;font-size:9.5pt;line-height:1.45}'
  +'.bar{position:sticky;top:0;z-index:10;background:#16181d;color:#fff;padding:10px 18px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;font-size:13px}'
  +'.bar button{background:#C41E2F;color:#fff;border:0;border-radius:9px;padding:9px 18px;font:inherit;font-weight:800;cursor:pointer}'
  +'.bar .tip{color:#b9bfca;font-size:12px}.bar #st{color:#7ee0c3;font-weight:700}'
  +'.page{width:210mm;height:297mm;margin:16px auto;background:#fff;position:relative;overflow:hidden;padding:13mm 15mm 17mm;box-shadow:0 6px 26px rgba(20,24,33,.14);break-after:page;page-break-after:always}'
  +'.page.flow{height:auto;min-height:297mm;overflow:visible}.page:last-child{break-after:auto;page-break-after:auto}'
  +'@media print{html,body{background:#fff}.bar{display:none}.page{margin:0;box-shadow:none}}'
  +'@media screen and (max-width:840px){.page{zoom:.46}}'
  // 쪽 머리·바닥
  +'.ph-h{display:flex;align-items:center;gap:10px;border-bottom:1.6pt solid #16181d;padding-bottom:2.4mm;margin-bottom:5mm}'
  +'.ph-h img{height:6.2mm}.ph-h .t{margin-left:auto;font-size:8.5pt;font-weight:700;color:#5b6270;text-align:right}'
  +'.pf{position:absolute;left:15mm;right:15mm;bottom:8mm;display:flex;justify-content:space-between;font-size:7.5pt;color:#8a919d;border-top:.6pt solid #d8dce3;padding-top:2mm}'
  +'.pf b{color:#16181d;font-weight:800}'
  +'h2.sec{font-size:15pt;margin:0 0 1.2mm;letter-spacing:-.3px}h2.sec small{font-size:9pt;color:#8a919d;font-weight:600;margin-left:6px}'
  +'.lede{font-size:8.8pt;color:#5b6270;margin:0 0 4.5mm}'
  // 표지
  +'.cv-top{display:flex;align-items:center;justify-content:space-between}.cv-top img{height:11mm}'
  +'.cv-prog{text-align:right;font-size:9pt;font-weight:800;color:#16181d}.cv-prog small{display:block;font-size:7.6pt;font-weight:600;color:#8a919d;margin-top:.6mm}'
  +'.stripe{height:1.6mm;margin:4mm 0 6.5mm;background:linear-gradient(90deg,#C41E2F 0 38%,#16181d 38% 62%,#1F4E9C 62% 100%)}'
  +'.eyebrow{font-size:8.5pt;font-weight:800;letter-spacing:3.2px;color:#C41E2F}'
  +'.cv-h1{font-size:30pt;font-weight:900;letter-spacing:-1px;margin:1.5mm 0 0}'
  +'.cv-school{font-size:21pt;font-weight:800;margin:5mm 0 2.5mm;letter-spacing:-.5px}'
  +'.chips{display:flex;gap:2mm;flex-wrap:wrap}.chip{font-size:8.3pt;font-weight:800;padding:1mm 3.2mm;border-radius:99px;background:#eef1f5;color:#3a404b}'
  +'.chip.k1{background:#8c1622;color:#fff}.chip.k2{background:#0f766e;color:#fff}'
  +'.info{display:grid;grid-template-columns:repeat(4,1fr);border:.8pt solid #d8dce3;border-radius:3mm;margin-top:6mm;overflow:hidden}'
  +'.info div{padding:3mm 3.6mm;border-right:.6pt solid #e5e8ee;border-bottom:.6pt solid #e5e8ee}.info div:nth-child(4n){border-right:0}.info div:nth-last-child(-n+4){border-bottom:0}'
  +'.info i{display:block;font-style:normal;font-size:7.3pt;font-weight:700;color:#8a919d;margin-bottom:.6mm}.info b{font-size:10pt;font-weight:800;word-break:keep-all}'
  +'.kpis{display:grid;grid-template-columns:44mm 1fr 1fr 1fr;grid-template-rows:1fr 1fr;gap:3mm;margin-top:5mm}'
  +'.ring{grid-row:1/3;border-radius:3mm;background:#16181d;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3mm}'
  +'.ring svg{width:31mm;height:31mm}.ring .lb{font-size:8pt;font-weight:700;color:#b9bfca;margin-top:1.5mm}'
  +'.kpi{border-radius:3mm;background:#f5f6f9;padding:3.2mm 3.8mm;position:relative;overflow:hidden}'
  +'.kpi:before{content:"";position:absolute;left:0;top:0;bottom:0;width:1.2mm;background:var(--c)}'
  +'.kpi i{display:block;font-style:normal;font-size:7.6pt;font-weight:700;color:#6b7280}.kpi b{font-size:17pt;font-weight:900;letter-spacing:-.5px}.kpi b small{font-size:8.5pt;font-weight:700;color:#6b7280;margin-left:1mm}'
  +'.kpi em{display:block;font-style:normal;font-size:7.4pt;color:#8a919d;margin-top:.3mm}'
  +'.card{border:.8pt solid #d8dce3;border-radius:3mm;padding:3.2mm 4mm;margin-top:4mm}'
  +'.card-h{display:flex;justify-content:space-between;align-items:baseline;font-size:9.5pt;font-weight:800;margin-bottom:2mm}.card-h span{font-size:7.6pt;font-weight:600;color:#8a919d}'
  +'.lg{display:inline-flex;align-items:center;gap:1mm;margin-left:3mm}.lg:before{content:"";width:2.4mm;height:2.4mm;border-radius:.6mm;background:var(--c)}'
  +'.track{display:grid;grid-template-columns:repeat(12,1fr);gap:1.6mm}'
  +'.track div{height:8.4mm;border-radius:1.6mm;display:flex;align-items:center;justify-content:center;font-size:8.2pt;font-weight:800;background:#f0f2f5;color:#a3a9b4;border:.6pt dashed #cfd4dc}'
  +'.track .ok{background:#0f766e;color:#fff;border:0}.track .wt{background:#fff4d6;color:#8a5a00;border:.8pt solid #e6b422}.track .rc{background:#fde8ea;color:#C41E2F;border:.8pt solid #C41E2F}'
  +'.cv-mark{position:absolute;right:-26mm;bottom:-24mm;width:118mm;opacity:.05;pointer-events:none}'
  // 현황표
  +'.months{display:flex;gap:2mm;flex-wrap:wrap;margin-bottom:4mm}'
  +'.months div{border:.8pt solid #d8dce3;border-radius:2mm;padding:1.6mm 3mm;font-size:8pt}.months b{font-size:9.5pt;font-weight:900;margin-right:1.5mm}'
  +'table.tb{width:100%;border-collapse:collapse;table-layout:fixed;font-size:7.9pt}'
  +'.tb th{background:#16181d;color:#fff;font-weight:800;padding:2mm 1.6mm;font-size:7.8pt;text-align:center}'
  +'.tb td{border-bottom:.6pt solid #e5e8ee;padding:.7mm 1.4mm;vertical-align:middle;height:7.8mm;line-height:1.22}'
  +'.tb tr:nth-child(even) td{background:#fafbfc}'
  +'.tb .c{text-align:center}.tb .sn{font-weight:900;font-size:9.5pt}'
  +'.tb .ct{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.25}'
  +'.tb .mf{display:block;font-size:6.8pt;color:#8a919d;line-height:1.15;white-space:nowrap}.tb td.c{white-space:nowrap}.tb td.c .sg{white-space:normal}'
  +'.tb .sg{display:flex;align-items:center;gap:1.4mm;justify-content:center}.tb .sg img{height:6mm;max-width:14mm;object-fit:contain}'
  +'.ok-t{color:#0f766e;font-weight:800}.no-t{color:#C41E2F;font-weight:800}.mu{color:#a3a9b4}'
  // 회차 카드
  +'.sc{height:115mm;border:.8pt solid #d8dce3;border-radius:3mm;display:flex;flex-direction:column;overflow:hidden;margin-bottom:5mm}.sc:last-child{margin-bottom:0}'
  +'.sc header{display:flex;align-items:center;gap:3.4mm;padding:2.6mm 4mm;background:#f5f6f9;border-bottom:.6pt solid #e5e8ee}'
  +'.sc .no{background:#C41E2F;color:#fff;border-radius:2mm;padding:1mm 2.6mm;text-align:center;line-height:1.05}.sc .no b{display:block;font-size:14pt;font-weight:900}.sc .no i{font-style:normal;font-size:6.6pt;font-weight:800}'
  +'.sc .dt b{display:block;font-size:11.5pt;font-weight:900}.sc .dt span{font-size:7.8pt;color:#6b7280;font-weight:600}'
  +'.pill{margin-left:auto;font-size:8pt;font-weight:800;padding:1.2mm 3.2mm;border-radius:99px;white-space:nowrap}.pill.ok{background:#e3f4ef;color:#0f766e}.pill.no{background:#f0f2f5;color:#6b7280}.pill.warn{background:#fde8ea;color:#C41E2F}'
  +'.sc .meta{display:grid;grid-template-columns:30mm 1fr;gap:4mm;padding:3mm 4mm 2mm}'
  +'.sc .meta i{display:block;font-style:normal;font-size:7.2pt;font-weight:800;color:#8a919d;margin-bottom:.6mm}'
  +'.sc .pp b{font-size:15pt;font-weight:900}.sc .pp small{display:block;font-size:7.8pt;color:#5b6270;font-weight:700}'
  +'.sc .ct p{margin:0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.sc .ct p.note{margin-top:1mm;color:#C41E2F;font-size:8pt;-webkit-line-clamp:1}'
  +'.sc .ph{flex:1;min-height:0;display:grid;gap:2mm;padding:0 4mm}'
  +'.sc .ph1{grid-template-columns:2fr 1fr}.sc .ph2{grid-template-columns:1fr 1fr}.sc .ph3{grid-template-columns:1fr 1fr 1fr}'
  +'.sc figure{margin:0;border-radius:2mm;overflow:hidden;background:#eef1f5;min-height:0}.sc figure img{width:100%;height:100%;object-fit:cover;display:block}'
  +'.sc figure.broken{display:flex;align-items:center;justify-content:center}.sc figure.broken:after{content:"사진을 불러오지 못했습니다";font-size:8pt;color:#8a919d}.sc figure.broken img{display:none}'
  +'.sc .ph1 .aside{display:flex;flex-direction:column;justify-content:center;gap:1.4mm;font-size:8pt;color:#6b7280;padding:2mm}'
  +'.noph{grid-column:1/-1;border:.8pt dashed #cfd4dc;border-radius:2mm;display:flex;align-items:center;justify-content:center;color:#a3a9b4;font-size:8.5pt;font-weight:700}'
  +'.sc footer{display:grid;grid-template-columns:1fr 50mm;gap:3mm;padding:2.6mm 4mm;margin-top:2.4mm;border-top:.6pt solid #e5e8ee;align-items:center}'
  +'.chk{display:grid;grid-template-columns:1fr 1fr;gap:.8mm 3mm;font-size:7.5pt;font-weight:700}.chk .y{color:#0f766e}.chk .n{color:#a3a9b4}'
  +'.tc{display:flex;align-items:center;gap:2mm;justify-content:flex-end;text-align:right}.tc i{display:block;font-style:normal;font-size:7pt;font-weight:800;color:#8a919d}.tc b{font-size:9.5pt;font-weight:900}.tc small{display:block;font-size:7pt;color:#8a919d}'
  +'.tc img{height:10mm;max-width:22mm;object-fit:contain;border-bottom:.6pt solid #cfd4dc}'
  +'.eh{font-size:7.3pt;color:#b8860b;font-weight:700;padding:0 4mm 2mm;margin-top:-1mm}'
  // 결과·확인
  +'.two{display:grid;grid-template-columns:1fr 1fr;gap:5mm}'
  +'.sbar{margin:1.8mm 0}.sbar div{display:flex;justify-content:space-between;font-size:8.2pt;font-weight:700}.sbar u{display:block;height:2.2mm;border-radius:99px;background:#eef1f5;margin-top:.8mm;overflow:hidden;text-decoration:none}.sbar u s{display:block;height:100%;background:#0f766e;text-decoration:none}'
  +'.stmt{margin-top:7mm;border:1.2pt solid #16181d;border-radius:3mm;padding:7mm 8mm;text-align:center}'
  +'.stmt p{font-size:11pt;font-weight:700;margin:0;line-height:1.75;word-break:keep-all}.stmt .dd{font-size:10.5pt;font-weight:800;margin-top:5mm}'
  +'.signs{display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-top:6mm}'
  +'.sb{border:.8pt solid #d8dce3;border-radius:3mm;padding:4mm 5mm;display:flex;align-items:center;gap:4mm;min-height:27mm}'
  +'.sb i{display:block;font-style:normal;font-size:7.6pt;font-weight:800;color:#8a919d}.sb b{font-size:13pt;font-weight:900}.sb small{display:block;font-size:7.2pt;color:#8a919d;margin-top:.8mm;line-height:1.4}'
  +'.sb .sg{margin-left:auto;width:34mm;height:17mm;display:flex;align-items:center;justify-content:center;border-bottom:.8pt solid #9aa1ad;position:relative}'
  +'.sb .sg img{max-width:100%;max-height:100%;object-fit:contain}.sb .sg:after{content:"(서명)";position:absolute;right:0;bottom:-4mm;font-size:7pt;color:#a3a9b4}'
  +'.issuer{margin-top:9mm;text-align:center}.issuer img{height:11mm}.issuer div{font-size:8pt;color:#6b7280;margin-top:2mm}'
  +'.fine{margin-top:6mm;font-size:7.4pt;color:#8a919d;line-height:1.6}';

  function chart(bySess,maxP){
    var W=720,H=176,x0=34,y0=148,gh=124,bw=18,step=(W-x0-8)/TOTAL,s='';
    var top=Math.max(10,Math.ceil(maxP/5)*5);
    for(var g=0;g<=2;g++){var yy=y0-gh*g/2;s+='<line x1="'+x0+'" x2="'+(W-6)+'" y1="'+yy+'" y2="'+yy+'" stroke="#e5e8ee" stroke-width="1"/><text x="'+(x0-6)+'" y="'+(yy+3.5)+'" font-size="10" text-anchor="end" fill="#8a919d">'+Math.round(top*g/2)+'</text>'}
    for(var i=1;i<=TOTAL;i++){
      var cx=x0+step*(i-0.5),l=bySess[i],bx=cx-bw/2;
      if(l){
        var c=+l.count||0,m=num(l.male),f=num(l.female),h=gh*c/top;
        if(m!=null&&f!=null&&m+f>0){var hm=gh*m/top,hf=gh*f/top;
          s+='<rect x="'+bx+'" y="'+(y0-hm)+'" width="'+bw+'" height="'+hm+'" rx="2" fill="#1F4E9C"/><rect x="'+bx+'" y="'+(y0-hm-hf)+'" width="'+bw+'" height="'+hf+'" rx="2" fill="#C41E2F"/>';h=hm+hf}
        else s+='<rect x="'+bx+'" y="'+(y0-h)+'" width="'+bw+'" height="'+h+'" rx="2" fill="#0f766e"/>';
        s+='<text x="'+cx+'" y="'+(y0-h-4)+'" font-size="10" font-weight="700" text-anchor="middle" fill="#16181d">'+c+'</text>';
      }else s+='<rect x="'+bx+'" y="'+(y0-6)+'" width="'+bw+'" height="6" rx="2" fill="#eef1f5"/>';
      s+='<text x="'+cx+'" y="'+(y0+15)+'" font-size="10" text-anchor="middle" fill="'+(l?'#16181d':'#b3b9c3')+'" font-weight="'+(l?700:400)+'">'+i+'</text>';
    }
    return '<svg viewBox="0 0 '+W+' '+(H-6)+'" width="100%" xmlns="http://www.w3.org/2000/svg" style="display:block">'+s+'</svg>';
  }
  function ring(n){
    var r=40,C=2*Math.PI*r,pct=Math.min(1,n/TOTAL);
    return '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="'+r+'" fill="none" stroke="#343944" stroke-width="10"/>'
      +'<circle cx="50" cy="50" r="'+r+'" fill="none" stroke="#e6b422" stroke-width="10" stroke-linecap="round" stroke-dasharray="'+(C*pct).toFixed(1)+' '+C.toFixed(1)+'" transform="rotate(-90 50 50)"/>'
      +'<text x="50" y="50" text-anchor="middle" font-size="24" font-weight="900" fill="#fff">'+n+'</text><text x="50" y="66" text-anchor="middle" font-size="10" font-weight="700" fill="#b9bfca">/ '+TOTAL+'회차</text></svg>';
  }

  function render(w,o){
    if(!w||w.closed)return;
    var A=o.app||{},logs=(o.logs||[]).slice().sort(function(a,b){return (a.session||0)-(b.session||0)||String(a.date||'').localeCompare(String(b.date||''))});
    var L0=logs[0]||{};
    var school=A.school||L0.school||'',type=A.type||L0.type||'';
    var isAfter=/방과후|늘봄/.test(type);
    var ins=o.instructor||{},insName=ins.name||L0.name||'';
    var WM=abs('kfdf_wordmark.png'),MK=abs('kfdf_logo.png');
    var dates=logs.map(function(l){return l.date}).filter(Boolean).sort();
    var first=dates[0]||'',last=dates[dates.length-1]||'';
    var bySess={};logs.forEach(function(l){if(l.session&&l.session<=TOTAL)bySess[l.session]=l});
    var nSess=Object.keys(bySess).length;
    var totP=0,mS=0,fS=0,mfN=0,maxP=0;
    logs.forEach(function(l){var c=+l.count||0;totP+=c;if(c>maxP)maxP=c;var m=num(l.male),f=num(l.female);if(m!=null&&f!=null){mS+=m;fS+=f;mfN++}});
    var avgP=logs.length?(totP/logs.length):0;
    var cfm=logs.filter(function(l){return l.teacherConfirm}).length;
    var phN=logs.filter(function(l){return (l.photos||[]).length}).length,phT=logs.reduce(function(a,l){return a+Math.min(3,(l.photos||[]).length)},0);
    var safeN=logs.filter(function(l){return l.check&&SAFE.every(function(k){return l.check[k]})}).length;
    var now=new Date(),today=now.getFullYear()+'. '+(now.getMonth()+1)+'. '+now.getDate()+'.';
    var docNo='KFDF-SL-'+now.getFullYear()+p2(now.getMonth()+1)+p2(now.getDate())+'-'+String(o.appId||'').replace(/[^A-Za-z0-9]/g,'').slice(0,6).toUpperCase();
    var lastTC=null;logs.forEach(function(l){var t=l.teacherConfirm;if(t&&(!lastTC||tms(t.at)>=tms(lastTC.at)))lastTC=t});
    var teacherName=(lastTC&&lastTC.name)||A.teacher||'';
    var region=[A.region,A.city].filter(Boolean).join(' · ');
    var studs=(A.studentsM!=null||A.studentsF!=null)?('남 '+(A.studentsM||0)+' · 여 '+(A.studentsF||0)):(A.students||'');

    var pages=[];
    // ── 1. 표지 ──
    var trk='';for(var i=1;i<=TOTAL;i++){var tl=bySess[i];trk+='<div class="'+(tl?(tl.teacherConfirm?'ok':(reconfirm(tl)?'rc':'wt')):'')+'">'+i+'</div>'}
    pages.push({cover:true,html:''
      +'<div class="cv-top"><img src="'+esc(WM)+'" alt="대한민국플라잉디스크연맹"><div class="cv-prog">2026 유소년 스포츠 기반구축사업<small>문화체육관광부 · 국민체육진흥공단 · 대한체육회</small></div></div>'
      +'<div class="stripe"></div>'
      +'<div class="eyebrow">SCHOOL PROGRAM LOGBOOK</div>'
      +'<div class="cv-h1">학교강습 운영일지</div>'
      +'<div class="cv-school">'+esc(school)+'</div>'
      +'<div class="chips"><span class="chip '+(isAfter?'k2':'k1')+'">'+(isAfter?'방과후 · 늘봄':'학교체육')+'</span>'+(type&&type!=='학교체육'&&!isAfter?'<span class="chip">'+esc(type)+'</span>':'')+(region?'<span class="chip">📍 '+esc(region)+'</span>':'')+(A.code?'<span class="chip">'+esc(A.code)+'</span>':'')+(A.support==='용품만'?'<span class="chip">용품 지원</span>':'')+'</div>'
      +'<div class="info">'
        +'<div><i>담당 강사</i><b>'+esc(insName||'-')+'</b></div>'
        +'<div><i>담당교사</i><b>'+esc(teacherName||'-')+'</b></div>'
        +'<div><i>운영 기간</i><b>'+(first?fd(first)+' ~ '+fd(last).replace(/^\d{4}\. /,''):'-')+'</b></div>'
        +'<div><i>대상 학생</i><b>'+esc(studs||'-')+(A.grade?' <small style="font-weight:600;color:#6b7280">'+esc(A.grade)+'</small>':'')+'</b></div>'
        +'<div><i>운영 요일·시간(신청)</i><b>'+esc(A.d1||'-')+'</b></div>'
        +'<div><i>제출 회차</i><b>'+logs.length+'건</b></div>'
        +'<div><i>문서번호</i><b style="font-size:8.6pt">'+esc(docNo)+'</b></div>'
        +'<div><i>출력일</i><b>'+today+'</b></div>'
      +'</div>'
      +'<div class="kpis">'
        +'<div class="ring">'+ring(nSess)+'<div class="lb">운영 진행률 '+Math.round(nSess/TOTAL*100)+'%</div></div>'
        +'<div class="kpi" style="--c:#C41E2F"><i>누적 참여 연인원</i><b>'+totP.toLocaleString()+'<small>명</small></b><em>'+(mfN?'남 '+mS+' · 여 '+fS+(mfN<logs.length?' ('+mfN+'회차 기준)':''):'남녀 구분 미입력')+'</em></div>'
        +'<div class="kpi" style="--c:#1F4E9C"><i>회차 평균 참여</i><b>'+(Math.round(avgP*10)/10)+'<small>명</small></b><em>최대 '+maxP+'명</em></div>'
        +'<div class="kpi" style="--c:#0f766e"><i>담당교사 확인</i><b>'+cfm+'<small>/ '+logs.length+'회차</small></b><em>'+(logs.length?Math.round(cfm/logs.length*100):0)+'% 전자서명 확인</em></div>'
        +'<div class="kpi" style="--c:#b8860b"><i>활동 사진 기록</i><b>'+phN+'<small>회차</small></b><em>사진 '+phT+'장</em></div>'
        +'<div class="kpi" style="--c:#7c3aed"><i>안전 지도 점검</i><b>'+safeN+'<small>/ '+logs.length+'회차</small></b><em>4개 항목 모두 이행</em></div>'
        +'<div class="kpi" style="--c:#16181d"><i>운영 개월</i><b>'+Object.keys(logs.reduce(function(a,l){if(l.date)a[String(l.date).slice(0,7)]=1;return a},{})).length+'<small>개월</small></b><em>'+(first?fd(first).slice(0,-1)+'부터':'-')+'</em></div>'
      +'</div>'
      +'<div class="card"><div class="card-h">회차별 참여 인원<span>'+(mfN?'<span class="lg" style="--c:#1F4E9C">남</span><span class="lg" style="--c:#C41E2F">여</span>':'')+'<span class="lg" style="--c:#0f766e">합계(남녀 미구분)</span></span></div>'+chart(bySess,maxP)+'</div>'
      +'<div class="card"><div class="card-h">24회차 진행 현황<span><span class="lg" style="--c:#0f766e">교사확인 완료</span><span class="lg" style="--c:#e6b422">제출 · 확인 전</span><span class="lg" style="--c:#C41E2F">정정 후 재확인</span><span class="lg" style="--c:#dfe3e9">미제출</span></span></div><div class="track">'+trk+'</div></div>'
      +'<img class="cv-mark" src="'+esc(MK)+'" alt="">'});

    // ── 2. 회차별 운영 현황표 (24행씩) ──
    var months={};logs.forEach(function(l){var k=String(l.date||'').slice(0,7);if(!k)return;var mo=months[k]=months[k]||{n:0,p:0,c:0};mo.n++;mo.p+=+l.count||0;if(l.teacherConfirm)mo.c++});
    var mk=Object.keys(months).sort();
    var mchips='<div class="months">'+mk.map(function(k){var mo=months[k];return '<div><b>'+(+k.slice(5))+'월</b>'+mo.n+'회차 · 연 '+mo.p+'명 · 확인 '+mo.c+'</div>'}).join('')+'</div>';
    for(var t=0;t<Math.max(1,logs.length);t+=24){
      var rows=logs.slice(t,t+24).map(function(l){
        var m=num(l.male),f=num(l.female),tc=l.teacherConfirm,ok=l.check&&SAFE.every(function(k){return l.check[k]});
        var sc=l.check?SAFE.filter(function(k){return l.check[k]}).length:0;
        return '<tr><td class="c sn">'+esc(l.session)+'</td><td class="c">'+fds(l.date)+'</td>'
          +'<td class="c"><b>'+esc(l.count||'-')+'</b>'+(m!=null||f!=null?'<span class="mf">남 '+(m==null?'-':m)+' · 여 '+(f==null?'-':f)+'</span>':'')+'</td>'
          +'<td><span class="ct">'+esc(l.content||'')+(l.note?' <b style="color:#C41E2F">· '+esc(l.note)+'</b>':'')+'</span></td>'
          +'<td class="c">'+(ok?'<span class="ok-t">✓ 4/4</span>':(l.check?'<span class="no-t">'+sc+'/4</span>':'<span class="mu">-</span>'))+'</td>'
          +'<td class="c">'+((l.photos||[]).length?'<b>'+Math.min(3,l.photos.length)+'</b>장':'<span class="mu">-</span>')+'</td>'
          +'<td class="c">'+(tc?'<span class="sg"><span class="ok-t">'+esc(tc.name)+'</span>'+(src(tc.sign)?'<img src="'+src(tc.sign)+'" alt="">':'')+'</span>':(reconfirm(l)?'<span class="no-t">재확인 필요</span>':'<span class="mu">확인 전</span>'))+'</td></tr>';
      }).join('');
      pages.push({flow:true,html:'<h2 class="sec">회차별 운영 현황'+'<small>'+(logs.length>24?(t+1)+'–'+Math.min(logs.length,t+24)+' · ':'')+'수업 내용 전문은 뒤쪽 회차별 활동 기록에 있습니다</small></h2>'
        +'<div style="height:2.4mm"></div>'
        +(t===0?mchips:'')
        +'<table class="tb"><colgroup><col style="width:11mm"><col style="width:21mm"><col style="width:19mm"><col><col style="width:14mm"><col style="width:11mm"><col style="width:33mm"></colgroup>'
        +'<tr><th>회차</th><th>수업일</th><th>참여</th><th>수업 내용 · 특이사항</th><th>안전점검</th><th>사진</th><th>담당교사 확인</th></tr>'
        +(rows||'<tr><td colspan="7" class="c mu" style="height:30mm">아직 제출된 회차 보고가 없습니다</td></tr>')+'</table>'});
    }

    // ── 3. 회차별 활동 기록 (한 쪽 2회차) ──
    function card(l){
      var tc=l.teacherConfirm,ph=(l.photos||[]).filter(function(p){return src(p)}).slice(0,3);
      var m=num(l.male),f=num(l.female),eh=edits(l),le=eh[eh.length-1]||{};
      var st=tc?'<span class="pill ok">✓ 담당교사 확인</span>':(reconfirm(l)?'<span class="pill warn">정정 후 재확인 필요</span>':'<span class="pill no">담당교사 확인 전</span>');
      var photos=ph.length?ph.map(function(p){return '<figure><img src="'+src(p)+'" alt=""></figure>'}).join('')
        +(ph.length===1?'<div class="aside"><b style="color:#16181d;font-size:9pt">'+esc(l.session)+'회차 활동 사진</b>'+fd(l.date,true)+'<br>'+esc(school)+'</div>':'')
        :'<div class="noph">등록된 활동 사진이 없습니다</div>';
      return '<article class="sc">'
        +'<header><div class="no"><b>'+p2(l.session||0)+'</b><i>회차</i></div>'
        +'<div class="dt"><b>'+fd(l.date,true)+'</b><span>'+esc(school)+' · 강사 '+esc(l.name||insName)+'</span></div>'+st+'</header>'
        +'<div class="meta"><div class="pp"><i>참여 인원</i><b>'+esc(l.count||'-')+'</b>명'+(m!=null||f!=null?'<small>남 '+(m==null?'-':m)+' · 여 '+(f==null?'-':f)+'</small>':'')+'</div>'
        +'<div class="ct"><i>수업 내용</i><p>'+esc(l.content||'')+'</p>'+(l.note?'<p class="note">특이사항 · '+esc(l.note)+'</p>':'')+'</div></div>'
        +'<div class="ph ph'+(ph.length||0)+'">'+photos+'</div>'
        +'<footer><div class="chk">'+SAFE.map(function(k){var y=l.check&&l.check[k];return '<span class="'+(y?'y':'n')+'">'+(y?'✓':'–')+' '+SAFE_LB[k]+'</span>'}).join('')+'</div>'
        +'<div class="tc">'+(tc?'<div><i>담당교사 확인</i><b>'+esc(tc.name)+'</b><small>'+ts(tc.at)+'</small></div>'+(src(tc.sign)?'<img src="'+src(tc.sign)+'" alt="서명">':''):'<div><i>담당교사 확인</i><b class="mu">확인 전</b></div>')+'</div></footer>'
        +(eh.length?'<div class="eh">✏️ 정정 '+eh.length+'회 · 마지막 '+esc(le.role||'')+' '+esc(le.by||'')+' '+ts(le.at)+' — 정정 전 값은 시스템에 보존됩니다</div>':'')
        +'</article>';
    }
    for(var s=0;s<logs.length;s+=2){
      var pair=logs.slice(s,s+2);
      pages.push({html:'<h2 class="sec" style="font-size:12.5pt;margin-bottom:3.4mm">회차별 활동 기록<small>'+esc(pair[0].session)+(pair[1]?'–'+esc(pair[1].session):'')+'회차</small></h2>'+pair.map(card).join('')});
    }

    // ── 4. 운영 결과 요약 · 확인 ──
    var mt='<table class="tb"><colgroup><col style="width:18mm"><col><col><col><col></colgroup><tr><th>월</th><th>운영 회차</th><th>연인원</th><th>회차 평균</th><th>교사확인</th></tr>'
      +(mk.length?mk.map(function(k){var mo=months[k];return '<tr><td class="c sn">'+(+k.slice(5))+'월</td><td class="c">'+mo.n+'회</td><td class="c"><b>'+mo.p+'</b>명</td><td class="c">'+(Math.round(mo.p/mo.n*10)/10)+'명</td><td class="c">'+(mo.c===mo.n?'<span class="ok-t">'+mo.c+'/'+mo.n+'</span>':'<span class="no-t">'+mo.c+'/'+mo.n+'</span>')+'</td></tr>'}).join(''):'<tr><td colspan="5" class="c mu">-</td></tr>')
      +'<tr><td class="c sn" style="background:#f0f2f5">합계</td><td class="c" style="background:#f0f2f5"><b>'+logs.length+'회</b></td><td class="c" style="background:#f0f2f5"><b>'+totP+'</b>명</td><td class="c" style="background:#f0f2f5">'+(Math.round(avgP*10)/10)+'명</td><td class="c" style="background:#f0f2f5"><b>'+cfm+'/'+logs.length+'</b></td></tr></table>';
    var sb=SAFE.map(function(k){var n=logs.filter(function(l){return l.check&&l.check[k]}).length,pc=logs.length?n/logs.length*100:0;
      return '<div class="sbar"><div><span>'+SAFE_LB[k]+'</span><span>'+n+'/'+logs.length+'</span></div><u><s style="width:'+pc.toFixed(1)+'%"></s></u></div>'}).join('');
    var insSig=src(ins.sign),tcSig=lastTC&&src(lastTC.sign);
    pages.push({html:'<h2 class="sec">운영 결과 요약 및 확인</h2><p class="lede">월별 운영 실적과 안전 지도 점검 이행 현황입니다.</p>'
      +'<div class="two"><div class="card" style="margin-top:0"><div class="card-h">월별 운영 실적</div>'+mt+'</div>'
      +'<div class="card" style="margin-top:0"><div class="card-h">안전 지도 점검 이행<span>회차 보고 시 강사 점검</span></div>'+sb
      +'<div class="card-h" style="margin-top:4mm">기록 충실도</div>'
      +'<div class="sbar"><div><span>활동 사진 첨부 회차</span><span>'+phN+'/'+logs.length+'</span></div><u><s style="width:'+(logs.length?phN/logs.length*100:0).toFixed(1)+'%;background:#b8860b"></s></u></div>'
      +'<div class="sbar"><div><span>담당교사 전자서명 확인</span><span>'+cfm+'/'+logs.length+'</span></div><u><s style="width:'+(logs.length?cfm/logs.length*100:0).toFixed(1)+'%;background:#1F4E9C"></s></u></div>'
      +'<div class="sbar"><div><span>남녀 인원 구분 입력</span><span>'+mfN+'/'+logs.length+'</span></div><u><s style="width:'+(logs.length?mfN/logs.length*100:0).toFixed(1)+'%;background:#C41E2F"></s></u></div>'
      +'</div></div>'
      +'<div class="stmt"><p>위와 같이 「2026 유소년 스포츠 기반구축사업」 학교강습을<br><b>'+esc(school)+'</b>에서 '+(first?fd(first)+'부터 '+fd(last)+'까지 ':'')+'총 <b>'+logs.length+'회차</b> 운영하였음을 확인합니다.</p>'
      +'<div class="dd">'+today+'</div></div>'
      +'<div class="signs">'
        +'<div class="sb"><div><i>강사</i><b>'+esc(insName||'')+'</b><small>'+(insSig?(ins.signSrc==='contract'?'위촉계약 전자서명':'회원정보 등록 서명'):'회차 보고는 강사 본인 계정으로 제출')+'</small></div><div class="sg">'+(insSig?'<img src="'+insSig+'" alt="">':'')+'</div></div>'
        +'<div class="sb"><div><i>담당교사</i><b>'+esc(teacherName||'')+'</b><small>'+(lastTC?'최근 전자서명 확인 '+ts(lastTC.at):'전자서명 확인 전')+(cfm<logs.length?'<br><span style="color:#C41E2F">확인 전 '+(logs.length-cfm)+'회차</span>':'')+'</small></div><div class="sg">'+(tcSig?'<img src="'+tcSig+'" alt="">':'')+'</div></div>'
      +'</div>'
      +'<div class="issuer"><img src="'+esc(WM)+'" alt="대한민국플라잉디스크연맹"><div>사단법인 대한민국플라잉디스크연맹 · 031-984-3248 · kfdf60@hanmail.net</div></div>'
      +'<div class="fine">※ 본 운영일지는 강사가 연맹 홈페이지에 회차별로 제출한 보고와 담당교사의 전자서명 확인 기록을 그대로 옮긴 것입니다. 교사확인 시각·서명과 정정 이력(정정 전 값), 삭제된 회차 기록은 연맹 시스템에 보존됩니다.<br>'
      +'※ 문서번호 '+esc(docNo)+' · 출력 '+ts(now)+(o.printedBy?' · '+esc(o.printedRole||'')+' '+esc(o.printedBy):'')+'</div>'});

    // ── 5. 삭제된 회차 기록 (있을 때만 · 규칙 v35 sessionLogArchive) ──
    var DEL=(o.deleted||[]).slice().sort(function(a,b){return (a.session||0)-(b.session||0)});
    if(DEL.length){
      pages.push({flow:true,html:'<h2 class="sec">삭제된 회차 기록<small>'+DEL.length+'건 · 원본과 사유는 연맹 시스템에 보존</small></h2>'
        +'<p class="lede">겸직 허가 시기 정정 등으로 삭제된 회차 보고입니다. 앞의 운영 실적(회차·인원)에는 포함되지 않습니다.</p>'
        +'<table class="tb"><colgroup><col style="width:11mm"><col style="width:22mm"><col style="width:12mm"><col style="width:22mm"><col style="width:30mm"><col></colgroup>'
        +'<tr><th>회차</th><th>원 수업일</th><th>인원</th><th>삭제일</th><th>삭제자</th><th>사유</th></tr>'
        +DEL.map(function(a){var g=a.log||{};return '<tr><td class="c sn">'+esc(a.session)+'</td><td class="c">'+fds(a.date)+'</td><td class="c">'+esc(g.count||'-')+'</td>'
          +'<td class="c">'+esc(String(a.deletedAtIso||'').slice(0,10).replace(/-/g,'. '))+'</td><td class="c">'+esc(a.deletedRole||'')+' '+esc(a.deletedByName||'')+'</td>'
          +'<td>'+esc(a.reason||'')+(a.hadConfirm?' <span class="no-t">(교사확인 있던 회차)</span>':'')+'</td></tr>'}).join('')
        +'</table>'});
    }

    // ── 조립 ──
    var P=pages.length;
    var body=pages.map(function(pg,ix){
      return '<section class="page'+(pg.flow?' flow':'')+'">'
        +(pg.cover?'':'<div class="ph-h"><img src="'+esc(WM)+'" alt=""><div class="t">학교강습 운영일지 · '+esc(school)+'<br><span style="font-weight:600;color:#8a919d">강사 '+esc(insName)+' · '+esc(docNo)+'</span></div></div>')
        +pg.html
        +'<div class="pf"><span><b>사단법인 대한민국플라잉디스크연맹</b> · 2026 유소년 스포츠 기반구축사업</span><span>'+(ix+1)+' / '+P+'</span></div></section>';
    }).join('');
    var fname='운영일지_'+String(school).replace(/[\\\/:*?"<>|\s]+/g,'')+'_'+String(insName).replace(/\s+/g,'')+'_'+now.getFullYear()+p2(now.getMonth()+1)+p2(now.getDate());
    var boot='(function(){var imgs=[].slice.call(document.images),n=imgs.length,d=0,st=document.getElementById("st"),fired=false;'
      +'function go(){if(fired)return;fired=true;st.textContent="준비 완료 — 인쇄 창에서 대상을 「PDF로 저장」으로 고르세요";setTimeout(function(){window.print()},350)}'
      +'function up(){d++;st.textContent="사진·서명 불러오는 중 "+d+"/"+n;if(d>=n)(document.fonts&&document.fonts.ready?document.fonts.ready.then(go):go())}'
      +'imgs.forEach(function(i){if(i.complete&&i.naturalWidth)up();else{i.addEventListener("load",up);i.addEventListener("error",function(){var f=i.closest("figure");if(f)f.className="broken";up()})}});'
      +'if(!n)go();setTimeout(go,25000)})();';
    w.document.open();
    w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(fname)+'</title>'
      +'<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"><style>'+CSS+'</style></head><body>'
      +'<div class="bar"><button onclick="window.print()">🖨 인쇄 · PDF로 저장</button><span id="st">사진·서명 불러오는 중…</span><span class="tip">인쇄 창: 대상 「PDF로 저장」 · 용지 A4 · 여백 없음 · 「배경 그래픽」 켜기</span></div>'
      +body+'<script>'+boot+'<'+'/script></body></html>');
    w.document.close();
  }
  // [일지 삭제 2026-09-16] 삭제는 반드시 기록(sessionLogArchive/{같은 ID})과 한 묶음으로 — 규칙 v35.
  //   원본 전체(내용·사진 주소·교사확인 서명·정정 이력)·사유·삭제자를 남기고 일지를 지웁니다. 둘 중 하나만 되는 일은 없습니다.
  function removeLog(db,fb,id,log,who){
    var src={};Object.keys(log||{}).forEach(function(k){if(k.charAt(0)!=='_')src[k]=log[k]});
    who=who||{};
    var b=db.batch();
    b.set(db.collection('sessionLogArchive').doc(id),{
      log:src,uid:src.uid||'',appId:src.appId||'',school:src.school||'',session:(src.session==null?null:src.session),
      date:src.date||'',name:src.name||'',hadConfirm:!!src.teacherConfirm,
      deletedAt:fb.firestore.FieldValue.serverTimestamp(),deletedAtIso:new Date().toISOString(),
      deletedBy:who.uid||'',deletedByName:who.name||'',deletedRole:who.role||'',reason:String(who.reason||'').slice(0,500)});
    b.delete(db.collection('sessionLogs').doc(id));
    return b.commit();
  }
  // 사무국 복원 — 원래 ID 는 다시 쓰지 않고 새 ID 로 되살립니다(기록 1건 = 삭제 1건 원칙 유지).
  function restoreLog(db,fb,arch,who){
    var aid=arch._id||arch.id;who=who||{};
    var ref=db.collection('sessionLogs').doc();
    var data={};var s=arch.log||{};Object.keys(s).forEach(function(k){data[k]=s[k]});
    data.restoredFrom=aid;
    var b=db.batch();
    b.set(ref,data);
    b.update(db.collection('sessionLogArchive').doc(aid),{restoredAt:fb.firestore.FieldValue.serverTimestamp(),restoredBy:who.uid||'',restoredByName:who.name||'',restoredTo:ref.id});
    return b.commit().then(function(){return ref.id});
  }
  window.KFDF_LOGBOOK={prep:prep,render:render,fail:fail,removeLog:removeLog,restoreLog:restoreLog};
})();
