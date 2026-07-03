#!/usr/bin/env python3
"""Static dev server that disables caching, so edits show up on every reload
(iOS Safari in particular caches ES modules aggressively). Serves on 0.0.0.0
so phones on the same Wi-Fi can reach it via the Mac's LAN IP."""
import http.server
import socketserver
import socket

PORT = 8123


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


# Dual-stack: listen on IPv6 with V6ONLY off so both ::1 (what browsers often
# try first for "localhost") and 127.0.0.1 / the LAN IPv4 address all work.
class DualStackServer(socketserver.TCPServer):
    address_family = socket.AF_INET6

    def server_bind(self):
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        except (AttributeError, OSError):
            pass
        super().server_bind()


with DualStackServer(('::', PORT), NoCacheHandler) as httpd:
    print(f'serving with no-cache (dual-stack) on http://localhost:{PORT}')
    httpd.serve_forever()
