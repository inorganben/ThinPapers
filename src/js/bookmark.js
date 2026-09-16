// 书签：
// - 选中文字 → 悬浮「书签」按钮保存（localStorage）；已加过的文字自带下划线，点击可删除
// - TopBar 图标打开居中弹窗（外部高斯模糊），顶部一行搜索，列表从新到旧
// - 打开弹窗/滚动时 fab 必须隐藏并复位坐标（残留 bug 的根源就是隐藏后没复位）
(function () {
  "use strict";

  var KEY = "thinpapers.bookmarks";
  var MIN_LEN = 2;

  // ---------- 存储（无痕模式下 localStorage 会抛异常，全部兜住） ----------
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }
  function save(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (e) {
      /* 存不下就不存，不影响页面 */
    }
  }

  var items = load().sort(function (a, b) { return b.created - a.created; });
  var pageUrl = location.href;

  // ---------- DOM ----------
  var fab = document.getElementById("bm-fab");
  var dialog = document.getElementById("bm-dialog");
  var search = document.getElementById("bm-search");
  var listEl = document.getElementById("bm-list");
  var openBtn = document.querySelector(".bm-open");
  var mainEl = document.querySelector("main.page");
  if (!fab || !dialog || !search || !listEl || !openBtn ||
      !document.getElementById("bm-confirm") ||
      !document.getElementById("bm-confirm-copy") ||
      !document.getElementById("bm-confirm-del")) return;

  var pendingText = ""; // 记下点击那一刻的选区文本
  var currentAnchor = null; // 当前选区起点元素，保存后立刻就地标记下划线
  var markedIds = {}; // 已渲染下划线的书签 id（异步扫描期间防重复包裹）

  function sourceTitle() {
    return document.title; // 「页面标题 — 站点名」，整个存下便于辨认来源
  }
  function findBookmark(id) {
    for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i];
    return null;
  }

  // ---------- 选区 → 悬浮按钮 ----------
  function currentSelection() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    var anchor = sel.anchorNode;
    if (!anchor) return null;
    var el = anchor.nodeType === 1 ? anchor : anchor.parentNode;
    // 弹窗内的选择不触发（在那里选中是为了复制，不是做新书签）
    if (dialog.contains(el)) return null;
    // 选区整体落在代码块/行内代码里：不提供书签；从外部框选包含代码内容则正常
    var ca = sel.getRangeAt(0).commonAncestorContainer;
    var caEl = ca.nodeType === 1 ? ca : ca.parentNode;
    if (caEl.closest && caEl.closest("pre, code")) return null;
    var text = sel.toString().replace(/\s+/g, " ").trim();
    if (text.length < MIN_LEN) return null;
    // 就地标记的搜索范围：起点在代码元素内（跨块选择的情况）时改用整页
    var scope = el.closest && el.closest("pre, code") ? mainEl : (el.nodeType === 1 ? el : null);
    return {
      text: text,
      anchor: scope,
      rect: sel.getRangeAt(0).getBoundingClientRect(),
    };
  }

  function showFab() {
    var s = currentSelection();
    if (!s) { hideFab(); return; }
    pendingText = s.text;
    currentAnchor = s.anchor;
    if (!s.rect.width && !s.rect.height) { hideFab(); return; }
    fab.hidden = false;
    var size = fab.getBoundingClientRect();
    var x = s.rect.left + s.rect.width / 2 - size.width / 2;
    x = Math.max(8, Math.min(x, window.innerWidth - size.width - 8));
    var y = s.rect.bottom + 8;
    if (y + size.height > window.innerHeight - 8) y = s.rect.top - size.height - 8;
    fab.style.left = x + "px";
    fab.style.top = y + "px";
  }

  function hideFab() {
    fab.hidden = true;
    fab.style.left = "0px"; // 复位坐标：只 hidden 不复位，下次显示前会有一帧残影
    fab.style.top = "0px";
    pendingText = "";
    currentAnchor = null;
  }

  // pointerup 同时覆盖鼠标拖选与手机长按选词；延一拍等选区稳定
  document.addEventListener("pointerup", function () {
    setTimeout(showFab, 10);
  });
  document.addEventListener("selectionchange", function () {
    if (!window.getSelection().toString()) hideFab();
  });
  window.addEventListener("scroll", hideFab, { passive: true });
  window.addEventListener("resize", hideFab);
  // 在别处按下鼠标即收起（在 fab 上按下除外，否则会吞掉那一次点击）
  document.addEventListener("pointerdown", function (e) {
    if (e.target !== fab) hideFab();
  });

  fab.addEventListener("click", function () {
    var text = pendingText;
    var anchor = currentAnchor;
    if (!text) return;
    var existing = null;
    items.some(function (b) { if (b.url === pageUrl && b.text === text) { existing = b; return true; } });
    if (!existing) {
      var b = { id: Date.now(), text: text, url: pageUrl, title: sourceTitle(), created: Date.now() };
      items.unshift(b); // 从新到旧
      save(items);
      if (anchor) markTextNodesOf(anchor, b); // 就地立刻画出下划线（若这段文字本身已完整是一个文本节点）
    }
    hideFab();
    var sel = window.getSelection();
    if (sel) sel.removeAllRanges();
  });

  // ---------- 弹窗 ----------
  openBtn.addEventListener("click", function () {
    hideFab(); // showModal 会给 body 加 overflow:hidden 触发滚动位置变化，必须先收起并复位 fab
    render("");
    search.value = "";
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  });
  // 点遮罩（弹窗外）关闭
  dialog.addEventListener("click", function (e) {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", function () { hideFab(); });

  function fmtDate(ts) {
    var d = new Date(ts);
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
      " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  function render(query) {
    var q = (query || "").toLowerCase();
    listEl.textContent = "";
    var shown = 0;
    for (var i = 0; i < items.length; i++) {
      var b = items[i];
      if (q && (b.text + " " + b.title).toLowerCase().indexOf(q) === -1) continue;
      shown++;

      var row = document.createElement("div");
      row.className = "bm-item";

      var a = document.createElement("a");
      a.href = b.url;

      var pText = document.createElement("span");
      pText.className = "bm-item-text";
      pText.textContent = b.text;

      var pMeta = document.createElement("span");
      pMeta.className = "bm-item-meta";
      pMeta.textContent = fmtDate(b.created) + " · " + b.title;

      a.appendChild(pText);
      a.appendChild(pMeta);

      var pDel = document.createElement("span");
      pDel.className = "bm-del";
      pDel.setAttribute("role", "button");
      pDel.setAttribute("aria-label", "删除书签");
      pDel.textContent = "✕";
      (function (bookmark, node) {
        node.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          openMenu(bookmark.id); // 与正文下划线同样弹功能列表
        });
      })(b, pDel);

      row.appendChild(a);
      row.appendChild(pDel);
      listEl.appendChild(row);
    }
    if (!shown) {
      var empty = document.createElement("p");
      empty.className = "bm-empty";
      empty.textContent = items.length ? "没有匹配的书签" : "还没有书签";
      listEl.appendChild(empty);
    }
  }

  search.addEventListener("input", function () { render(search.value); });

  // ---------- 书签操作菜单（正文下划线与列表 ✕ 共用）：复制 / 删除 ----------
  var confirmEl = document.getElementById("bm-confirm");
  var copyBtn = document.getElementById("bm-confirm-copy");
  var delBtn = document.getElementById("bm-confirm-del");
  var pendingId = null;

  function openMenu(id) {
    var b = findBookmark(id);
    if (!b) return;
    pendingId = id;
    document.getElementById("bm-confirm-text").textContent = b.text;
    if (typeof confirmEl.showModal === "function") confirmEl.showModal();
    else confirmEl.setAttribute("open", "");
  }
  function closeMenu() {
    pendingId = null;
    confirmEl.close();
  }

  copyBtn.addEventListener("click", function () {
    var b = findBookmark(pendingId);
    closeMenu();
    if (b) copyText(b.text);
  });
  delBtn.addEventListener("click", function () {
    var id = pendingId;
    closeMenu();
    if (id === null) return;
    removeBookmark(id);
    render(search.value); // 若书签弹窗开着，列表同步刷新；关着也无副作用
  });
  // 点菜单之外的遮罩 = 收起（ESC 由 dialog 原生处理，close 事件里兜底复位）
  confirmEl.addEventListener("click", function (e) {
    if (e.target === confirmEl) closeMenu();
  });
  confirmEl.addEventListener("close", function () { pendingId = null; });

  // 剪贴板：clipboard API 优先（HTTPS/localhost 可用），否则隐藏 textarea + execCommand 兜底
  function copyText(text) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) { /* 无法复制就算了 */ }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(fallback);
    } else {
      fallback();
    }
  }

  function removeBookmark(id) {
    var b = findBookmark(id);
    items = items.filter(function (x) { return x.id !== id; });
    save(items);
    if (b && b.url === pageUrl) unmarkSpan(b.text);
  }

  // ---------- 正文内标记 ----------
  // 已加书签的原文显示下划线（复用稿纸线变量），点击弹确认删除。
  // 匹配不能只看单个文本节点：行内代码/公式/加粗会把一段话切碎进不同元素，
  // 所以把 scope 内全部文本节点拼接成一串（空白折叠，与保存时的规范化一致），
  // 命中后用 Range 直接圈住跨节点的原样内容整体包上 span。

  // 拼接文本 + 每个输出字符到 (文本节点, 原始下标) 的映射
  function buildHaystack(scope) {
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var p = node.parentNode;
        if (!p || !p.closest) return NodeFilter.FILTER_ACCEPT;
        // 跳过已标记区域，避免二次包裹
        if (p.closest(".bm-mark")) return NodeFilter.FILTER_REJECT;
        // KaTeX 的 .katex-mathml 层（含 annotation 里的 LaTeX 源码）视觉隐藏但文本在 DOM，
        // 只保留 .katex-html 可见层，否则一段公式会以三种形态混进 haystack，
        // 与 sel.toString()（浏览器只取可见文本）得到的 needle 永远对不上
        if (p.closest(".katex-mathml")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    var chars = [];
    var map = [];
    var pendingWs = false; // 空白游程只输出一个空格
    var n;
    while ((n = walker.nextNode())) {
      var v = n.nodeValue;
      for (var i = 0; i < v.length; i++) {
        var isWs = /\s/.test(v[i]);
        if (isWs && pendingWs) continue;
        pendingWs = isWs;
        chars.push(isWs ? " " : v[i]);
        map.push({ node: n, at: i });
      }
      // 节点交界直接相接：浏览器 sel.toString() 在相邻行内元素之间不加空格，
      // 插虚拟空格会让 KaTeX 被拆成多 span 的字（λ 与 ∗）拼出needle里没有的空格
    }
    return { text: chars.join(""), map: map };
  }

  // 找 needle 在 haystack 里的起点：先精确匹配，退化到忽略大小写
  function findNeedle(hay, needle) {
    var h = hay.text;
    var idx = h.indexOf(needle);
    if (idx !== -1) return idx;
    var lower = h.toLowerCase();
    return lower.indexOf(needle.toLowerCase());
  }

  function wrapRange(hay, start, len, b) {
    var s = hay.map[start];
    var e = hay.map[start + len - 1];
    if (!s || !e) return;
    var range = document.createRange();
    range.setStart(s.node, s.at);
    range.setEnd(e.node, e.at + 1);
    var frag;
    try {
      frag = range.extractContents();
    } catch (err) {
      return; // 极端情况（节点已被改动）：放弃这条，不影响页面
    }
    var span = document.createElement("span");
    span.className = "bm-mark";
    span.dataset.bmId = b.id;
    span.dataset.bmText = b.text;
    span.title = "书签操作";
    span.appendChild(frag);
    range.insertNode(span);
    span.addEventListener("click", function () { openMenu(b.id); });
  }

  // 对 scope 找一条书签的命中并包裹；成功返回 true。只标第一处命中。
  function markInScope(scope, b) {
    var hay = buildHaystack(scope);
    var idx = findNeedle(hay, b.text);
    if (idx === -1) return false;
    wrapRange(hay, idx, b.text.length, b);
    return true;
  }

  function markTextNodesOf(scope, b) {
    if (markedIds[b.id]) return;
    markedIds[b.id] = true;
    markInScope(scope, b);
  }

  function unmarkSpan(text) {
    var nodes = document.querySelectorAll(".bm-mark");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.dataset.bmText === text) {
        var parent = el.parentNode;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
        parent.normalize(); // 合并相邻文本节点，还原原文结构
      }
    }
  }

  // 整页扫描：从新到旧逐条标记（后处理的文本节点更碎，匹配率越低；
  // 被先处理书签包住的文字不在文本节点里，天然避免相互包裹），
  // requestIdleCallback 异步分帧，不阻塞渲染与滚动
  function markAll() {
    if (!mainEl) return;
    var queue = items.filter(function (b) { return b.url === pageUrl && !markedIds[b.id]; });
    var i = 0;
    function step(deadline) {
      while (i < queue.length && (!deadline || deadline.timeRemaining() > 1)) {
        markTextNodesOf(mainEl, queue[i]);
        i++;
      }
      if (i < queue.length) next(task);
    }
    function task(deadline) { step(deadline); }
    function next(fn) {
      if (typeof requestIdleCallback === "function") requestIdleCallback(fn);
      else setTimeout(function () { fn({ timeRemaining: function () { return 8; } }); }, 60);
    }
    step(null);
  }
  markAll();
})();
