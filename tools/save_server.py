#!/usr/bin/env python3
"""Servidor mínimo para a ferramenta de bake: recebe arquivos por POST e grava em sprites/baked/.
Uso:  python3 tools/save_server.py      (porta 8124)   — pare com Ctrl+C quando terminar."""
import http.server, os, re, sys
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sprites', 'baked')
os.makedirs(OUT, exist_ok=True)

class H(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()
    def do_POST(self):
        m = re.match(r'^/save\?name=([a-z0-9._-]+)$', self.path)
        if not m or '..' in m.group(1) or not m.group(1).endswith(('.png', '.js')):
            self.send_response(400); self._cors(); self.end_headers(); return
        data = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        with open(os.path.join(OUT, m.group(1)), 'wb') as f: f.write(data)
        print('salvo', m.group(1), len(data), 'bytes'); sys.stdout.flush()
        self.send_response(200); self._cors(); self.end_headers(); self.wfile.write(b'ok')
    def log_message(self, *a): pass

http.server.ThreadingHTTPServer(('127.0.0.1', 8124), H).serve_forever()
