#!/usr/bin/env python3
"""Simple HTTPS server for local development."""

from __future__ import annotations

import argparse
import http.server
import os
import ssl


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Serve a directory over HTTPS.")
    parser.add_argument("--host", default="0.0.0.0", help="Bind address")
    parser.add_argument("--port", type=int, default=8443, help="Port to listen on")
    parser.add_argument("--cert", default="cert.pem", help="Path to cert.pem")
    parser.add_argument("--key", default="key.pem", help="Path to key.pem")
    parser.add_argument("--dir", default=".", help="Directory to serve")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    directory = os.path.abspath(args.dir)
    handler = http.server.SimpleHTTPRequestHandler
    server = http.server.ThreadingHTTPServer((args.host, args.port), handler)
    os.chdir(directory)

    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile=args.cert, keyfile=args.key)
    server.socket = context.wrap_socket(server.socket, server_side=True)

    print(f"Serving HTTPS on https://{args.host}:{args.port} (dir: {directory})")
    server.serve_forever()


if __name__ == "__main__":
    main()
