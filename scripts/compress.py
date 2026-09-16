#!/usr/bin/env python3
# 通用图片压缩：把超过目标体积的图原地压小（等比缩放 + 重编码），可增量重复执行。
#
# 用法：
#   python3 scripts/compress.py [路径...] [--target-mb 1.0] [--quality 80] [--convert] [--dry-run]
#
# - 路径可以是文件或目录（递归处理 jpg/jpeg/png/webp），默认 src/mdimgs
# - 只处理体积超过 --target-mb 的文件，已达标的一律跳过，所以可以放心反复跑
# - PNG 照片类压不动时加 --convert：转成同名 .jpg、删原文件，
#   并把 src/ 下所有 md/njk 里的引用一并改掉
#
# 典型场景：往 src/mdimgs/ 放了新图，跑一遍再部署：
#   python3 scripts/compress.py --convert && npm run deploy

import argparse
import io
import math
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = None  # 本地信任的高清碑帖扫描件，放行解压炸弹保护

SUPPORTED = {".jpg", ".jpeg", ".png", ".webp"}
MIN_EDGE = 800  # 缩放的地板：再短就不缩了，只报告


def encode_jpeg(img: Image.Image, quality: int) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True, progressive=True)
    return buf.getvalue()


def shrink_to_target(img: Image.Image, quality: int, target: int):
    """先按目标质量编码，超了就按 sqrt(目标/实际) 等比缩，迭代至多 8 次。"""
    data = encode_jpeg(img, quality)
    for _ in range(8):
        if len(data) <= target or min(img.size) <= MIN_EDGE:
            break
        k = math.sqrt(target / len(data)) * 0.95
        size = (max(MIN_EDGE, int(img.width * k)), max(MIN_EDGE, int(img.height * k)))
        img = img.resize(size, Image.LANCZOS)
        data = encode_jpeg(img, quality)
    return img, data


def flatten_to_rgb(img: Image.Image) -> Image.Image:
    """PNG 转 JPEG 前拍平透明通道（透明像素铺白底）。"""
    if img.mode in ("RGBA", "LA") and img.getextrema()[-1][0] < 255:
        bg = Image.new("RGB", img.size, "white")
        bg.paste(img, mask=img.getchannel("A"))
        return bg
    return img.convert("RGB")


def rewrite_refs(old_stem: str, old_ext: str, new_ext: str, src_root: Path) -> int:
    """把 src/ 下模板与文章里的 `名字.旧后缀` 引用改成新后缀，返回改写文件数。"""
    pattern = re.compile(re.escape(old_stem) + re.escape(old_ext) + r"(?![A-Za-z0-9])")
    n = 0
    for f in list(src_root.rglob("*.md")) + list(src_root.rglob("*.njk")):
        text = f.read_text(encoding="utf-8")
        new = pattern.sub(old_stem + new_ext, text)
        if new != text:
            f.write_text(new, encoding="utf-8")
            n += 1
    return n


def collect(paths):
    files = []
    for p in paths:
        path = Path(p)
        if path.is_dir():
            files += [f for f in path.rglob("*") if f.suffix.lower() in SUPPORTED]
        elif path.suffix.lower() in SUPPORTED:
            files.append(path)
    return sorted(set(files), key=lambda f: f.stat().st_size, reverse=True)


def main():
    ap = argparse.ArgumentParser(
        description="通用图片压缩：把超过目标体积的图原地压小（等比缩放 + 重编码），可增量重复执行")
    ap.add_argument("paths", nargs="*", default=["src/mdimgs"])
    ap.add_argument("--target-mb", type=float, default=1.0, help="目标体积上限，默认 1.0MB")
    ap.add_argument("--quality", type=int, default=80, help="JPEG 质量，默认 80")
    ap.add_argument("--convert", action="store_true", help="超限的 PNG/webp 转成 JPEG 并改写引用")
    ap.add_argument("--dry-run", action="store_true", help="只报告，不写文件")
    args = ap.parse_args()

    target = int(args.target_mb * 1024 * 1024)
    total_saved = 0
    processed = over_after = 0
    pending = collect(args.paths)

    for f in pending:
        size = f.stat().st_size
        if size <= target:
            print(f"跳过  {f.name}（{size/1024:.0f}KB 已达标）")
            continue

        processed += 1
        img = Image.open(f)
        img = ImageOps.exif_transpose(img)  # 按 EXIF 转正后写回，之后不再依赖 EXIF
        ext = f.suffix.lower()

        if ext == ".png" and not args.convert:
            img.save(f, format="PNG", optimize=True)  # 无损优化，通常杯水车薪
            new = f.stat().st_size
            tip = "仍超限，建议 --convert 转 JPEG" if new > target else "无损优化达标"
            print(f"PNG   {f.name}：{size/1024:.0f}KB → {new/1024:.0f}KB（{tip}）")
            total_saved += size - new
            over_after += new > target
            continue

        out_ext = ".jpg" if ext in (".png", ".webp") and args.convert else ext
        img = flatten_to_rgb(img)
        img, data = shrink_to_target(img, args.quality, target)
        over_after += len(data) > target

        if args.dry_run:
            print(f"计划  {f.name}：{size/1024:.0f}KB → {len(data)/1024:.0f}KB"
                  + (f"（转存 {f.stem}.jpg）" if out_ext != ext else ""))
        else:
            out = f.with_suffix(out_ext) if out_ext != ext else f
            out.write_bytes(data)
            if out != f:
                f.unlink()
                touched = rewrite_refs(f.stem, ext, out_ext, Path("src"))
                print(f"转换  {f.name} → {out.name}：{size/1024:.0f}KB → {len(data)/1024:.0f}KB"
                      f"（改写引用 {touched} 个文件）")
            else:
                print(f"压缩  {f.name}：{size/1024:.0f}KB → {len(data)/1024:.0f}KB"
                      f"（{img.width}×{img.height}）")
        total_saved += size - len(data)

    if not pending:
        print("没有匹配的图片。")
    else:
        print(f"\n扫描 {len(pending)} 个文件，处理 {processed} 个，"
              f"省下 {total_saved/1024/1024:.2f}MB；仍超限 {over_after} 个。")
    return 1 if over_after and not args.dry_run else 0


if __name__ == "__main__":
    sys.exit(main())
