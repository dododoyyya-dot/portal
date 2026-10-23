/* ══════════ 원반 놀이터 2부 (play_fun.js) — C 원반 골프 · D 룰 퀴즈 · E 포지션 테스트 · F 오늘의 운세 · G 랭킹·승부 예측 ══════════
   play.js 다음에 불러옴(ME·MYD·TAB·say·modal·shareCard·mascot 등 공용) */

/* ══ C. 원반 골프 챌린지 — 옆에서 본 화면, 뒤로 끌었다 놓아 던지기, 바람·글라이드 물리, 5홀 합계 ══ */
const GW=960,GH=440,GG=372,PX=21,TX=64;
let GM=null;
function gameRender(el){
  const best=+ls('pgGolfBest')||0;
  el.innerHTML='<div class="pg-card"><div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px;flex-wrap:wrap"><div><h2 class="pg-h">원반 골프 챌린지</h2><p class="pg-sub" style="margin:0">원반을 <b>뒤로 끌었다가 놓으면</b> 날아가요. 바람을 보고 바스켓에 쏙! 5홀 합계 점수로 겨뤄요.</p></div><div class="pg-note"><b>내 최고 점수</b> <b style="font-size:18px;color:var(--pn)" id="gmBest">'+best+'</b>점'+(ME?'':' · 로그인하면 전국 랭킹에 올라가요')+'</div></div>'
    +'<div class="gm-box" style="margin-top:12px"><canvas id="gmCv" width="'+GW+'" height="'+(window.innerWidth<640?660:GH)+'"></canvas><div class="gm-over" id="gmOver"></div></div>'
    +'<div class="gm-side"><div class="pg-note">'+I('target',{size:16,color:'#13306b'})+' <b>점수</b> — 바스켓 인 <b>100점 + 거리×2</b>, 못 넣으면 가까울수록 최대 60점. 멀수록, 바람이 셀수록 대박 점수!</div><div class="pg-note">'+I('flag',{size:16,color:'#13306b'})+' <b>요령</b> — 길게 당길수록 세게, 아래로 당길수록 높이 날아가요. 등바람(→)이면 덜 세게, 맞바람(←)이면 더 세게.</div></div></div>';
  gmInit()}
function gmStop(){if(GM&&GM.raf)cancelAnimationFrame(GM.raf);GM=null}
function gmHoles(){const r=Math.random;const ds=[[13,18],[16,23],[20,27],[23,31],[26,34]];return ds.map((d,i)=>({d:Math.round(d[0]+r()*(d[1]-d[0])),w:Math.round(((r()*2-1)*(i===0?2:4.5))*10)/10}))}
function gmInit(){gmStop();const cv=document.getElementById('gmCv');if(!cv)return;const g=cv.getContext('2d');
  GM={cv:cv,g:g,holes:gmHoles(),h:0,total:0,res:[],st:'intro',disc:null,trail:[],parts:[],drag:null,msg:null,t:0,clouds:[[120,70,1],[420,46,.8],[700,96,1.1],[880,40,.7]].map(c=>({x:c[0],y:c[1],s:c[2]}))};
  const pt=e=>{const r=cv.getBoundingClientRect();const p=e.touches?e.touches[0]:e;return {x:(p.clientX-r.left)*GW/r.width,y:(p.clientY-r.top)*cv.height/r.height}};
  const down=e=>{if(!GM||GM.st!=='aim')return;e.preventDefault();const p=pt(e);GM.drag={x0:p.x,y0:p.y,x:p.x,y:p.y}};
  const move=e=>{if(!GM||!GM.drag)return;e.preventDefault();const p=pt(e);GM.drag.x=p.x;GM.drag.y=p.y};
  const up=e=>{if(!GM||!GM.drag)return;const a=gmAim();GM.drag=null;if(a.p<.06)return;gmThrow(a)};
  cv.addEventListener('pointerdown',down);cv.addEventListener('pointermove',move);window.addEventListener('pointerup',up);cv.addEventListener('pointercancel',()=>{if(GM)GM.drag=null});
  gmOver('<h3>'+mascot({size:90})+'<br>원반 골프 챌린지</h3><p>화면 아무 곳이나 누른 채 <b>뒤로(왼쪽 아래로) 끌었다가</b> 손을 떼면 던져요.<br>5홀, 홀마다 거리와 바람이 달라요!</p><button class="pg-btn sun" onclick="gmStart()">시작하기</button>');
  let last=performance.now();const loop=now=>{if(!GM)return;const dt=Math.min(.05,(now-last)/1000);last=now;gmStep(dt);gmDraw();GM.raf=requestAnimationFrame(loop)};GM.raf=requestAnimationFrame(loop)}
function gmOver(html){const o=document.getElementById('gmOver');if(!o)return;o.style.display=html?'flex':'none';o.innerHTML=html||''}
function gmStart(){if(!GM)return;GM.holes=gmHoles();GM.h=0;GM.total=0;GM.res=[];gmOver('');gmHole()}
function gmHole(){GM.st='aim';GM.disc={x:0,y:1.2,vx:0,vy:0,rot:0};GM.trail=[];GM.msg=null}
function gmAim(){const d=GM.drag;if(!d)return {p:0,a:0};const dx=d.x0-d.x,dy=d.y0-d.y;const len=Math.hypot(dx,dy);let a=Math.atan2(-dy,dx);if(dx<=0)a=70*Math.PI/180;a=Math.max(5*Math.PI/180,Math.min(70*Math.PI/180,a));return {p:Math.min(1,len/210),a:a}}
function gmThrow(a){const v=6+a.p*13;Object.assign(GM.disc,{x:0,y:1.2,vx:v*Math.cos(a.a),vy:v*Math.sin(a.a),rot:0});GM.st='fly';GM.trail=[]}
function gmStep(dt){const H=GM.holes[GM.h];GM.t+=dt;GM.clouds.forEach(c=>{c.x+=(8+(H?H.w:0)*6)*c.s*dt;if(c.x>GW+80)c.x=-80;if(c.x<-80)c.x=GW+80});
  GM.parts=GM.parts.filter(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=500*dt;p.l-=dt;return p.l>0});
  if(GM.st==='fly'){const D=GM.disc,n=Math.ceil(dt*240);for(let i=0;i<n;i++){const st=dt/n;const sp=Math.hypot(D.vx,D.vy);const lift=.45*Math.min(1,sp/18)*(D.vy<0?1:.6);
      D.vx+=(H.w*.25-.12*D.vx)*st;D.vy+=(-9.8*(1-lift)-.12*D.vy)*st;D.x+=D.vx*st;D.y+=D.vy*st;D.rot+=st*22;
      if(Math.abs(D.x-H.d)<.75&&D.y>.55&&D.y<1.4&&D.vy<2.5){gmLand(true);return}
      if(Math.abs(D.x-H.d)<.07&&D.y<=.55&&D.y>0){D.vx=-D.vx*.25;D.x+=D.vx>0?.08:-.08}
      if(D.y<=0){D.y=0;gmLand(false);return}
      if(D.x>60||D.x<-6){gmLand(false);return}}
    if(Math.random()<.9)GM.trail.push({x:D.x,y:D.y});if(GM.trail.length>40)GM.trail.shift()}}
function gmLand(inn){const H=GM.holes[GM.h],D=GM.disc;GM.st='result';const off=Math.abs(D.x-H.d);let pts,msg;
  if(inn){pts=100+H.d*2;msg='쏙! 바스켓 인!';D.x=H.d;D.y=.9;for(let i=0;i<46;i++)GM.parts.push({x:TX+H.d*PX,y:GG-1*PX,vx:(Math.random()-.5)*420,vy:-Math.random()*420-60,l:1+Math.random()*.6,c:['#ffd23f','#ff6b6b','#2ec4a0','#6ec6ff','#fff'][i%5]})}
  else{pts=off<1?60:Math.max(0,Math.round(50-off*4));msg=off<1?'아깝다! 거의 들어갈 뻔':off<4?'좋아요! 가까워요':off<10?'괜찮아요, 다음 홀에서!':'바람이 장난을 쳤어요'}
  GM.total+=pts;GM.res.push({d:H.d,pts:pts,inn:inn});GM.msg={t:msg,p:pts,at:GM.t};
  setTimeout(()=>{if(!GM)return;GM.h++;if(GM.h>=GM.holes.length)gmEnd();else gmHole()},1700)}
async function gmEnd(){GM.st='end';const total=GM.total,ins=GM.res.filter(r=>r.inn).length;const prev=+ls('pgGolfBest')||0;if(total>prev)ls('pgGolfBest',String(total));const b=document.getElementById('gmBest');if(b)b.textContent=Math.max(prev,total);
  const lv=total>=700?['원반 골프 전설','crown']:total>=500?['바스켓 사냥꾼','tophat']:total>=300?['바람을 읽는 자','band']:total>=150?['원반 꿈나무','none']:['첫걸음 골퍼','none'];
  gmOver('<h3>'+mascot({size:86,acc:lv[1]})+'<br>'+total+'점</h3><p><b>'+lv[0]+'</b> · 바스켓 인 '+ins+'/5'+(total>prev?' · <b style="color:#ffd23f">내 최고 기록!</b>':'')+'</p><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="pg-btn sun" onclick="gmStart()">다시 하기</button><button class="pg-btn ghost" onclick="gmShare('+total+','+ins+',\''+lv[0]+'\',\''+lv[1]+'\')">점수 카드</button><button class="pg-btn ghost" onclick="RK.sub=\'game\';go(\'rank\')">랭킹 보기</button></div><p id="gmSave" style="font-size:12.5px;opacity:.85">'+(ME?'랭킹에 저장하는 중…':'로그인하면 전국 랭킹에 올라가요')+'</p>');
  if(ME){try{const ref=DB.collection('playScores').doc(ME.uid);const s=await ref.get();const o=s.exists?s.data():{};const best=Math.max(+o.best||0,total);
      await ref.set({name:myName(),best:best,games:(+o.games||0)+1,badges:myBadges(),at:FV.serverTimestamp()});const e=document.getElementById('gmSave');if(e)e.textContent=total>=best&&total>(+o.best||0)?'✓ 랭킹에 새 최고 기록으로 올렸어요!':'✓ 저장했어요 (랭킹 최고 '+best+'점)'}
    catch(e){const x=document.getElementById('gmSave');if(x)x.textContent='랭킹 저장은 보안 규칙 v58 게시 후에 돼요'}}}
