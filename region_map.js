// ══════════════════════════════════════════════
// KFDF 공용 권역 지도 컴포넌트 (region_map.js)
// 사용: KFDF_MAP.render('컨테이너ID', {mode:'single'|'multi'|'display', selected:[...], counts:{권역:'표시문구'}, onChange:fn})
// ══════════════════════════════════════════════
(function(){
  var REGIONS=['서울·경기','강원','충청','전라','경상','제주'];
  // 시·도 → 권역 매핑 (신청서 주소 자동 인식용)
  var SIDO={'서울':'서울·경기','인천':'서울·경기','경기':'서울·경기',
    '강원':'강원',
    '대전':'충청','세종':'충청','충북':'충청','충남':'충청','충청':'충청',
    '광주':'전라','전북':'전라','전남':'전라','전라':'전라',
    '부산':'경상','대구':'경상','울산':'경상','경북':'경상','경남':'경상','경상':'경상',
    '제주':'제주'};
  // 한반도 대략 배치 (viewBox 320x430)
  var TILES={
    '서울·경기':{x:28,y:30,w:120,h:92},
    '강원':{x:158,y:16,w:134,h:106},
    '충청':{x:22,y:132,w:146,h:92},
    '경상':{x:178,y:132,w:120,h:158},
    '전라':{x:22,y:234,w:146,h:106},
    '제주':{x:44,y:372,w:86,h:40}
  };
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

  window.KFDF_MAP={
    REGIONS:REGIONS,
    // 주소·시도 문자열에서 권역 추정 ('경기도 김포시' → '서울·경기')
    guessRegion:function(str){
      if(!str)return '';
      str=String(str);
      for(var k in SIDO){if(str.indexOf(k)===0||str.indexOf(k)>=0&&str.slice(0,4).indexOf(k)>=0)return SIDO[k];}
      for(var k2 in SIDO){if(str.indexOf(k2)>=0)return SIDO[k2];}
      return '';
    },
    render:function(elId,opts){
      opts=opts||{};
      var mode=opts.mode||'single';
      var sel=(opts.selected||[]).slice();
      var el=document.getElementById(elId);
      if(!el)return null;
      function draw(){
        var svg='<svg viewBox="0 0 320 430" style="width:100%;max-width:340px;display:block" xmlns="http://www.w3.org/2000/svg">';
        REGIONS.forEach(function(r){
          var t=TILES[r],on=sel.indexOf(r)>=0;
          var fill=on?'#153A77':'#eef3fa',stroke=on?'#153A77':'#b9cdec',txt=on?'#fff':'#153A77';
          var cursor=(mode==='display')?'default':'pointer';
          svg+='<g data-r="'+esc(r)+'" style="cursor:'+cursor+'">'
            +'<rect x="'+t.x+'" y="'+t.y+'" width="'+t.w+'" height="'+t.h+'" rx="14" fill="'+fill+'" stroke="'+stroke+'" stroke-width="2"/>'
            +'<text x="'+(t.x+t.w/2)+'" y="'+(t.y+t.h/2-(opts.counts?6:-5))+'" text-anchor="middle" font-size="15" font-weight="800" fill="'+txt+'" style="pointer-events:none">'+esc(r)+'</text>';
          if(opts.counts&&opts.counts[r]!=null){
            svg+='<text x="'+(t.x+t.w/2)+'" y="'+(t.y+t.h/2+14)+'" text-anchor="middle" font-size="11.5" font-weight="700" fill="'+(on?'#cfe0f8':'#5b7db1')+'" style="pointer-events:none">'+esc(opts.counts[r])+'</text>';
          }
          if(on&&mode!=='display'){
            svg+='<text x="'+(t.x+t.w-14)+'" y="'+(t.y+18)+'" text-anchor="middle" font-size="13" fill="#e6b422" style="pointer-events:none">✓</text>';
          }
          svg+='</g>';
        });
        svg+='</svg>';
        el.innerHTML=svg;
        if(mode!=='display'){
          el.querySelectorAll('g[data-r]').forEach(function(g){
            g.addEventListener('click',function(){
              var r=g.getAttribute('data-r');
              if(mode==='single'){sel=[r];}
              else{
                var i=sel.indexOf(r);
                if(i>=0)sel.splice(i,1);else sel.push(r);
              }
              draw();
              if(opts.onChange)opts.onChange(sel.slice());
            });
          });
        }
      }
      draw();
      return {
        get:function(){return sel.slice()},
        set:function(arr){sel=(arr||[]).slice();draw()},
        setCounts:function(c){opts.counts=c;draw()}
      };
    }
  };
})();
