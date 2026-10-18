// birthpick.js v20261018b · 생년월일 입력을 「연도 · 월 · 일」 선택 상자로 (2026-10-18)
//  브라우저 기본 달력은 연도를 바꾸려면 위의 「2026년 9월 ▾」를 눌러야 해서, 모르는 분들이 한 달씩 넘기는 문제가 있었습니다.
//  대상: type="date" 이면서 id·class·name·onchange 에 birth 가 들어간 칸, 또는 data-birth 가 있는 칸 (나중에 생기는 칸도 자동).
//  원래 칸은 화면에서만 숨기고 그대로 둡니다 — value 읽기·쓰기, change 이벤트(나이 확인 등)는 기존 코드 그대로 동작합니다.
(function(){
  if(window.KFDF_BIRTHPICK)return;window.KFDF_BIRTHPICK=1;
  var NATIVE=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
  var THIS_YEAR=new Date().getFullYear(),MIN_YEAR=1930;
  var css=document.createElement('style');
  css.textContent='.kbp{position:relative;display:inline-flex;gap:4px;align-items:center;flex-wrap:nowrap;min-width:214px;vertical-align:middle;max-width:100%}'
    +'.kbp.full{display:flex;width:100%}'
    +'.kbp select{font-family:inherit!important;font-size:14px!important;width:auto!important;min-width:0!important;flex-basis:0!important;margin:0!important;padding:9px 20px 9px 8px!important;border:1.5px solid #d5dce8;border-radius:9px!important;color:#16181d;cursor:pointer;-webkit-appearance:none;-moz-appearance:none;appearance:none;background:#fff url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%276%27%3E%3Cpath d=%27M1 1l4 4 4-4%27 fill=%27none%27 stroke=%27%23667085%27 stroke-width=%271.6%27/%3E%3C/svg%3E") no-repeat right 7px center!important;text-overflow:clip;line-height:1.2!important;height:auto!important}'
    +'.kbp select.y{flex:1.5 1 0!important}.kbp select.m,.kbp select.d{flex:1 1 0!important}.kbp select.empty{color:#8a919d}'
    +'.kbp select:focus{outline:2px solid #1F4E9C;outline-offset:1px}'
    +'.kbp .kbp-src{position:absolute!important;left:0;top:0;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;padding:0!important;border:0!important;margin:0!important}';
  (document.head||document.documentElement).appendChild(css);
  function isBirth(el){if(!el||el.tagName!=='INPUT'||(el.type||'').toLowerCase()!=='date')return false;if(el.dataset&&el.dataset.bp)return false;if(el.hasAttribute('data-birth'))return true;
    return /birth/i.test([el.id,el.className,el.name,el.getAttribute('onchange')||'',el.getAttribute('oninput')||''].join(' '))}
  function opt(v,t,sel){return '<option value="'+v+'"'+(sel?' selected':'')+'>'+t+'</option>'}
  function daysIn(y,m){return (y&&m)?new Date(+y,+m,0).getDate():31}
  function enhance(el){
    el.dataset.bp='1';var CS=null;try{var _c=getComputedStyle(el);CS={paddingTop:_c.paddingTop,fontSize:_c.fontSize,marginTop:_c.marginTop,marginBottom:_c.marginBottom,height:_c.height,boxSizing:_c.boxSizing}}catch(e){}   // 살아 있는 값이라 숨기기 전에 복사
    var wrap=document.createElement('span');wrap.className='kbp';
    var w=el.style.width||'';if(/100%/.test(w))wrap.className+=' full';else if(/px$/.test(w)&&parseInt(w,10)>214)wrap.style.width=w;
    if(el.style.flex)wrap.style.flex=el.style.flex;
    var fs=el.style.fontSize;if(fs)wrap.style.fontSize=fs;
    var mt=el.style.marginTop||(CS&&CS.marginTop!=='0px'?CS.marginTop:'');if(mt)wrap.style.marginTop=mt;if(CS&&CS.marginBottom&&CS.marginBottom!=='0px')wrap.style.marginBottom=CS.marginBottom;
    var alone=[].filter.call(el.parentNode.children,function(x){return x!==el&&x.tagName!=='LABEL'&&x.tagName!=='BR'&&!(x.tagName==='SPAN'&&!x.children.length&&!x.textContent.trim())}).length===0;if(alone&&wrap.className.indexOf('full')<0)wrap.className+=' full';
    var ys='<option value="">연도</option>';for(var y=THIS_YEAR;y>=MIN_YEAR;y--)ys+=opt(y,y+'년');
    var ms='<option value="">월</option>';for(var m=1;m<=12;m++)ms+=opt(m,m+'월');
    wrap.innerHTML='<select class="y" aria-label="태어난 연도">'+ys+'</select><select class="m" aria-label="태어난 월">'+ms+'</select><select class="d" aria-label="태어난 일"></select>';
    el.parentNode.insertBefore(wrap,el);wrap.appendChild(el);el.classList.add('kbp-src');el.tabIndex=-1;
    var Y=wrap.querySelector('.y'),M=wrap.querySelector('.m'),Dd=wrap.querySelector('.d');
    if(CS){var pt=parseFloat(CS.paddingTop)||0;var fsz=Math.min(15,Math.max(13,parseFloat(CS.fontSize)||14));var hh=parseFloat(CS.height)||0;[Y,M,Dd].forEach(function(s){if(hh>=30&&CS.boxSizing==='border-box')s.style.setProperty('height',hh+'px','important');s.style.setProperty('padding-top',Math.max(6,pt)+'px','important');s.style.setProperty('padding-bottom',Math.max(6,pt)+'px','important');s.style.setProperty('font-size',fsz+'px','important')})}
    function fillDays(keep){var n=daysIn(Y.value,M.value);var h='<option value="">일</option>';for(var d=1;d<=n;d++)h+=opt(d,d+'일',String(d)===String(keep));Dd.innerHTML=h}
    function paint(){[Y,M,Dd].forEach(function(s){s.classList.toggle('empty',!s.value)})}
    function fromValue(v){var g=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v||'');
      if(g){var yy=+g[1];if(!Y.querySelector('option[value="'+yy+'"]')){var o=document.createElement('option');o.value=yy;o.textContent=yy+'년';Y.appendChild(o)}Y.value=String(yy);M.value=String(+g[2]);fillDays(+g[3])}
      else{Y.value='';M.value='';fillDays('')}paint()}
    // 기존 코드가 el.value = '2013-05-01' 처럼 넣어도 선택 상자가 따라오게
    Object.defineProperty(el,'value',{configurable:true,get:function(){return NATIVE.get.call(this)},set:function(v){NATIVE.set.call(this,v);fromValue(NATIVE.get.call(this))}});
    var _focus=el.focus;el.focus=function(){var t=!Y.value?Y:!M.value?M:Dd;try{t.focus()}catch(e){try{_focus.call(el)}catch(x){}}};
    function push(){var full=Y.value&&M.value&&Dd.value;var v=full?(Y.value+'-'+String(M.value).padStart(2,'0')+'-'+String(Dd.value).padStart(2,'0')):'';
      var before=NATIVE.get.call(el);NATIVE.set.call(el,v);paint();
      try{el.dispatchEvent(new Event('input',{bubbles:true}))}catch(e){}
      if(v!==before&&(full||before)){try{el.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){}}}
    Y.addEventListener('change',function(){fillDays(Dd.value);push()});
    M.addEventListener('change',function(){fillDays(Dd.value);push()});
    Dd.addEventListener('change',push);
    // 검사 코드가 원래 칸에 붉은 테두리를 주면 선택 상자에도
    try{new MutationObserver(function(){var b=el.style.border||el.style.borderColor;[Y,M,Dd].forEach(function(s){s.style.border=b&&!/^0/.test(b)?b:''})}).observe(el,{attributes:true,attributeFilter:['style']})}catch(e){}
    fromValue(NATIVE.get.call(el));
  }
  function scan(root){if(!root||!root.querySelectorAll)return;if(isBirth(root))enhance(root);root.querySelectorAll('input[type="date"],input[type=date]').forEach(function(el){if(isBirth(el))enhance(el)})}
  function start(){scan(document.body);try{new MutationObserver(function(list){list.forEach(function(r){r.addedNodes&&r.addedNodes.forEach(function(n){if(n.nodeType===1)scan(n)})})}).observe(document.body,{childList:true,subtree:true})}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  window.KFDF_BIRTHPICK_SCAN=scan;
})();
