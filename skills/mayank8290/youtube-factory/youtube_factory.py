#!/usr/bin/env python3
"""
YouTube Factory - Generate complete YouTube videos from prompts
100% Free tools - No expensive APIs required

Usage:
    python youtube_factory.py "5 Morning Habits of Successful People"
    python youtube_factory.py "How AI Works" --style documentary --length 8
    python youtube_factory.py "Quick Python Tips" --shorts
"""

import os
import sys
import json
import argparse
import tempfile
from pathlib import Path
from datetime import datetime

# Add shared utilities
sys.path.insert(0, str(Path(__file__).parent.parent / "shared"))
from video_utils import (
    text_to_speech,
    search_stock_videos,
    download_stock_video,
    concatenate_videos,
    add_audio_to_video,
    add_captions,
    resize_for_shorts,
    create_thumbnail,
    extract_frame,
    estimate_speech_duration,
    clean_text_for_speech,
    OUTPUT_DIR
)


# =============================================================================
# SCRIPT GENERATION PROMPTS
# =============================================================================

SCRIPT_PROMPTS = {
    "documentary": """Write a YouTube video script about: {topic}

Target length: {length} minutes (approximately {words} words)

Structure:
1. HOOK (first 15 seconds): Start with a surprising fact, question, or bold statement
2. INTRO (next 30 seconds): Set context and promise what viewers will learn
3. MAIN CONTENT: Cover {points} key points with examples and stories
4. CONCLUSION: Summarize key takeaways
5. CTA: Ask viewers to subscribe and comment

Style: Professional, informative, engaging. Use conversational language.
Avoid: Filler words, overly complex jargon, "um" and "uh"

Output the script in this format:
---
[SCENE 1: Hook]
(0:00 - 0:15)
[Script text here]
VISUAL: [Describe the B-roll footage needed]

[SCENE 2: Intro]
(0:15 - 0:45)
[Script text here]
VISUAL: [Describe the B-roll footage needed]

... continue for all scenes ...
---

Topic: {topic}""",

    "listicle": """Write a "Top {points}" style YouTube video script about: {topic}

Target length: {length} minutes (approximately {words} words)

Structure:
1. HOOK: Tease the best item on the list
2. INTRO: Why this list matters
3. ITEMS {points} to 1: Count down from least to most important
   - Each item: Name it, explain it, give an example
4. RECAP: Quick summary of all items
5. CTA: Subscribe and comment their favorite

Each item should be roughly equal length.

Output format:
---
[HOOK]
[Script]
VISUAL: [B-roll description]

[INTRO]
[Script]
VISUAL: [B-roll description]

[#{points}: Item Name]
[Script]
VISUAL: [B-roll description]

... continue ...
---

Topic: {topic}""",

    "tutorial": """Write a step-by-step tutorial video script about: {topic}

Target length: {length} minutes (approximately {words} words)

Structure:
1. HOOK: Show the end result first
2. INTRO: What they'll learn and why it matters
3. PREREQUISITES: What they need before starting (keep brief)
4. STEPS: {points} clear steps with detailed instructions
5. COMMON MISTAKES: 2-3 things to avoid
6. CONCLUSION: Recap and encourage them to try it
7. CTA: Subscribe for more tutorials

Be specific and actionable. Assume the viewer is following along.

Output format:
---
[HOOK]
[Script]
VISUAL: [Show end result]

[STEP 1: Step Name]
[Detailed instructions]
VISUAL: [What to show on screen]

... continue ...
---

Topic: {topic}""",

    "story": """Write a storytelling YouTube video script about: {topic}

Target length: {length} minutes (approximately {words} words)

Structure:
1. HOOK: Start in the middle of the action
2. SETUP: Introduce the characters/situation
3. CONFLICT: The challenge or problem
4. JOURNEY: The struggle and attempts
5. CLIMAX: The turning point
6. RESOLUTION: How it ended
7. LESSON: What we can learn
8. CTA: Subscribe for more stories

Use vivid descriptions. Create emotional connection.

Output format:
---
[HOOK]
[Script - start with action]
VISUAL: [Dramatic B-roll]

[SETUP]
[Script]
VISUAL: [B-roll description]

... continue ...
---

Topic: {topic}""",

    "shorts": """Write a YouTube Shorts script (60 seconds max) about: {topic}

Structure:
1. HOOK (first 3 seconds): Immediate attention grabber
2. CONTENT (50 seconds): One key insight, fact, or tip
3. CTA (last 7 seconds): Follow for more

Rules:
- Maximum 150 words total
- Fast-paced, punchy sentences
- No fluff or filler
- End with a bang

Output format:
---
[HOOK - 3 sec]
[Script]

[MAIN - 50 sec]
[Script]

[CTA - 7 sec]
[Script]
---

Topic: {topic}"""
}


# =============================================================================
# VIDEO GENERATION
# =============================================================================

