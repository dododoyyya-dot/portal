// v20260921a · 연맹 자격증 파일 생성 공용 모듈 (mypage.html 본인 출력 · license.html 관리자 출력이 함께 씁니다)
//   인쇄 대화상자(→ "PDF로 저장") 방식은 휴대폰·카카오톡 안 브라우저에서 팝업·인쇄창이 막혀 실패하는 일이 잦아,
//   자격증을 캔버스에 그려 PDF/이미지 「파일」로 바로 저장하거나 휴대폰 공유(카카오톡 등)로 보낼 수 있게 합니다.
//   좌표·서식은 staff.html _drawLicPng · mypage.html printLicense 의 공식 양식과 같습니다.
(function(){
  var W=1240,H=1753;   // A4 150dpi
  function bgFor(type){return new URL('files/'+((String(type||'').indexOf('심판')>=0)?'cert_bg_referee.jpg':'cert_bg_leader.jpg'),location.href).href}
  function dot(s){return String(s||'').replace(/-/g,'.')}
  function loadImg(src){return new Promise(function(ok,no){var im=new Image();im.onload=function(){ok(im)};im.onerror=function(){no(new Error('자격증 배경 이미지를 불러오지 못했습니다'))};im.src=src})}
  function fontReady(){try{return document.fonts&&document.fonts.load?Promise.all([document.fonts.load('800 40px Pretendard'),document.fonts.load('600 30px Pretendard')]).catch(function(){}):Promise.resolve()}catch(e){return Promise.resolve()}}
  // c = {no, type, grade, name, birth, expireAt, issuedAt, region} → canvas
  async function draw(c){
    var bg=await loadImg(bgFor(c.type));await fontReady();
    var cv=document.createElement('canvas');cv.width=W;cv.height=H;var ctx=cv.getContext('2d');
    ctx.drawImage(bg,0,0,W,H);ctx.fillStyle='#111';
    var F='"Pretendard","Noto Sans KR","Malgun Gothic",sans-serif';
    var fs=Math.round(H*0.029);ctx.font='900 '+fs+'px '+F;ctx.fillText(c.grade||'',W*0.397,H*0.336+fs);
    fs=Math.round(H*0.031);ctx.font='800 '+fs+'px '+F;ctx.fillText(c.name||'',W*0.318+W*0.008,H*0.405+fs);
    var nw=ctx.measureText(c.name||'').width;ctx.fillRect(W*0.318,H*0.405+fs+Math.round(H*0.006),nw+W*0.03,Math.round(H*0.002));
    fs=Math.round(H*0.0165);ctx.font='600 '+fs+'px '+F;
    ctx.fillText(c.no||'',W*0.682,H*0.3375+fs);ctx.fillText(dot(c.expireAt),W*0.682,H*0.3585+fs);ctx.fillText(dot(c.birth),W*0.682,H*0.3795+fs);ctx.fillText(c.region||'',W*0.682,H*0.4005+fs);
    fs=Math.round(H*0.021);ctx.font='700 '+fs+'px '+F;ctx.fillText(dot(c.issuedAt),W*0.366,H*0.7065+fs);
    return cv;
  }
  function loadJsPdf(){if(window.jspdf&&window.jspdf.jsPDF)return Promise.resolve();return new Promise(function(ok,no){var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';s.onload=ok;s.onerror=function(){no(new Error('PDF 라이브러리를 불러오지 못했습니다 (네트워크 확인)'))};document.head.appendChild(s)})}
  // 여러 장 → PDF Blob (A4 한 장에 한 명)
  async function pdf(cards){
    await loadJsPdf();var doc=new window.jspdf.jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});
    for(var i=0;i<cards.length;i++){var cv=await draw(cards[i]);if(i)doc.addPage();doc.addImage(cv.toDataURL('image/jpeg',0.9),'JPEG',0,0,210,297)}
    return doc.output('blob');
  }
  function isMobile(){return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)}
  // 저장: 휴대폰이면 공유(카카오톡·메일 등)를 먼저 시도, 아니면(또는 공유 취소·불가) 내려받기
  async function save(blob,filename,title){
    var file=null;try{file=new File([blob],filename,{type:blob.type||'application/pdf'})}catch(e){}
    if(isMobile()&&file&&navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title:title||filename});return 'shared'}catch(e){if(e&&e.name==='AbortError')return 'cancel'}
    }
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.rel='noopener';document.body.appendChild(a);a.click();
    setTimeout(function(){try{URL.revokeObjectURL(a.href)}catch(e){}a.remove()},4000);return 'download';
  }
  function fname(c){return '자격증_'+String(c.name||'').replace(/\s+/g,'')+'_'+String(c.no||'').replace(/[\\\/:*?"<>|]/g,'')+'.pdf'}
  // 편의: 카드 목록 → PDF 파일 저장/공유. 결과 'shared'|'download'|'cancel'
  async function savePdf(cards,filename,title){var b=await pdf(cards);return save(b,filename||(cards.length===1?fname(cards[0]):'자격증_'+cards.length+'장.pdf'),title||'연맹 자격증')}
  window.KFDF_LICCERT={draw:draw,pdf:pdf,save:save,savePdf:savePdf,bgFor:bgFor,isMobile:isMobile,fname:fname};
})();
