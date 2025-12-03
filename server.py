import http.server
import socketserver

PORT = 8000
DIRECTORY = "."

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    # Desactivar caché para que veas tus cambios al instante
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        return super().end_headers()

print(f"🇪🇸 Servidor Histórico corriendo en: http://localhost:{PORT}")
print("Presiona Ctrl+C para detenerlo.")

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    httpd.serve_forever()