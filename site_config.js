// ═══ 연맹 홈페이지 설정 파일 ═══
// 이메일 자동발송(EmailJS) 설정: https://www.emailjs.com 가입 후 아래 3개 값만 붙여넣으면
// 접수확인·선정통보·회원승인 메일이 자동 발송됩니다. 비워두면 메일 없이 정상 작동합니다.
window.KFDF_CONFIG = {
  emailjs: {
    publicKey: "mF6dxXDbXHdbJ3Ihb",     // EmailJS > Account > Public Key
    serviceId: "kfdf60",     // EmailJS > Email Services > Service ID
    templateId: "template_l4vtrwe"     // EmailJS > Email Templates > Template ID (변수: to_email, subject, message)
  },
  adminEmail: "kfdf60@hanmail.net"
};
// [메일로그] 발송 결과를 siteContent/mailLog(최근 800건)에 기록 — 기록 실패는 발송에 영향 없음
// ※ admin.html은 자체 래퍼로 기록하므로 이 함수를 거치지 않습니다 (중복 기록 없음).
// ※ apply.html 등 비로그인 페이지는 보안규칙상 기록이 거부될 수 있으며, 그 경우에도 발송은 정상 진행됩니다.
window._kfdfMailQ = Promise.resolve();
window._kfdfMailLog = function(rec){
  window._kfdfMailQ = window._kfdfMailQ.then(async function(){
    try{
      if(!window.firebase || !firebase.apps || !firebase.apps.length || !firebase.firestore) return;
      const ref = firebase.firestore().collection('siteContent').doc('mailLog');
      const d = await ref.get();
      let items = (d.exists && d.data().items) || [];
      items.push(rec);
      if(items.length > 800) items = items.slice(items.length - 800);
      await ref.set({items:items, updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
    }catch(e){ /* 기록 실패는 무시 — 발송에는 영향 없음 */ }
  });
  return window._kfdfMailQ;
};
window.kfdfMail = async function(to, subject, message){
  const c = window.KFDF_CONFIG.emailjs;
  const rec = {to:String(to||''), subject:String(subject||''), ok:false, error:'', at:new Date().toISOString(), by:'', page:(location.pathname.split('/').pop()||'')};
  try{ rec.by = ((window.firebase && firebase.auth && firebase.auth().currentUser) || {}).email || '' }catch(e){}
  if(!to){ rec.error='이메일 주소 없음'; try{window._kfdfMailLog(rec)}catch(e){} return; }
  if(!c.publicKey) return;                     // 미설정 시 조용히 통과
  try{
    if(!window.emailjs || !window._kfdfMailInit){
      if(!window.emailjs){
        await new Promise((ok,no)=>{const s=document.createElement('script');
          s.src='https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
          s.onload=ok;
          s.onerror=function(){no(new Error('EmailJS 라이브러리 로드 실패'))};
          setTimeout(function(){no(new Error('EmailJS 라이브러리 로드 시간초과(15초)'))},15000);
          document.head.appendChild(s);});
      }
      window.emailjs.init({publicKey:c.publicKey});
      window._kfdfMailInit = true;
    }
    await window.emailjs.send(c.serviceId, c.templateId, {to_email:to, subject:subject, message:message});
    rec.ok = true;
  }catch(e){
    rec.error = String((e && e.message) || (e && e.text) || e);
    console.warn('메일 발송 실패(운영에는 영향 없음):', rec.to, rec.error);
  }
  try{ window._kfdfMailLog(rec) }catch(e){}   // 기록 실패가 발송 호출부로 전파되지 않도록
};
