/* ══════════ 응원 댓글 · 사진 댓글 공용 모듈 (comments.js · 2026-10-24 · b: 욕설 사전 분리·반복 글자 접기) ══════════
 * 저장소: liveChat/{room}/msgs  (보안 규칙 v44~: 승인 회원이 본인 이름으로 300자 이내, 열람 공개, 삭제는 운영자)
 *   room 은 자유 문자열 — 홈 응원 댓글 'cheer_<slotId>', 사진 댓글 'photo_<photoId>', 중계 채팅은 유튜브 영상 ID
 * window.KFDF_CMT = {
 *   clean(text)                → {ok, text, why}   욕설·비방·개인정보 거름 (ok=false 면 보내지 않음, text 는 가려진 글)
 *   listen(room, cb, opt)      → unsub             최신 opt.limit(기본 60)건, 오래된 순으로 cb(list)
 *   send(room, text, me, my)   → Promise<void>     me=firebase user, my=users 문서. 승인 회원만. 실패 시 Error(message 한국어)
 *   del(room, id, by)          → Promise<void>     운영자 삭제(del:true)
 *   mask(name)                 → '김*수'            공개 화면용 이름 가리기
 *   guideHtml(opt)             → 댓글 안내 HTML(작은 글씨)
 *   canWrite(me, my)           → boolean           승인 회원인가
 *   timeAgo(ts)                → '방금' · '3분 전' · '14:02'
 * }  */
