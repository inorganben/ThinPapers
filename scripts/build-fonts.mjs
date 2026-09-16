import path from "node:path";
import { fileURLToPath } from "node:url";
import { fontSplit } from "cn-font-split";

const here = path.dirname(fileURLToPath(import.meta.url));

await fontSplit({
  input: path.join(here, "../src/fonts/LXGWNeoZhiSong.ttf"),
  outDir: path.join(here, "../src/fonts/dist"),
  css: {
    fontFamily: "LXGW Neo ZhiSong",
  },
});

console.log("字体子集化完成：src/fonts/dist/");