def parse_script(script_text: str) -> list:
    """Parse script into scenes with text and visual descriptions"""
    scenes = []
    current_scene = {"text": "", "visual": "", "name": ""}

    lines = script_text.split("\n")
    for line in lines:
        line = line.strip()

        if line.startswith("[") and "]" in line:
            # New scene
            if current_scene["text"]:
                scenes.append(current_scene)
            scene_name = line.strip("[]").split(":")[0]
            current_scene = {"text": "", "visual": "", "name": scene_name}

        elif line.upper().startswith("VISUAL:"):
            current_scene["visual"] = line.replace("VISUAL:", "").strip()

        elif line and not line.startswith("(") and not line.startswith("---"):
            current_scene["text"] += " " + line

    if current_scene["text"]:
        scenes.append(current_scene)

    # Clean up text
    for scene in scenes:
        scene["text"] = clean_text_for_speech(scene["text"].strip())

    return scenes


def generate_video(
    topic: str,
    style: str = "documentary",
    length: int = 8,
    voice: str = "en-US-ChristopherNeural",
    shorts: bool = False,
    output_name: str = None
) -> dict:
    """
    Generate a complete YouTube video from a topic

    Returns dict with paths to all generated files
    """
    print(f"\n🎬 YouTube Factory: Generating video about '{topic}'")
    print("=" * 60)

    # Create output directory
    if output_name is None:
        output_name = topic.lower().replace(" ", "-")[:50]
        output_name = "".join(c for c in output_name if c.isalnum() or c == "-")

    video_dir = OUTPUT_DIR / output_name
    video_dir.mkdir(parents=True, exist_ok=True)

    results = {"directory": str(video_dir)}

    # Override for shorts
    if shorts:
        style = "shorts"
        length = 1

    # ==========================================================================
    # STEP 1: Generate Script
    # ==========================================================================
    print("\n📝 Step 1/6: Generating script...")

    words_per_minute = 150
    target_words = length * words_per_minute
    points = max(3, min(10, length))  # 3-10 points based on length

    prompt = SCRIPT_PROMPTS.get(style, SCRIPT_PROMPTS["documentary"]).format(
        topic=topic,
        length=length,
        words=target_words,
        points=points
    )

    # This is where OpenClaw's LLM generates the script
    # In standalone mode, we'll create a placeholder
    script = f"""[HOOK]
Did you know that {topic} is changing everything we thought we knew?

VISUAL: Dramatic establishing shot

[INTRO]
In this video, we're going to explore {topic} in a way you've never seen before.
You'll discover the secrets that experts don't want you to know.
Stay until the end for the most surprising revelation.

VISUAL: Dynamic montage related to {topic}

[MAIN POINT 1]
The first thing you need to understand about {topic} is that it's not what it seems.
Most people make the mistake of overlooking the fundamentals.
Let me show you what I mean.

VISUAL: Explanatory graphics or relevant B-roll

[MAIN POINT 2]
Here's where things get really interesting.
The research shows that {topic} has evolved dramatically in recent years.
This changes everything.

VISUAL: Data visualization or expert interviews

[MAIN POINT 3]
But wait, there's more.
The implications of {topic} extend far beyond what we initially discussed.
This is the part that blows most people's minds.

VISUAL: Impactful imagery

[CONCLUSION]
So there you have it - the truth about {topic}.
Remember the key points we covered today.
If you found this valuable, hit that subscribe button and ring the bell.
Drop a comment below with your thoughts.
See you in the next video.

VISUAL: Subscribe button animation, end screen
"""

    # Save script
    script_path = video_dir / "script.md"
    with open(script_path, "w") as f:
        f.write(f"# {topic}\n\n")
        f.write(f"Style: {style}\n")
        f.write(f"Target Length: {length} minutes\n\n")
        f.write("---\n\n")
        f.write(script)

    results["script"] = str(script_path)
    print(f"   ✓ Script saved to {script_path}")

    # Parse into scenes
    scenes = parse_script(script)
    print(f"   ✓ Parsed {len(scenes)} scenes")

    # ==========================================================================
    # STEP 2: Generate Voiceover
    # ==========================================================================
    print("\n🎤 Step 2/6: Generating voiceover...")

    full_text = " ".join(scene["text"] for scene in scenes)
    voiceover_path = str(video_dir / "voiceover.mp3")

    text_to_speech(full_text, voiceover_path, voice=voice)
    results["voiceover"] = voiceover_path
    print(f"   ✓ Voiceover saved to {voiceover_path}")

    # ==========================================================================
    # STEP 3: Fetch Stock Footage
    # ==========================================================================
    print("\n🎥 Step 3/6: Fetching stock footage...")

    stock_clips = []
    orientation = "portrait" if shorts else "landscape"

    for i, scene in enumerate(scenes):
        # Generate search query from visual description or scene text
        query = scene.get("visual", "") or topic
        query = query[:100]  # Limit query length

        print(f"   Searching for: {query[:40]}...")
        videos = search_stock_videos(query, count=2, orientation=orientation)

        if videos:
            # Download first matching video
            clip_path = str(video_dir / f"clip_{i}.mp4")
            download_stock_video(videos[0]["url"], clip_path)
            stock_clips.append(clip_path)
            print(f"   ✓ Downloaded clip {i+1}/{len(scenes)}")
        else:
            print(f"   ⚠ No footage found for scene {i+1}")

    results["stock_clips"] = stock_clips

    # ==========================================================================
    # STEP 4: Assemble Video
    # ==========================================================================
    print("\n🔧 Step 4/6: Assembling video...")

    if stock_clips:
        raw_video = str(video_dir / "video_raw.mp4")
        concatenate_videos(stock_clips, raw_video)

        # Add voiceover
        with_audio = str(video_dir / "video_with_audio.mp4")
        add_audio_to_video(raw_video, voiceover_path, with_audio)
        results["video_raw"] = with_audio
        print(f"   ✓ Video assembled")
    else:
        print("   ⚠ No stock clips - creating audio-only visualization")
        # Fallback: create simple video from voiceover
        with_audio = voiceover_path
        results["video_raw"] = with_audio

    # ==========================================================================
    # STEP 5: Add Captions
    # ==========================================================================
    print("\n💬 Step 5/6: Adding captions...")

    # Create caption segments from scenes
    caption_segments = []
    current_time = 0
    for scene in scenes:
        duration = estimate_speech_duration(scene["text"])
        # Split into smaller chunks for better captions
        words = scene["text"].split()
        chunk_size = 8  # words per caption
        for j in range(0, len(words), chunk_size):
            chunk = " ".join(words[j:j+chunk_size])
            chunk_duration = estimate_speech_duration(chunk)
            caption_segments.append({
                "start": current_time,
                "end": current_time + chunk_duration,
                "text": chunk
            })
            current_time += chunk_duration

    if os.path.exists(str(video_dir / "video_with_audio.mp4")):
        final_video = str(video_dir / "video_final.mp4")
        add_captions(
            str(video_dir / "video_with_audio.mp4"),
            final_video,
            caption_segments,
            style="modern"
        )
        results["video_final"] = final_video
        print(f"   ✓ Captions added")
    else:
        results["video_final"] = results.get("video_raw", voiceover_path)

    # Resize for shorts if needed
    if shorts and os.path.exists(results.get("video_final", "")):
        shorts_path = str(video_dir / "video_shorts.mp4")
        resize_for_shorts(results["video_final"], shorts_path)
        results["video_shorts"] = shorts_path
        print(f"   ✓ Converted to Shorts format")

    # ==========================================================================
    # STEP 6: Generate Thumbnail
    # ==========================================================================
    print("\n🖼️ Step 6/6: Generating thumbnail...")

    if stock_clips:
        # Extract frame from first clip
        frame_path = str(video_dir / "thumb_frame.jpg")
        extract_frame(stock_clips[0], frame_path, timestamp=2.0)

        # Create thumbnail with text
        thumbnail_path = str(video_dir / "thumbnail.jpg")
        title_words = topic.split()[:5]  # First 5 words
        create_thumbnail(
            frame_path,
            thumbnail_path,
            title=" ".join(title_words).upper(),
            subtitle="MUST WATCH"
        )
        results["thumbnail"] = thumbnail_path
        print(f"   ✓ Thumbnail created")

    # ==========================================================================
    # METADATA
    # ==========================================================================
    print("\n📋 Generating metadata...")

    metadata = {
        "title": topic,
        "description": f"In this video, we explore {topic}. Subscribe for more!",
        "tags": topic.lower().split() + ["tutorial", "explained", "2024"],
        "category": "Education",
        "generated_at": datetime.now().isoformat(),
        "style": style,
        "voice": voice,
        "files": results
    }

    metadata_path = video_dir / "metadata.json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    results["metadata"] = str(metadata_path)

    # ==========================================================================
    # SUMMARY
    # ==========================================================================
    print("\n" + "=" * 60)
    print("✅ VIDEO GENERATION COMPLETE!")
    print("=" * 60)
    print(f"\n📁 Output folder: {video_dir}")
    print("\nGenerated files:")
    for key, path in results.items():
        if key != "directory" and key != "stock_clips":
            print(f"   • {key}: {Path(path).name}")

    print(f"\n🚀 Upload '{Path(results.get('video_final', '')).name}' to YouTube!")

    return results


# =============================================================================
# CLI
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="YouTube Factory - Generate complete videos from prompts"
    )
    parser.add_argument("topic", help="Video topic")
    parser.add_argument("--style", default="documentary",
                        choices=["documentary", "listicle", "tutorial", "story"],
                        help="Video style")
    parser.add_argument("--length", type=int, default=8,
                        help="Target length in minutes")
    parser.add_argument("--voice", default="en-US-ChristopherNeural",
                        help="TTS voice name")
    parser.add_argument("--shorts", action="store_true",
                        help="Generate YouTube Shorts (vertical 60s)")
    parser.add_argument("--output", help="Custom output folder name")

    args = parser.parse_args()

    generate_video(
        topic=args.topic,
        style=args.style,
        length=args.length,
        voice=args.voice,
        shorts=args.shorts,
        output_name=args.output
    )


if __name__ == "__main__":
    main()
