// 时间线右缘进度条：圆点按整页滚动比例沿细线均匀滑动，
// 点内显示进度位置对应文章的汉字月份（壹…拾、冬、腊）；圆点可拖动、线上可点按，按比例快速跳转
(function () {
  "use strict";
  var rail = document.getElementById("tl-rail");
  var dot = document.getElementById("tl-dot");
  if (!rail || !dot) return;

  var NAMES = ["", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖", "拾", "冬", "腊"];
  // 注意：单年页每个月一个 .post-list，必须全页收集，不能只取第一个列表
  var items = Array.prototype.slice.call(document.querySelectorAll(".post-item[data-month]"));
  if (!items.length) {
    rail.style.display = "none";
    return;
  }

  function trackHeight() {
    return rail.clientHeight - dot.offsetHeight;
  }

  function progress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? window.scrollY / max : 0;
    return Math.max(0, Math.min(1, p));
  }

  // 月份字 = 按进度 p 落在文章序列里的哪一篇：把 p 映射到"第一篇顶→最后一篇顶"
  // 的文档区间再找篇目。页顶必显首篇、页底必显末篇，切换只按文章间距走。
  // （旧规则"视口中线以下最后一篇"在文章少、列表短时会让中线一开始
  // 就越过前几篇，导致首篇的月份永远不出现。）
  function monthAtProgress(p) {
    var sy = window.scrollY;
    var firstTop = items[0].getBoundingClientRect().top + sy;
    var lastTop = items[items.length - 1].getBoundingClientRect().top + sy;
    var y = firstTop + p * (lastTop - firstTop);
    var idx = 0;
    for (var i = 1; i < items.length; i++) {
      if (items[i].getBoundingClientRect().top + sy <= y + 1) idx = i;
      else break;
    }
    return NAMES[parseInt(items[idx].getAttribute("data-month"), 10)] || "";
  }

  var ticking = false;
  function update() {
    ticking = false;
    // 进度按整页滚动比例：页顶=圆点在轨道顶，页底=轨道底
    var p = progress();
    dot.style.top = Math.round(p * trackHeight()) + "px";
    var name = monthAtProgress(p);
    if (dot.textContent !== name) dot.textContent = name;
  }
  function request() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);

  // 把 clientY 换算成进度比，再按比例直接滚到整页对应位置
  function seekTo(clientY) {
    var r = rail.getBoundingClientRect();
    var track = trackHeight() || 1;
    var p = (clientY - r.top - dot.offsetHeight / 2) / track;
    p = Math.max(0, Math.min(1, p));
    var max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, p * max);
  }

  var dragging = false;
  dot.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    dragging = true;
    rail.classList.add("dragging");
    if (dot.setPointerCapture) dot.setPointerCapture(e.pointerId);
  });
  dot.addEventListener("pointermove", function (e) {
    if (dragging) seekTo(e.clientY);
  });
  function endDrag() {
    dragging = false;
    rail.classList.remove("dragging");
  }
  dot.addEventListener("pointerup", endDrag);
  dot.addEventListener("pointercancel", endDrag);
  // 点细线空白处 = 直接跳到该比例位置
  rail.addEventListener("pointerdown", function (e) {
    if (e.target === dot) return;
    seekTo(e.clientY);
  });

  update();
})();
