// 顶部进度条：页顶整条全满，越往下滑越短（左端固定、右端往左收），页底全无。
// 进度口径与时间线右缘的进度条一致：scrollY / (文档高 − 视口高)
(function () {
  "use strict";
  var bar = document.getElementById("top-progress");
  if (!bar) return;

  function progress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? window.scrollY / max : 0;
    return Math.max(0, Math.min(1, p));
  }

  var ticking = false;
  function update() {
    ticking = false;
    // 用 scaleX 而不是改 width：不触发重排，也不会把 2px 的线算出半像素
    bar.style.transform = "scaleX(" + (1 - progress()) + ")";
  }
  function request() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);

  update();
})();