function gmShare(total,ins,lv,acc){shareCard({kicker:'원반 골프 챌린지',title:total+'점',pill:lv,lines:['5홀 중 바스켓 인 '+ins+'번!','나보다 잘 던질 수 있을까?'],c1:'#2d63c4',c2:'#13306b',art:mascot({size:560,acc:acc}),who:ME?myName():''},'KFDF_원반골프_'+total)}
function gmDraw(){const g=GM.g,H=GM.holes[GM.h]||GM.holes[GM.holes.length-1];const sx=x=>TX+x*PX,sy=y=>GG-y*PX;
  let sk=g.createLinearGradient(0,0,0,GG);sk.addColorStop(0,'#2d63c4');sk.addColorStop(1,'#a9dcff');g.fillStyle=sk;g.fillRect(0,0,GW,GM.cv.height);
  const su=g.createRadialGradient(840,70,10,840,70,90);su.addColorStop(0,'rgba(255,242,168,1)');su.addColorStop(.4,'rgba(255,210,63,.9)');su.addColorStop(1,'rgba(255,210,63,0)');g.fillStyle=su;g.fillRect(740,0,200,170);
  g.fillStyle='rgba(255,255,255,.92)';GM.clouds.forEach(c=>{g.beginPath();g.ellipse(c.x,c.y,46*c.s,14*c.s,0,0,7);g.ellipse(c.x+24*c.s,c.y-8*c.s,28*c.s,15*c.s,0,0,7);g.ellipse(c.x-26*c.s,c.y-3*c.s,22*c.s,11*c.s,0,0,7);g.fill()});
  g.fillStyle='#57c99c';g.beginPath();g.moveTo(0,300);g.bezierCurveTo(200,240,380,270,560,300);g.bezierCurveTo(740,250,880,262,960,280);g.lineTo(960,GG);g.lineTo(0,GG);g.fill();
  g.fillStyle='#2f9e78';[[170,300],[204,296],[640,302],[676,297],[712,294]].forEach(t=>{g.fillRect(t[0]-2,t[1],4,16);g.beginPath();g.arc(t[0],t[1]-2,13,0,7);g.fill()});
  const gr=g.createLinearGradient(0,GG,0,GH);gr.addColorStop(0,'#4cc98f');gr.addColorStop(1,'#2a9d6e');g.fillStyle=gr;g.fillRect(0,GG,GW,GM.cv.height-GG);
  g.fillStyle='rgba(255,255,255,.08)';for(let i=0;i<12;i++)if(i%2)g.fillRect(i*80,GG,80,GH-GG);
  g.font='700 11px Pretendard,sans-serif';g.textAlign='center';for(let m=10;m<=45;m+=10){const x=sx(m);g.fillStyle='rgba(255,255,255,.85)';g.fillRect(x-1,GG-10,2,10);g.fillText(m+'m',x,GG+16)}
  g.fillStyle='#d7c39a';g.beginPath();g.roundRect?g.roundRect(TX-26,GG-4,52,9,4):g.rect(TX-26,GG-4,52,9);g.fill();
  /* 바스켓 */
  const bx=sx(H.d);g.fillStyle='rgba(19,48,107,.18)';g.beginPath();g.ellipse(bx,GG+2,18,4,0,0,7);g.fill();g.fillStyle='#e8edf5';g.fillRect(bx-3,sy(1.45),6,GG-sy(1.45));g.fillStyle='#ffd23f';g.beginPath();g.ellipse(bx,sy(.62),16,5,0,0,7);g.fill();g.fillRect(bx-16,sy(.62),32,11);g.beginPath();g.ellipse(bx,sy(.62)+11,16,5,0,0,Math.PI);g.fill();g.fillStyle='#e0b000';g.beginPath();g.ellipse(bx,sy(.62),16,5,0,Math.PI,0);g.fill();
  g.strokeStyle='#d5dde9';g.lineWidth=1.5;for(let i=-3;i<=3;i++){g.beginPath();g.moveTo(bx+i*4.6,sy(1.38));g.quadraticCurveTo(bx+i*2.6,sy(1),bx+i*1.6,sy(.66));g.stroke()}
  g.strokeStyle='#ffd23f';g.lineWidth=5;g.beginPath();g.ellipse(bx,sy(1.4),16,4.5,0,0,7);g.stroke();
  g.fillStyle='#ff6b6b';g.beginPath();g.moveTo(bx,sy(1.45)-26);g.lineTo(bx+(H.w>=0?18:-18),sy(1.45)-20);g.lineTo(bx,sy(1.45)-14);g.fill();g.fillStyle='#e8edf5';g.fillRect(bx-1,sy(1.45)-28,2,28);
  /* HUD — 좁은 화면에서는 글자를 키움 */
  const K=Math.min(2.2,Math.max(1,GW/((GM.cv.clientWidth||GW))*.6));g.save();g.scale(K,K);
  g.fillStyle='rgba(19,48,107,.78)';g.beginPath();g.roundRect?g.roundRect(14,12,256,58,14):g.rect(14,12,256,58);g.fill();g.fillStyle='#fff';g.textAlign='left';g.font='900 15px Pretendard,sans-serif';g.fillText('HOLE '+Math.min(GM.h+1,5)+' / 5 · '+H.d+'m',28,36);
  g.font='800 13px Pretendard,sans-serif';const wl=Math.abs(H.w);g.fillText('바람 '+(H.w>0?'→ 등바람':H.w<0?'← 맞바람':'없음')+' '+wl.toFixed(1)+'m/s',28,58);
  g.strokeStyle='#ffd23f';g.lineWidth=3;g.beginPath();const ax=226,ay=40,al=6+wl*6;g.moveTo(ax-(H.w>=0?al:-al)/2,ay);g.lineTo(ax+(H.w>=0?al:-al)/2,ay);g.stroke();if(wl>0){g.fillStyle='#ffd23f';g.beginPath();const tip=ax+(H.w>=0?al:-al)/2,dir=H.w>=0?1:-1;g.moveTo(tip+dir*7,ay);g.lineTo(tip-dir*2,ay-6);g.lineTo(tip-dir*2,ay+6);g.fill()}
  g.restore();g.save();g.translate(GW,0);g.scale(K,K);g.fillStyle='rgba(19,48,107,.78)';g.beginPath();g.roundRect?g.roundRect(-170,12,156,58,14):g.rect(-170,12,156,58);g.fill();g.fillStyle='#fff';g.textAlign='right';g.font='800 12px Pretendard,sans-serif';g.fillText('점수',-28,32);g.font='900 24px Pretendard,sans-serif';g.fillText(String(GM.total),-28,60);
  g.textAlign='left';GM.res.forEach((r,i)=>{g.fillStyle=r.inn?'#ffd23f':'rgba(255,255,255,.45)';g.beginPath();g.arc(-156+i*16,50,5,0,7);g.fill()});g.restore();
  /* 조준 */
  if(GM.st==='aim'&&GM.drag){const a=gmAim();const v=6+a.p*13;let x=0,y=1.2,vx=v*Math.cos(a.a),vy=v*Math.sin(a.a);g.fillStyle='rgba(255,255,255,.9)';for(let i=0;i<26;i++){for(let k=0;k<6;k++){const st=1/120;vx+=-.12*vx*st;vy+=(-9.8*.75-.12*vy)*st;x+=vx*st;y+=vy*st}if(i%2===0){g.beginPath();g.arc(sx(x),sy(y),3,0,7);g.fill()}}
    g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=8;g.beginPath();g.arc(sx(0),sy(1.2),34,0,7);g.stroke();g.strokeStyle=a.p>.85?'#ff6b6b':a.p>.5?'#ffd23f':'#2ec4a0';g.beginPath();g.arc(sx(0),sy(1.2),34,-Math.PI/2,-Math.PI/2+a.p*Math.PI*2);g.stroke()}
  if(GM.st==='aim'&&!GM.drag&&Math.floor(GM.t*2)%2===0){g.fillStyle='rgba(19,48,107,.75)';g.font='800 '+Math.round(13*K)+'px Pretendard,sans-serif';g.textAlign='left';g.fillText('← 뒤로 끌었다가 놓기',sx(0)+10,sy(1.2)-40*K)}
  /* 궤적·원반 */
  GM.trail.forEach((p,i)=>{g.fillStyle='rgba(255,255,255,'+(i/GM.trail.length*.6)+')';g.beginPath();g.arc(sx(p.x),sy(p.y),2.5,0,7);g.fill()});
  if(GM.disc&&GM.st!=='end'){const D=GM.disc,x=sx(D.x),y=sy(D.y);g.save();g.translate(x,y);g.rotate(Math.max(-.5,Math.min(.5,-Math.atan2(D.vy,Math.max(1,D.vx))*.4)));
    g.fillStyle='#e09a00';g.beginPath();g.ellipse(0,3,15,5.5,0,0,7);g.fill();const dg=g.createLinearGradient(0,-6,0,6);dg.addColorStop(0,'#ffe066');dg.addColorStop(1,'#ffb000');g.fillStyle=dg;g.beginPath();g.ellipse(0,0,15,5.5,0,0,7);g.fill();
    g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=1.4;g.beginPath();g.ellipse(0,-.5,10,3.2,0,0,7);g.stroke();
    if(GM.st==='aim'){g.fillStyle='#13306b';g.beginPath();g.arc(-4,-1,1.4,0,7);g.arc(4,-1,1.4,0,7);g.fill()}else{g.fillStyle='rgba(255,255,255,.8)';const r=D.rot%(Math.PI*2);g.fillRect(Math.cos(r)*9-1,-1.2,2.5,2)}
    g.restore()}
  GM.parts.forEach(p=>{g.fillStyle=p.c;g.globalAlpha=Math.max(0,p.l);g.fillRect(p.x,p.y,6,3.5);g.globalAlpha=1});
  if(GM.msg){const k=Math.min(1,(GM.t-GM.msg.at)*4);g.save();g.translate(GW/2,150-k*10);g.scale((.8+k*.2)*K,(.8+k*.2)*K);g.textAlign='center';g.fillStyle='rgba(19,48,107,.85)';g.beginPath();g.roundRect?g.roundRect(-170,-40,340,74,20):g.rect(-170,-40,340,74);g.fill();g.fillStyle='#fff';g.font='400 26px Jua,Pretendard,sans-serif';g.fillText(GM.msg.t,0,-6);g.fillStyle='#ffd23f';g.font='900 18px Pretendard,sans-serif';g.fillText('+'+GM.msg.p+'점',0,22);g.restore()}}

