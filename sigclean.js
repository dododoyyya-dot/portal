/* [2026-10-21] 서명 이미지 배경 제거(누끼) 공용 — 화면·기록지에 서명이 흰 상자처럼 보이던 것
   · 종이 배경만 투명하게: 작은 칸마다 가장 밝은 값을 종이 색으로 보고(그림자·조명 얼룩 대응), 그보다 충분히 어두운 곳만 잉크로 남김
   · 선을 지우거나 덩어리를 빼지 않음 — 밑줄·긴 획이 있는 서명도 그대로
   · 이미 투명한 서명(화면에 그린 서명)은 손대지 않음
   · 화면: <img data-sig> 는 자동으로 정리본으로 바뀜 · 인쇄: KFDF_SIG.cleanSigns(signs) 로 미리 정리
   · 불러오기 실패(CORS 등)면 원본 그대로 — CSS mix-blend-mode:multiply 로 흰 배경은 어차피 안 보임 */
(function(){
function pixels(data,w,h){
  var N=w*h,i,k,x,y;
  var tr=0;for(i=0;i<N;i++){if(data[i*4+3]<16)tr++}
  if(tr>N*0.15)return null;   // 이미 누끼된 이미지
  var L=new Float32Array(N);for(i=0;i<N;i++){k=i*4;L[i]=0.299*data[k]+0.587*data[k+1]+0.114*data[k+2]}
  var B=Math.max(8,Math.round(Math.max(w,h)/40)),bw=Math.ceil(w/B),bh=Math.ceil(h/B);
  var mx=new Float32Array(bw*bh);
  for(y=0;y<h;y++)for(x=0;x<w;x++){var bi=Math.floor(y/B)*bw+Math.floor(x/B);if(L[y*w+x]>mx[bi])mx[bi]=L[y*w+x]}
  var bg=new Float32Array(bw*bh);   // 이웃 칸까지 가장 밝은 값 — 잉크로 꽉 찬 칸도 종이 색을 얻음
  for(y=0;y<bh;y++)for(x=0;x<bw;x++){var m=0;for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){var yy=y+dy,xx=x+dx;if(yy>=0&&yy<bh&&xx>=0&&xx<bw&&mx[yy*bw+xx]>m)m=mx[yy*bw+xx]}bg[y*bw+x]=m}
  var minX=w,minY=h,maxX=-1,maxY=-1,ink=0;
  for(y=0;y<h;y++){var fy=Math.min(bh-1,Math.max(0,(y+0.5)/B-0.5)),y0=Math.floor(fy),y1=Math.min(bh-1,y0+1),ty=fy-y0;
    for(x=0;x<w;x++){var fx=Math.min(bw-1,Math.max(0,(x+0.5)/B-0.5)),x0=Math.floor(fx),x1=Math.min(bw-1,x0+1),tx=fx-x0;
      var p=(bg[y0*bw+x0]*(1-tx)+bg[y0*bw+x1]*tx)*(1-ty)+(bg[y1*bw+x0]*(1-tx)+bg[y1*bw+x1]*tx)*ty;
      i=y*w+x;k=i*4;var d=p-L[i];var lo=Math.max(14,p*0.07),hi=Math.max(55,p*0.28);
      var a=d<=lo?0:d>=hi?255:Math.round((d-lo)/(hi-lo)*255);
      data[k+3]=Math.round(a*data[k+3]/255);
      if(a>0){var s=Math.min(1,L[i]/Math.max(1,p));data[k]=Math.round(data[k]*s*0.75);data[k+1]=Math.round(data[k+1]*s*0.75);data[k+2]=Math.round(data[k+2]*s*0.75)}   // 잉크는 조금 진하게
      if(a>90){ink++;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y}}}
  if(maxX<0)return {box:[0,0,w,h],ink:0};
  var pad=Math.round(Math.max(w,h)*0.02)+2;minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);maxX=Math.min(w-1,maxX+pad);maxY=Math.min(h-1,maxY+pad);
  return {box:[minX,minY,maxX-minX+1,maxY-minY+1],ink:ink/N};
}
var CACHE={};
function load(url){return new Promise(function(res,rej){var x=new Image();var d=/^data:/.test(url);if(!d)x.crossOrigin='anonymous';x.onload=function(){res(x)};x.onerror=function(){rej(new Error('load'))};x.src=d?url:url+(url.indexOf('?')>=0?'&':'?')+'cors=1'})}
function clean(url){
  if(!url||typeof url!=='string')return Promise.resolve(url);
  if(/_c2\.png/.test(url))return Promise.resolve(url);   // 마이페이지에서 이미 정리된 서명
  if(CACHE[url])return CACHE[url];
  CACHE[url]=load(url).then(function(im){
    var r=Math.min(1,900/Math.max(im.width,im.height));var w=Math.max(1,Math.round(im.width*r)),h=Math.max(1,Math.round(im.height*r));
    var c=document.createElement('canvas');c.width=w;c.height=h;var g=c.getContext('2d');g.drawImage(im,0,0,w,h);
    var d=g.getImageData(0,0,w,h);var info=pixels(d.data,w,h);if(!info||info.ink<0.001)return url;
    g.putImageData(d,0,0);var b=info.box;var o=document.createElement('canvas');o.width=b[2];o.height=b[3];
    o.getContext('2d').drawImage(c,b[0],b[1],b[2],b[3],0,0,b[2],b[3]);return o.toDataURL('image/png');
  }).catch(function(){return url});
  return CACHE[url];
}
function cleanSigns(signs){var out={};var jobs=[];Object.keys(signs||{}).forEach(function(k){var v=signs[k];if(v&&typeof v==='object'&&v.img){out[k]=Object.assign({},v);jobs.push(clean(v.img).then(function(u){out[k].img=u}))}else out[k]=v});return Promise.all(jobs).then(function(){return out})}
function fix(root){var L=(root||document).querySelectorAll('img[data-sig]:not([data-sigdone])');for(var i=0;i<L.length;i++){(function(im){im.setAttribute('data-sigdone','1');var src=im.getAttribute('src');clean(src).then(function(u){if(u&&u!==src)im.src=u})})(L[i])}}
var T=0;function watch(){if(!document.body)return;new MutationObserver(function(){clearTimeout(T);T=setTimeout(function(){fix(document)},60)}).observe(document.body,{childList:true,subtree:true});fix(document)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
window.KFDF_SIG={clean:clean,cleanSigns:cleanSigns,fix:fix,pixels:pixels};
})();
