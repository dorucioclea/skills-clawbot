# Monet AI SDK

AI content generation API for video, image and music.

## Features

- 🚀 **Async Task Creation** - Create tasks and poll for results
- 📡 **Streaming Support** - SSE-based streaming for real-time updates
- 🎬 **Video Generation** - Sora, Wan, Hailuo, Kling, Veo, Doubao and more
- 🖼️ **Image Generation** - GPT-4o, Flux, Imagen, Ideogram and more
- 🎵 **Music Generation** - Suno, Udio
- 🔒 **API Key Authentication** - Secure Bearer token auth

## Installation

```bash
npm install monet-ai
```

## Quick Start

```typescript
import { MonetAI } from "monet-ai";

const monet = new MonetAI({ 
  apiKey: process.env.MONET_API_KEY! 
});

// Create a video generation task
const task = await monet.createTask({
  type: "video",
  input: {
    model: "sora-2",
    prompt: "A cat running in the park",
    duration: 5,
    aspect_ratio: "16:9"
  }
});

console.log("Task ID:", task.id);
console.log("Status:", task.status);

// Poll for completion
while (task.status === "pending" || task.status === "processing") {
  await new Promise(r => setTimeout(r, 3000));
  task = await monet.getTask(task.id);
}

console.log("Result:", task.outputs);
```

## Getting API Key

1. Visit https://monet.vision to register an account
2. After login, go to https://monet.vision/skills/keys to create an API Key
3. Configure the API Key in environment variables or code

If you don't have an API Key, ask your owner to apply at monet.vision.

## API Reference

### Configuration

```typescript
const monet = new MonetAI({
  apiKey: "monet_xxx",    // Required: Your API key
  timeout: 60000          // Optional: Request timeout in ms (default: 60000)
});
```

### Create Task (Async)

Creates a task and returns immediately. Use `getTask()` to poll for results.

```typescript
const task = await monet.createTask({
  type: "video",                 // "video" | "image" | "music"
  input: {
    model: "sora-2",
    prompt: "A cat running in the park",
    duration: 5,
    aspect_ratio: "16:9",
    images: ["https://example.com/image1.jpg"]
  },
  idempotency_key: "unique-key-123"  // Optional but RECOMMENDED
});
```

> ⚠️ **Important**: `idempotency_key` is optional but **highly recommended**. Use a unique value (e.g., UUID) to prevent duplicate task creation if the request is retried. If the same `idempotency_key` is used within 24 hours, the API will return the existing task instead of creating a new one.

### Create Task (Sync/Stream)

Creates a task and returns a ReadableStream for real-time SSE updates.

```typescript
const stream = await monet.createTaskStream({
  type: "video",
  input: {
    model: "sora-2",
    prompt: "A cat running"
  }
});

const decoder = new TextDecoder();
for await (const chunk of stream) {
  const data = decoder.decode(chunk);
  console.log("SSE:", data);
}
```

### Get Task

```typescript
const task = await monet.getTask("task_id_here");
```

### List Tasks

```typescript
const list = await monet.listTasks({
  page: 1,
  pageSize: 20
});
```

## Supported Models

### Video Generation

#### Sora (OpenAI)

**sora-2**
```typescript
{
  model: "sora-2",                    // Required: literal type
  prompt: "A cat running in the park", // Required: string
  images?: string[],                   // Optional: reference images (URLs)
  duration?: 10 | 15,                 // Optional: number (10 or 15), default: 10
  aspect_ratio?: "16:9" | "9:16"       // Optional: "16:9" or "9:16"
}

// Example:
await monet.createTask({
  type: "video",
  input: {
    model: "sora-2",
    prompt: "A golden retriever running on the beach at sunset",
    duration: 15,
    aspect_ratio: "16:9"
  }
});
```

**sora-2-pro**
```typescript
{
  model: "sora-2-pro",                // Required: literal type
  prompt: "A cat running in the park", // Required: string
  images?: string[],                   // Optional: reference images
  duration?: 15 | 25,                 // Optional: number (15 or 25), default: 15
  aspect_ratio?: "16:9" | "9:16"       // Optional: "16:9" or "9:16"
}

// Example:
await monet.createTask({
  type: "video",
  input: {
    model: "sora-2-pro",
    prompt: "A futuristic city with flying cars",
    duration: 25,
    aspect_ratio: "16:9"
  }
});
```

---

#### Veo (Google)