/* ══ D. 룰 퀴즈 ══ */
const QUIZ=[
 {q:'얼티미트에서 원반을 잡은 선수가 할 수 있는 것은?',o:['원반을 들고 달리기','한 발을 축으로 몸 돌리기(피벗)','원반을 땅에 굴리기','같은 팀에게 손으로 건네주기'],a:1,ex:'원반을 잡으면 달릴 수 없어요. 한 발을 축으로 몸을 돌려(피벗) 패스할 곳을 찾아요.'},
 {q:'원반을 가진 선수가 패스할 때까지 수비가 세는 「스톨 카운트」는 보통 몇까지?',o:['5','10','15','30'],a:1,ex:'국제 규칙(WFDF)에서는 10까지 세요. 다 세기 전에 패스해야 해요.'},
 {q:'얼티미트에서 점수가 나는 순간은?',o:['원반이 골대 그물에 들어갈 때','상대 엔드존 안에서 같은 팀이 원반을 잡을 때','원반을 가장 멀리 던졌을 때','상대가 원반을 떨어뜨릴 때'],a:1,ex:'상대편 엔드존 안에서 우리 팀 선수가 원반을 잡으면 1점!'},
 {q:'패스한 원반이 땅에 떨어지면?',o:['다시 던질 수 있다','공격권이 상대 팀으로 넘어간다','1점을 잃는다','심판이 다시 던져 준다'],a:1,ex:'떨어지거나, 밖으로 나가거나, 가로채이면 공격권이 바뀌어요(턴오버).'},
 {q:'경기 시작이나 득점 뒤 수비 팀이 원반을 멀리 던져 주는 것은?',o:['서브','킥오프','풀(Pull)','토스'],a:2,ex:'얼티미트의 시작은 「풀」! 수비 팀이 공격 팀 쪽으로 멀리 던져요.'},
 {q:'얼티미트를 특별하게 만드는 「스피릿 오브 더 게임」의 뜻은?',o:['무조건 이기는 정신','스포츠맨십과 상대 존중','가장 빨리 달리는 정신','심판에게 항의하는 권리'],a:1,ex:'규칙을 지키고 상대를 존중하는 마음. 그래서 페어플레이 점수도 함께 매겨요.'},
 {q:'얼티미트에서 몸싸움은?',o:['어깨까지는 괜찮다','원칙적으로 하지 않는 비접촉 경기','수비만 할 수 있다','마지막 5분만 된다'],a:1,ex:'얼티미트는 몸이 부딪치지 않게 하는 비접촉 경기예요. 부딪치면 반칙이에요.'},
 {q:'국제 규칙(WFDF)에서 얼티미트 한 팀이 경기장에서 뛰는 선수는?',o:['5명','7명','9명','11명'],a:1,ex:'국제 규칙은 7명이에요. 학교 대회는 규모에 맞게 바꿔 운영하기도 해요.'},
 {q:'디스크골프의 목표는?',o:['가장 멀리 던지기','가장 적은 던지기 횟수로 바스켓에 넣기','상대 원반 맞히기','가장 높이 던지기'],a:1,ex:'골프처럼 적은 횟수로 넣을수록 좋아요.'},
 {q:'디스크골프에서 원반을 넣는 골대의 이름은?',o:['골포스트','바스켓','후프','링'],a:1,ex:'쇠사슬(체인)이 달린 바스켓! 체인에 맞으면 원반이 바스켓 안으로 떨어져요.'},
 {q:'디스크골프에서 홀마다 처음 던지는 곳은?',o:['티(티 패드)','그린','벙커','엔드존'],a:0,ex:'티에서 출발해 바스켓까지 가요.'},
 {q:'디스크골프에서 한 홀의 기준 타수를 무엇이라 할까요?',o:['버디','파','보기','이글'],a:1,ex:'기준 타수는 「파」. 1타 적으면 버디, 1타 많으면 보기예요.'},
 {q:'기준 타수(파)보다 1타 적게 넣으면?',o:['보기','버디','홀인원','파'],a:1,ex:'버디! 2타 적으면 이글이에요.'},
 {q:'바스켓 가까이에서 짧게 넣는 던지기를 무엇이라 할까요?',o:['드라이브','퍼트','풀','해머'],a:1,ex:'골프처럼 짧게 넣는 건 「퍼트」.'},
 {q:'몸 반대쪽에서 몸을 가로질러 던지는 가장 기본적인 던지기는?',o:['백핸드','포핸드','해머','롤러'],a:0,ex:'원반 던지기의 기본, 백핸드!'},
 {q:'손바닥이 위를 보게 몸 옆에서 손목으로 튕기듯 던지는 것은?',o:['백핸드','포핸드(플릭)','스쿠버','오버헤드'],a:1,ex:'포핸드 또는 플릭이라고 불러요.'},
 {q:'원반을 머리 위로 세워 던져 뒤집혀 날아가게 하는 던지기는?',o:['해머','백핸드','롤러','퍼트'],a:0,ex:'해머! 수비 머리 위로 넘길 때 좋아요.'},
 {q:'원반이 오래 떠서 날아가는 데 가장 중요한 것은?',o:['무게','회전(스핀)','색깔','던지는 소리'],a:1,ex:'회전이 원반을 안정시켜 줘요. 회전이 많을수록 흔들리지 않아요.'},
 {q:'맞바람(앞에서 부는 바람)에 원반을 던지면?',o:['더 높이 뜨려고 한다','바로 떨어진다','더 빨라진다','아무 변화 없다'],a:0,ex:'맞바람을 받으면 원반이 위로 솟으려 해요. 조금 낮게 던져 보세요.'},
 {q:'「프리스비」라는 말은 원래 무엇일까요?',o:['종목 이름','장난감 회사의 상표 이름','원반을 만든 사람 이름','미국의 도시 이름'],a:1,ex:'프리스비는 상표 이름이라, 공식 종목명은 「플라잉디스크」예요.'},
 {q:'경기 중 팀이 잠깐 멈추고 작전을 짜는 시간은?',o:['하프타임','작전타임(타임아웃)','풀','스톨'],a:1,ex:'작전타임! 기록 화면에도 따로 기록돼요.'},
 {q:'이번 축전에서 경기 점수·제재를 실시간으로 기록하는 사람은?',o:['선수 본인','관중','심판(점수심·기록심)','선생님'],a:2,ex:'심판진이 실시간으로 기록해요. 그래서 홈 화면에 점수가 바로 떠요.'},
 {q:'대회 오더지에서 선생님이 비고란에 고르는 역할은?',o:['주장 1명','주전 7명','교체 선수','골키퍼'],a:0,ex:'주장 1명만 골라요. 주전·교체는 고르지 않아요.'},
 {q:'경기가 끝나면 심판진이 매기는 것이 아닌 것은?',o:['페어플레이 점수','최우수선수','지도자 점수','관중 수'],a:3,ex:'페어플레이·지도자 점수와 최우수선수를 정해요. 관중 수는 매기지 않아요.'}
];
let QZ=null;
function quizRender(el){if(!QZ||QZ.done===undefined)QZ=null;
  if(!QZ){el.innerHTML='<div class="pg-card" style="text-align:center">'+mascot({acc:'hat',size:150,c1:'#c9bfff',c2:'#8b7cf6'})+'<h2 class="pg-h">플라잉디스크 룰 퀴즈</h2><p class="pg-sub">얼티미트·디스크골프·던지기·대회 상식 10문제! 다 맞히면 「원반 마스터」 🏅</p><button class="pg-btn sun" onclick="quizStart()">퀴즈 시작</button>'+(ls('pgQuizBest')?'<p class="pg-sub" style="margin-top:10px">내 최고 '+ls('pgQuizBest')+' / 10</p>':'')+'</div>';return}
  if(QZ.i>=QZ.qs.length){quizEnd(el);return}
  const q=QZ.qs[QZ.i];
  el.innerHTML='<div class="pg-card"><div class="qz-bar">'+QZ.qs.map((x,i)=>'<i class="'+(i<QZ.i?(QZ.ok[i]?'ok':'ng'):i===QZ.i?'cur':'')+'"></i>').join('')+'</div><div style="font:900 12.5px Pretendard;color:var(--ink2)">문제 '+(QZ.i+1)+' / '+QZ.qs.length+' · 맞힌 개수 '+QZ.score+'</div>'
    +'<div class="qz-q">'+esc(q.q)+'</div><div class="qz-o">'+q.o.map((t,i)=>'<button onclick="quizPick('+i+')" '+(QZ.picked!=null?'disabled':'')+' class="'+(QZ.picked!=null?(i===q.a?'ok':i===QZ.picked?'ng':''):'')+'"><i>'+'ABCD'[i]+'</i>'+esc(t)+'</button>').join('')+'</div>'
    +(QZ.picked!=null?'<div class="qz-ex">'+(QZ.picked===q.a?'<b style="color:#0f8a6c">정답!</b> ':'<b style="color:#d64545">아쉬워요!</b> ')+esc(q.ex)+'</div><div style="text-align:right;margin-top:12px"><button class="pg-btn" onclick="QZ.i++;QZ.picked=null;render()">'+(QZ.i+1<QZ.qs.length?'다음 문제 →':'결과 보기 →')+'</button></div>':'')+'</div>'}
function quizStart(){const p=QUIZ.slice().sort(()=>Math.random()-.5).slice(0,10).map(q=>{const idx=q.o.map((t,i)=>i).sort(()=>Math.random()-.5);return {q:q.q,o:idx.map(i=>q.o[i]),a:idx.indexOf(q.a),ex:q.ex}});QZ={qs:p,i:0,score:0,ok:[],picked:null,done:false};render()}
function quizPick(i){if(QZ.picked!=null)return;QZ.picked=i;const ok=i===QZ.qs[QZ.i].a;QZ.ok[QZ.i]=ok;if(ok)QZ.score++;render()}
const QLV=[[10,'원반 마스터','crown'],[8,'원반 박사','hat'],[6,'원반 탐험가','glasses'],[4,'원반 꿈나무','band'],[0,'원반 새싹','none']];
function quizEnd(el){const sc=QZ.score;const lv=QLV.find(x=>sc>=x[0]);const best=Math.max(+ls('pgQuizBest')||0,sc);ls('pgQuizBest',String(best));
  el.innerHTML='<div class="pg-card"><div class="qz-res">'+mascot({acc:lv[2],size:170})+'<div><div style="font:900 13px Pretendard;color:var(--ink2)">10문제 중</div><div style="font:400 54px Jua,Pretendard;color:var(--pn);line-height:1">'+sc+'개 정답</div><h3 class="pg-h" style="margin-top:6px">'+lv[1]+' Lv.'+Math.max(1,Math.ceil(sc/2))+'</h3><p class="pg-sub">'+(sc===10?'완벽해요! 심판을 해도 되겠는데요?':sc>=7?'대단해요! 규칙을 거의 다 알고 있어요.':sc>=4?'좋아요! 틀린 문제 설명을 다시 보면 금방 늘어요.':'괜찮아요! 다시 하면 문제가 섞여 나와요.')+'</p>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="pg-btn sun" onclick="quizStart()">다시 풀기</button><button class="pg-btn ghost" onclick="shareCard({kicker:\'플라잉디스크 룰 퀴즈\',title:\''+lv[1]+'\',pill:\'10문제 중 '+sc+'개 정답\',lines:[\'나도 원반 박사에 도전!\'],c1:\'#8b7cf6\',c2:\'#2a1f6b\',art:mascot({acc:\''+lv[2]+'\',size:560,c1:\'#c9bfff\',c2:\'#8b7cf6\'}),who:ME?myName():\'\'},\'KFDF_퀴즈_'+sc+'\')">결과 카드</button></div></div></div></div>'}

