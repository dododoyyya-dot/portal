// ══════════════════════════════════════════════
// KFDF 공용 권역 지도 컴포넌트 (region_map.js) — 2026-09-07 지도형으로 개편
// 사용: KFDF_MAP.render('컨테이너ID', {mode:'single'|'multi'|'display', selected:[...], counts:{권역:'표시문구'}, onChange:fn})
//   · 남한 실루엣 위에 6개 권역 표식(라벨·건수)을 실제 위치에 놓습니다. 표식을 누르면 선택(single/multi), display 는 보기 전용.
//   · 반환 {get, set, setCounts} 와 guessRegion 은 종전과 동일 (apply·jobs·mypage·index 호출부 무변경).
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
  // 남한 해안선 근사 (경도·위도 → x=(lon-125.9)*88, y=(38.75-lat)*92) · viewBox 340x480
  var LAND='M66,89 L92,74 L106,64 L136,41 L176,40 L211,18 L224,14 L238,51 L264,87 L282,115 L304,147 L308,184 L312,216 L321,248 L304,276 L312,299 L299,327 L277,340 L255,345 L238,359 L220,368 L189,354 L172,368 L158,377 L141,382 L123,396 L97,391 L75,409 L53,396 L35,373 L44,345 L40,317 L57,290 L75,267 L57,248 L53,221 L26,198 L44,179 L75,175 L92,156 L70,138 L57,120 Z';
  var JEJU={cx:62,cy:452,rx:30,ry:13};
  // 권역 표식 위치(대략 중심)와 포인트 색
  var PIN={
    '서울·경기':{x:96,y:118,c:'#1f5fb2'},
    '강원':{x:214,y:98,c:'#068081'},
    '충청':{x:112,y:206,c:'#3e9e5f'},
    '전라':{x:92,y:322,c:'#d99a1e'},
    '경상':{x:240,y:258,c:'#7c3aed'},
    '제주':{x:104,y:452,c:'#c41e2f'}
  };
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function tw(s){var n=0;for(var i=0;i<s.length;i++)n+=(s.charCodeAt(i)>255?1:0.55);return n}

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
      var uid='km'+Math.floor(Math.random()*1e6);
      function draw(){
        var svg='<svg viewBox="0 0 340 480" style="width:100%;max-width:360px;display:block" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="권역 지도">'
          +'<defs><linearGradient id="'+uid+'l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9f0fb"/><stop offset="1" stop-color="#cfe0f5"/></linearGradient>'
          +'<filter id="'+uid+'s" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#141d51" flood-opacity=".18"/></filter></defs>'
          +'<path d="'+LAND+'" fill="url(#'+uid+'l)" stroke="#9db8dd" stroke-width="2" stroke-linejoin="round"/>'
          +'<ellipse cx="'+JEJU.cx+'" cy="'+JEJU.cy+'" rx="'+JEJU.rx+'" ry="'+JEJU.ry+'" fill="url(#'+uid+'l)" stroke="#9db8dd" stroke-width="2"/>'
          +'<text x="298" y="470" font-size="10" fill="#9db8dd" font-weight="700" letter-spacing="1">KOREA</text>';
        REGIONS.forEach(function(r){
          var p=PIN[r],on=sel.indexOf(r)>=0;
          var cnt=(opts.counts&&opts.counts[r]!=null)?String(opts.counts[r]):'';
          var w=Math.max(tw(r)*15+26,cnt?tw(cnt)*11.5+22:0),h=cnt?46:30;
          var x=p.x-w/2,y=p.y-h/2;
          var fill=on?p.c:'#fff',stroke=p.c,txt=on?'#fff':'#141d51',sub=on?'rgba(255,255,255,.9)':'#4b5563';
          var cursor=(mode==='display')?'default':'pointer';
          svg+='<g data-r="'+esc(r)+'" style="cursor:'+cursor+'" filter="url(#'+uid+'s)">'
            +'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="15" fill="'+fill+'" stroke="'+stroke+'" stroke-width="2"/>'
            +'<circle cx="'+(x+12)+'" cy="'+(cnt?y+15:y+15)+'" r="4" fill="'+(on?'#fff':p.c)+'"/>'
            +'<text x="'+(p.x+6)+'" y="'+(y+(cnt?19:20))+'" text-anchor="middle" font-size="14" font-weight="900" fill="'+txt+'" style="pointer-events:none">'+esc(r)+'</text>'
            +(cnt?'<text x="'+p.x+'" y="'+(y+36)+'" text-anchor="middle" font-size="11" font-weight="700" fill="'+sub+'" style="pointer-events:none">'+esc(cnt)+'</text>':'')
            +(on&&mode!=='display'?'<circle cx="'+(x+w-2)+'" cy="'+(y+2)+'" r="8" fill="#e6b422"/><text x="'+(x+w-2)+'" y="'+(y+6)+'" text-anchor="middle" font-size="10" font-weight="900" fill="#141d51" style="pointer-events:none">✓</text>':'')
            +'</g>';
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