**veo-3-1-fast**
```typescript
{
  model: "veo-3-1-fast",              // Required
  prompt: "A cat running",             // Required
  images?: string[],                   // Optional: reference images
  aspect_ratio?: "16:9" | "9:16"       // Optional
}
```

**veo-3-1**
```typescript
{
  model: "veo-3-1",                   // Required
  prompt: "A cat running",             // Required
  images?: string[],                   // Optional
  aspect_ratio?: "16:9" | "9:16"       // Optional
}
```

**veo-3-fast**
```typescript
{
  model: "veo-3-fast",                // Required
  prompt: "A cat running",             // Required
  images?: string[],                   // Optional
  negative_prompt?: string             // Optional: negative prompt
}
```

**veo-3**
```typescript
{
  model: "veo-3",                     // Required
  prompt: "A cat running",             // Required
  images?: string[],                   // Optional
  negative_prompt?: string             // Optional
}
```

---

#### Wan

**wan-2-6**
```typescript
{
  model: "wan-2-6",                   // Required
  prompt: "A cat running",             // Required
  images?: string[],                   // Optional
  duration?: 5 | 10 | 15,             // Optional: 5, 10, or 15 seconds
  resolution?: "720p" | "1080p",     // Optional
  aspect_ratio?: "16:9" | "9:16" | "4:3" | "3:4" | "1:1", // Optional
  shot_type?: "single" | "multi"       // Optional: single shot or multi-shot
}

// Example:
await monet.createTask({
  type: "video",
  input: {
    model: "wan-2-6",
    prompt: "A panda eating bamboo",
    duration: 10,
    resolution: "1080p",
    aspect_ratio: "16:9",
    shot_type: "single"
  }
});
```

**wan-2-5**
```typescript
{
  model: "wan-2-5",                   // Required
  prompt: "A cat running",             // Required
  images?: string[],                   // Optional
  duration?: 5 | 10,                  // Optional: 5 or 10 seconds, default: 5
  resolution?: "480p" | "720p" | "1080p", // Optional
  aspect_ratio?: "16:9" | "9:16" | "4:3" | "3:4" | "1:1" // Optional
}
```

**wan-2-2-flash**
```typescript
{
  model: "wan-2-2-flash",             // Required
  prompt: "A cat running",             // Required
  images?: string[],                   // Optional
  duration?: 5 | 10,                  // Optional
  resolution?: "480p" | "720p" | "1080p", // Optional
  negative_prompt?: string             // Optional
}
```

**wan-2-2**
```typescript
{
  model: "wan-2-2",                   // Required
  prompt: "A cat running",             // Required
  images?: string[],                   // Optional
  duration?: 5 | 10,                  // Optional
  resolution?: "480p" | "1080p",      // Optional
  aspect_ratio?: "16:9" | "9:16" | "4:3" | "3:4" | "1:1", // Optional
  negative_prompt?: string             // Optional
}
```

---

#### Kling

**kling-2-6**
```typescript
{
  model: "kling-2-6",                 // Required
  prompt: "A cat running",             // Required
  images?: string[],                   // Optional
  duration?: 5 | 10,                  // Optional: 5 or 10 seconds, default: 5
  aspect_ratio?: "1:1" | "16:9" | "9:16", // Optional
  generate_audio?: boolean             // Optional: whether to generate audio
}

// Example:
await monet.createTask({
  type: "video",
  input: {
    model: "kling-2-6",
    prompt: "A person walking in the rain",
    duration: 10,
    aspect_ratio: "16:9",
    generate_audio: true
  }
});
```

**kling-2-5**
```typescript
{
  model: "kling-2-5",                 // Required
  prompt: "A cat running",             // Required
  images?: string[],                   // Optional
  duration?: 5 | 10,                  // Optional
  aspect_ratio?: "1:1" | "16:9" | "9:16", // Optional
  negative_prompt?: string             // Optional
}
```

**kling-v2-1-master**
```typescript
{
  model: "kling-v2-1-master",         // Required
  prompt: "A cat running",             // Required
  images?: string[],                   // Optional
  duration?: 5 | 10,                  // Optional
  aspect_ratio?: "1:1" | "16:9" | "9:16", // Optional
  strength?: number,                   // Optional: 0-1, controls generation strength
  negative_prompt?: string             // Optional
}

// Example:
await monet.createTask({
  type: "video",
  input: {
    model: "kling-v2-1-master",
    prompt: "A dancer performing ballet",
    duration: 10,
    strength: 0.8,
    negative_prompt: "blurry, low quality"
  }
});
```