/* ══ E. 포지션 테스트 ══ */
const TYPES={
 H:{n:'핸들러형',t:'경기를 설계하는 지휘자',acc:'glasses',c1:'#ffe066',c2:'#ffb000',bg:['#ffb000','#7a4a00'],d:'원반을 가장 많이 만지는 사령탑! 침착하게 패스 길을 읽고 팀의 공격을 이끌어요.',s:['정확한 패스','넓은 시야','침착함'],th:'백핸드 · 포핸드 숏패스',mate:'C'},
 C:{n:'커터형',t:'빈 공간을 찾는 번개',acc:'band',c1:'#ffb3b3',c2:'#ff6b6b',bg:['#ff6b6b','#7a1f2b'],d:'빈 공간으로 번개처럼 뛰어 들어가 원반을 받아 내요. 엔드존의 주인공!',s:['순간 스피드','점프 캐치','끈기'],th:'달리면서 받는 롱 패스',mate:'H'},
 D:{n:'디펜더형',t:'상대를 읽는 철벽',acc:'shield',c1:'#9be8d3',c2:'#2ec4a0',bg:['#2ec4a0','#0d5a4a'],d:'상대의 움직임을 먼저 읽고 패스 길을 막아요. 가로채기 한 번으로 흐름을 바꾸는 해결사!',s:['예측력','집중력','가로채기'],th:'스톨 카운트 마크 수비',mate:'S'},
 S:{n:'스피릿형',t:'팀을 웃게 하는 응원단장',acc:'mega',c1:'#d3cbff',c2:'#8b7cf6',bg:['#8b7cf6','#2a1f6b'],d:'팀 분위기를 살리고 상대도 존중하는 페어플레이의 아이콘! 지고 있을 때 더 빛나요.',s:['팀워크','배려','긍정 에너지'],th:'모두에게 골고루 주는 패스',mate:'D'}};
const TQ=[
 {q:'친구들과 놀이공원에 가면 나는?',o:[['H','타는 순서와 동선을 짠다'],['C','제일 짜릿한 놀이기구로 먼저 달려간다'],['D','일행이 흩어지지 않게 챙긴다'],['S','사진 찍고 분위기를 띄운다']]},
 {q:'원반이 내 쪽으로 날아온다!',o:[['H','잡기 전부터 누구에게 줄지 보고 있다'],['C','뛰어올라 멋지게 잡는다'],['D','상대보다 먼저 손을 뻗어 가로챈다'],['S','「나이스!」 외치며 박수부터']]},
 {q:'체육 시간에 팀을 정했다. 나는?',o:[['H','작전부터 이야기한다'],['C','몸을 풀며 이리저리 뛰어 본다'],['D','상대 팀 에이스가 누군지 살핀다'],['S','팀 이름과 구호를 만든다']]},
 {q:'내가 제일 자신 있는 것은?',o:[['H','정확하게 던지기'],['C','빠르게 달리기'],['D','끝까지 따라가기'],['S','친구 기분 알아차리기']]},
 {q:'경기에서 지고 있을 때 나는?',o:[['H','차분하게 패스 길을 다시 찾는다'],['C','더 많이 뛰어 빈 공간을 만든다'],['D','수비로 상대 흐름을 끊는다'],['S','「아직 안 끝났어!」 팀을 응원한다']]},
 {q:'좋아하는 동물을 고른다면?',o:[['H','지혜로운 부엉이'],['C','빠른 치타'],['D','끈질긴 늑대'],['S','다정한 돌고래']]},
 {q:'친구가 실수했을 때 나는?',o:[['H','다음엔 이렇게 해 보자고 알려 준다'],['C','내가 더 뛰어서 메운다'],['D','뒤를 받쳐 막아 준다'],['S','「괜찮아!」 하이파이브']]},
 {q:'시험 공부 스타일은?',o:[['H','계획표를 세워 차근차근'],['C','마지막에 폭발적인 집중력'],['D','틀린 문제를 끝까지 파고들기'],['S','친구들과 함께 스터디']]}];
let TT=null;
function typeRender(el){
  if(!TT){el.innerHTML='<div class="pg-card" style="text-align:center"><div style="display:flex;justify-content:center;gap:4px;flex-wrap:wrap">'+['H','C','D','S'].map(k=>mascot({acc:TYPES[k].acc,c1:TYPES[k].c1,c2:TYPES[k].c2,size:96})).join('')+'</div><h2 class="pg-h">나의 원반 포지션 테스트</h2><p class="pg-sub">질문 8개로 알아보는 나의 플라잉디스크 성향! 핸들러·커터·디펜더·스피릿 중 나는?</p><button class="pg-btn sun" onclick="TT={i:0,sc:{H:0,C:0,D:0,S:0}};render()">테스트 시작</button></div>';return}
  if(TT.i>=TQ.length){typeEnd(el);return}
  const q=TQ[TT.i];const opts=q.o.slice().sort((a,b)=>((TT.i*7+a[0].charCodeAt(0))%5)-((TT.i*7+b[0].charCodeAt(0))%5));
  el.innerHTML='<div class="pg-card"><div class="qz-bar">'+TQ.map((x,i)=>'<i class="'+(i<TT.i?'ok':i===TT.i?'cur':'')+'"></i>').join('')+'</div><div style="font:900 12.5px Pretendard;color:var(--ink2)">질문 '+(TT.i+1)+' / '+TQ.length+'</div><div class="qz-q">'+esc(q.q)+'</div><div class="qz-o">'+opts.map((o,i)=>'<button onclick="TT.sc.'+o[0]+'++;TT.i++;render()"><i>'+'ABCD'[i]+'</i>'+esc(o[1])+'</button>').join('')+'</div></div>'}
function typeEnd(el){const k=Object.keys(TT.sc).sort((a,b)=>TT.sc[b]-TT.sc[a])[0];const T=TYPES[k],M=TYPES[T.mate];ls('pgType',k);
  el.innerHTML='<div class="pg-card"><div class="qz-res">'+mascot({acc:T.acc,c1:T.c1,c2:T.c2,size:190})+'<div><div style="font:900 13px Pretendard;color:var(--ink2)">나의 원반 포지션은</div><div style="font:400 48px Jua,Pretendard;color:'+T.c2+';line-height:1.1">'+T.n+'</div><h3 class="pg-h" style="margin-top:4px">「'+T.t+'」</h3><p class="pg-sub">'+T.d+'</p>'
    +'<div class="pg-chips" style="margin:0 0 8px">'+T.s.map(x=>'<button class="on" style="cursor:default;background:'+T.c2+';border-color:'+T.c2+'">'+x+'</button>').join('')+'</div>'
    +'<div class="pg-note"><b>어울리는 플레이</b> '+T.th+'<br><b>찰떡 파트너</b> '+M.n+' — '+M.t+'</div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="pg-btn sun" onclick="typeShare(\''+k+'\')">결과 카드</button><button class="pg-btn ghost" onclick="TT=null;render()">다시 하기</button></div></div></div></div>'
    +'<div class="pg-card" style="margin-top:14px"><h3 class="pg-h" style="font-size:20px">네 가지 포지션</h3><div class="hl-champ">'+Object.keys(TYPES).map(x=>{const t=TYPES[x];return '<div class="hl-c" style="background:'+t.c1+'33">'+mascot({acc:t.acc,c1:t.c1,c2:t.c2,size:64})+'<div><b>'+t.n+'</b><small style="color:#4b5563">'+t.t+'</small></div></div>'}).join('')+'</div></div>'}
function typeShare(k){const T=TYPES[k];shareCard({kicker:'나의 원반 포지션은',title:T.n,pill:T.t,lines:[T.d],c1:T.bg[0],c2:T.bg[1],art:mascot({acc:T.acc,c1:T.c1,c2:T.c2,size:560}),who:ME?myName():''},'KFDF_포지션_'+T.n)}

