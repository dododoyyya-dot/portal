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
window.kfdfMail = async function(to, subject, message){
  const c = window.KFDF_CONFIG.emailjs;
  if(!c.publicKey || !to) return;              // 미설정 시 조용히 통과
  try{
    if(!window.emailjs){
      await new Promise((ok,no)=>{const s=document.createElement('script');
        s.src='https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
        s.onload=ok;s.onerror=no;document.head.appendChild(s);});
      window.emailjs.init({publicKey:c.publicKey});
    }
    await window.emailjs.send(c.serviceId, c.templateId, {to_email:to, subject:subject, message:message});
  }catch(e){console.warn('메일 발송 실패(운영에는 영향 없음):', e)}
};