**kling-v2-1**
```typescript
{
  model: "kling-v2-1",                 // Required
  prompt: "A cat running",             // Required
  images?: string[],                   // Optional
  duration?: 5 | 10,                  // Optional
  aspect_ratio?: "1:1" | "16:9" | "9:16", // Optional
  strength?: number,                   // Optional
  negative_prompt?: string             // Optional
}
```

**kling-v2**
```typescript
{
  model: "kling-v2",                   // Required
  prompt: "A cat running",             // Required
  images?: string[],                   // Optional
  duration?: 5 | 10,                  // Optional
  aspect_ratio?: "1:1" | "16:9" | "9:16", // Optional
  strength?: number,                   // Optional
  negative_prompt?: string             // Optional
}
```

---

#### Hailuo

**hailuo-2-3**
```typescript
{
  model: "hailuo-2-3",                 // Required
  prompt: "A cat running",             // Required
  images?: string[],                   // Optional
  duration?: 6 | 10,                  // Optional: 6 or 10 seconds, default: 6
  resolution?: "768p" | "1080p"       // Optional
}
```

**hailuo-2-3-fast**
```typescript
{
  model: "hailuo-2-3-fast",           // Required
  prompt: "A cat running",             // Required
  images?: string[],                   // Optional
  duration?: 6 | 10,                  // Optional
  resolution?: "768p" | "1080p"       // Optional
}
```

**hailuo-02**
```typescript
{
  model: "hailuo-02",                 // Required
  prompt: "A cat running",             // Required
  images?: string[],                   // Optional
  duration?: 6 | 10,                  // Optional
  resolution?: "768p" | "1080p"       // Optional
}
```

**hailuo-01-live2d**
```typescript
{
  model: "hailuo-01-live2d",          // Required
  prompt: "A cat running",             // Required
  images?: string[]                    // Optional
}
```

**hailuo-01**
```typescript
{
  model: "hailuo-01",                 // Required
  prompt: "A cat running",             // Required
  images?: string[]                    // Optional
}
```

---

#### Doubao Seedance

**doubao-seedance-1-5-pro**
```typescript
{
  model: "doubao-seedance-1-5-pro",   // Required
  prompt: "A cat running",             // Required
  images?: string[],                   // Optional
  duration?: number,                   // Optional: custom duration in seconds
  resolution?: "480p" | "720p",       // Optional
  aspect_ratio?: "1:1" | "4:3" | "16:9" | "3:4" | "9:16" | "21:9", // Optional
  generate_audio?: boolean             // Optional
}
```

**doubao-seedance-1-0-pro-fast**
```typescript
{
  model: "doubao-seedance-1-0-pro-fast", // Required
  prompt: "A cat running",             // Required
  images?: string[],                   // Optional
  duration?: number,                   // Optional
  resolution?: "720p" | "1080p",      // Optional
  aspect_ratio?: "1:1" | "4:3" | "16:9" | "3:4" | "9:16" | "21:9" // Optional
}
```

**doubao-seedance-1-0-pro**
```typescript
{
  model: "doubao-seedance-1-0-pro",   // Required
  prompt: "A cat running",             // Required
  images?: string[],                   // Optional
  duration?: 5 | 10,                  // Optional
  resolution?: "480p" | "1080p",      // Optional
  aspect_ratio?: "1:1" | "4:3" | "16:9" | "3:4" | "9:16" // Optional
}
```

**doubao-seedance-1-0-lite**
```typescript
{
  model: "doubao-seedance-1-0-lite", // Required
  prompt: "A cat running",             // Required
  images?: string[],                   // Optional
  duration?: 5 | 10,                  // Optional
  resolution?: "480p" | "720p" | "1080p" // Optional
}
```

---

#### Special Features

**kling-motion-control** (动作控制)
```typescript
{
  model: "kling-motion-control",       // Required
  prompt: "Detailed action description", // Required: must describe the motion
  images: string[],                    // Required: at least 1 reference image
  videos: string[],                    // Required: at least 1 reference video
  resolution?: "720p" | "1080p"       // Optional
}

// Example:
await monet.createTask({
  type: "video",
  input: {
    model: "kling-motion-control",
    prompt: "Person walking forward with arms swinging",
    images: ["https://example.com/person.jpg"],
    videos: ["https://example.com/motion.mp4"],
    resolution: "1080p"
  }
});
```

**runway-act-two** (动作迁移)
```typescript
{
  model: "runway-act-two",             // Required
  images: string[],                    // Required: at least 1
  videos: string[],                    // Required: at least 1
  aspect_ratio?: "1:1" | "4:3" | "16:9" | "3:4" | "9:16" | "21:9" // Optional
}
```