/* ══ F. 오늘의 원반 운세 — 날짜 + 계정(없으면 기기)마다 하루 하나 ══ */
const THROWS=[['백핸드','기본이 최고! 오늘은 백핸드가 쭉쭉 뻗어요'],['포핸드','손목 스냅이 살아 있는 날'],['해머','수비 머리 위로 넘기기 딱 좋은 날'],['스쿠버','짧고 빠른 한 방이 통해요'],['롤러','땅으로 굴려 깜짝 놀라게!'],['오버헤드','높이, 더 높이!'],['블레이드','칼같이 정확한 패스']];
const COLORS=[['하늘색','#6ec6ff'],['개나리색','#ffd23f'],['민트색','#2ec4a0'],['산호색','#ff6b6b'],['보라색','#8b7cf6'],['주황색','#ff9f43'],['남색','#13306b'],['분홍색','#ff8fa3']];
const WORDS=['오늘 던진 원반은 꼭 누군가에게 닿아요','실수해도 괜찮아, 다음 패스가 있잖아','친구에게 먼저 「나이스!」 해 보세요','바람이 내 편인 날이에요','천천히, 정확하게. 그게 오늘의 비법','오늘은 수비에서 행운이 터져요','처음 해 보는 던지기에 도전해 보세요','하이파이브를 3번 하면 좋은 일이 생겨요','물 많이 마시기! 컨디션이 실력이에요','상대를 칭찬하면 내 플레이도 좋아져요','엔드존이 나를 부르고 있어요','오늘의 주인공은 바로 나','팀원 이름을 크게 불러 주세요','넘어져도 웃으면 이긴 거예요','회전을 많이! 원반이 흔들리지 않아요','가장 조용한 친구에게 패스해 보세요','오늘은 잡는 손이 자석이에요','스트레칭 5분이 부상 0의 비결','끝까지 뛰는 사람이 원반을 잡아요','오늘 찍은 사진이 공모전 1위?!'];
const MISSIONS=['친구 3명에게 패스하기','처음 보는 친구와 하이파이브','원반 10번 연속 주고받기','심판·선생님께 「감사합니다」 인사','사진 공모전에 한 장 올리기','오늘 경기 후 상대 팀 칭찬하기','포핸드 5번 연습하기','원반 골프 챌린지 300점 넘기기'];
function luckRender(el){let dev=ls('pgDev');if(!dev){dev=Math.random().toString(36).slice(2);ls('pgDev',dev)}const key=today()+'|'+(ME?ME.uid:dev);const r=rnd(key);const opened=ls('pgLuck')===key;
  const no=1+Math.floor(r()*99),th=THROWS[Math.floor(r()*THROWS.length)],col=COLORS[Math.floor(r()*COLORS.length)],w=WORDS[Math.floor(r()*WORDS.length)],mi=MISSIONS[Math.floor(r()*MISSIONS.length)];const st=[2+Math.floor(r()*4),2+Math.floor(r()*4),2+Math.floor(r()*4)];
  const star=n=>'<span class="stars">'+'★'.repeat(n)+'<span style="color:#e3e7ef">'+'★'.repeat(5-n)+'</span></span>';
  const cookie='<svg width="170" height="150" viewBox="0 0 170 150" aria-hidden="true"><ellipse cx="85" cy="132" rx="56" ry="8" fill="rgba(122,74,0,.15)"/><path d="M20 82 Q85 -6 150 82 Q120 70 85 96 Q50 70 20 82Z" fill="#f4b740"/><path d="M20 82 Q85 -6 150 82" fill="none" stroke="#d48a12" stroke-width="4"/><path d="M85 96 Q86 112 80 124" stroke="#d48a12" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M78 70 h22 v26 h-22z" fill="#fff" transform="rotate(-12 89 83)"/><path d="M82 76h14M82 82h10" stroke="#ff6b6b" stroke-width="2.5" transform="rotate(-12 89 83)"/><ellipse cx="62" cy="58" rx="4" ry="5" fill="#13306b"/><ellipse cx="104" cy="58" rx="4" ry="5" fill="#13306b"/><path d="M76 66 Q83 72 90 66" stroke="#13306b" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="50" cy="66" rx="7" ry="4" fill="#ff8a80" opacity=".7"/><ellipse cx="116" cy="66" rx="7" ry="4" fill="#ff8a80" opacity=".7"/></svg>';
  el.innerHTML='<div class="pg-card"><h2 class="pg-h">오늘의 원반 운세</h2><p class="pg-sub">'+today().replace(/-/g,'.')+' · 하루에 하나씩, '+(ME?'내 계정':'이 기기')+'만의 운세가 나와요.</p><div class="lk-wrap">'
    +(opened?'<div class="lk-cookie" style="cursor:default;background:linear-gradient(135deg,#fff8dc 0%,#fff8dc 45%,'+col[1]+'55 100%)">'+mascot({size:150,acc:'crown'})+'<b style="font:400 22px/1.5 Jua,Pretendard;color:var(--ink)">「'+esc(w)+'」</b><button class="pg-btn ghost" onclick="luckShare()">운세 카드 만들기</button></div>'
      :'<div class="lk-cookie" onclick="ls(\'pgLuck\',\''+key+'\');render()">'+cookie+'<b style="font:400 22px Jua,Pretendard;color:#7a4a00">원반 쿠키를 눌러 열어 보세요!</b><span style="font-size:13px;color:#8a6a00">오늘의 행운이 들어 있어요</span></div>')
    +'<div class="lk-r" style="'+(opened?'':'filter:blur(6px);pointer-events:none;user-select:none')+'">'
      +'<div class="lk-i"><div class="k">'+no+'</div><div><b>행운의 배번 '+no+'번</b><small>이 번호 친구와 패스를 주고받아 보세요</small></div></div>'
      +'<div class="lk-i"><div class="k">'+I('disc',{size:22,color:'#13306b'})+'</div><div><b>오늘의 던지기 · '+th[0]+'</b><small>'+th[1]+'</small></div></div>'
      +'<div class="lk-i"><div class="k" style="background:'+col[1]+'"></div><div><b>행운의 색 · '+col[0]+'</b><small>이 색 원반이나 옷이 행운을 불러요</small></div></div>'
      +'<div class="lk-i"><div class="k">'+I('star',{size:22,color:'#e6a700'})+'</div><div style="flex:1"><b style="display:flex;justify-content:space-between">던지기 '+star(st[0])+'</b><b style="display:flex;justify-content:space-between">수비 '+star(st[1])+'</b><b style="display:flex;justify-content:space-between">팀워크 '+star(st[2])+'</b></div></div>'
      +'<div class="lk-i"><div class="k">'+I('flag',{size:22,color:'#ff6b6b'})+'</div><div><b>오늘의 미션</b><small>'+esc(mi)+'</small></div></div>'
    +'</div></div></div>';
  window._LK={no:no,th:th,col:col,w:w,mi:mi}}
function luckShare(){const L=window._LK;if(!L)return;shareCard({kicker:'오늘의 원반 운세 · '+today().replace(/-/g,'.'),title:'행운의 배번 '+L.no+'번',pill:'오늘의 던지기 · '+L.th[0],lines:['「'+L.w+'」','미션: '+L.mi],c1:L.col[1],c2:'#13306b',art:mascot({size:560,acc:'crown'}),who:ME?myName():''},'KFDF_오늘의운세')}

/* ══ G. 랭킹 · 승부 예측 — [2026-10-24] 축전: 승부 예측 10/24 10:00 일괄 마감 · 1일차 예선 전 경기 부문별 접이식 · 원반 상품(연맹 협찬) · 부문별 1·2위 맞히기(champPicks, 보안 규칙 v64) ══
   저장: matchPicks/{경기ID_uid} · champPicks/{SLOT_부문키_uid}{uid,name,slotId,div,divKey(=pkDivKey(div) — 규칙 v64 가 문서 ID slotId_divKey_uid 대조에 씀),first:{pid,name},second:{pid,name},badges,at}
   [2026-10-24 재점검] 로그인 복귀는 login.html?next=play.html%3Ftab%3Drank(next 는 '#' 불가) → 아래 pkTabFromQuery 가 해시로 바꿈 · 1·2위 맞히기는 본선 명단(4팀 이상)이 없는 부문은 예선 참가팀 전체에서 고르고 명단이 차면 좁힘(고등부처럼 본선 문서가 없어도 열림)
   · pid 없는 팀은 pid 자리에 'name:팀명'(규칙의 first.pid != second.pid 통과) · pkTick 이 3분마다 뒤에서 다시 받아 카드·예측왕·1·2위 칸을 제자리 갱신
   예측왕: 적중 수(승부 적중 + 1·2위 점수) ↓ → 적중률(ok/n) ↓ → 마지막 예측 시각 ↑. 1위 적중 1점, 1·2위 모두 적중 2점. 상위 10명 줄에 「원반」 표식 */
const PICK_DEADLINE=Date.parse('2026-10-24T01:00:00Z');          // 승부 예측 마감 10/24(토) 10:00 KST — 앞 경기 결과를 보고 고르지 못하게 모든 경기 일괄 마감
const CHAMP_DEADLINE=Date.parse('2026-10-25T08:30:00+09:00');    // 부문별 1·2위 맞히기 마감 10/25(일) 08:30 KST — 본선(8강) 시작 전
const PK_FEST_END=Date.parse('2026-10-26T00:00:00+09:00');       // 축전 기간에는 「승부 예측」 하위 탭을 먼저 보여 줌
const PK_DIVS=['초등부 남자','초등부 여자','중등부 남자','중등부 여자','고등부 남자','고등부 여자'];
let RK={sub:Date.now()<PK_FEST_END?'pick':'game',scores:null,ms:null,picks:null,cpicks:null,msAt:0,secOpen:{},champSel:{},_byM:{},_secs:{},_ct:{},_cpre:{}};
const pkPh=t=>!t||/^\(.*\)$/.test(String(t).trim());                       // 자리표시 '(A조 1위)' '(8강 1경기 승자)'
const pkReal=m=>!pkPh((m.a||{}).name)&&!pkPh((m.b||{}).name);
const pkKO=m=>m.stage==='본선'||MR.isKnockout(m);
function pkWinner(m){if(m.status!=='종료')return '';const sc=MR.score(m.events||[]);return sc.a>sc.b?'a':sc.b>sc.a?'b':''}
function pkDivKey(d){return String(d||'').replace(/[^0-9A-Za-z가-힣]/g,'')}
function pkMs(x){try{return MR.tsMs(x)||0}catch(e){return 0}}
const pkPid=t=>{t=t||{};return t.pid||(t.name?'name:'+String(t.name):'')};   // pid 없는 팀은 'name:팀명' — 규칙 v64 의 first.pid != second.pid(둘 다 '' 이면 거부)를 통과시킴
function pkSame(x,y){x=x||{};y=y||{};if(!x.name&&!x.pid)return false;const px=String(x.pid||''),py=String(y.pid||'');return (px&&py&&px.indexOf('name:')!==0&&py.indexOf('name:')!==0)?px===py:String(x.name||'')===String(y.name||'')}
function pkClosed(){return Date.now()>=PICK_DEADLINE}
function pkChampClosed(){return Date.now()>=CHAMP_DEADLINE}
function pkDivSort(a,b){const ia=PK_DIVS.indexOf(a),ib=PK_DIVS.indexOf(b);return (ia<0?99:ia)-(ib<0?99:ib)||a.localeCompare(b,'ko')}
function pkLeft(ms){const tm=Math.max(1,Math.ceil(ms/60000)),d=Math.floor(tm/1440),h=Math.floor(tm%1440/60),m=tm%60;return (d?d+'일 ':'')+((d||h)?h+'시간 ':'')+m+'분'}
/* [2026-10-24] 로그인·가입 뒤 복귀 — login.html 의 next 는 '#' 이 든 값을 버리므로 play.html?tab=rank 로 돌아옴 → 해시로 바꿔 play.js(DOMContentLoaded 에서 location.hash 를 읽음)가 그 탭을 열게 함 */
(function pkTabFromQuery(){try{if(location.hash)return;const t=new URLSearchParams(location.search).get('tab');if(!t||!/^[a-z]{1,10}$/.test(t))return;history.replaceState(null,'',location.pathname+'#'+t);if(document.readyState!=='loading'&&typeof go==='function')go(t)}catch(e){}})();
function pkCss(){if(document.getElementById('pkStyle'))return;const s=document.createElement('style');s.id='pkStyle';s.textContent=
 '.pk-dl{background:linear-gradient(135deg,#fff8dc,#ffe9a8);border-radius:18px;padding:12px 16px;margin-top:14px;display:grid;gap:6px;font-size:13.5px;line-height:1.5;color:#5a4200;word-break:keep-all;overflow-wrap:break-word}'
 +'.pk-dl-l{display:flex;gap:8px;align-items:flex-start}.pk-dl-l svg{flex:none;margin-top:2px}.pk-dl b.pk-left{color:#c41e2f}'
 +'.pk-sec{border:1.5px solid var(--line);border-radius:18px;margin-bottom:10px;background:#fff;overflow:hidden}'
 +'.pk-sec>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;min-height:44px;padding:8px 14px;font:900 15px Pretendard,sans-serif;color:var(--pn);background:#f6f8fc;-webkit-tap-highlight-color:transparent;word-break:keep-all}'
 +'.pk-sec>summary::-webkit-details-marker{display:none}.pk-sec>summary small{font-size:12px;color:var(--ink2);font-weight:800}'
 +'.pk-sec>summary .pk-cnt{margin-left:auto;font-size:12px;color:var(--pn);font-weight:800;white-space:nowrap}'
 +'.pk-sec>summary::after{content:"";width:8px;height:8px;border-right:2px solid var(--pn);border-bottom:2px solid var(--pn);transform:rotate(45deg);margin:0 4px 4px 4px;flex:none;transition:.15s}'
 +'.pk-sec[open]>summary::after{transform:rotate(225deg);margin:4px 4px 0}'
 +'.pk-body{padding:10px 10px 2px}.pk-vs button{min-height:44px;line-height:1.25;word-break:keep-all;overflow-wrap:break-word}'
 +'.pk-m .pk-vs button.win{border-color:var(--mint);background:var(--mint2);color:#0f6b52}.pk-m .pk-vs button.on.win{background:var(--mint);border-color:var(--mint);color:#fff}'
 +'.pk-m .pk-vs button.on:disabled{opacity:1}.pk-ck{font-style:normal;font-weight:900}'
 +'.pk-gift{display:inline-flex;align-items:center;gap:3px;font-size:10.5px;font-weight:900;color:#7a4a00;background:#ffe9a8;border-radius:999px;padding:2px 7px;font-style:normal;white-space:nowrap}'
 +'.rk-row b.sc{text-align:right}.pk-brk{display:block;font-size:10.5px;color:var(--ink2);font-weight:800;white-space:nowrap}'
 +'.pk-mine .rk-n{background:#f2f4fa!important;color:var(--ink2)!important}'
 +'.pk-ch{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}'
 +'.pk-chd{border:1.5px solid var(--line);border-radius:18px;padding:12px 14px;min-width:0}.pk-chd h4{margin:0 0 6px;font:900 15px Pretendard,sans-serif;color:var(--pn)}'
 +'.pk-chl{font-size:12px;font-weight:900;color:var(--ink2);margin:8px 0 4px}.pk-chips{display:flex;flex-wrap:wrap;gap:6px}'
 +'.pk-chip{min-height:44px;border:2px solid var(--line);background:#fff;border-radius:14px;padding:8px 12px;font:800 13.5px Pretendard,sans-serif;color:var(--ink);cursor:pointer;flex:1 1 auto;min-width:0;word-break:keep-all;overflow-wrap:break-word}'
 +'.pk-chip.on{background:var(--pn);border-color:var(--pn);color:#fff}.pk-chip:disabled{opacity:.45;cursor:default}.pk-chip.on:disabled{opacity:1}'
 +'@media (orientation:landscape) and (max-height:520px){#pkGrid{grid-template-columns:1fr}.pk-body{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start}.pk-body .pk-m{margin-bottom:0}.pk-dl{grid-template-columns:1fr 1fr}}'
 +'@media (max-width:720px){.pk-sec>summary{font-size:14px;padding:8px 12px}.pk-chip{font-size:13px;padding:8px 10px}}';
 document.head.appendChild(s)}
