"""Rebuild a transparent PNG from two captures of the same image, one over white and one over black.

Usage: python tools/art_matte.py WHITE.png BLACK.png OUT.png

Why: the browser pane can't download files from chatgpt.com. The image is shown over a white
overlay and then a black one, and each is screenshotted. alpha = 1 - (white - black) / 255,
colour = black / alpha. The result is cropped to the figure.
"""
import sys
import numpy as np
from PIL import Image


def matte(white_path, black_path):
    w = np.asarray(Image.open(white_path).convert("RGB")).astype(float)
    b = np.asarray(Image.open(black_path).convert("RGB")).astype(float)
    a = np.clip(1 - (w - b).mean(2) / 255, 0, 1)
    a[a < 0.03] = 0
    col = np.clip(np.where(a[..., None] > 0, b / np.maximum(a[..., None], 1e-3), 0), 0, 255)
    im = Image.fromarray(np.dstack([col, a * 255]).astype(np.uint8))
    ys, xs = np.where(a > 0.08)
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


if __name__ == "__main__":
    out = matte(sys.argv[1], sys.argv[2])
    out.save(sys.argv[3])
    print(sys.argv[3], out.size)
