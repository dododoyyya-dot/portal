/* ══════════ KFDF 홈 메인 배너 슬라이드 (banner.js · 2026-09-07) ══════════
 * 사진첩(gallery)에서 ★배너로 지정한 항목의 대표 사진을 홈 화면 메인 배너(.hero) 배경에 슬라이드로 보여줍니다.
 *   KFDF_BANNER.mount(host, items, opt) → {stop, go, next}
 *   items: [{id,title,date,endDate,place,cover}]   opt: {interval:초(기본 3), caption:true, dots:true, kenburns:true, link:true}
 * 한 장이면 정지 화면, 여러 장이면 interval 초마다 서서히 바뀝니다. 마우스를 올리면 멈추고, 탭이 숨겨지면 멈춥니다.
 * 글은 그대로 읽히도록 왼쪽이 짙은 그라데이션 가림막을 깔고, 이미지는 배경으로만 씁니다. 사진첩 관리자의 [미리보기]도 같은 함수를 씁니다.
 */
(function(){
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function css(){
    if(document.getElementById('kbCss'))return;
    var st=document.createElement('style');st.id='kbCss';
    st.textContent='.kb-layer{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none}'
      +'.kb-slide{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transition:opacity 1.1s ease;will-change:opacity,transform}'
      +'.kb-slide.on{opacity:1}'
      +'.kb-kb .kb-slide.on{animation:kbZoom var(--kb-dur,9s) ease-out forwards}'
      +'@keyframes kbZoom{from{transform:scale(1)}to{transform:scale(1.07)}}'
      +'.kb-shade{position:absolute;inset:0;background:linear-gradient(100deg,rgba(11,18,64,.62) 0%,rgba(11,18,64,.34) 46%,rgba(11,18,64,.04) 100%)}'   /* [2026-09-07] 사진이 잘 보이도록 필터를 크게 낮춤 */
      +'.kb-ui{position:absolute;left:0;right:0;bottom:0;z-index:2;pointer-events:none}'
      +'.kb-cap{position:absolute;right:22px;bottom:16px;pointer-events:auto;display:inline-flex;align-items:center;gap:8px;max-width:min(60%,420px);background:rgba(11,26,58,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.16);border-radius:12px;padding:8px 12px;color:#fff;text-decoration:none;font-size:12.5px;line-height:1.35;transition:opacity .4s}'
      +'.kb-cap b{display:block;font-size:13px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      +'.kb-cap span{display:block;font-size:11.5px;color:#d7dce6;margin-top:1px}'
      +'.kb-cap svg{flex:none}'
      +'.kb-dots{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:flex;gap:6px;pointer-events:auto}'
      +'.kb-dot{width:8px;height:8px;border-radius:999px;background:rgba(255,255,255,.4);border:0;padding:0;cursor:pointer;transition:all .3s}'
      +'.kb-dot.on{background:#ffd166;width:22px}'
      +'@media(max-width:760px){.kb-cap{right:10px;bottom:10px;max-width:70%;padding:6px 9px}.kb-cap b{font-size:12px}.kb-shade{background:linear-gradient(180deg,rgba(11,18,64,.5) 0%,rgba(11,18,64,.6) 100%)}}';
    document.head.appendChild(st);
  }
  function camIcon(){return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffd166" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>'}
  function fmt(a,b){if(!a)return '';return String(a).replace(/-/g,'.')+(b&&b!==a?' ~ '+String(b).slice(5).replace(/-/g,'.'):'')}
  function mount(host,items,opt){
    opt=opt||{};css();
    items=(items||[]).filter(function(x){return x&&x.cover});
    if(!host||!items.length)return null;
    var interval=Math.max(1,Math.min(30,+opt.interval||3))*1000;
    var caption=opt.caption!==false,dots=opt.dots!==false&&items.length>1,kb=opt.kenburns!==false,link=opt.link!==false;
    var old=host.querySelector('.kb-layer');if(old)old.remove();var oldUi=host.querySelector('.kb-ui');if(oldUi)oldUi.remove();
    if(getComputedStyle(host).position==='static')host.style.position='relative';
    var layer=document.createElement('div');layer.className='kb-layer'+(kb?' kb-kb':'');
    layer.style.setProperty('--kb-dur',Math.max(4,interval/1000+2)+'s');
    layer.innerHTML=items.map(function(x,i){return '<div class="kb-slide'+(i===0?' on':'')+'" style="background-image:url(\''+esc(x.cover).replace(/'/g,'%27')+'\')"></div>'}).join('')+'<div class="kb-shade"></div>';
    host.insertBefore(layer,host.firstChild);
    var ui=document.createElement('div');ui.className='kb-ui';
    ui.innerHTML=(caption?'<a class="kb-cap" '+(link?'href="gallery.html?id='+esc(items[0].id)+'"':'')+'>'+camIcon()+'<div style="min-width:0"><b></b><span></span></div></a>':'')
      +(dots?'<div class="kb-dots">'+items.map(function(_,i){return '<button type="button" class="kb-dot'+(i===0?' on':'')+'" data-i="'+i+'" aria-label="'+(i+1)+'번째 사진"></button>'}).join('')+'</div>':'');
    host.appendChild(ui);
    var cur=0,timer=null,paused=false;
    function setCap(i){var c=ui.querySelector('.kb-cap');if(!c)return;var x=items[i];c.querySelector('b').textContent=x.title||'';c.querySelector('span').textContent=[fmt(x.date,x.endDate),x.place].filter(Boolean).join(' · ');if(link)c.setAttribute('href','gallery.html?id='+x.id)}
    function go(i){
      i=(i+items.length)%items.length;if(i===cur&&layer.querySelectorAll('.kb-slide.on').length)return;
      var sl=layer.querySelectorAll('.kb-slide');for(var k=0;k<sl.length;k++){sl[k].classList.toggle('on',k===i);if(k===i&&kb){sl[k].style.animation='none';void sl[k].offsetWidth;sl[k].style.animation=''}}
      var ds=ui.querySelectorAll('.kb-dot');for(var d=0;d<ds.length;d++)ds[d].classList.toggle('on',d===i);
      cur=i;setCap(i);
    }
    function next(){go(cur+1)}
    function start(){stop();if(items.length>1)timer=setInterval(function(){if(!paused&&!document.hidden)next()},interval)}
    function stop(){if(timer){clearInterval(timer);timer=null}}
    setCap(0);
    ui.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.kb-dot');if(b){go(+b.getAttribute('data-i'));start()}});
    host.addEventListener('mouseenter',function(){paused=true});host.addEventListener('mouseleave',function(){paused=false});
    // 다음 장 미리 받기
    items.slice(1).forEach(function(x){var im=new Image();im.src=x.cover});
    start();
    return {stop:stop,go:go,next:next,start:start,count:items.length};
  }
  window.KFDF_BANNER={mount:mount};
})();