function pkDlHtml(){const now=Date.now();
  const l1=now<PICK_DEADLINE?'<b>승부 예측 마감 10/24(토) 오전 10:00</b> — 남은 시간 <b class="pk-left">'+pkLeft(PICK_DEADLINE-now)+'</b>':'<b>승부 예측이 마감되었습니다.</b> 적중 결과는 경기가 끝날 때마다 올라와요';
  const l2=now<CHAMP_DEADLINE?'<b>부문별 1·2위 맞히기 마감 10/25(일) 오전 08:30</b> — 남은 시간 <b class="pk-left">'+pkLeft(CHAMP_DEADLINE-now)+'</b>'+(pkChampReady()?'':' · 본선 진출팀이 정해지면 열려요'):'<b>1·2위 맞히기도 마감되었습니다.</b> 결승이 끝나면 적중 결과가 나와요';
  return '<div class="pk-dl-l">'+I('clock',{size:16,color:'#13306b'})+'<span>'+l1+'</span></div><div class="pk-dl-l">'+I('trophy',{size:16,color:'#e6a700'})+'<span>'+l2+'</span></div>'}
function pkTick(){clearTimeout(RK._t);const el=document.getElementById('pkDl');if(!el||TAB!=='rank'||RK.sub!=='pick')return;
  const st=(pkClosed()?1:0)+(pkChampClosed()?2:0);if(RK._st!=null&&st!==RK._st){RK._st=st;render();return}RK._st=st;el.innerHTML=pkDlHtml();
  if(Date.now()-RK.msAt>180000&&!RK._ld)pkLoad().then(pkRefreshAll);   // [2026-10-24] 탭을 열어 둔 채여도 3분마다 뒤에서 다시 받아 점수·적중·예측왕을 제자리에서 갱신(두 마감이 지난 뒤에도 1분마다 계속)
  const now=Date.now(),tgt=now<PICK_DEADLINE?PICK_DEADLINE:now<CHAMP_DEADLINE?CHAMP_DEADLINE:0;let wait=tgt?(tgt-now)%60000:60000;if(wait<=0)wait+=60000;RK._t=setTimeout(pkTick,Math.max(1000,wait+300))}
function pkIndex(){RK._byM={};(RK.picks||[]).forEach(p=>{(RK._byM[p.matchId]=RK._byM[p.matchId]||[]).push(p)})}
async function pkLoad(){RK._ld=true;
  try{const [m,p,c]=await Promise.all([DB.collection('liveMatches').where('slotId','==',SLOT).get(),DB.collection('matchPicks').where('slotId','==',SLOT).get().catch(e=>{RK.perr=e.code||e.message;return null}),DB.collection('champPicks').where('slotId','==',SLOT).get().catch(e=>{RK.cerr=e.code||e.message;return null})]);
    RK.ms=m.docs.map(d=>Object.assign({id:d.id},d.data())).filter(x=>!x.golf&&!x.test).sort((a,b)=>String(a.day||'').localeCompare(String(b.day||''))||String(a.time||'').localeCompare(String(b.time||''))||(+a.order||0)-(+b.order||0));
    RK.picks=p?p.docs.map(d=>d.data()):[];RK.cpicks=c?c.docs.map(d=>d.data()):[];if(p)RK.perr=null;if(c)RK.cerr=null}
  catch(e){RK.ms=RK.ms||[];RK.picks=RK.picks||[];RK.cpicks=RK.cpicks||[]}
  RK.msAt=Date.now();RK._ld=false}
function pkReload(){RK.ms=null;RK.msAt=0;render()}
function pkLoginAsk(){modal('<h3 class="pg-h" style="margin-top:4px">회원이면 누구나 참여!</h3><p class="pg-sub">로그인하면 승부 예측에 참여하고, 적중 상위 약 10명에게 드리는 원반 선물(연맹 협찬)에 도전할 수 있어요. 가입은 바로 승인돼요.</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><a class="pg-btn sun" href="login.html?next=play.html%3Ftab%3Drank">로그인 · 가입</a><button class="pg-btn ghost" onclick="closeModal()">나중에</button></div>')}
async function rankRender(el){pkCss();
  const head='<div class="pg-card"><h2 class="pg-h">랭킹 · 승부 예측</h2><p class="pg-sub">축전 경기 승부 맞히기와 원반 골프 전국 랭킹! 적중 상위 약 10명에게 원반 선물(연맹 협찬). 이름은 가운데를 가려서 보여요.'+(ME?'':' 참여하려면 <a href="login.html?next=play.html%3Ftab%3Drank" style="font-weight:900;color:var(--pn)">로그인</a>해 주세요 — 회원이면 누구나.')+'</p><div class="pg-chips" style="margin:0"><button class="'+(RK.sub==='pick'?'on':'')+'" onclick="RK.sub=\'pick\';render()">🔮 승부 예측</button><button class="'+(RK.sub==='game'?'on':'')+'" onclick="RK.sub=\'game\';render()">🎯 원반 골프 랭킹</button></div></div>';
  if(RK.sub==='game'){
    if(!RK.scores){el.innerHTML=head+'<div class="pg-card" style="margin-top:14px"><div class="pg-empty">불러오는 중…</div></div>';try{const q=await DB.collection('playScores').orderBy('best','desc').limit(30).get();RK.scores=q.docs.map(d=>Object.assign({id:d.id},d.data()))}catch(e){RK.scores=[];RK.err=e.code||e.message}if(TAB!=='rank'||RK.sub!=='game')return}
    const L=RK.scores;const mine=ME?L.findIndex(x=>x.id===ME.uid):-1;
    el.innerHTML=head+'<div class="pg-card" style="margin-top:14px">'+(L.length?L.map((x,i)=>'<div class="rk-row'+(ME&&x.id===ME.uid?' me':'')+'"><div class="rk-n">'+(i+1)+'</div><span class="nm">'+esc(x.name||'익명')+' '+badgeMini(x.badges,20)+'<small style="color:var(--ink2);font-weight:700">'+(+x.games||0)+'판</small></span><b class="sc">'+(+x.best||0)+'점</b></div>').join('')
      :'<div class="pg-empty">'+(RK.err?'랭킹은 보안 규칙 v58 게시 후에 열려요.':'아직 기록이 없어요. 첫 번째 주인공이 되어 보세요!')+'<br><br><button class="pg-btn sun" onclick="go(\'game\')">원반 골프 하러 가기</button></div>')
      +(ME&&mine<0&&L.length?'<div class="pg-note" style="margin-top:10px">아직 내 기록이 없어요 — <a href="#game" onclick="go(\'game\');return false" style="font-weight:900;color:var(--pn)">원반 골프</a>를 끝까지 하면 자동으로 올라가요.</div>':'')+'</div>';return}
  if(!RK.ms){el.innerHTML=head+'<div class="pg-card" style="margin-top:14px"><div class="pg-empty">경기를 불러오는 중…</div></div>';await pkLoad();if(TAB!=='rank'||RK.sub!=='pick')return}
  else if(Date.now()-RK.msAt>180000&&!RK._ld)pkLoad().then(()=>{if(TAB==='rank'&&RK.sub==='pick')render()});   // 3분 지난 자료는 뒤에서 다시 받아 결과를 갱신
  pkIndex();
  const day1=RK.ms.filter(m=>!pkKO(m)&&pkReal(m));const S={},divs=[];day1.forEach(m=>{const d=m.div||'기타';if(!S[d]){S[d]=[];divs.push(d)}S[d].push(m)});divs.sort(pkDivSort);RK._secs={};divs.forEach(d=>{RK._secs[pkDivKey(d)]={div:d,list:S[d]}});
  const board=pkBoard();
  const matches='<div class="pg-card"><h3 class="pg-h" style="font-size:20px">'+I('target',{color:'#ff6b6b'})+' 1일차 예선 승부 예측</h3><p class="pg-sub">이길 것 같은 팀을 눌러 주세요. 마감(10/24 오전 10:00) 전까지는 바꿀 수 있어요. 적중 상위 약 10명(참여자의 5% 내외)에게 원반 선물(연맹 협찬) · 회원이면 누구나 참여.</p>'
      +(RK.perr?'<div class="pg-note" style="margin-bottom:10px">승부 예측은 보안 규칙 v58 게시 후에 열려요.</div>':'')
      +(divs.length?divs.map((d,i)=>pkSection(d,S[d],i)).join(''):'<div class="pg-empty">예측할 수 있는 경기가 아직 없어요.<br>대진이 정해지면(10/24 축전) 여기에 나와요.</div>')
      +'<div style="text-align:right;margin-top:6px"><button class="pg-btn ghost" style="padding:8px 14px;font-size:12.5px;min-height:44px" onclick="pkReload()">결과 새로고침</button></div></div>';
  const boardH=pkBoardHtml(board);
  const champH='<div id="pkChamp">'+pkChampHtml()+'</div>',gridH='<div class="hl-grid" id="pkGrid" style="margin-top:14px">'+((pkClosed()&&board.length)?boardH+matches:matches+boardH)+'</div>';
  el.innerHTML=head+'<div class="pk-dl" id="pkDl">'+pkDlHtml()+'</div>'+(pkClosed()?champH+gridH:gridH+champH);   // 10/24 10:00 전엔 승부 예측이 먼저, 마감 뒤엔 1·2위 맞히기가 먼저
  pkTick()}
