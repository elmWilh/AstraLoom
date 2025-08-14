#!/usr/bin/env bash
set -euo pipefail

WKDIR="/data/wkhtmltox"
BIN="$WKDIR/usr/local/bin/wkhtmltopdf"

if [ ! -x "$BIN" ]; then
  echo "[wkhtmltopdf] installing into $WKDIR ..."
  mkdir -p "$WKDIR"
  curl -sSLf -o /tmp/wk.deb \
    https://github.com/wkhtmltopdf/packaging/releases/download/0.12.6.1-3/wkhtmltox_0.12.6.1-3.bookworm_amd64.deb
  dpkg-deb -x /tmp/wk.deb "$WKDIR" || \
    (cd /tmp && ar x /tmp/wk.deb && tar -xJf data.tar.xz -C "$WKDIR")
fi

export WKHTMLTOPDF_CMD="$BIN"
export LD_LIBRARY_PATH="$WKDIR/usr/local/lib:$WKDIR/usr/lib:$WKDIR/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH:-}"

echo "[wkhtmltopdf] $("$BIN" --version)"
exec gunicorn app:app --bind 0.0.0.0:"${PORT:-5000}" --workers 2 --threads 4 --timeout 120
