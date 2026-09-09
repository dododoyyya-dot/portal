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
  // [섬 2026-09-09] 본토 밖 섬 — 실제 위치(같은 투영)
  var ISLES=[{n:'강화',x:48,y:97,r:6},{n:'거제',x:236,y:358,r:8},{n:'남해',x:176,y:364,r:6},{n:'완도',x:74,y:410,r:5},{n:'진도',x:34,y:394,r:6}];
  // 울릉도(130.87E,37.50N)·독도(131.87E,37.24N) — 같은 투영. 동해 구간(x>330)은 폭을 1/2로 줄여 지도 안에 실제 방향·순서대로 배치
  var ESEA=function(x){return 330+(x-330)*0.5};
  var ULL={x:ESEA(437),y:115},DOK={x:ESEA(525),y:139};
  // 권역 표식 위치(대략 중심)와 포인트 색
  var PIN={
    '서울·경기':{x:96,y:118,c:'#1f5fb2'},
    '강원':{x:214,y:98,c:'#068081'},
    '충청':{x:112,y:206,c:'#3e9e5f'},
    '전라':{x:92,y:322,c:'#d99a1e'},
    '경상':{x:240,y:258,c:'#7c3aed'},
    '제주':{x:104,y:452,c:'#c41e2f'}
  };
  // 문자열에서 시도 이름(경남·부산 등)을 찾음 — 시도별 집계·필터용
  var FULL={'서울특별시':'서울','인천광역시':'인천','경기도':'경기','강원특별자치도':'강원','강원도':'강원','대전광역시':'대전','세종특별자치시':'세종','충청북도':'충북','충청남도':'충남','광주광역시':'광주','전북특별자치도':'전북','전라북도':'전북','전라남도':'전남','부산광역시':'부산','대구광역시':'대구','울산광역시':'울산','경상북도':'경북','경상남도':'경남','제주특별자치도':'제주','제주도':'제주'};
  function sidoOf(str){str=String(str||'');var best='',bi=-1;
    for(var f in FULL){var i=str.indexOf(f);if(i>=0&&(bi<0||i<bi)){best=FULL[f];bi=i}}
    if(best)return best;
    for(var k in SIDO){if(k==='충청'||k==='전라'||k==='경상')continue;var j=str.indexOf(k);if(j>=0&&(bi<0||j<bi)){best=k;bi=j}}
    return best;
  }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function tw(s){var n=0;for(var i=0;i<s.length;i++)n+=(s.charCodeAt(i)>255?1:0.55);return n}

  window.KFDF_MAP={
    REGIONS:REGIONS,SIDO:SIDO,sidoOf:sidoOf,
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
        var svg='<svg viewBox="0 0 450 480" style="width:100%;max-width:470px;display:block" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="권역 지도">'
          +'<defs><linearGradient id="'+uid+'l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9f0fb"/><stop offset="1" stop-color="#cfe0f5"/></linearGradient>'
          +'<filter id="'+uid+'s" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#141d51" flood-opacity=".18"/></filter></defs>'
          +'<path d="'+LAND+'" fill="url(#'+uid+'l)" stroke="#9db8dd" stroke-width="2" stroke-linejoin="round"/>'
          +'<ellipse cx="'+JEJU.cx+'" cy="'+JEJU.cy+'" rx="'+JEJU.rx+'" ry="'+JEJU.ry+'" fill="url(#'+uid+'l)" stroke="#9db8dd" stroke-width="2"/>'
          +ISLES.map(function(i){return '<ellipse cx="'+i.x+'" cy="'+i.y+'" rx="'+i.r+'" ry="'+Math.max(3,i.r*0.7)+'" fill="url(#'+uid+'l)" stroke="#9db8dd" stroke-width="1.5"/>'}).join('')
          // 동해·서해·남해 표기 + 울릉도·독도(실제 위치, 동해)
          +'<text x="372" y="62" text-anchor="middle" font-size="12" font-weight="800" fill="#7f9cc4" letter-spacing="3">동 해</text>'
          +'<text x="372" y="75" text-anchor="middle" font-size="7.5" font-weight="700" fill="#a9bdd9" letter-spacing="1">EAST SEA</text>'
          +'<text x="24" y="250" text-anchor="middle" font-size="10" font-weight="800" fill="#a9bdd9" letter-spacing="2">서해</text>'
          +'<text x="200" y="430" text-anchor="middle" font-size="10" font-weight="800" fill="#a9bdd9" letter-spacing="2">남해</text>'
          +'<ellipse cx="'+ULL.x+'" cy="'+ULL.y+'" rx="7" ry="5.5" fill="url(#'+uid+'l)" stroke="#9db8dd" stroke-width="1.5"/>'
          +'<text x="'+ULL.x+'" y="'+(ULL.y+17)+'" text-anchor="middle" font-size="9.5" font-weight="800" fill="#374151">울릉도</text>'
          +'<ellipse cx="'+(DOK.x-2)+'" cy="'+DOK.y+'" rx="2.6" ry="2" fill="#1f5fb2" stroke="#1f5fb2"/><ellipse cx="'+(DOK.x+3)+'" cy="'+(DOK.y+2)+'" rx="1.9" ry="1.5" fill="#1f5fb2" stroke="#1f5fb2"/>'
          +'<text x="'+DOK.x+'" y="'+(DOK.y+16)+'" text-anchor="middle" font-size="9.5" font-weight="900" fill="#141d51">독도</text>'
          +'<text x="404" y="470" font-size="10" fill="#9db8dd" font-weight="700" letter-spacing="1">KOREA</text>'
          +'<text x="'+(JEJU.cx)+'" y="'+(JEJU.cy+26)+'" text-anchor="middle" font-size="9.5" font-weight="800" fill="#374151">제주도</text>';
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
        // [세부 지역] 권역이 선택되면 그 권역의 시도별 건수 칩을 지도 아래에 표시 (opts.subCounts {권역:{시도:건수}}, 칩 클릭 → opts.onSub(시도))
        var subHtml='';
        if(opts.subCounts&&sel.length===1&&opts.subCounts[sel[0]]){var sc=opts.subCounts[sel[0]];var keys=Object.keys(sc);
          if(keys.length)subHtml='<div class="km-sub" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:8px">'+keys.map(function(k){var on=opts.sub===k;return '<button type="button" data-sub="'+esc(k)+'" style="border:1.5px solid '+(on?'#1f5fb2':'#dfe5ee')+';background:'+(on?'#1f5fb2':'#fff')+';color:'+(on?'#fff':'#141d51')+';border-radius:999px;padding:5px 12px;font-size:12.5px;font-weight:800;font-family:inherit;cursor:pointer">'+esc(k)+' <span style="font-weight:700;opacity:.8">'+esc(sc[k])+'</span></button>'}).join('')+'</div>'}
        el.innerHTML=svg+subHtml;
        el.querySelectorAll('.km-sub button').forEach(function(b){b.addEventListener('click',function(){var k=b.getAttribute('data-sub');opts.sub=(opts.sub===k)?'':k;draw();if(opts.onSub)opts.onSub(opts.sub)})});
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
        setSub:function(k){opts.sub=k||'';draw()},
        set:function(arr){sel=(arr||[]).slice();draw()},
        setCounts:function(c){opts.counts=c;draw()}
      };
    }
  };
})();