function pkSummary(div,list){const fin=list.filter(m=>m.status==='종료').length;
  const my=ME?list.filter(m=>(RK._byM[m.id]||[]).some(p=>p.uid===ME.uid)).length:0;
  const hit=ME?list.filter(m=>{const w=pkWinner(m);return w&&(RK._byM[m.id]||[]).some(p=>p.uid===ME.uid&&p.pick===w)}).length:0;
  return '<span>'+esc(div)+'</span><small>'+list.length+'경기'+(fin?' · 종료 '+fin:'')+'</small><span class="pk-cnt">'+(ME?'내 예측 '+my+'/'+list.length+((fin&&my)?' · 적중 '+hit:''):'')+'</span>'}
function pkSection(div,list,idx){const key=pkDivKey(div);if(RK.secOpen[key]==null)RK.secOpen[key]=idx===0;
  return '<details class="pk-sec" data-pks="'+key+'"'+(RK.secOpen[key]?' open':'')+' ontoggle="pkSecToggle(this,\''+key+'\')"><summary>'+pkSummary(div,list)+'</summary><div class="pk-body">'+list.map(pkCard).join('')+'</div></details>'}
function pkSecToggle(el,key){RK.secOpen[key]=!!el.open}
function pkCard(m){const L=RK._byM[m.id]||[];const na=L.filter(p=>p.pick==='a').length;const pa=L.length?Math.round(na/L.length*100):50;const mp=ME?(L.find(p=>p.uid===ME.uid)||{}).pick:'';
  const w=pkWinner(m),fin=m.status==='종료',live=m.status==='진행';const sc=(fin||live)?MR.score(m.events||[]):null;const dis=m.status!=='예정'||pkClosed();
  const btn=s=>'<button class="'+(mp===s?'on':'')+(w===s?' win':'')+'" '+(dis?'disabled':'')+' onclick="pickSet(\''+m.id+'\',\''+s+'\')">'+esc((m[s]||{}).name)+(w===s?' <i class="pk-ck">✓</i>':'')+'</button>';
  const res=fin?(mp?(w?(mp===w?'<div class="pk-res" style="color:#0f8a6c">내 예측 적중!</div>':'<div class="pk-res" style="color:#d64545">아쉽게 빗나갔어요</div>'):'<div class="pk-res" style="color:var(--ink2)">무승부 — 적중 집계에서 빠져요</div>'):''):'';
  return '<div class="pk-m'+(fin?' done':live?' live':'')+'" data-pkm="'+m.id+'"><div class="meta">'+esc(String(m.day||'').slice(5).replace('-','/'))+' '+esc(m.time||'')+' · '+esc(m.court||'')+' · '+esc(m.round||'')+(live?' · <b style="color:#d64545">진행 중</b>':fin?' · 종료':'')+(sc?' · <b style="color:var(--pn)">'+sc.a+' : '+sc.b+'</b>':'')+'</div><div class="pk-vs">'+btn('a')+'<span class="v">VS</span>'+btn('b')+'</div>'
    +'<div class="pk-bar"><i style="width:'+pa+'%"></i><i style="width:'+(100-pa)+'%"></i></div><div class="pk-pc"><span>'+pa+'%</span><span>'+L.length+'명 참여</span><span>'+(100-pa)+'%</span></div>'+res+'</div>'}
function pkRefreshCard(mid){pkIndex();const m=(RK.ms||[]).find(x=>x.id===mid);const el=document.querySelector('[data-pkm="'+mid+'"]');if(!m||!el){render();return}
  const tmp=document.createElement('div');tmp.innerHTML=pkCard(m);el.replaceWith(tmp.firstElementChild);
  const key=pkDivKey(m.div||'기타'),S=RK._secs[key];const sum=document.querySelector('.pk-sec[data-pks="'+key+'"] > summary');if(sum&&S)sum.innerHTML=pkSummary(S.div,S.list);
  const n=document.getElementById('pkMyNote');if(n)n.innerHTML=pkMyNoteHtml(pkBoard())}
function pkRefreshAll(){if(TAB!=='rank'||RK.sub!=='pick')return;const g=document.getElementById('pkGrid');if(!g){render();return}pkIndex();   // 뒤에서 다시 받은 자료로 카드·요약·예측왕·1·2위 칸만 제자리 갱신(스크롤·펼침 유지)
  const S={};(RK.ms||[]).forEach(m=>{if(pkKO(m)||!pkReal(m))return;const d=m.div||'기타';(S[d]=S[d]||[]).push(m)});Object.keys(S).forEach(d=>{RK._secs[pkDivKey(d)]={div:d,list:S[d]}});
  const board=pkBoard();if(pkClosed()&&board.length&&g.firstElementChild&&g.firstElementChild.id!=='pkBoard'){render();return}   // 마감 뒤 첫 결과가 나오면 예측왕을 앞으로 — 전체 다시 그림
  const swap=(el,html)=>{if(!el)return;const tmp=document.createElement('div');tmp.innerHTML=html;if(tmp.firstElementChild)el.replaceWith(tmp.firstElementChild)};
  (RK.ms||[]).forEach(m=>swap(document.querySelector('[data-pkm="'+m.id+'"]'),pkCard(m)));
  Object.keys(RK._secs).forEach(k=>{const X=RK._secs[k],sum=document.querySelector('.pk-sec[data-pks="'+k+'"] > summary');if(sum&&X)sum.innerHTML=pkSummary(X.div,X.list)});
  swap(document.getElementById('pkBoard'),pkBoardHtml(board));const c=document.getElementById('pkChamp');if(c)c.innerHTML=pkChampHtml()}
function pkBoard(){const U={};const add=(p,ok)=>{const u=U[p.uid]=U[p.uid]||{name:p.name,badges:p.badges,ok:0,n:0,m:0,c:0,at:0};u.ok+=ok;u.n++;return u};
  (RK.ms||[]).forEach(m=>{const w=pkWinner(m);if(!w)return;(RK._byM[m.id]||[]).forEach(p=>{const h=p.pick===w?1:0;add(p,h).m+=h})});
  const CR=pkChampResults();(RK.cpicks||[]).forEach(p=>{const r=CR[pkDivKey(p.div)];if(!r)return;const pts=pkChampPts(p,r);add(p,pts).c+=pts});
  (RK.picks||[]).concat(RK.cpicks||[]).forEach(p=>{const u=U[p.uid];if(u)u.at=Math.max(u.at,pkMs(p.at))});   // 마지막 예측 시각 — 모든 예측 기준
  return Object.keys(U).map(k=>Object.assign({uid:k},U[k])).filter(u=>u.n>0).sort((a,b)=>b.ok-a.ok||(b.ok/b.n)-(a.ok/a.n)||a.at-b.at)}
function pkMyNoteHtml(board){if(!ME)return '';const my=(RK.picks||[]).filter(p=>p.uid===ME.uid).length,myc=(RK.cpicks||[]).filter(p=>p.uid===ME.uid).length;const i=board.findIndex(x=>x.uid===ME.uid);const u=i>=0?board[i]:null;
  return '내 예측 '+my+'경기'+(myc?' · 1·2위 '+myc+'부문':'')+(u?' · 적중 <b>'+u.ok+'</b> / '+u.n+(u.c?' (승부 '+u.m+' + 1·2위 '+u.c+')':'')+' · 현재 <b>'+(i+1)+'위</b> / '+board.length+'명'+(i<10?' — 원반 선물 범위 안!':''):' · 경기가 끝나면 내 순위가 나와요')}
function pkBoardHtml(board){const hasC=board.some(x=>x.c>0);const myI=ME?board.findIndex(x=>x.uid===ME.uid):-1;
  const row=(x,i)=>'<div class="rk-row'+(ME&&x.uid===ME.uid?' me':'')+'"><div class="rk-n">'+(i+1)+'</div><span class="nm">'+esc(x.name||'익명')+' '+badgeMini(x.badges,20)+(i<10?'<i class="pk-gift">'+I('disc',{size:12,color:'#7a4a00'})+'원반</i>':'')+'</span><b class="sc">'+x.ok+'<small style="font-size:12px;color:var(--ink2)"> / '+x.n+'</small>'+(hasC?'<small class="pk-brk">승부 '+x.m+' + 1·2위 '+x.c+'</small>':'')+'</b></div>';
  return '<div class="pg-card" id="pkBoard"><h3 class="pg-h" style="font-size:20px">'+I('crown',{color:'#e6a700'})+' 예측왕</h3><p class="pg-sub" style="margin-bottom:8px">적중 수 → 적중률 → 먼저 예측한 순으로 30명까지. 상위 약 10명(참여자의 5% 내외)에게 원반 선물(연맹 협찬)'+(hasC?' · 승부 적중과 1·2위 맞히기 점수를 합산해요':'')+'.</p>'
    +(ME?'<div class="pg-note" id="pkMyNote" style="margin-bottom:10px">'+pkMyNoteHtml(board)+'</div>':'')
    +(board.length?'<div class="pk-rows">'+board.slice(0,30).map(row).join('')+'</div>'+(myI>=30?'<div class="pk-rows pk-mine" style="margin-top:6px">'+row(board[myI],myI)+'</div>':''):'<div class="pg-empty">경기가 끝나면 적중 순위가 나와요.</div>')+'</div>'}
/* ── 부문별 1·2위 맞히기(2일차) — 본선 경기에 실제 팀이 4팀 이상 들어온 부문부터 열림 ── */
function pkChampTeams(){const T={},P={};(RK.ms||[]).forEach(m=>{const d=m.div||'기타',B=pkKO(m)?T:P;['a','b'].forEach(s=>{const t=m[s]||{};if(pkPh(t.name))return;const id=t.pid||t.name;const o=B[d]=B[d]||{};if(!o[id])o[id]={pid:pkPid(t),name:t.name||''}})});
  const out={};RK._cpre={};Object.keys(Object.assign({},P,T)).sort(pkDivSort).forEach(d=>{let L=Object.keys(T[d]||{}).map(k=>T[d][k]);
    if(L.length<4){L=Object.keys(P[d]||{}).map(k=>P[d][k]);if(L.length<4)return;RK._cpre[d]=true}   // 본선 명단(4팀 이상)이 아직 없으면 예선 참가팀 전체에서 고름 — 「진출팀 채우기」가 늦어도, 고등부처럼 본선 문서가 없어도 열림. 명단이 차면 자동으로 좁혀짐
    out[d]=L.sort((a,b)=>a.name.localeCompare(b.name,'ko'))});return out}
