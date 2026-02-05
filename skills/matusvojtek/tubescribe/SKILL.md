---
name: tubescribe
description: |
  YouTube video summarizer with speaker detection, formatted documents, and audio output.
  Use when user sends a YouTube URL or asks to summarize/transcribe a YouTube video.
  Creates: transcript with speaker labels, summary, key quotes, and optional audio narration.
  Triggers: YouTube URLs (youtube.com, youtu.be), "summarize this video", "transcribe YouTube"
---

# TubeScribe 🎬

**Turn any YouTube video into a polished document + audio summary in seconds.**

Drop a YouTube link → get a beautiful transcript with speaker labels, key quotes, timestamps that link back to the video, and an audio summary you can listen to on the go.

### 💸 100% Free & Local

- **No subscription** — runs entirely on your machine
- **No API keys required** — works out of the box
- **No data leaves your computer** — your content stays private
- **No usage limits** — summarize as many videos as you want

### ✨ Features

- **🎯 Smart Speaker Detection** — Automatically identifies who's talking in interviews, podcasts, and conversations
- **📝 Clickable Timestamps** — Every quote links directly to that moment in the video
- **📄 Clean Documents** — Export as DOCX, HTML, or Markdown
- **🔊 Audio Summaries** — Listen to the key points (MP3/WAV)
- **🚀 Zero Config** — Works out of the box, upgrades available for power users

### 🎬 Works With Any Video

- Interviews & podcasts (multi-speaker detection)
- Lectures & tutorials (single speaker)
- Music videos (lyrics extraction)
- News & documentaries
- Any YouTube content with captions

## Quick Start

When user sends a YouTube URL, run the full pipeline automatically:

```bash
# 1. Extract transcript
python skills/tubescribe/scripts/tubescribe.py "YOUTUBE_URL"
```

This creates:
- `/tmp/tubescribe_{video_id}_source.json` — metadata + transcript
- `/tmp/tubescribe_{video_id}_output.md` — path for output

Then process with sub-agent (see workflow below).

## First-Time Setup

Run setup to check dependencies and configure defaults:

```bash
python skills/tubescribe/scripts/setup.py
```

This checks: `summarize` CLI, `pandoc`/`python-docx`, `ffmpeg`, `Kokoro TTS`

## Full Workflow

### Step 1: Extract Transcript

```bash
python skills/tubescribe/scripts/tubescribe.py "https://youtube.com/watch?v=VIDEO_ID"
```

### Step 2: Process with Sub-Agent

Spawn a sub-agent to analyze and format:

```python
sessions_spawn(
    task="""Read /tmp/tubescribe_{video_id}_source.json and create formatted output.

**Output to:** /tmp/tubescribe_{video_id}_output.md

**Format:**
1. # Title (from metadata)
2. ## Participants — identify speakers from context
3. ## Summary — 3-5 paragraphs covering main topics
4. ## Key Quotes — 5 best quotes with timestamps [[MM:SS]](https://youtu.be/{video_id}?t=SECONDS)
5. ## Full Transcript — ALL segments with:
   - Speaker labels (**Name:** ) when identifiable
   - Clickable timestamps: [[0:42]](https://youtu.be/{video_id}?t=42)
   - Convert MM:SS to seconds for links

**Speaker Detection:**
- Use context clues (questions vs answers, explicit names, speaking patterns)
- For single-speaker videos, use narrator label or skip speaker labels
- For interviews: host asks questions, guest gives longer answers
""",
    label="tubescribe",
    runTimeoutSeconds=600,
    cleanup="delete"
)
```

### Step 3: Create Document

Convert markdown to final format:

```bash
# RTF (no dependencies)
python skills/tubescribe/scripts/rtf_writer.py /tmp/tubescribe_{video_id}_output.md output.rtf

# Or with pandoc for DOCX
pandoc /tmp/tubescribe_{video_id}_output.md -o output.docx
```

### Step 4: Generate Audio Summary (Optional)

Extract summary section and generate TTS:

```python
# Read summary from output markdown
# Generate audio using Kokoro (preferred) or built-in TTS
# Save to {output_dir}/{title}_summary.wav or .mp3
```

### Step 5: Open Results

```bash
open output.rtf  # or .docx
open -a "QuickTime Player" output_summary.wav
```

## Configuration

Config file: `~/.tubescribe/config.json`

```json
{
  "output_folder": "~/Documents/TubeScribe",
  "document_format": "docx",
  "audio_format": "mp3",
  "tts_engine": "kokoro"
}
```

Options:
- `output_folder`: Where to save files (default: `~/Documents/TubeScribe`)
- `document_format`: `html` (default without deps), `docx` (with pandoc), `md`
- `audio_format`: `mp3` (with ffmpeg), `wav` (default without ffmpeg)
- `tts_engine`: `builtin` (macOS say), `kokoro` (high quality)

## Output Structure

```
~/Documents/TubeScribe/
├── {Video Title}.html         # Formatted document (or .docx)
└── {Video Title}_summary.mp3  # Audio summary
```

After generation, opens the folder (not individual files) so you can access everything.

## Dependencies

**Required:**
- `summarize` CLI — `brew install steipete/tap/summarize`
- Python 3.8+

**Optional (better quality):**
- `pandoc` — DOCX output: `brew install pandoc`
- `ffmpeg` — MP3 audio: `brew install ffmpeg`
- Kokoro TTS — High-quality voices: see https://github.com/hexgrad/kokoro

## Tips

- For long videos (>30 min), increase sub-agent timeout to 900s
- Speaker detection works best with clear interview/podcast formats
- Single-speaker videos (tutorials, lectures) skip speaker labels automatically
- Timestamps link directly to YouTube at that moment