**wan-animate-mix** (视频换人)
```typescript
{
  model: "wan-animate-mix",            // Required
  videos: string[],                    // Required: original video
  images: string[]                     // Required: reference character image
}
```

**wan-animate-mix-pro**
```typescript
{
  model: "wan-animate-mix-pro",        // Required
  videos: string[],                    // Required
  images: string[]                     // Required
}
```

**wan-animate-move** (动作迁移)
```typescript
{
  model: "wan-animate-move",           // Required
  videos: string[],                    // Required: motion reference video
  images: string[]                      // Required: target character image
}
```

**wan-animate-move-pro**
```typescript
{
  model: "wan-animate-move-pro",       // Required
  videos: string[],                    // Required
  images: string[]                      // Required
}
```

---

### Image Generation

#### GPT (OpenAI)

**gpt-4o**
```typescript
{
  model: "gpt-4o",                    // Required
  prompt: "A cute cat",                // Required
  images?: string[],                   // Optional: reference images
  aspect_ratio?: "1:1" | "4:3" | "3:2" | "16:9" | "3:4" | "2:3" | "9:16", // Optional
  style?: string                        // Optional: custom style
}

// Example:
await monet.createTask({
  type: "image",
  input: {
    model: "gpt-4o",
    prompt: "A cute orange cat sitting on a windowsill",
    aspect_ratio: "16:9",
    style: "natural"
  }
});
```

**gpt-image-1-5**
```typescript
{
  model: "gpt-image-1-5",             // Required
  prompt: "A cute cat",                // Required
  images?: string[],                   // Optional: max 10 reference images
  aspect_ratio?: "1:1" | "3:2" | "2:3", // Optional
  quality?: "auto" | "low" | "medium" | "high" // Optional
}
```

---

#### Nano Banana

**nano-banana-1**
```typescript
{
  model: "nano-banana-1",              // Required
  prompt: "A cute cat",                // Required
  images?: string[],                   // Optional: max 5 reference images
  aspect_ratio?: "1:1" | "2:3" | "3:2" | "4:3" | "3:4" | "16:9" | "9:16" // Optional
}
```

**nano-banana-2**
```typescript
{
  model: "nano-banana-2",              // Required
  prompt: "A cute cat",                // Required
  images?: string[],                   // Optional: max 14 reference images
  aspect_ratio?: "1:1" | "2:3" | "3:2" | "4:3" | "3:4" | "4:5" | "5:4" | "16:9" | "9:16" | "21:9", // Optional
  resolution?: "1K" | "2K" | "4K"     // Optional: output resolution
}

// Example:
await monet.createTask({
  type: "image",
  input: {
    model: "nano-banana-2",
    prompt: "A futuristic cityscape",
    images: ["https://example.com/ref1.jpg", "https://example.com/ref2.jpg"],
    aspect_ratio: "16:9",
    resolution: "4K"
  }
});
```

---

#### Wan

**wan-i-2-6**
```typescript
{
  model: "wan-i-2-6",                  // Required
  prompt: "A cute cat",                // Required
  images?: string[],                   // Optional: max 4 reference images
  aspect_ratio?: "1:1" | "4:3" | "3:2" | "16:9" | "3:4" | "2:3" | "9:16" | "21:9" // Optional
}
```

**wan-2-5**
```typescript
{
  model: "wan-2-5",                   // Required
  prompt: "A cute cat",                // Required
  images?: string[],                   // Optional: max 2 reference images
  aspect_ratio?: "1:1" | "4:3" | "3:2" | "16:9" | "3:4" | "2:3" | "9:16" | "21:9" // Optional
}
```

---

#### Flux

**flux-2-dev**
```typescript
{
  model: "flux-2-dev",                // Required
  prompt: "A cute cat",                // Required
  aspect_ratio?: "1:1" | "4:3" | "3:2" | "16:9" | "3:4" | "2:3" | "9:16" // Optional
}
```

**flux-kontext-pro**
```typescript
{
  model: "flux-kontext-pro",           // Required
  prompt: "A cute cat",                // Required
  images?: string[],                   // Optional
  aspect_ratio?: "1:1" | "4:3" | "3:2" | "16:9" | "3:4" | "2:3" | "9:16", // Optional
  style?: string                       // Optional
}
```

