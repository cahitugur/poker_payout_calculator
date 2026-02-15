#!/usr/bin/env python3
"""Simple HTTPS server for local development."""

from __future__ import annotations

import argparse
import http.server
import os
import ssl
from pathlib import Path


def parse_args(script_dir: Path) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Serve a directory over HTTPS.")
    parser.add_argument("--host", default="0.0.0.0", help="Bind address")
    parser.add_argument("--port", type=int, default=8443, help="Port to listen on")
    parser.add_argument(
        "--cert",
        default=str(script_dir / "cert.pem"),
        help="Path to cert.pem",
    )
    parser.add_argument(
        "--key",
        default=str(script_dir / "key.pem"),
        help="Path to key.pem",
    )
    parser.add_argument(
        "--dir",
        default=str(script_dir),
        help="Directory to serve",
    )
    return parser.parse_args()


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    args = parse_args(script_dir)

    directory = Path(args.dir).expanduser().resolve()
    cert_path = Path(args.cert).expanduser().resolve()
    key_path = Path(args.key).expanduser().resolve()

    if not cert_path.exists() or not key_path.exists():
        missing = []
        if not cert_path.exists():
            missing.append(str(cert_path))
        if not key_path.exists():
            missing.append(str(key_path))
        missing_list = "\n".join(f"- {item}" for item in missing)
        raise SystemExit(
            "Missing TLS files:\n"
            f"{missing_list}\n\n"
            "Generate a local cert with:\n"
            "  openssl req -x509 -nodes -newkey rsa:2048 -keyout cert.pem "
            "-out cert.pem -days 365 -subj \"/CN=localhost\"\n"
        )

    handler = http.server.SimpleHTTPRequestHandler
    server = http.server.ThreadingHTTPServer((args.host, args.port), handler)
    os.chdir(directory)

    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile=str(cert_path), keyfile=str(key_path))
    server.socket = context.wrap_socket(server.socket, server_side=True)

    print(f"Serving HTTPS on https://{args.host}:{args.port} (dir: {directory})")
    print("Open: /ui/index.html")
    server.serve_forever()


if __name__ == "__main__":
    main()
