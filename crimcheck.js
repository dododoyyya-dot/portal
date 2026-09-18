// crimcheck.js v20260917a · 파견 강사 범죄경력조회 증빙 (대한체육회 「범죄경력 조회 업무 안내」 2026. 9. 9. · 공문 붙임 1)
//   ① 학교→강사: 기관ID·검증번호 직접 전달   ② 강사: 시스템 동의(인쇄 유형 「시설(기관)출력」)
//   ③ 강사→연맹: 발급동의 완료 화면 사진(마이페이지) — 연맹은 증빙으로 보관   ④ 학교: 발급 요청·인쇄·보관
//   ⑤ 학교→연맹: 메일로 「적격/부적격」만 회신 → 사무국이 입력
//   저장(규칙 v36): crimChecks/{강습신청ID} 사진·상태(사무국·배정 강사 본인) · crimResults/{강습신청ID} 적격/부적격(사무국만)
//   사진 파일: storage docs/{강사uid}/crim_{신청ID}_{시각}.jpg (본인·사무국만 열람) — 열람 링크는 저장하지 않고 볼 때마다 발급
//   회보서는 받지 않습니다(직접출력본은 학교 제출용으로 쓸 수 없고, 목적 외 취득·사용은 법적 처벌 대상이 될 수 있음).
(function(){
  'use strict';
  var SYS_URL='https://crims.police.go.kr/main.do';
  var AUTO_BY='학교 회신(전 학교 적격)';
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

  // 상태 — chk: crimChecks 문서 데이터, res: crimResults 문서 데이터(사무국 화면에서만 넘김)
  function status(chk,res){
    var c=(chk&&chk.consent)||null;
    if(res&&res.result==='부적격')return {key:'unfit',label:'학교 회신: 부적격',color:'#C41E2F'};
    if(res&&res.result==='적격')return {key:'fit',label:'학교 회신: 적격',color:'#0f766e'};
    if(chk&&chk.schoolDone)return {key:'done',label:'학교 조회 완료',color:'#0f766e'};
    if(!c)return {key:'none',label:'사진 미제출',color:'#C41E2F'};
    if(c.status==='반려')return {key:'rejected',label:'사진 반려',color:'#C41E2F'};
    return {key:'submitted',label:'사진 제출',color:'#1F4E9C'};
  }
  function chip(st){return '<span style="font-size:11.5px;font-weight:900;color:#fff;background:'+st.color+';border-radius:999px;padding:3px 9px;white-space:nowrap">'+esc(st.label)+'</span>'}

  // 강사 안내(붙임 1 요약) — 마이페이지 카드 안에 접어서 보여줌
  function guideHtml(){
    return '<ol style="margin:6px 0 0 18px;padding:0;line-height:1.75">'
      +'<li>배정 학교에서 <b>기관ID(영문·숫자 6자리)·검증번호(숫자 4자리)</b>를 받습니다 — 학교마다 각각</li>'
      +'<li><a href="'+SYS_URL+'" target="_blank" rel="noopener" style="color:#153A77;font-weight:800">범죄경력회보서 발급시스템</a> 본인 로그인 → 「취업예정자 발급동의 신청」 → 기관ID·검증번호 입력·조회·동의</li>'
      +'<li>인쇄 유형은 반드시 <b style="color:#C41E2F">「시설(기관)출력」</b> — 「직접출력」은 선택하지 마세요 → 본인확인 완료</li>'
      +'<li>완료 화면을 <b>다른 휴대폰·카메라로 촬영</b>(시스템이 화면 캡처를 막습니다). 성명·학교명·신청일이 보이게, 주민등록번호는 가려 주세요</li>'
      +'<li>아래에서 사진을 올리면 끝 — 이후 조회·적격 회신은 학교가 연맹에 직접 합니다</li>'
      +'</ol>'
      +'<div style="margin-top:6px;background:#fdf1f1;border:1.5px solid #f1c7cc;border-radius:9px;padding:7px 10px;color:#8c1622;font-weight:700;line-height:1.6">'
      +'⚠ 「직접출력」본은 학교 제출용으로 사용할 수 없으며, 목적 외 취득·사용 시 <b>법적 처벌 대상</b>이 될 수 있으므로 반드시 <b>「시설(기관)출력」</b>으로 신청해 주세요. 회보서는 연맹에 올리지 마세요. 이미 동의를 마쳤다면 그때 찍은 사진만 올리면 됩니다.</div>';
  }

  // ── 강사: 완료 화면 사진 올리기 ── opt:{db,fb,uid,name,app:{id,school},file,compress}
  async function upload(opt){
    var f=opt.file;
    if(!f)throw new Error('사진을 골라 주세요');
    if(!/^image\//.test(f.type||''))throw new Error('사진 파일만 올릴 수 있습니다 (회보서·PDF는 받지 않습니다)');
    var blob=f;
    if(opt.compress){try{blob=(await opt.compress(f))||f}catch(e){blob=f}}
    if(blob.size>8*1024*1024)throw new Error('사진이 8MB를 넘습니다 — 해상도를 낮춰 다시 찍어 주세요');
    var path='docs/'+opt.uid+'/crim_'+opt.app.id+'_'+Date.now()+'.jpg';
    await opt.fb.storage().ref(path).put(blob,{contentType:'image/jpeg'});
    var ref=opt.db.collection('crimChecks').doc(opt.app.id);
    var cur=null;
    try{var g=await ref.get();cur=g.exists?g.data():null}catch(e){cur=null}
    var consent={path:path,fileName:String(f.name||'').slice(0,120),at:new Date().toISOString(),status:'제출',note:''};
    var TS=opt.fb.firestore.FieldValue.serverTimestamp();
    if(cur){
      var upd={consent:consent,updatedAt:TS};
      if(cur.consent)upd.consentLog=opt.fb.firestore.FieldValue.arrayUnion(cur.consent);   // 이전 제출은 이력으로 보관
      await ref.update(upd);
    }else{
      await ref.set({uid:opt.uid,appId:opt.app.id,school:opt.app.school||'',name:opt.name||'',consent:consent,consentLog:[],updatedAt:TS});
    }
    return consent;
  }
  function photoUrl(fb,path){return fb.storage().ref(path).getDownloadURL()}

  // ── 사무국: 사진 반려 (잘못 찍은 사진 · 회보서를 올린 경우 등) ──
  async function reject(db,fb,appId,note,byName){
    await db.collection('crimChecks').doc(appId).update({
      'consent.status':'반려','consent.note':String(note||'').slice(0,300),
      'consent.checkedAt':new Date().toISOString(),'consent.checkedBy':byName||'',
      updatedAt:fb.firestore.FieldValue.serverTimestamp()});
  }

  // ── 사무국: 학교 회신 입력 · 취소(result '') ── o:{appId,uid,school,name,result,repliedAt,byUid,byName}
  async function setResult(db,fb,o){
    var now=new Date().toISOString(),r=o.result||'';
    if(r&&r!=='적격'&&r!=='부적격')throw new Error('회신은 적격 또는 부적격만 입력합니다');
    var b=db.batch();
    b.set(db.collection('crimResults').doc(o.appId),{
      appId:o.appId,uid:o.uid||'',school:o.school||'',name:o.name||'',
      result:r,repliedAt:r?(o.repliedAt||now.slice(0,10)):'',at:now,by:o.byUid||'',byName:o.byName||'',
      history:fb.firestore.FieldValue.arrayUnion({result:r||'(취소)',repliedAt:o.repliedAt||'',at:now,byName:o.byName||''})},{merge:true});
    b.set(db.collection('crimChecks').doc(o.appId),{
      uid:o.uid||'',appId:o.appId,school:o.school||'',name:o.name||'',
      schoolDone:!!r,schoolDoneAt:r?now:'',updatedAt:fb.firestore.FieldValue.serverTimestamp()},{merge:true});
    await b.commit();
    return syncCrimDoc(db,fb,o.uid);
  }

  // 강사의 배정 학교가 모두 「적격」이면 기존 「경력확인 ✓」(users.crimDoc)을 자동으로 켜고,
  // 부적격이 하나라도 있으면 끕니다. 사무국이 손으로 켠 경력확인은 부적격일 때만 끕니다.
  async function syncCrimDoc(db,fb,uid){
    if(!uid)return {changed:false,apps:0};
    var ids=[];
    var add=function(snap){snap.forEach(function(d){var s=d.data()||{};if(s.status==='배정완료'&&!s.deleted&&ids.indexOf(d.id)<0)ids.push(d.id)})};
    add(await db.collection('schoolApplications').where('assignedUid','==',uid).get());
    try{add(await db.collection('schoolApplications').where('selfUid','==',uid).get())}catch(e){}
    if(!ids.length)return {changed:false,apps:0};
    var res=await Promise.all(ids.map(function(id){return db.collection('crimResults').doc(id).get().then(function(g){return g.exists?((g.data()||{}).result||''):''})}));
    var unfit=res.indexOf('부적격')>=0,allFit=res.every(function(x){return x==='적격'});
    var u=((await db.collection('users').doc(uid).get()).data())||{};
    var TS=fb.firestore.FieldValue.serverTimestamp();
    if(allFit&&!u.crimDoc){await db.collection('users').doc(uid).update({crimDoc:true,crimDocAt:TS,crimDocBy:AUTO_BY});return {changed:true,crimDoc:true,apps:ids.length,unfit:false,allFit:true}}
    if(u.crimDoc&&(unfit||(!allFit&&u.crimDocBy===AUTO_BY))){await db.collection('users').doc(uid).update({crimDoc:false,crimDocAt:TS,crimDocBy:unfit?'학교 회신(부적격)':''});return {changed:true,crimDoc:false,apps:ids.length,unfit:unfit,allFit:allFit}}
    return {changed:false,crimDoc:!!u.crimDoc,apps:ids.length,unfit:unfit,allFit:allFit};
  }

  // ── 사무국: 증빙 보관 zip — 학교별 폴더에 동의 사진(이전 제출 포함) + 현황표 ──
  //   rows: [{appId,region,sido,school,type,name,chk,res}]  (chk·res 는 문서 데이터)
  async function evidenceZip(opt){
    var JSZip=opt.JSZip,ExcelJS=opt.ExcelJS,fb=opt.fb,rows=opt.rows||[];
    var zip=new JSZip(),miss=[],n=0;
    var safe=function(s){return String(s||'').replace(/[\\\/:*?"<>|\s]+/g,'')};
    var sheet=[];
    for(var i=0;i<rows.length;i++){
      var r=rows[i],c=(r.chk&&r.chk.consent)||null,st=status(r.chk,r.res);
      var folder=safe(r.sido)+'_'+safe(r.school)+'_'+safe(r.name);
      var shots=[];if(c&&c.path)shots.push({p:c.path,tag:'동의사진'});
      ((r.chk&&r.chk.consentLog)||[]).forEach(function(x,j){if(x&&x.path)shots.push({p:x.path,tag:'이전제출'+(j+1)})});
      for(var k=0;k<shots.length;k++){
        try{
          var url=await photoUrl(fb,shots[k].p);
          var resp=await fetch(url);if(!resp.ok)throw new Error(resp.status);
          zip.file(folder+'/'+shots[k].tag+'.jpg',await resp.blob());n++;
        }catch(e){miss.push(r.school+' '+r.name+' '+shots[k].tag)}
      }
      sheet.push([i+1,r.region||'',r.sido||'',r.school||'',r.type||'',r.name||'',
        c?String(c.at||'').slice(0,10):'',c?(c.status==='반려'?'반려'+(c.note?'('+c.note+')':''):'제출'):'미제출',
        (r.res&&r.res.result)||'',(r.res&&r.res.repliedAt)||'',(r.res&&r.res.byName)||'',st.label]);
    }
    var wb=new ExcelJS.Workbook();var ws=wb.addWorksheet('범죄경력조회 증빙',{views:[{state:'frozen',ySplit:1}]});
    var head=['연번','권역','시도','학교명','유형','강사','사진 제출일','사진 상태','학교 회신','회신일','입력자','현재 상태'];
    var w=[6,10,8,18,11,10,12,14,10,12,10,16];
    ws.columns=head.map(function(h,i){return {header:h,key:'c'+i,width:w[i]}});
    sheet.forEach(function(x){ws.addRow(x)});
    ws.getRow(1).font={bold:true};ws.getRow(1).eachCell(function(cl){cl.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFD9D9D9'}}});
    if(miss.length){var m=wb.addWorksheet('사진 받기 실패');m.addRow(['항목']);miss.forEach(function(x){m.addRow([x])})}
    zip.file('현황표.xlsx',await wb.xlsx.writeBuffer());
    return {blob:await zip.generateAsync({type:'blob'}),photos:n,miss:miss};
  }

  window.KFDF_CRIM={SYS_URL:SYS_URL,AUTO_BY:AUTO_BY,status:status,chip:chip,guideHtml:guideHtml,upload:upload,photoUrl:photoUrl,reject:reject,setResult:setResult,syncCrimDoc:syncCrimDoc,evidenceZip:evidenceZip};
})();
