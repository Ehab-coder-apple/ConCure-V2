#!/bin/bash

# ConCure Clinic Management - One-Click Installer
# This script handles the complete installation process

echo "🏥 Installing ConCure Clinic Management..."

# Get the directory where this script is located (inside the DMG)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_SOURCE="$SCRIPT_DIR/ConCure Clinic Management.app"
APP_DEST="/Applications/ConCure Clinic Management.app"

# Check if source app exists
if [ ! -d "$APP_SOURCE" ]; then
    echo "❌ Error: ConCure app not found in installer"
    exit 1
fi

# Remove existing installation
if [ -d "$APP_DEST" ]; then
    echo "🗑️  Removing previous installation..."
    rm -rf "$APP_DEST"
fi

# Copy app to Applications
echo "📦 Installing ConCure to Applications..."
cp -R "$APP_SOURCE" "$APP_DEST"

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to copy application"
    exit 1
fi

# Remove quarantine attributes
echo "🔧 Configuring security settings..."
xattr -rd com.apple.quarantine "$APP_DEST" 2>/dev/null || true
xattr -c "$APP_DEST" 2>/dev/null || true

# Set proper permissions
chmod -R 755 "$APP_DEST" 2>/dev/null || true

# Verify installation
if [ -d "$APP_DEST" ]; then
    echo "✅ ConCure Clinic Management installed successfully!"
    echo "🚀 You can now find it in your Applications folder"
    
    # Try to open the app
    echo "🎯 Launching ConCure..."
    open "$APP_DEST" 2>/dev/null || true
    
    echo ""
    echo "🎉 Installation Complete!"
    echo "   ConCure Clinic Management is ready to use."
else
    echo "❌ Installation failed"
    exit 1
fi
