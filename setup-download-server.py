#!/usr/bin/env python3
"""
Simple HTTP server to host ConCure download files
Run this to create a local download server for testing
"""

import http.server
import socketserver
import os
import shutil
from pathlib import Path

def setup_download_directory():
    """Set up the download directory with all necessary files"""
    
    # Create downloads directory
    download_dir = Path("downloads")
    download_dir.mkdir(exist_ok=True)
    
    print("📁 Setting up download directory...")
    
    # Copy installer files
    dist_dir = Path("dist-electron")
    if dist_dir.exists():
        for dmg_file in dist_dir.glob("*.dmg"):
            dest = download_dir / dmg_file.name
            if not dest.exists():
                print(f"📦 Copying {dmg_file.name}...")
                shutil.copy2(dmg_file, dest)
    
    # Copy download page
    html_file = Path("download-page.html")
    if html_file.exists():
        dest = download_dir / "index.html"
        shutil.copy2(html_file, dest)
        print("📄 Copied download page as index.html")
    
    # Create a simple file listing if needed
    files_info = []
    for file in download_dir.glob("*.dmg"):
        size_mb = file.stat().st_size / (1024 * 1024)
        files_info.append(f"  - {file.name} ({size_mb:.1f} MB)")
    
    print("\n✅ Download directory ready!")
    print(f"📂 Location: {download_dir.absolute()}")
    print("📦 Available files:")
    for info in files_info:
        print(info)
    
    return download_dir

def start_server(port=8080):
    """Start a simple HTTP server"""
    
    download_dir = setup_download_directory()
    
    # Change to download directory
    os.chdir(download_dir)
    
    # Create server
    handler = http.server.SimpleHTTPRequestHandler
    
    # Add CORS headers for better compatibility
    class CORSRequestHandler(handler):
        def end_headers(self):
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', '*')
            super().end_headers()
    
    with socketserver.TCPServer(("", port), CORSRequestHandler) as httpd:
        print(f"\n🌐 ConCure Download Server Started!")
        print(f"📍 URL: http://localhost:{port}")
        print(f"🔗 Share this link with clients: http://your-server-ip:{port}")
        print("\n📋 Instructions for clients:")
        print("1. Visit the URL above")
        print("2. Choose the appropriate download for their Mac")
        print("3. Install the .dmg file")
        print("4. Launch ConCure and enter license key")
        print("\n⏹️  Press Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped.")

if __name__ == "__main__":
    import sys
    
    port = 8080
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("Invalid port number. Using default 8080.")
    
    start_server(port)
