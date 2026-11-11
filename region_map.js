// ══════════════════════════════════════════════
// KFDF 공용 권역 지도 컴포넌트 (region_map.js) · v20260910a — 2026-09-07 지도형으로 개편
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
  // [권역 보강 2026-09-10] 시·군·구 이름 → 시도 (club.html 행정구역표에서 생성, 중복 이름 제외). '밀양시종합운동장'·'순천 팔마체육관'처럼 시도명이 없는 장소도 판정
  var CITY={"강남구":"서울","강남":"서울","강동구":"서울","강동":"서울","강북구":"서울","강북":"서울","관악구":"서울","관악":"서울","광진구":"서울","광진":"서울","구로구":"서울","구로":"서울","금천구":"서울","금천":"서울","노원구":"서울","노원":"서울","도봉구":"서울","도봉":"서울","동대문구":"서울","동대문":"서울","동작구":"서울","동작":"서울","마포구":"서울","마포":"서울","서대문구":"서울","서대문":"서울","서초구":"서울","서초":"서울","성동구":"서울","성동":"서울","성북구":"서울","성북":"서울","송파구":"서울","송파":"서울","양천구":"서울","양천":"서울","영등포구":"서울","영등포":"서울","용산구":"서울","용산":"서울","은평구":"서울","은평":"서울","종로구":"서울","종로":"서울","중랑구":"서울","중랑":"서울","금정구":"부산","금정":"부산","기장군":"부산","기장":"부산","동래구":"부산","동래":"부산","부산진구":"부산","부산진":"부산","사상구":"부산","사상":"부산","사하구":"부산","사하":"부산","수영구":"부산","수영":"부산","연제구":"부산","연제":"부산","영도구":"부산","영도":"부산","해운대구":"부산","해운대":"부산","군위군":"대구","군위":"대구","달서구":"대구","달서":"대구","달성군":"대구","달성":"대구","수성구":"대구","수성":"대구","강화군":"인천","강화":"인천","계양구":"인천","계양":"인천","남동구":"인천","남동":"인천","미추홀구":"인천","미추홀":"인천","부평구":"인천","부평":"인천","연수구":"인천","연수":"인천","옹진군":"인천","옹진":"인천","광산구":"광주","광산":"광주","대덕구":"대전","대덕":"대전","유성구":"대전","유성":"대전","울주군":"울산","울주":"울산","세종시":"세종","가평군":"경기","가평":"경기","고양시":"경기","고양":"경기","과천시":"경기","과천":"경기","광명시":"경기","광명":"경기","광주시":"경기","구리시":"경기","구리":"경기","군포시":"경기","군포":"경기","김포시":"경기","김포":"경기","남양주시":"경기","남양주":"경기","동두천시":"경기","동두천":"경기","부천시":"경기","부천":"경기","성남시":"경기","성남":"경기","수원시":"경기","수원":"경기","시흥시":"경기","시흥":"경기","안산시":"경기","안산":"경기","안성시":"경기","안성":"경기","안양시":"경기","안양":"경기","양주시":"경기","양주":"경기","양평군":"경기","양평":"경기","여주시":"경기","여주":"경기","연천군":"경기","연천":"경기","오산시":"경기","오산":"경기","용인시":"경기","용인":"경기","의왕시":"경기","의왕":"경기","의정부시":"경기","의정부":"경기","이천시":"경기","이천":"경기","파주시":"경기","파주":"경기","평택시":"경기","평택":"경기","포천시":"경기","포천":"경기","하남시":"경기","하남":"경기","화성시":"경기","화성":"경기","강릉시":"강원","강릉":"강원","동해시":"강원","동해":"강원","삼척시":"강원","삼척":"강원","속초시":"강원","속초":"강원","양구군":"강원","양구":"강원","양양군":"강원","양양":"강원","영월군":"강원","영월":"강원","원주시":"강원","원주":"강원","인제군":"강원","인제":"강원","정선군":"강원","정선":"강원","철원군":"강원","철원":"강원","춘천시":"강원","춘천":"강원","태백시":"강원","태백":"강원","평창군":"강원","평창":"강원","홍천군":"강원","홍천":"강원","화천군":"강원","화천":"강원","횡성군":"강원","횡성":"강원","괴산군":"충북","괴산":"충북","단양군":"충북","단양":"충북","보은군":"충북","보은":"충북","영동군":"충북","영동":"충북","옥천군":"충북","옥천":"충북","음성군":"충북","음성":"충북","제천시":"충북","제천":"충북","증평군":"충북","증평":"충북","진천군":"충북","진천":"충북","청주시":"충북","청주":"충북","충주시":"충북","충주":"충북","계룡시":"충남","계룡":"충남","공주시":"충남","공주":"충남","금산군":"충남","금산":"충남","논산시":"충남","논산":"충남","당진시":"충남","당진":"충남","보령시":"충남","보령":"충남","부여군":"충남","부여":"충남","서산시":"충남","서산":"충남","서천군":"충남","서천":"충남","아산시":"충남","아산":"충남","예산군":"충남","예산":"충남","천안시":"충남","천안":"충남","청양군":"충남","청양":"충남","태안군":"충남","태안":"충남","홍성군":"충남","홍성":"충남","고창군":"전북","고창":"전북","군산시":"전북","군산":"전북","김제시":"전북","김제":"전북","남원시":"전북","남원":"전북","무주군":"전북","무주":"전북","부안군":"전북","부안":"전북","순창군":"전북","순창":"전북","완주군":"전북","완주":"전북","익산시":"전북","익산":"전북","임실군":"전북","임실":"전북","장수군":"전북","장수":"전북","전주시":"전북","전주":"전북","정읍시":"전북","정읍":"전북","진안군":"전북","진안":"전북","강진군":"전남","강진":"전남","고흥군":"전남","고흥":"전남","곡성군":"전남","곡성":"전남","광양시":"전남","광양":"전남","구례군":"전남","구례":"전남","나주시":"전남","나주":"전남","담양군":"전남","담양":"전남","목포시":"전남","목포":"전남","무안군":"전남","무안":"전남","보성군":"전남","보성":"전남","순천시":"전남","순천":"전남","신안군":"전남","신안":"전남","여수시":"전남","여수":"전남","영광군":"전남","영광":"전남","영암군":"전남","영암":"전남","완도군":"전남","완도":"전남","장성군":"전남","장성":"전남","장흥군":"전남","장흥":"전남","진도군":"전남","진도":"전남","함평군":"전남","함평":"전남","해남군":"전남","해남":"전남","화순군":"전남","화순":"전남","경산시":"경북","경산":"경북","경주시":"경북","경주":"경북","고령군":"경북","고령":"경북","구미시":"경북","구미":"경북","김천시":"경북","김천":"경북","문경시":"경북","문경":"경북","봉화군":"경북","봉화":"경북","상주시":"경북","상주":"경북","성주군":"경북","성주":"경북","안동시":"경북","안동":"경북","영덕군":"경북","영덕":"경북","영양군":"경북","영양":"경북","영주시":"경북","영주":"경북","영천시":"경북","영천":"경북","예천군":"경북","예천":"경북","울릉군":"경북","울릉":"경북","울진군":"경북","울진":"경북","의성군":"경북","의성":"경북","청도군":"경북","청도":"경북","청송군":"경북","청송":"경북","칠곡군":"경북","칠곡":"경북","포항시":"경북","포항":"경북","거제시":"경남","거제":"경남","거창군":"경남","거창":"경남","김해시":"경남","김해":"경남","남해군":"경남","남해":"경남","밀양시":"경남","밀양":"경남","사천시":"경남","사천":"경남","산청군":"경남","산청":"경남","양산시":"경남","양산":"경남","의령군":"경남","의령":"경남","진주시":"경남","진주":"경남","창녕군":"경남","창녕":"경남","창원시":"경남","창원":"경남","통영시":"경남","통영":"경남","하동군":"경남","하동":"경남","함안군":"경남","함안":"경남","함양군":"경남","함양":"경남","합천군":"경남","합천":"경남","서귀포시":"제주","서귀포":"제주","제주시":"제주","제주":"제주"};
  function cityOf(str){str=String(str||'');var best='',bi=-1;for(var k in CITY){var i=str.indexOf(k);if(i>=0&&(bi<0||i<bi||(i===bi&&k.length>best.length))){best=k;bi=i}}return best?CITY[best]:''}
  function sidoOf(str){str=String(str||'').replace(/경기장/g,' ');var best='',bi=-1;   // '경기장' 은 경기도가 아님
    for(var f in FULL){var i=str.indexOf(f);if(i>=0&&(bi<0||i<bi)){best=FULL[f];bi=i}}
    if(best)return best;
    for(var k in SIDO){if(k==='충청'||k==='전라'||k==='경상')continue;var j=str.indexOf(k);if(j>=0&&(bi<0||j<bi)){best=k;bi=j}}
    return best||cityOf(str);
  }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function tw(s){var n=0;for(var i=0;i<s.length;i++)n+=(s.charCodeAt(i)>255?1:0.55);return n}

  window.KFDF_MAP={
    REGIONS:REGIONS,SIDO:SIDO,sidoOf:sidoOf,cityOf:cityOf,
    // 주소·시도 문자열에서 권역 추정 ('경기도 김포시' → '서울·경기')
    guessRegion:function(str){
      if(!str)return '';
      str=String(str).replace(/경기장/g,' ');   // '진남경기장' 의 '경기' 오판 방지
      for(var k in SIDO){if(str.indexOf(k)===0||str.indexOf(k)>=0&&str.slice(0,4).indexOf(k)>=0)return SIDO[k];}
      for(var k2 in SIDO){if(str.indexOf(k2)>=0)return SIDO[k2];}
      var c=cityOf(str);return c?(SIDO[c]||''):'';   // [권역 보강] 시·군·구 이름으로도 판정
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