**flux-kontext-max**
```typescript
{
  model: "flux-kontext-max",           // Required
  prompt: "A cute cat",                // Required
  images?: string[],                   // Optional
  aspect_ratio?: "1:1" | "4:3" | "3:2" | "16:9" | "3:4" | "2:3" | "9:16", // Optional
  style?: string                       // Optional
}
```

**flux-1-schnell**
```typescript
{
  model: "flux-1-schnell",             // Required
  prompt: "A cute cat"                 // Required: only prompt is available
}
```

---

#### Imagen (Google)

**imagen-3-0**
```typescript
{
  model: "imagen-3-0",                // Required
  prompt: "A cute cat",                // Required
  aspect_ratio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9", // Optional
  style?: string                       // Optional
}
```

**imagen-4-0**
```typescript
{
  model: "imagen-4-0",                // Required
  prompt: "A cute cat",                // Required
  aspect_ratio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9", // Optional
  style?: string                       // Optional
}
```

---

#### Ideogram

**ideogram-v2**
```typescript
{
  model: "ideogram-v2",                // Required
  prompt: "A cute cat",                // Required
  aspect_ratio?: "1:1" | "4:3" | "3:2" | "16:9" | "3:4" | "2:3" | "9:16", // Optional
  style?: string                       // Optional
}
```

**ideogram-v3**
```typescript
{
  model: "ideogram-v3",                // Required
  prompt: "A cute cat",                // Required
  aspect_ratio?: "1:1" | "4:3" | "3:2" | "16:9" | "3:4" | "2:3" | "9:16", // Optional
  style?: string                       // Optional
}
```

---

#### Others

**seedream-4-0**
```typescript
{
  model: "seedream-4-0",              // Required
  prompt: "A cute cat",                // Required
  images?: string[],                   // Optional: max 10 reference images
  aspect_ratio?: "1:1" | "4:3" | "3:2" | "16:9" | "3:4" | "2:3" | "9:16" // Optional
}
```

**stability-1-0**
```typescript
{
  model: "stability-1-0",             // Required
  prompt: "A cute cat",                // Required
  aspect_ratio?: "1:1" | "4:3" | "3:2" | "16:9" | "3:4" | "2:3" | "9:16", // Optional
  style?: string,                      // Optional
  negative_prompt?: string             // Optional: negative prompt
}
```

---

### Music Generation

**suno-3.5**
```typescript
{
  model: "suno-3.5",                  // Required
  prompt: "Upbeat pop song with catchy melody" // Required: music description
}

// Example:
await monet.createTask({
  type: "music",
  input: {
    model: "suno-3.5",
    prompt: "A relaxing acoustic guitar song with birds chirping, peaceful morning vibe"
  }
});
```

**udio-v1-6**
```typescript
{
  model: "udio-v1-6",                 // Required
  prompt: "Upbeat pop song"            // Required
}
```

---

## Error Handling

```typescript
try {
  const task = await monet.createTask({
    type: "video",
    input: { model: "sora-2", prompt: "test" }
  });
} catch (error) {
  console.error("Error:", error.message);
  // Common errors:
  // - "unauthorized": Invalid or missing API key
  // - "VALIDATION_ERROR": Invalid input parameters
  // - "not_found": Task not found
}
```

## TypeScript Support

```typescript
import { MonetAI, Task, TaskStatus } from "monet-ai";
```

## License

MIT

## curl Examples

### Create Video Task

```bash
curl -X POST https://monet.vision/api/v1/tasks/async \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer monet_xxx" \
  -d '{
    "type": "video",
    "input": {
      "model": "sora-2",
      "prompt": "A cat running in the park",
      "duration": 5,
      "aspect_ratio": "16:9"
    }
  }'
```

### Create Image Task

```bash
curl -X POST https://monet.vision/api/v1/tasks/async \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer monet_xxx" \
  -d '{
    "type": "image",
    "input": {
      "model": "gpt-4o",
      "prompt": "A cute cat",
      "aspect_ratio": "16:9"
    }
  }'
```

### Create Music Task

```bash
curl -X POST https://monet.vision/api/v1/tasks/async \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer monet_xxx" \
  -d '{
    "type": "music",
    "input": {
      "model": "suno-3.5",
      "prompt": "Upbeat pop song"
    }
  }'
```

### Get Task

```bash
curl https://monet.vision/api/v1/tasks/task_id \
  -H "Authorization: Bearer monet_xxx"
```

### List Tasks

```bash
curl "https://monet.vision/api/v1/tasks/list?page=1" \
  -H "Authorization: Bearer monet_xxx"
```
