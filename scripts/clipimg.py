#!/usr/bin/env python3
# 剪贴板压图小工具（PySide6）：
#   读取剪切板图片 → 预览 → 按需压缩（目标 1MB，同 scripts/compress.py）
#   → 存 JPG 到 src/mdimgs/[子路径] → 一键复制 md 引用 ![](/mdimgs/子路径/xxx.jpg)
#
# 启动：python3 scripts/clipimg.py

import io
import sys
import time
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import compress as C  # 复用 shrink_to_target / flatten_to_rgb / SUPPORTED

from PySide6.QtCore import Qt, QBuffer, QIODevice
from PySide6.QtGui import QImage, QPixmap
from PySide6.QtWidgets import (
    QApplication, QCheckBox, QHBoxLayout, QLabel, QLineEdit, QMainWindow,
    QPushButton, QSlider, QSpinBox, QVBoxLayout, QWidget,
)

ROOT = Path(__file__).resolve().parents[1]
MDIMGS = ROOT / "src" / "mdimgs"
TARGET = 1024 * 1024  # 站内图片预算：1MB
DEFAULT_QUALITY = 80


class Win(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("剪贴板压图 → mdimgs")
        self.resize(760, 620)
        self.img = None      # PIL.Image（原始）
        self.out = None      # bytes（当前设置的 JPEG 输出）
        self.fname = ""      # 将保存的文件名
        self.src_path = None # 若来自文件复制，记住原文件名

        top = QHBoxLayout()
        self.btn_read = QPushButton("读取剪切板图片")
        self.btn_read.clicked.connect(self.read_clipboard)
        self.chk_comp = QCheckBox("压缩")
        self.chk_comp.setChecked(True)  # 默认勾选；大于 1M 时更是强烈推荐
        self.chk_comp.toggled.connect(self.recompute)
        self.slider = QSlider(Qt.Horizontal)
        self.slider.setRange(30, 97)
        self.slider.setValue(DEFAULT_QUALITY)
        self.spin = QSpinBox()
        self.spin.setRange(30, 97)
        self.spin.setValue(DEFAULT_QUALITY)
        self.slider.valueChanged.connect(self.spin.setValue)
        self.spin.valueChanged.connect(self.slider.setValue)
        self.slider.valueChanged.connect(self.recompute)
        top.addWidget(self.btn_read)
        top.addWidget(self.chk_comp)
        top.addWidget(QLabel("质量"))
        top.addWidget(self.slider, 1)
        top.addWidget(self.spin)

        self.preview = QLabel("剪切板里放一张图，点上面按钮读取")
        self.preview.setAlignment(Qt.AlignCenter)
        self.preview.setMinimumHeight(380)
        self.preview.setStyleSheet("background:#1b1d21;border:1px solid #3a3d44;")
        self.info = QLabel("")
        self.info.setAlignment(Qt.AlignCenter)

        pathrow = QHBoxLayout()
        pathrow.addWidget(QLabel("/mdimgs/"))
        self.subpath = QLineEdit()
        self.subpath.setPlaceholderText("子目录，如 wechat_moment；留空即根目录")
        pathrow.addWidget(self.subpath, 1)
        pathrow.addWidget(QLabel("文件名"))
        self.nameedit = QLineEdit()
        self.nameedit.setMinimumWidth(160)
        pathrow.addWidget(self.nameedit)

        btnrow = QHBoxLayout()
        self.btn_save = QPushButton("保存 JPG")
        self.btn_save.clicked.connect(self.save)
        self.btn_save.setEnabled(False)
        self.btn_md = QPushButton("复制 MD 引用")
        self.btn_md.clicked.connect(self.copy_md)
        self.btn_md.setEnabled(False)
        self.status = QLabel("")
        btnrow.addWidget(self.btn_save)
        btnrow.addWidget(self.btn_md)
        btnrow.addWidget(self.status, 1)

        lay = QVBoxLayout()
        lay.addLayout(top)
        lay.addWidget(self.preview, 1)
        lay.addWidget(self.info)
        lay.addLayout(pathrow)
        lay.addLayout(btnrow)
        w = QWidget()
        w.setLayout(lay)
        self.setCentralWidget(w)

    # ---------- 读取剪切板 ----------
    def read_clipboard(self):
        md = QApplication.clipboard().mimeData()
        img = None
        # Finder 复制的文件：优先按本地路径读，体积/文件名都是现成的
        for url in md.urls():
            p = Path(url.toLocalFile())
            if p.suffix.lower() in C.SUPPORTED and p.is_file():
                img = Image.open(p)
                img.load()
                self.src_path = p
                break
        if img is None and md.hasImage():
            qimg = QApplication.clipboard().image()
            img = Image.open(io.BytesIO(qimg_to_bytes(qimg)))
            self.src_path = None
        if img is None:
            self.status.setText("剪切板里没有图片")
            return
        img = C.ImageOps.exif_transpose(img)
        self.img = img
        stem = self.src_path.stem if self.src_path else time.strftime("%Y%m%d-%H%M%S")
        self.fname = stem
        self.nameedit.setText(stem)
        self._show_preview(img)
        self.recompute()

    def _show_preview(self, img):
        buf = io.BytesIO()
        img.convert("RGB").save(buf, "PNG")  # PIL 直接写内存，无需 Qt 缓冲
        pix = QPixmap()
        pix.loadFromData(buf.getvalue())
        self.preview.setPixmap(pix.scaled(
            self.preview.width(), self.preview.height(),
            Qt.KeepAspectRatio, Qt.SmoothTransformation))

    # ---------- 生成当前输出 ----------
    def recompute(self):
        if self.img is None:
            return
        img = C.flatten_to_rgb(self.img)
        src_mb = (self.src_path.stat().st_size / 1048576) if self.src_path and self.src_path.is_file() else None
        if self.chk_comp.isChecked():
            img2, data = C.shrink_to_target(img, self.slider.value(), TARGET)
        else:
            data = C.encode_jpeg(img, 95)
            img2 = img
        self.out = data
        self.final_img = img2
        orig = f"原图 {src_mb:.2f}MB → " if src_mb is not None else f"原图 {self.img.width}×{self.img.height} → "
        hint = ""
        if src_mb is not None and src_mb > 1.0 and not self.chk_comp.isChecked():
            hint = "  ⚠ 超过1MB，建议压缩"
        self.info.setText(f"{orig}约 {len(data)/1024:.0f}KB（{img2.width}×{img2.height}）{hint}")
        self.btn_save.setEnabled(True)
        self.btn_md.setEnabled(True)

    # ---------- 保存 / 复制 ----------
    def _dest(self):
        sub = self.subpath.text().strip().strip("/")
        name = self.nameedit.text().strip() or time.strftime("%Y%m%d-%H%M%S")
        if not name.lower().endswith(".jpg"):
            name += ".jpg"
        url = "/mdimgs/" + (f"{sub}/{name}" if sub else name)
        disk = MDIMGS / sub if sub else MDIMGS
        return disk / name, url

    def save(self):
        if self.out is None:
            return
        dest, url = self._dest()
        dest.parent.mkdir(parents=True, exist_ok=True)
        final, n = dest, 2
        while final.exists():
            final = dest.with_name(f"{dest.stem}-{n}{dest.suffix}")
            n += 1
        final.write_bytes(self.out)
        self.status.setText(f"已存 {final.relative_to(ROOT)}（{len(self.out)/1024:.0f}KB）")

    def copy_md(self):
        _, url = self._dest()
        QApplication.clipboard().setText(f"![]({url})")
        self.status.setText(f"已复制 ![]({url})")


def qimg_to_bytes(qimg):
    """QImage → PNG 字节：save 需要 QIODevice，用 QBuffer 充当。"""
    b = QBuffer()
    b.open(QIODevice.ReadWrite)
    qimg.save(b, "PNG")
    return bytes(b.data())


if __name__ == "__main__":
    app = QApplication(sys.argv)
    win = Win()
    win.show()
    win.raise_()        # 裸 python 进程不会自动到前台，手动置顶并聚焦
    win.activateWindow()
    sys.exit(app.exec())
