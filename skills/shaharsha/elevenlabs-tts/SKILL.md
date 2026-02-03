---
name: elevenlabs-tts
description: ElevenLabs voice synthesis with audio tags for expressive TTS (Text-to-Speech). Use when creating voice messages, podcasts, audiobooks, or any spoken content. Handles WhatsApp voice compatibility, long-form audio concatenation, and emotional expression via audio tags.
---

# ElevenLabs TTS (Text-to-Speech)

Generate expressive voice messages using ElevenLabs v3 with audio tags.

## Quick Start Examples

**English:**
```
[excited] This is absolutely amazing! I can't believe how natural this sounds.
```

**Hebrew:**
```
[excited] זה ממש מדהים מה שעשינו היום! אני כל כך שמח!
```

**Spanish:**
```
[excited] ¡Esto es absolutamente increíble! No puedo creer lo natural que suena.
```

## Configuration (OpenClaw)

In `openclaw.json`, configure TTS under `messages.tts`:

```json
{
  "messages": {
    "tts": {
      "provider": "elevenlabs",
      "elevenlabs": {
        "apiKey": "sk_your_api_key_here",
        "voiceId": "pNInz6obpgDQGcFmaJgB",
        "modelId": "eleven_v3",
        "languageCode": "en",
        "voiceSettings": {
          "stability": 0.5,
          "similarityBoost": 0.75,
          "style": 0,
          "useSpeakerBoost": true,
          "speed": 1
        }
      }
    }
  }
}
```

**Getting your API Key:**
1. Go to https://elevenlabs.io
2. Sign up/login
3. Click profile → API Keys
4. Copy your key

## Recommended Voices for v3

These premade voices are optimized for v3 and work well with audio tags:

| Voice | ID | Gender | Accent | Best For |
|-------|-----|--------|--------|----------|
| **Adam** | `pNInz6obpgDQGcFmaJgB` | Male | American | Deep narration, general use |
| **Rachel** | `21m00Tcm4TlvDq8ikWAM` | Female | American | Calm narration, conversational |
| **Brian** | `nPczCjzI2devNBz1zQrb` | Male | American | Deep narration, podcasts |
| **Charlotte** | `XB0fDUnXU5powFXDhCwa` | Female | English-Swedish | Expressive, video games |
| **George** | `JBFqnCBsd6RMkjVDRZzb` | Male | British | Raspy narration, storytelling |

**Finding more voices:**
- Browse: https://elevenlabs.io/voice-library
- v3-optimized collection: https://elevenlabs.io/app/voice-library/collections/aF6JALq9R6tXwCczjhKH
- API: `GET https://api.elevenlabs.io/v1/voices`

**Voice selection tips:**
- Use IVC (Instant Voice Clone) or premade voices - PVC not optimized for v3 yet
- Match voice character to your use case (whispering voice won't shout well)
- For expressive IVCs, include varied emotional tones in training samples

## Model Settings

- **Model**: `eleven_v3` (alpha) - ONLY model supporting audio tags
- **Languages**: 70+ supported with full audio tag control

### Stability Modes

| Mode | Stability | Description |
|------|-----------|-------------|
| **Creative** | 0.3-0.5 | More emotional/expressive, may hallucinate |
| **Natural** | 0.5-0.7 | Balanced, closest to original voice |
| **Robust** | 0.7-1.0 | Highly stable, less responsive to tags |

For audio tags, use **Creative** (0.5) or **Natural**. Higher stability reduces tag responsiveness.

### Speed Control

Range: 0.7 (slow) to 1.2 (fast), default 1.0

Extreme values affect quality. For pacing, prefer audio tags like `[rushed]` or `[drawn out]`.

## Critical Rules

### Length Limits
- **Optimal**: <800 characters per segment (best quality)
- **Maximum**: 10,000 characters (API hard limit)
- **Quality degrades** with longer text - voice becomes inconsistent

### Audio Tags
- **Opening only**: `[excited]` ✅ | `[/excited]` ❌
- **Natural sentences**: Tags modify tone, not explanations
- **Sparingly**: 2-4 tags per paragraph max
- **Match voice**: Don't use [shouts] on a whispering voice

### SSML Not Supported
v3 does NOT support SSML break tags. Use audio tags and punctuation instead.

### Punctuation Effects
- **Ellipses (...)** → pauses and weight
- **CAPS** → emphasis ("That's AMAZING!")
- **Standard punctuation** → natural rhythm

## WhatsApp Compatibility

MP3 doesn't work on all devices. Convert to Opus:
```bash
ffmpeg -i input.mp3 -c:a libopus -b:a 64k -vbr on -application voip output.ogg
```

## Long-Form Audio (Podcasts)

For content >800 chars:

1. Split into short segments (<800 chars each)
2. Generate each with `tts` tool
3. Concatenate with ffmpeg:
   ```bash
   cat > list.txt << EOF
   file '/path/file1.mp3'
   file '/path/file2.mp3'
   EOF
   ffmpeg -f concat -safe 0 -i list.txt -c copy final.mp3
   ```
4. Convert to Opus for WhatsApp
5. Send as single voice message

**Important**: Don't mention "part 2" or "chapter" - keep it seamless.

## Multi-Speaker Dialogue

v3 can handle multiple characters in one generation:

```
Jessica: [whispers] Did you hear that?
Chris: [interrupting] —I heard it too!
Jessica: [panicking] We need to hide!
```

**Dialogue tags**: `[interrupting]`, `[overlapping]`, `[cuts in]`, `[interjecting]`

## Audio Tags Quick Reference

| Category | Tags |
|----------|------|
| **Emotions** | [excited], [happy], [sad], [angry], [nervous], [sarcastic], [curious] |
| **Delivery** | [whispers], [shouts], [pause], [rushed], [drawn out] |
| **Reactions** | [laughs], [sighs], [gasps], [clears throat], [gulps] |
| **Pacing** | [deliberate], [rapid-fire], [stammers], [hesitates], [breathes] |
| **Character** | [pirate voice], [French accent], [British accent], [robotic tone] |
| **Dialogue** | [interrupting], [overlapping], [cuts in] |

**Full tag list**: See [references/audio-tags.md](references/audio-tags.md)

## Troubleshooting

**Tags read aloud?**
- Verify using `eleven_v3` model
- Use IVC/premade voices, not PVC
- Simplify tags (no "tone" suffix)
- Increase text length (250+ chars)

**Voice inconsistent?**
- Segment is too long - split at <800 chars
- Regenerate (v3 is non-deterministic)
- Try lower stability setting

**WhatsApp won't play?**
- Convert to Opus format (see above)

**No emotion despite tags?**
- Voice may not match tag style
- Try Creative stability mode (0.5)
- Add more context around the tag
