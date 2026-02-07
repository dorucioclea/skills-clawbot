---
name: hotdog
description: "Hot dog or not? Classify food photos and battle Nemotron. Use when a user sends a food photo, asks if something is a hot dog, or says 'hotdog', '/hotdog', or 'hot dog battle'."
metadata: {"openclaw": {"emoji": "🌭", "requires": {"bins": ["curl"], "env": ["HOTDOG_BATTLE_TOKEN"]}}}
---

# Hot Dog or Not — Battle Skill

When a user sends a food photo, classify it and battle Nemotron.

## Text-only trigger (no photo)

If the user says "hotdog", "/hotdog", "hot dog", or asks about the hot dog battle **without sending a photo**, reply with this intro:

```
🌭 Hot Dog or Not — AI Vision Battle

Send me any food photo and I'll tell you if it's a hot dog! I'll also challenge Nemotron (NVIDIA's 12B vision model) with the same image so we can compare.

📸 Just send a photo to start
🏆 Live scoreboard: https://hotdogornot.xyz/battle

How it works:
1. You send a food photo
2. I analyze it and decide: hot dog or not?
3. Nemotron independently classifies the same image
4. We compare verdicts — who's right?
```

Then stop. Do NOT call the battle API without an image.

## With a photo — Battle Steps

### 1. Analyze the image

Use `image()` to look at the photo. Answer this question about the image:

> Is it a hot dog (food: a sausage served in a bun/roll; any cooking style)?

Think through it step by step:
1. **Observations**: Describe what you see — bun shape, sausage, condiments, toppings, plate, etc.
2. **Answer**: yes or no

Edge cases like corn dogs, bratwursts in buns, or deconstructed hot dogs should be considered hot dogs.

Set:
- `claw_answer`: "yes" or "no"
- `claw_reasoning`: your observations (what is visible and why it is or isn't a hot dog, 2-3 sentences)

### 2. Save the image to a temp file

```bash
exec: mktemp /tmp/hotdog_XXXXXX.jpg
```

Save the image data to this temp file path.

### 3. POST to the battle API

Send the image and your verdict to the battle API:

```bash
exec: curl -s -X POST "https://hotdogornot.xyz/api/battle/round" \
  -H "Authorization: Bearer ${HOTDOG_BATTLE_TOKEN}" \
  -F "image=@${TEMP_FILE}" \
  -F "claw_answer=${CLAW_ANSWER}" \
  -F "claw_reasoning=${CLAW_REASONING}"
```

The response is JSON with both verdicts:

```json
{
  "round_id": "abc123",
  "nemotron": { "answer": "yes", "reasoning": "...", "latency_ms": 1234 },
  "openclaw": { "answer": "no", "reasoning": "..." },
  "consensus": "disagree",
  "winner": "disagree"
}
```

### 4. Reply to the user

Format a nice reply with both verdicts:

```
🌭 Hot Dog Battle — Round #{round_id}

🦞 OpenClaw: {claw_answer}
   {claw_reasoning}

🤖 Nemotron: {nemotron.answer}
   {nemotron.reasoning}

{result emoji + text}
```

Result outcomes:
- Both say yes: "✅ Both agree — it's a hot dog!"
- Both say no: "✅ Both agree — not a hot dog!"
- Disagree: "⚔️ Disagreement! The battle continues..."

### 5. Clean up

```bash
exec: rm -f ${TEMP_FILE}
```

Delete the temp file after the API call completes.
