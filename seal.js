// seal.js v20260929b · 직인 받아오기 — 직인 이미지는 홈페이지에 파일로 두지 않습니다.
//   로그인한 승인 회원이 문서를 출력하는 순간에만 서버 함수(sealImage)에서 받아오며, 받은 직인에는 문서번호·날짜가 작은 글자로 새겨지고 발급 기록이 남습니다.
//   사용: const url = await KFDF_SEAL.get('contract', 문서번호);   // 받지 못하면 '' → 화면은 「(직인 생략)」으로 출력
//   용도: careerCert(경력증명서) · athleteCert(선수 경력 확인서) · contract(위촉계약서) · compContract(대회 위촉계약서) · eduCert(이수증)
//         adminDoc · goodsCert · consentDoc (관리자·시도연맹 임원만)
(function(){
  'use strict';
  var URL_='https://sealimage-1081847355343.asia-northeast3.run.app';
  var URL_BG='https://certbg-1081847355343.asia-northeast3.run.app';
  var cache={};
  var OMIT='<small style="font-size:10.5px;color:#666;font-weight:500;margin-left:6px;letter-spacing:0">(직인 생략)</small>';
  function get(purpose,docNo){
    var k=purpose+'|'+String(docNo||'');if(cache[k])return Promise.resolve(cache[k]);
    try{
      if(!window.firebase||!firebase.app().functions)return Promise.resolve('');
      var fn=firebase.app().functions('asia-northeast3').httpsCallableFromURL(URL_);
      return fn({purpose:purpose,docNo:String(docNo||'')}).then(function(r){var u=(r&&r.data&&r.data.img)||'';if(u)cache[k]=u;return u})
        .catch(function(e){try{console.warn('직인을 받아오지 못했습니다:',e&&(e.code||e.message))}catch(x){}return ''});
    }catch(e){return Promise.resolve('')}
  }
  // 자격증 배경(공식 양식) — 자격 종류에 '심판'이 있으면 심판용, 아니면 지도자용. 받지 못하면 오류(자격증은 배경 없이 만들 수 없음)
  var bgP={};
  function bg(type){
    var k=(String(type||'').indexOf('심판')>=0||type==='referee')?'referee':'leader';if(bgP[k])return bgP[k];
    bgP[k]=new Promise(function(ok,no){
      try{var fn=firebase.app().functions('asia-northeast3').httpsCallableFromURL(URL_BG);
        fn({type:k}).then(function(r){var u=(r&&r.data&&r.data.img)||'';if(u)ok(u);else no(new Error('자격증 양식을 받아오지 못했습니다'))}).catch(function(e){no(new Error('자격증 양식을 받아오지 못했습니다 ('+((e&&(e.message||e.code))||'')+')'))});
      }catch(e){no(new Error('자격증 양식을 받아오지 못했습니다'))}});
    bgP[k].catch(function(){delete bgP[k]});
    return bgP[k];
  }
  // 출력 창이 비어 보이지 않게 — 직인을 받아오는 동안 안내
  function wait(w,t){try{w.document.body.innerHTML='<p style="font-family:sans-serif;padding:40px;color:#334">'+(t||'문서를 준비하는 중…')+'</p>'}catch(e){}}
  window.KFDF_SEAL={get:get,bg:bg,wait:wait,OMIT:OMIT};
})();
