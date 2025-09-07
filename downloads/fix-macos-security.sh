#!/bin/bash

# ConCure macOS Security Fix Script
# This script helps users bypass the "unverified developer" warning

echo "🔒 ConCure macOS Security Fix"
echo "=============================="
echo ""

# Check if ConCure app exists
APP_PATH="/Applications/ConCure Clinic Management.app"
if [ ! -d "$APP_PATH" ]; then
    echo "❌ ConCure app not found in Applications folder"
    echo "Please install ConCure first, then run this script"
    exit 1
fi

echo "✅ Found ConCure app at: $APP_PATH"
echo ""

# Remove quarantine attribute
echo "🔧 Removing quarantine attribute..."
sudo xattr -rd com.apple.quarantine "$APP_PATH" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Security attribute removed successfully!"
    echo ""
    echo "🚀 ConCure should now launch without warnings"
    echo ""
    echo "To launch ConCure:"
    echo "1. Go to Applications folder"
    echo "2. Double-click 'ConCure Clinic Management'"
    echo "3. Or run: open '$APP_PATH'"
    echo ""
    
    # Ask if user wants to launch now
    read -p "Launch ConCure now? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 Launching ConCure..."
        open "$APP_PATH"
    fi
    
else
    echo "⚠️  Could not remove security attribute"
    echo "This might be normal if the attribute doesn't exist"
    echo ""
    echo "Try the manual method:"
    echo "1. Right-click on ConCure app in Applications"
    echo "2. Select 'Open' from the menu"
    echo "3. Click 'Open' in the security dialog"
fi

echo ""
echo "📖 For more help, see: macos-security-guide.md"
echo "💬 Support: Contact your ConCure administrator"
