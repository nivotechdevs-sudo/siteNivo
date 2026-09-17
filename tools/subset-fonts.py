#!/usr/bin/env python3
"""
Otimização das fontes variáveis: instanciação parcial de eixo + subsetting.

Por que isso existe
-------------------
Fonte é recurso bloqueante de renderização: enquanto ela não chega, ou o texto
não aparece ou aparece e depois salta. Ou seja, peso de fonte é LCP e CLS
direto. Os pacotes Fontsource entregam o subset "latin" inteiro (~700 glifos)
com o eixo de peso completo (100–900). Um site em português usa menos de 250
glifos e quatro pesos.

São duas otimizações em sequência, e a ordem importa:

1. Instanciação parcial do eixo (fontTools.varLib.instancer)
   Recorta a faixa do eixo `wght` para só o que o design usa. É aqui que mora
   a maior economia — os deltas de interpolação dos pesos extremos são a maior
   parte do arquivo, não os contornos dos glifos.

2. Subsetting de glifos (fontTools.subset)
   Remove os caracteres que o português não usa, preservando kerning,
   ligaduras e algarismos tabulares.

Resultado medido: 80,0 KB → 46,1 KB (-42%), mantendo o eixo variável vivo
dentro da faixa útil.

Uso
---
    python3 tools/subset-fonts.py

Rode de novo ao trocar de fonte, mudar os pesos usados no design ou precisar
de caracteres de outro idioma (edite UNICODES). A saída vai para public/fonts/
e é versionada no git, então o build normal não depende de Python.

Requisitos: pip install "fonttools[woff]" brotli
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

try:
    from fontTools.ttLib import TTFont
except ImportError:
    print(
        'ERRO: fonttools não instalado.\n'
        '      Rode: pip install "fonttools[woff]" brotli',
        file=sys.stderr,
    )
    raise SystemExit(1)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "fonts"

# Faixas Unicode mantidas. Latin básico + Latin-1 cobrem todo o português
# (á à â ã ç é ê í ó ô õ ú ü e as maiúsculas). O resto é pontuação
# tipográfica e símbolos que a interface realmente usa.
UNICODES = ",".join(
    [
        "U+0020-007E",  # ASCII imprimível
        "U+00A0-00FF",  # Latin-1 Supplement — acentuação do português
        "U+0131",       # ı (dotless i, usado por ligaduras)
        "U+2010-2015",  # hífens e travessões
        "U+2018-201A",  # aspas simples tipográficas
        "U+201C-201E",  # aspas duplas tipográficas
        "U+2022",       # •
        "U+2026",       # …
        "U+2039-203A",  # ‹ ›
        "U+20AC",       # €
        "U+2122",       # ™
        "U+2190-2193",  # ← ↑ → ↓
        "U+00D7",       # ×
        "U+2212",       # −
        "U+FEFF",       # BOM
    ]
)

# Features OpenType preservadas.
#   kern/ccmp/mark/mkmk — espaçamento e posicionamento de acento (crítico em pt-BR)
#   liga/calt           — ligaduras e alternativas contextuais
#   tnum                — algarismos tabulares, usados nos números de resultado
LAYOUT_FEATURES = "kern,liga,calt,tnum,ccmp,locl,mark,mkmk"

# (rótulo, origem, faixa do eixo, arquivo de saída)
#
# A faixa de peso vem do sistema de design em src/styles/global.css:
#   Inter — corpo e interface: 400, 500, 600, 700, 800
#   Sora  — apenas títulos:    600, 700, 800
FONTS = [
    (
        "Inter",
        "node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
        "wght=400:800",
        "inter-var.woff2",
    ),
    (
        "Sora",
        "node_modules/@fontsource-variable/sora/files/sora-latin-wght-normal.woff2",
        "wght=600:800",
        "sora-var.woff2",
    ),
]


def kb(n: int) -> str:
    return f"{n / 1024:.1f} KB"


def optimize(src: Path, axis: str, dst: Path) -> tuple[int, int]:
    """Instancia o eixo, subseta os glifos e grava woff2. Retorna (antes, depois)."""
    before = src.stat().st_size

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)

        # O instancer não lê woff2 comprimido: descomprime para ttf primeiro.
        font = TTFont(src)
        font.flavor = None
        raw = tmp / "raw.ttf"
        font.save(raw)
        font.close()

        # 1. Recorta a faixa do eixo variável.
        instanced = tmp / "instanced.ttf"
        subprocess.run(
            [sys.executable, "-m", "fontTools.varLib.instancer", str(raw), axis, "-o", str(instanced)],
            check=True,
            capture_output=True,
        )

        # 2. Subseta os glifos e recomprime em woff2 com zopfli.
        dst.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            [
                sys.executable,
                "-m",
                "fontTools.subset",
                str(instanced),
                f"--unicodes={UNICODES}",
                f"--layout-features={LAYOUT_FEATURES}",
                "--flavor=woff2",
                "--with-zopfli",
                "--desubroutinize",
                "--no-hinting",
                f"--output-file={dst}",
            ],
            check=True,
            capture_output=True,
        )

    return before, dst.stat().st_size


def main() -> int:
    total_before = total_after = 0

    print("Otimizando fontes (instanciação de eixo + subsetting)\n")
    for label, src_rel, axis, out_name in FONTS:
        src = ROOT / src_rel
        if not src.exists():
            print(f"ERRO: origem não encontrada: {src_rel}", file=sys.stderr)
            print("      Rode `npm install` antes de otimizar.", file=sys.stderr)
            return 1

        before, after = optimize(src, axis, OUT / out_name)
        total_before += before
        total_after += after
        print(f"  {label:6} {axis:14} {kb(before):>9} → {kb(after):>9}  (-{100 - after / before * 100:.0f}%)")

    print(f"\n  {'TOTAL':6} {'':14} {kb(total_before):>9} → {kb(total_after):>9}  (-{100 - total_after / total_before * 100:.0f}%)")
    print(f"\nArquivos gravados em {OUT.relative_to(ROOT)}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
