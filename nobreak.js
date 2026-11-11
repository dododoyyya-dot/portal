/* [줄바꿈 보정 2026-11-11] 설명 글(p·li·dd) 안의 가운뎃점(·) 앞에서 줄이 바뀌어 줄 맨 앞에 ·이 오는 것을 막는다.
   보이지 않는 WORD JOINER(U+2060)만 끼우며, 표·입력·동적 목록은 건드리지 않는다. */
(function () {
  function run() {
    try {
      var doc = /(privacy|briefing)/.test(location.pathname); /* 정적 안내문 쪽만 표 칸도 포함 */
      var els = document.querySelectorAll(doc ? 'p,li,dd,.note,.tip,td,th' : 'p,li,dd,.note,.tip');
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (el.closest('script,style,textarea,input,select,table,[contenteditable],pre,code') && !(doc && el.closest('table') && !el.closest('textarea,input,select,[contenteditable]'))) continue;
        var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n;
        while ((n = w.nextNode())) {
          var v = n.nodeValue;
          if (v.indexOf('\u00b7') < 0) continue;
          var nv = v.replace(/([가-힣A-Za-z0-9)\]」』”’%])\u00b7/g, '$1\u2060\u00b7');
          if (nv !== v) n.nodeValue = nv;
        }
      }
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  window.addEventListener('load', function () { setTimeout(run, 1000); });
})();
