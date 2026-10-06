"""Re-subset the two Chinese UI fonts to the characters used in index.html + js/*.js.
Run after adding new Chinese text:  python3 tools/subset-fonts.py
Sources are not in the repo (18 MB / 6 MB); override paths with env WK_SRC / MSZ_SRC.
LXGW WenKai Bold and Ma Shan Zheng are SIL OFL-1.1 (licences in vendor/fonts).
The WenKai Bold source has a format-4 cmap fontTools cannot read, so the cmap is rebuilt from its format-12 subtable."""
import os, sys, glob, struct
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables._c_m_a_p import CmapSubtable
from fontTools import subset
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WK = os.environ.get('WK_SRC', os.path.expanduser('~/Library/Mobile Documents/com~apple~CloudDocs/Desktop/AI Coding/mockpatients/assets/fonts/LXGWWenKai-Bold.ttf'))
MSZ = os.environ.get('MSZ_SRC', os.path.expanduser('~/Projects/游戏/luori-jianghu/src/xhs/fonts/MaShanZheng-Regular.ttf'))
def cmap_of(src):
    f = TTFont(src, lazy=True); raw = f.reader['cmap']; n = struct.unpack('>HH', raw[:4])[1]
    offs = [struct.unpack('>HHI', raw[4 + 8 * i:12 + 8 * i])[2] for i in range(n)]
    o12 = [o for o in offs if struct.unpack('>H', raw[o:o + 2])[0] == 12]
    if not o12: return f, TTFont(src).getBestCmap()
    o = o12[0]; ng = struct.unpack('>I', raw[o + 12:o + 16])[0]; order = f.getGlyphOrder(); m = {}
    for i in range(ng):
        a, b, g = struct.unpack('>III', raw[o + 16 + 12 * i:o + 28 + 12 * i])
        for c in range(a, b + 1): m[c] = order[g + c - a]
    t = newTable('cmap'); t.tableVersion = 0; t.tables = []
    for p, e in ((3, 10), (0, 4)):
        st = CmapSubtable.newSubtable(12); st.platformID = p; st.platEncID = e; st.language = 0; st.cmap = dict(m); t.tables.append(st)
    f['cmap'] = t; return f, m
def chars():
    txt = ''.join(open(p, encoding='utf8').read() for p in [os.path.join(ROOT, 'index.html')] + glob.glob(os.path.join(ROOT, 'js', '*.js')))
    return {ch for ch in txt if ord(ch) > 127} | {chr(c) for c in range(32, 127)} | set('，。、；：？！“”‘’（）《》【】…—·～￥％＋－×÷')
def run(src, out):
    f, m = cmap_of(src); cs = [ord(c) for c in chars() if ord(c) in m]
    o = subset.Options(); o.flavor = 'woff2'; o.layout_features = ['*']; o.notdef_outline = True
    s = subset.Subsetter(o); s.populate(unicodes=cs); s.subset(f); f.flavor = 'woff2'; f.save(out)
    print(os.path.basename(out), len(cs), 'chars', os.path.getsize(out) // 1024, 'KB')
run(WK, os.path.join(ROOT, 'vendor/fonts/LXGWWenKai-Bold-sub.woff2'))
run(MSZ, os.path.join(ROOT, 'vendor/fonts/MaShanZheng-sub.woff2'))
