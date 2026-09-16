// 正文图片查看器：点击放大到页内全屏，页面其余部分高斯模糊（dialog backdrop）
// 滚轮=以光标为锚缩放，拖拽=平移，双击=1x/3x 切换，双指=捏合缩放，点图外/Esc=关闭
(function () {
  "use strict";
  var MIN_S = 1;
  var MAX_S = 20;

  var dialog = document.createElement("dialog");
  dialog.className = "lightbox";
  dialog.setAttribute("aria-label", "查看图片");
  var stage = document.createElement("div");
  stage.className = "lb-stage";
  var img = document.createElement("img");
  img.className = "lb-img";
  img.alt = "";
  img.draggable = false;
  var cap = document.createElement("p");
  cap.className = "lb-cap";
  var closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "lb-close";
  closeBtn.textContent = "关闭";
  closeBtn.addEventListener("click", function () { dialog.close(); });
  stage.appendChild(img);
  dialog.appendChild(stage);
  dialog.appendChild(cap);
  dialog.appendChild(closeBtn);
  document.body.appendChild(dialog);

  var state = { s: 1, tx: 0, ty: 0 };
  function apply() {
    img.style.transform =
      "translate(" + state.tx + "px," + state.ty + "px) scale(" + state.s + ")";
  }
  function clampScale(v) {
    return Math.max(MIN_S, Math.min(MAX_S, v));
  }
  // 平移限制：图的中心最多跑出视口边缘外 40px
  function clampPan() {
    var mx = Math.max(0, (img.offsetWidth * state.s - stage.clientWidth) / 2 + 40);
    var my = Math.max(0, (img.offsetHeight * state.s - stage.clientHeight) / 2 + 40);
    state.tx = Math.max(-mx, Math.min(mx, state.tx));
    state.ty = Math.max(-my, Math.min(my, state.ty));
  }
  // 以视口点 (cx,cy) 为锚缩放到 ns：该点下的图像局部坐标保持不动
  function zoomAt(cx, cy, ns) {
    var r = stage.getBoundingClientRect();
    var px = cx - (r.left + r.width / 2);
    var py = cy - (r.top + r.height / 2);
    ns = clampScale(ns);
    var k = ns / state.s;
    state.tx = px - k * (px - state.tx);
    state.ty = py - k * (py - state.ty);
    state.s = ns;
    clampPan();
    apply();
  }

  // ---------- 打开 ----------
  document.addEventListener("click", function (e) {
    var target = e.target.closest && e.target.closest("img");
    if (!target || !target.closest("main")) return;
    if (target.closest(".lightbox") || target.closest(".ssg-icon")) return;
    if (target.classList.contains("avatar")) return;
    // 列表预览的缩略图不放大：那排图在滑动列表时容易误触，
    // 点开一个 47px 小图的全屏版也没意义，链接本身在标题上
    if (target.classList.contains("post-thumb")) return;
    img.src = target.currentSrc || target.src;
    img.alt = target.alt || "";
    cap.textContent = target.alt || "";
    cap.hidden = !cap.textContent;
    state.s = 1;
    state.tx = 0;
    state.ty = 0;
    apply();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  });

  dialog.addEventListener("close", function () {
    img.removeAttribute("src");
  });

  // ---------- 滚轮缩放 ----------
  stage.addEventListener(
    "wheel",
    function (e) {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, state.s * Math.pow(2, -e.deltaY * 0.0022));
    },
    { passive: false }
  );

  // ---------- 双击：1x ↔ 3x ----------
  img.addEventListener("dblclick", function (e) {
    e.preventDefault();
    if (state.s > 1.4) {
      state.s = 1;
      state.tx = 0;
      state.ty = 0;
      apply();
    } else {
      zoomAt(e.clientX, e.clientY, 3);
    }
  });

  // ---------- 拖拽平移 & 双指捏合 ----------
  // 手势挂在 stage（整个查看区域）上：手机上图片外的空白处也能捏合缩放，
  // 配合 .lb-stage 的 touch-action:none，浏览器不会再连页面一起缩放
  var pts = new Map();
  var moved = 0;
  var pinch = null; // { d, s }
  stage.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    moved = 0;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (stage.setPointerCapture) stage.setPointerCapture(e.pointerId);
    if (pts.size === 2) {
      var p = [...pts.values()];
      pinch = {
        d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y),
        s: state.s,
      };
    }
    stage.classList.add("lb-grabbing");
  });
  stage.addEventListener("pointermove", function (e) {
    if (!pts.has(e.pointerId)) return;
    var prev = pts.get(e.pointerId);
    var dx = e.clientX - prev.x;
    var dy = e.clientY - prev.y;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2 && pinch) {
      var p = [...pts.values()];
      var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      var cx = (p[0].x + p[1].x) / 2;
      var cy = (p[0].y + p[1].y) / 2;
      zoomAt(cx, cy, (pinch.s * d) / pinch.d);
      return;
    }
    moved += Math.abs(dx) + Math.abs(dy);
    state.tx += dx;
    state.ty += dy;
    clampPan();
    apply();
  });
  function endPointer(e) {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (pts.size === 0) stage.classList.remove("lb-grabbing");
  }
  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);

  // 点图片外的空白（且不是拖拽收尾）= 关闭
  stage.addEventListener("click", function (e) {
    if (e.target === stage && !moved) dialog.close();
  });
})();
