# Media Cache Build System for Kirby 4.8

This project includes a comprehensive media cache build system to pre-generate all thumbnail images for optimal performance.

## Overview

Due to issues with automatic on-demand media generation in Kirby 4.8, this build system pre-generates all required thumbnail sizes for all project images. This ensures that all media files are available immediately without relying on automatic generation.

## Usage

### Build All Media Cache Files

```bash
npm run build:media
```

Or run directly with PHP:

```bash
php build-media-cache.php
```

### What It Does

The build script:

1. **Scans all projects** in the `/projects` page
2. **Processes all image files** (JPG, PNG, WebP, etc.)
3. **Generates 7 thumbnail sizes** for each image:
   - 150×150 (quality 60) - Small thumbnails
   - 300×200 (quality 80) - Card previews
   - 400×300 (quality 80) - Medium previews
   - 490×390 (quality 35) - List view thumbnails
   - 690×590 (quality 75) - Large previews
   - 800×600 (quality 85) - Detail views
   - 1200×800 (quality 90) - High-resolution displays

4. **Processes existing job files** - Converts any pending `.json` job files into actual images
5. **Provides detailed progress reporting** with file sizes and status

### Build Output

The script generates comprehensive output showing:
- ✅ Successfully generated thumbnails
- ⏭️ Skipped thumbnails (already exist)
- ❌ Any errors encountered
- 📊 Summary statistics per project
- 🎯 Total files created

### Example Output

```
=== KIRBY MEDIA CACHE BUILD SCRIPT ===
📁 Processing project: Phenotype Agency (01-phenotype-agency)
   🖼️  Processing: phenotype-agency-00_keyvisual.jpg
      📏 Original: 3840x2160 (2211785 bytes)
      ✅ 150x150 (q60): Generated (3518 bytes)
      ✅ 300x200 (q80): Generated (10166 bytes)
      ...

=== BUILD SUMMARY ===
📈 Total thumbnails generated: 1442
⏭️ Total thumbnails skipped: 42
❌ Total errors: 0
✅ Media cache build completed successfully!
```

## When to Run

- **After adding new images** to any project
- **Before deploying** to production
- **When thumbnails are missing** or not loading properly
- **After updating image files**

## Technical Details

### Memory Management
- Script automatically increases PHP memory limit to 512MB
- Handles large images (up to 7680×4320 resolution)
- Processes images efficiently to prevent memory exhaustion

### File Structure
Generated thumbnails are stored in:
```
app/media/pages/projects/{project-slug}/{hash}/{filename}-{width}x{height}-crop-q{quality}.{ext}
```

### Supported Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- Any format supported by Kirby's image processing

## Troubleshooting

### Memory Issues
If you encounter memory errors:
1. Increase PHP memory limit in `build-media-cache.php`
2. Process projects individually by modifying the script
3. Check for extremely large source images

### Permission Issues
Ensure the `app/media/` directory is writable:
```bash
chmod -R 755 app/media/
```

### Missing Thumbnails
If thumbnails still don't appear:
1. Run the build script again
2. Check file permissions
3. Verify original images exist and are readable
4. Clear any existing `.jobs` files and rebuild

## Integration

The build system integrates with:
- **Kirby 4.8** native media processing
- **Vite build process** (can be added to build pipeline)
- **Development workflow** (run during development)
- **Deployment process** (include in CI/CD)

## Performance Benefits

Pre-generating thumbnails provides:
- ⚡ **Instant loading** - No on-demand generation delays
- 🚀 **Better UX** - Images load immediately
- 📱 **Responsive images** - Multiple sizes for different devices
- 🔧 **Reliable delivery** - No dependency on automatic generation
- 💾 **Optimized file sizes** - Proper compression for each use case

---

**Note**: This build system was created to work around automatic media generation issues in Kirby 4.8. All thumbnails are now pre-generated for optimal performance and reliability.
