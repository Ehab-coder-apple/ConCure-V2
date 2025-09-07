#!/usr/bin/env python3
"""
Simple script to create basic application icons for ConCure
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    import os
    
    def create_icon(size, output_path):
        # Create a new image with a medical cross design
        img = Image.new('RGBA', (size, size), (0, 128, 128, 255))  # Teal background
        draw = ImageDraw.Draw(img)
        
        # Draw a white medical cross
        cross_width = size // 8
        cross_length = size // 2
        
        # Horizontal bar
        h_x = (size - cross_length) // 2
        h_y = (size - cross_width) // 2
        draw.rectangle([h_x, h_y, h_x + cross_length, h_y + cross_width], fill=(255, 255, 255, 255))
        
        # Vertical bar
        v_x = (size - cross_width) // 2
        v_y = (size - cross_length) // 2
        draw.rectangle([v_x, v_y, v_x + cross_width, v_y + cross_length], fill=(255, 255, 255, 255))
        
        # Add a subtle border
        draw.rectangle([2, 2, size-3, size-3], outline=(255, 255, 255, 100), width=2)
        
        img.save(output_path)
        print(f"Created icon: {output_path}")
    
    # Create icons directory
    os.makedirs('electron/assets', exist_ok=True)
    
    # Create different sized icons
    create_icon(512, 'electron/assets/icon.png')
    create_icon(256, 'electron/assets/icon@2x.png')
    create_icon(128, 'electron/assets/icon@1x.png')
    
    print("✅ Basic icons created successfully!")
    print("📝 Note: For production, consider creating professional icons with:")
    print("   - Higher quality graphics")
    print("   - Proper .icns file for macOS")
    print("   - Proper .ico file for Windows")
    
except ImportError:
    print("❌ PIL (Pillow) not found. Creating placeholder icons...")
    
    # Create placeholder text files as icons
    os.makedirs('electron/assets', exist_ok=True)
    
    with open('electron/assets/icon.png', 'w') as f:
        f.write("# ConCure Icon Placeholder\n# Replace with actual PNG icon")
    
    print("📝 Created placeholder icon files.")
    print("🔧 To create proper icons:")
    print("   1. Install Pillow: pip install Pillow")
    print("   2. Run this script again")
    print("   3. Or manually create icon.png, icon.ico, and icon.icns files")

except Exception as e:
    print(f"❌ Error creating icons: {e}")
    print("📝 Please manually create icon files in electron/assets/")