(function(){
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  // ── 욕설·비방 사전: 센 말(차단) / 약한 말(별표로 가림). 띄어쓰기·기호·숫자로 피해 쓴 것도 잡도록 글자만 남겨 비교 ──
  //    [2026-10-24b] 일상어와 겹치는 짧은 말(새끼손가락·보지 못해·닥치는 대로·3개년·구호로·등 신나게…)까지 글자만 남겨 부분 비교하면 정상 응원이 대량으로 막혀서 둘로 나눔:
  //      HARD      — 명백한 욕설만. 띄어쓰기·기호를 지운 글자열에서 부분 일치해도 차단
  //      HARD_WORD — 원문에서 어절 첫머리에 그 말이 통째로 올 때만 차단(뒤에 공백·문장부호·끝, 또는 아/야/들/이/의/임/같/어/라/냐/네/지/할/럴). '보지'·'자지'·'ㅅㅅ' 는 동사·줄임말과 구분이 안 돼 뺌
  var HARD=['씨발','씨빨','시빨','씨팔','시팔','ㅅㅂ','ㅆㅂ','병신','븅신','빙신','개새끼','개세끼','섹스','좆','좃','존나','ㅈㄴ','지랄','느금','뒈져','후레자식','썅','개놈','개자식','미친놈','미친년','빡대가리','찐따','fuck','shit','bitch','asshole','porn'];
  var HARD_WORD=['시발','새끼','새끼가','개색','졸라','염병','엿먹','니미','니애미','니엄마','창녀','창년','걸레','꺼져','뒤져','디져','닥쳐','닥치','호로','개년','쌍년','쌍놈','등신','애미','애비','ㅂㅅ','ㅈㄹ','ㅁㅊ','sex'];
  var reWord=new RegExp('(^|\\s)('+HARD_WORD.join('|')+')(아|야|들|이|의|임|같|어|라|냐|네|지|할|럴|$|[\\s!?.,~…ㅋㅎ])');
  var SOFT=['멍청','못생','꼴통','또라이','돌아이','쓰레기','한심','찌질','빻','ㅗ'];
  var ZW=/[\s​‌‍⁠\.\,\-\_\~\!\?\*\#\@\^\&\(\)\[\]\{\}\/\\\|\+\=\:\;\'\"\`<>·ㆍ]/g;
  function norm(s){return String(s||'').toLowerCase().replace(ZW,'')}
  function clean(text){
    var t=String(text||'').replace(/\s+/g,' ').trim();
    if(!t)return {ok:false,text:'',why:'내용을 적어 주세요'};
    t=t.replace(/(.)\1{4,}/g,'$1$1$1$1$1');   /* [2026-10-24b] 같은 글자 반복(ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ·!!!!!!!!!!)은 흔한 응원이라 막지 않고 5개로 접음 */
    if(t.length>300)return {ok:false,text:t,why:'300자 이내로 적어 주세요'};
    var n=norm(t),why='욕설·비방으로 보이는 말이 있어 보낼 수 없어요. 응원하는 말로 바꿔 주세요';
    for(var i=0;i<HARD.length;i++){if(n.indexOf(norm(HARD[i]))>=0)return {ok:false,text:t,why:why}}
    if(reWord.test(t.toLowerCase()))return {ok:false,text:t,why:why};
    if(/01[016789][\s\-\.]?\d{3,4}[\s\-\.]?\d{4}/.test(t))return {ok:false,text:t,why:'전화번호 같은 개인정보는 적을 수 없어요'};
    if(/(https?:\/\/|www\.)/i.test(t))return {ok:false,text:t,why:'링크는 적을 수 없어요'};
    var out=t;SOFT.forEach(function(w){var re=new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g');out=out.replace(re,function(m){return '*'.repeat(m.length)})});
    return {ok:true,text:out,why:''};
  }
  function mask(n){n=String(n||'').trim();if(!n)return '익명';if(n.length<2)return n;if(n.length===2)return n[0]+'*';return n[0]+'*'.repeat(n.length-2)+n[n.length-1]}
  function canWrite(me,my){return !!(me&&my&&my.status==='approved'&&my.name)}
  function db(){return firebase.firestore()}
  function listen(room,cb,opt){opt=opt||{};var lim=+opt.limit||60;
    return db().collection('liveChat').doc(room).collection('msgs').orderBy('at','desc').limit(lim).onSnapshot(function(q){
      var L=q.docs.map(function(d){var x=d.data()||{};x.id=d.id;return x}).filter(function(m){return !m.del}).reverse();cb(L)},function(e){console.warn('comments',room,e);cb([],e)})}
  function send(room,text,me,my){
    if(!me)return Promise.reject(new Error('로그인 후 적을 수 있어요'));
    if(!canWrite(me,my))return Promise.reject(new Error('가입 승인 뒤에 적을 수 있어요'));
    var c=clean(text);if(!c.ok)return Promise.reject(new Error(c.why));
    return db().collection('liveChat').doc(room).collection('msgs').add({uid:me.uid,name:my.name||'',text:c.text,op:false,room:room,at:firebase.firestore.FieldValue.serverTimestamp()})
      .catch(function(e){throw new Error(/permission/i.test(String(e))?'권한이 없어요 (가입 승인 뒤에 적을 수 있어요)':(e.message||String(e)))})}
  function del(room,id,by){return db().collection('liveChat').doc(room).collection('msgs').doc(id).update({del:true,delBy:by||''})}
  function timeAgo(ts){try{var d=ts&&ts.toDate?ts.toDate():(ts?new Date(ts):null);if(!d||isNaN(d))return '';var s=(Date.now()-d.getTime())/1000;if(s<60)return '방금';if(s<3600)return Math.floor(s/60)+'분 전';return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}catch(e){return ''}}
  function guideHtml(opt){opt=opt||{};return '<div class="cmt-guide" style="font-size:'+(opt.size||'11.5px')+';color:'+(opt.color||'#6b7280')+';line-height:1.55;word-break:keep-all">'
    +(opt.title?'<b>'+esc(opt.title)+'</b> ':'')+'이름은 일부가 가려져(예: 김*수) 표시되고 누구나 볼 수 있어요. 욕설·비방·놀림·개인정보(전화번호 등)·광고는 보낼 수 없고, 운영진이 지울 수 있어요. 선수와 학교를 응원하는 따뜻한 말을 남겨 주세요.</div>'}
  window.KFDF_CMT={clean:clean,listen:listen,send:send,del:del,mask:mask,guideHtml:guideHtml,canWrite:canWrite,timeAgo:timeAgo,esc:esc};
})();
