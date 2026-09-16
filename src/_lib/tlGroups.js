// 时间线按年份分组：[{ year: 2026, items: [文章…新→旧] }, …]（年份从新到旧）
// 由 eleventy.config.js 的 byYear 过滤器与 timeline-year 的 computed data 共用
module.exports = function (posts) {
  const sorted = (posts || []).slice().sort((a, b) => b.data.date - a.data.date);
  const groups = new Map();
  for (const p of sorted) {
    const d = p.data.date;
    if (!d) continue;
    const year = d.getUTCFullYear();
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(p);
  }
  return [...groups.entries()].map(([year, items]) => ({ year, items }));
};