function pkChampReady(){return Object.keys(pkChampTeams()).length>0}
function pkChampResults(){const R={};(RK.ms||[]).forEach(m=>{if(!pkKO(m)||!/^결승/.test(String(m.round||'').trim())||m.status!=='종료')return;const w=pkWinner(m);if(!w)return;const l=w==='a'?'b':'a';R[pkDivKey(m.div)]={first:{pid:pkPid(m[w]),name:(m[w]||{}).name||''},second:{pid:pkPid(m[l]),name:(m[l]||{}).name||''}}});return R}
function pkChampPts(p,r){if(!r||!pkSame(p.first,r.first))return 0;return pkSame(p.second,r.second)?2:1}
function pkMineSel(key){const m=ME?(RK.cpicks||[]).find(p=>p.uid===ME.uid&&pkDivKey(p.div)===key):null;return m?{first:{pid:pkPid(m.first),name:(m.first||{}).name||''},second:{pid:pkPid(m.second),name:(m.second||{}).name||''}}:{}}   // 저장본의 pid 가 비어 있어도 'name:팀명' 으로 — 규칙의 first.pid != second.pid
function pkChampHtml(){const T=pkChampTeams();if(!Object.keys(T).length)return '';const CR=pkChampResults(),closed=pkChampClosed();const byD={};(RK.cpicks||[]).forEach(p=>{const k=pkDivKey(p.div);(byD[k]=byD[k]||[]).push(p)});RK._ct={};
  const cards=Object.keys(T).map(d=>{const key=pkDivKey(d),teams=T[d],L=byD[key]||[],r=CR[key];RK._ct[key]={div:d,list:teams};const mine=ME?L.find(p=>p.uid===ME.uid):null;const sel=RK.champSel[key]||(mine?pkMineSel(key):{});
    const more=(RK.ms||[]).some(m=>pkKO(m)&&(m.div||'기타')===d&&(pkPh((m.a||{}).name)||pkPh((m.b||{}).name)));
    const c1={};L.forEach(p=>{const id=(p.first||{}).pid||(p.first||{}).name;if(id)c1[id]=(c1[id]||0)+1});const topId=Object.keys(c1).sort((a,b)=>c1[b]-c1[a])[0];const topT=topId?teams.find(t=>(t.pid||t.name)===topId):null;
    const started=(RK.ms||[]).some(m=>pkKO(m)&&(m.div||'기타')===d&&m.status!=='예정');   // 본선이 시작된 부문은 시각과 상관없이 잠금
    const dis=closed||!!r||started;
    const chips=slot=>'<div class="pk-chips">'+teams.map((t,i)=>{const on=pkSame(sel[slot],t),oth=pkSame(sel[slot==='first'?'second':'first'],t);return '<button class="pk-chip'+(on?' on':'')+'" '+((dis||oth)?'disabled':'')+' onclick="champSet(\''+key+'\',\''+slot+'\','+i+')">'+esc(t.name)+'</button>'}).join('')+'</div>';
    let foot='';
    if(r){const pts=mine?pkChampPts(mine,r):0;foot='<div class="pk-res" style="color:var(--pn)">결과 — 1위 '+esc(r.first.name)+' · 2위 '+esc(r.second.name)+'</div>'+(mine?'<div class="pk-res" style="color:'+(pts?'#0f8a6c':'#d64545')+'">내 예측 1위 '+esc((mine.first||{}).name)+' · 2위 '+esc((mine.second||{}).name)+' → '+(pts===2?'1·2위 모두 적중! 2점':pts===1?'1위 적중! 1점':'아쉽게 빗나갔어요')+'</div>':'')}
    else if(mine){const gone=[mine.first,mine.second].filter(x=>x&&x.name&&!teams.some(t=>pkSame(x,t))).map(x=>esc(x.name));
      foot='<div class="pk-res" style="color:#0f8a6c">✓ 내 예측 저장됨 — 1위 '+esc((mine.first||{}).name)+' · 2위 '+esc((mine.second||{}).name)+((closed||started)?'':' (마감 전까지 바꿀 수 있어요)')+'</div>'
        +((gone.length&&!dis)?'<div class="pk-res" style="color:#d64545">'+gone.join(' · ')+'은(는) 본선에 없어요 — 다시 골라 주세요</div>':'')}
    else if(closed||started)foot='<div class="pk-res" style="color:var(--ink2)">'+(started?'본선이 시작되어 마감되었어요':'마감되었어요')+'</div>';
    else if(sel.first||sel.second)foot='<div class="pk-res" style="color:var(--pn)">'+(sel.first?'1위 '+esc(sel.first.name)+' 선택 — 이제 2위를 골라 주세요':'2위 '+esc(sel.second.name)+' 선택 — 이제 1위를 골라 주세요')+'</div>';
    const pre=!!RK._cpre[d];
    return '<div class="pk-chd"><h4>'+esc(d)+' <small style="font-weight:800;color:var(--ink2);font-size:12px">'+(pre?'예선 참가 '+teams.length+'팀 · 본선 진출팀이 정해지면 그 팀들로 좁혀져요':'본선 '+teams.length+'팀'+(more?' · 진출팀이 더 정해지면 늘어나요':''))+'</small></h4><div class="pk-pc" style="justify-content:flex-start;gap:8px;margin:0 0 4px"><span>'+L.length+'명 참여</span>'+(topT?'<span>· 1위 예측 최다 '+esc(topT.name)+' ('+Math.round(c1[topId]/L.length*100)+'%)</span>':'')+'</div><div class="pk-chl">1위</div>'+chips('first')+'<div class="pk-chl">2위</div>'+chips('second')+foot+'</div>'}).join('');
  return '<div class="pg-card" style="margin-top:14px"><h3 class="pg-h" style="font-size:20px">'+I('trophy',{color:'#e6a700'})+' 부문별 1·2위 맞히기 <small style="font-size:12px;color:var(--ink2);font-weight:800">2일차 본선</small></h3><p class="pg-sub">본선에 오른 팀 중에서 <b>1위</b>와 <b>2위</b>를 골라 주세요(같은 팀은 안 돼요). 본선 진출팀이 아직 안 정해진 부문은 예선 참가팀 전체에서 고르고, 정해지면 목록이 좁혀져요 — 본선에 못 오른 팀을 골랐다면 마감 전에 바꿔 주세요. 1위 적중 1점, 1·2위 모두 적중 2점 — 승부 예측 적중과 합쳐 예측왕 순위를 매겨요. 마감 10/25(일) 오전 08:30, 본선 시작 전.'+(ME?'':' <a href="login.html?next=play.html%3Ftab%3Drank" style="font-weight:900;color:var(--pn)">로그인</a>하면 참여할 수 있어요.')+'</p>'
    +(RK.cerr?'<div class="pg-note" style="margin-bottom:10px">1·2위 맞히기는 보안 규칙 v64 게시 후 열려요.</div>':'')+'<div class="pk-ch">'+cards+'</div></div>'}
function pkChampRefresh(){const w=document.getElementById('pkChamp');if(w)w.innerHTML=pkChampHtml();else render()}
async function champSet(key,slot,idx){if(!ME){pkLoginAsk();return}if(pkChampClosed()){say('1·2위 맞히기가 마감되었어요 (10/25 오전 08:30)');return}
  const T=RK._ct[key];const t=T&&T.list[idx];if(!t)return;
  if((RK.ms||[]).some(m=>pkKO(m)&&(m.div||'기타')===T.div&&m.status!=='예정')){say('본선이 시작되어 1·2위 맞히기가 마감되었어요');return}
  const sel=RK.champSel[key]=RK.champSel[key]||pkMineSel(key);
  if(pkSame(sel[slot==='first'?'second':'first'],t)){say('1위와 2위는 다른 팀이어야 해요');return}
  sel[slot]={pid:pkPid(t),name:t.name||''};
  if(!sel.first||!sel.second){pkChampRefresh();say(slot==='first'?'이제 2위를 골라 주세요':'이제 1위를 골라 주세요');return}
  try{await DB.collection('champPicks').doc(SLOT+'_'+key+'_'+ME.uid).set({uid:ME.uid,name:myName(),slotId:SLOT,div:T.div,divKey:key,first:sel.first,second:sel.second,badges:myBadges(),at:FV.serverTimestamp()});   // divKey = 문서 ID 의 부문 키 — 규칙 v64 가 id == slotId+'_'+divKey+'_'+uid 로 대조(없으면 규칙 평가 오류 → 항상 거부)
    const rec={uid:ME.uid,name:myName(),slotId:SLOT,div:T.div,divKey:key,first:Object.assign({},sel.first),second:Object.assign({},sel.second),badges:myBadges(),at:Date.now()};RK.cpicks=RK.cpicks||[];const i=RK.cpicks.findIndex(p=>p.uid===ME.uid&&pkDivKey(p.div)===key);if(i>=0)RK.cpicks[i]=rec;else RK.cpicks.push(rec);
    RK.cerr=null;pkChampRefresh();say('저장했어요! 결승이 끝나면 결과가 나와요')}
  catch(e){if(e.code==='permission-denied'){RK.cerr=e.code;pkChampRefresh();say('1·2위 맞히기는 보안 규칙 v64 게시 후 열려요')}else say('저장하지 못했어요')}}
async function pickSet(mid,side){if(!ME){pkLoginAsk();return}if(pkClosed()){say('승부 예측이 마감되었어요 (10/24 오전 10:00)');return}
  const m=(RK.ms||[]).find(x=>x.id===mid);if(m&&m.status!=='예정'){say('이미 시작된 경기예요');return}
  try{await DB.collection('matchPicks').doc(mid+'_'+ME.uid).set({uid:ME.uid,name:myName(),slotId:SLOT,matchId:mid,pick:side,badges:myBadges(),at:FV.serverTimestamp()});
    const rec={uid:ME.uid,name:myName(),slotId:SLOT,matchId:mid,pick:side,badges:myBadges(),at:Date.now()};RK.picks=RK.picks||[];const i=RK.picks.findIndex(p=>p.matchId===mid&&p.uid===ME.uid);if(i>=0)RK.picks[i]=rec;else RK.picks.push(rec);
    pkRefreshCard(mid);say('예측했어요! 결과는 경기가 끝나면 나와요')}
  catch(e){say(e.code==='permission-denied'?'예측이 마감됐거나 경기가 이미 시작됐어요':'저장하지 못했어요')}}
