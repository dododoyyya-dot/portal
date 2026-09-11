// v20260911a · 공고 지역 알림 — 대회 참가 모집·심판·운영요원 모집·단기 강사 구인 공고가 올라오면
//   회원의 주소지·거점·활동 지역(시도)과 맞는 회원에게 알림(🔔)을 보냅니다. 학생회원·미성년은 제외(자격 취득·활동 불가).
//   ① 올리는 순간(push): 올린 사람이 볼 수 있는 회원(중앙=전체, 시도임원=관할 시도)에게 바로
//   ② 들어오는 순간(pull): 그 밖의 회원은 사이트에 들어올 때 최근 14일 공고 중 내 지역 것을 찾아 스스로 알림을 만듭니다
//   알림 문서 ID = pa_종류_공고ID_회원 — 두 경로가 겹쳐도 한 번만 남습니다.
(function(){
  var SIDOS=['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주'];
  var FULL={'서울특별시':'서울','부산광역시':'부산','대구광역시':'대구','인천광역시':'인천','광주광역시':'광주','대전광역시':'대전','울산광역시':'울산','세종특별자치시':'세종','경기도':'경기','강원특별자치도':'강원','강원도':'강원','충청북도':'충북','충청남도':'충남','전북특별자치도':'전북','전라북도':'전북','전라남도':'전남','경상북도':'경북','경상남도':'경남','제주특별자치도':'제주','제주도':'제주','충청북':'충북','충청남':'충남','전라북':'전북','전라남':'전남','경상북':'경북','경상남':'경남'};
  var REG={'서울·경기':['서울','인천','경기'],'수도권':['서울','인천','경기'],'강원':['강원'],'충청':['대전','세종','충북','충남'],'전라':['광주','전북','전남'],'호남':['광주','전북','전남'],'경상':['부산','대구','울산','경북','경남'],'영남':['부산','대구','울산','경북','경남'],'제주':['제주']};
  function uniq(a){var o=[],s={};a.forEach(function(x){if(x&&!s[x]){s[x]=1;o.push(x)}});return o}
  function sidosIn(t){
    t=String(t||'').replace(/경기장/g,'');if(!t)return [];var out=[];   // 「사직경기장」의 경기 ≠ 경기도
    Object.keys(FULL).forEach(function(k){if(t.indexOf(k)>=0)out.push(FULL[k])});
    SIDOS.forEach(function(s){if(new RegExp('^'+s+'|(^|[^가-힣])'+s+'(?=$|[^가-힣]|시|도|광역|특별)').test(t))out.push(s)});   // 「해운대구」의 대구처럼 다른 낱말 속 글자는 제외
    Object.keys(REG).forEach(function(r){if(t===r||t.indexOf(r+'권')>=0||t===r+' 권역')out=out.concat(REG[r])});
    if(!out.length&&window.KFDF_MAP&&KFDF_MAP.cityOf){try{var c=KFDF_MAP.cityOf(t);if(c)out.push(c)}catch(e){}}   // 시·군·구 이름만 있는 장소
    if(out.indexOf('경기')>=0&&/경기[^가-힣]*(도\s*)?광주시/.test(t))out=out.filter(function(x){return x!=='광주'});   // 경기도 광주시 ≠ 광주광역시
    return uniq(out);
  }
  function isNationwide(t){return /전국/.test(String(t||''))}
  // 공고 → 시도 목록 ([] = 전국 · 알 수 없음이면 null)
  function postSidos(p){
    var texts=[p.location,p.place,p.area,p.address].filter(Boolean);
    if(texts.some(isNationwide)||isNationwide(p.region)||isNationwide(p.sido))return [];
    var out=[];texts.forEach(function(t){out=out.concat(sidosIn(t))});
    if(!out.length&&p.sido)out=sidosIn(p.sido);
    if(!out.length&&p.bySido)out=sidosIn(p.bySido);
    if(!out.length&&p.region)out=REG[p.region]?REG[p.region].slice():sidosIn(p.region);
    return out.length?uniq(out):null;
  }
  function userSidos(v){
    var out=[];[v.sidoKey,v.baseCity,v.address,v.sido].forEach(function(t){out=out.concat(sidosIn(t))});
    (v.activityAreas||[]).forEach(function(a){out=out.concat(sidosIn(a))});
    (v.activityRegions||[]).forEach(function(r){if(REG[r])out=out.concat(REG[r])});
    if(v.region&&REG[v.region]&&!out.length)out=out.concat(REG[v.region]);
    return uniq(out);
  }
  function ageOf(b){var m=String(b||'').match(/^(\d{4})-(\d{2})-(\d{2})/);if(!m)return null;var t=new Date(),a=t.getFullYear()-(+m[1]);if(t.getMonth()+1<+m[2]||(t.getMonth()+1===+m[2]&&t.getDate()<+m[3]))a--;return a}
  // 알림 대상: 승인 회원 · 학생회원·미성년 제외
  function eligible(v){
    if(!v||v.deleted||v.status!=='approved')return false;
    if(v.accountType==='student'||v.memberGroup==='student'||v.isMinor===true)return false;
    var a=ageOf(v.birth);if(a!==null&&a<18)return false;
    if(v.notifyPosts===false)return false;   // 본인이 끈 경우(마이페이지 설정용)
    return true;
  }
  function matches(v,ps){if(ps===null)return false;if(!ps.length)return true;var us=userSidos(v);return ps.some(function(s){return us.indexOf(s)>=0})}
  var KIND={comp:['🏆','대회 참가 모집'],staff:['🏁','심판·운영요원 모집'],gig:['🔎','단기 강사 구인']};
  function titleOf(kind,p,ps){var k=KIND[kind]||['📢','공고'];var where=(ps&&ps.length)?ps.slice(0,3).join('·'):'전국';return k[0]+' ['+where+'] '+(p.title||p.competitionName||'공고')+' — '+k[1]+' 공고가 올라왔습니다 (내 활동 지역)'}
  function nid(kind,id,uid){return ('pa_'+kind+'_'+id+'_'+uid).replace(/[\/\s]/g,'_').slice(0,700)}
  function docOf(kind,id,p,ps,link,uid){return {toUid:uid,title:titleOf(kind,p,ps),link:link,read:false,kind:'postAlert',postKind:kind,postId:id,createdAt:firebase.firestore.FieldValue.serverTimestamp()}}
  // ① 올리는 순간 — users: [{id, data}] (없으면 올린 사람 권한으로 조회)
  async function push(DB,kind,id,p,link,me,meDoc,users){
    var ps=postSidos(p);if(ps===null)return {sent:0,sidos:null};
    if(!users){
      var isAdm=meDoc&&(meDoc.owner===true||meDoc.role==='admin'||(meDoc.roles||[]).indexOf('admin')>=0);
      var isSido=meDoc&&(meDoc.role==='sidoOfficer'||(meDoc.roles||[]).indexOf('sidoOfficer')>=0);
      try{
        if(isAdm){var s=await DB.collection('users').get();users=s.docs.map(function(d){return {id:d.id,data:d.data()}})}
        else if(isSido&&meDoc.sido){var r=await Promise.all([DB.collection('users').where('sidoKey','==',meDoc.sido).get(),DB.collection('users').where('sidoKey','==','').get().catch(function(){return {docs:[]}})]);users=r[0].docs.concat(r[1].docs).map(function(d){return {id:d.id,data:d.data()}})}
        else users=[];
      }catch(e){users=[]}
    }
    var to=users.filter(function(u){return u.id!==me&&eligible(u.data)&&matches(u.data,ps)});
    var sent=0;
    for(var i=0;i<to.length;i+=400){var part=to.slice(i,i+400);var b=DB.batch();part.forEach(function(u){b.set(DB.collection('notifications').doc(nid(kind,id,u.id)),docOf(kind,id,p,ps,link,u.id))});
      try{await b.commit();sent+=part.length}catch(e){for(var j=0;j<part.length;j++){try{await DB.collection('notifications').doc(nid(kind,id,part[j].id)).set(docOf(kind,id,p,ps,link,part[j].id));sent++}catch(e2){}}}}
    return {sent:sent,sidos:ps};
  }
  // ② 들어오는 순간 — 최근 14일 공고 중 내 지역 것 (2시간에 한 번)
  async function pull(DB,uid,meDoc){
    try{
      if(!eligible(meDoc))return 0;
      var key='kfdf_pa_'+uid,now=Date.now();var st={};try{st=JSON.parse(localStorage.getItem(key)||'{}')}catch(e){}
      if(st.at&&now-st.at<2*3600e3)return 0;
      var since=now-14*864e5,today=new Date().toISOString().slice(0,10);var seen=st.seen||{};var made=0;
      var ms=function(t){return t&&t.toMillis?t.toMillis():(t&&t.seconds?t.seconds*1000:0)};
      var cand=[];
      try{var a=await DB.collection('compSlots').orderBy('createdAt','desc').limit(40).get();a.docs.forEach(function(d){var x=d.data()||{};if(ms(x.createdAt)<since)return;if((x.deadline&&x.deadline<today)||(x.date&&x.date<today))return;
        cand.push({kind:x.role==='참가'?'comp':'staff',id:d.id,p:{title:x.title,region:x.region,bySido:x.bySido,place:x.place,sido:x.sido},link:'competition.html?slot='+d.id})})}catch(e){}
      try{var b=await DB.collection('competitionStaff').where('approved','==',true).limit(80).get();b.docs.forEach(function(d){var x=d.data()||{};if(ms(x.createdAt)<since)return;if((x.deadline&&x.deadline<today)||(x.endDate&&x.endDate<today))return;
        cand.push({kind:'staff',id:d.id,p:{title:x.competitionName,location:x.location,sido:x.sido},link:'staff.html?post='+d.id})})}catch(e){}
      try{var c=await DB.collection('gigs').where('status','==','승인').limit(100).get();c.docs.forEach(function(d){var x=d.data()||{};if(ms(x.approvedAt||x.createdAt)<since)return;
        cand.push({kind:'gig',id:d.id,p:{title:x.title,area:x.area},link:'jobs.html#gigList'})})}catch(e){}
      for(var i=0;i<cand.length;i++){var k=cand[i];var n=nid(k.kind,k.id,uid);if(seen[n])continue;var ps=postSidos(k.p);if(!matches(meDoc,ps)){seen[n]=1;continue}
        try{await DB.collection('notifications').doc(n).set(docOf(k.kind,k.id,k.p,ps,k.link,uid));made++}catch(e){}   // 이미 있으면(올린 순간 받은 알림) 권한상 덮어쓰지 못하고 넘어갑니다
        seen[n]=1}
      var keys=Object.keys(seen);if(keys.length>400){var s2={};keys.slice(-300).forEach(function(k2){s2[k2]=1});seen=s2}
      try{localStorage.setItem(key,JSON.stringify({at:now,seen:seen}))}catch(e){}
      return made;
    }catch(e){return 0}
  }
  window.KFDF_POSTALERT={postSidos:postSidos,userSidos:userSidos,eligible:eligible,matches:matches,push:push,pull:pull,sidosIn:sidosIn};
})();
