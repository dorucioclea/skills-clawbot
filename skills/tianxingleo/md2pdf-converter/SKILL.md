---
name: md2pdf-converter
description: Offline Markdown to PDF converter with full Unicode support using Pandoc + WeasyPrint + local emoji cache. Converts Markdown documents to professional PDFs with Chinese fonts and colorful emojis. Use when user needs to convert Markdown reports or documents to PDF, generate PDFs with emoji support, create PDFs with proper Chinese character rendering, or work offline after initial setup.
---

# Markdown to PDF Converter

## Overview

Convert Markdown documents to professional PDFs with full Unicode support, Chinese fonts, and colorful emojis. Uses Pandoc + WeasyPrint with a local emoji cache to work offline after the first run.

## Quick Start

Convert a Markdown file to PDF:

```bash
bash scripts/md2pdf-local.sh input.md output.pdf
```

**First run only:** Downloads ~68MB emoji resources from npmmirror.com (China-friendly mirror). Subsequent runs work offline.

**Example:**

```bash
bash scripts/md2pdf-local.sh report.md report.pdf
```

## Features

- Full Unicode support (Chinese, Japanese, Korean)
- Colorful emoji rendering (Google style, 64px)
- Offline operation after initial setup
- China-friendly mirror (npmmirror.com)
- Professional PDF layout with page numbers
- Code highlighting, tables, blockquotes
- Automatic emoji detection and conversion

## Technical Details

### Dependencies

- **Pandoc** - Universal document converter
- **WeasyPrint** - CSS-to-PDF renderer
- **wget** - For emoji download (first run only)

### How It Works

1. **First run**: Downloads emoji-datasource-google (15.0.0) to `~/.cache/md2pdf/emojis/`
2. **Pandoc** converts Markdown to HTML with a Lua filter that replaces emoji characters with local image references
3. **WeasyPrint** renders the HTML to PDF using:
   - AR PL UMing CN for Chinese characters
   - Local emoji images (PNG, 64px)
   - Professional CSS styling

### Emoji Cache Location

```
~/.cache/md2pdf/emojis/
└── 1f600.png, 1f601.png, ... (all emoji PNGs)
```

### Fonts

**Primary Chinese font**: AR PL UMing CN

**Fallback**: Noto Sans SC, Noto Sans CJK SC, Microsoft YaHei

**Monospace**: Menlo, Monaco

## Limitations

- Only supports emojis present in emoji-datasource-google 15.0.0 (~3600 emojis)
- Missing emojis display as Unicode fallback characters
- First run requires internet connection (for emoji download)

## Troubleshooting

### Font Issues

If Chinese characters display incorrectly, ensure AR PL UMing CN is installed:

```bash
# Ubuntu/Debian
sudo apt-get install fonts-arphic-uming

# Check if installed
fc-list | grep "AR PL UMing"
```

### Emoji Not Showing

- Check if emoji cache exists: `ls ~/.cache/md2pdf/emojis/`
- If missing, delete cache and re-run: `rm -rf ~/.cache/md2pdf`
- Verify emoji file exists: `ls ~/.cache/md2pdf/emojis/1f600.png`

### WeasyPrint Errors

Install missing dependencies:

```bash
# Ubuntu/Debian
sudo apt-get install python3-weasyprint

# Or via pip
pip3 install weasyprint
```

## Resources

### scripts/

**md2pdf-local.sh** - Main conversion script with automatic emoji caching

**Usage**: Direct execution, no need to load into context unless debugging or modifying.

**Key Features**:
- Automatic emoji download and caching
- Lua filter for emoji replacement
- CSS styling for professional output
- Temporary file cleanup (automatic)
