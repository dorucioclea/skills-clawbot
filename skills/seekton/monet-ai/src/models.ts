// ============ Model Constants ============

/** Available video generation models */
export const VIDEO_MODELS = {
  // Sora
  SORA_2: "sora-2",
  SORA_2_PRO: "sora-2-pro",
  // Veo
  VEO_3_1_FAST: "veo-3-1-fast",
  VEO_3_1: "veo-3-1",
  VEO_3_FAST: "veo-3-fast",
  VEO_3: "veo-3",
  // Wan
  WAN_2_6: "wan-2-6",
  WAN_2_5: "wan-2-5",
  WAN_2_2_FLASH: "wan-2-2-flash",
  WAN_2_2: "wan-2-2",
  // Kling
  KLING_2_6: "kling-2-6",
  KLING_2_5: "kling-2-5",
  KLING_V2_1_MASTER: "kling-v2-1-master",
  KLING_V2_1: "kling-v2-1",
  KLING_V2: "kling-v2",
  // Hailuo
  HAILUO_2_3: "hailuo-2-3",
  HAILUO_2_3_FAST: "hailuo-2-3-fast",
  HAILUO_02: "hailuo-02",
  HAILUO_01_LIVE2D: "hailuo-01-live2d",
  HAILUO_01: "hailuo-01",
  // Doubao Seedance
  DOUBAO_SEEDANCE_1_5_PRO: "doubao-seedance-1-5-pro",
  DOUBAO_SEEDANCE_1_0_PRO_FAST: "doubao-seedance-1-0-pro-fast",
  DOUBAO_SEEDANCE_1_0_PRO: "doubao-seedance-1-0-pro",
  DOUBAO_SEEDANCE_1_0_LITE: "doubao-seedance-1-0-lite",
  // Special
  KLING_MOTION_CONTROL: "kling-motion-control",
  RUNWAY_ACT_TWO: "runway-act-two",
  WAN_ANIMATE_MIX: "wan-animate-mix",
  WAN_ANIMATE_MIX_PRO: "wan-animate-mix-pro",
  WAN_ANIMATE_MOVE: "wan-animate-move",
  WAN_ANIMATE_MOVE_PRO: "wan-animate-move-pro",
} as const;

/** Available image generation models */
export const IMAGE_MODELS = {
  // GPT
  GPT_4O: "gpt-4o",
  GPT_IMAGE_1_5: "gpt-image-1-5",
  // Nano Banana
  NANO_BANANA_1: "nano-banana-1",
  NANO_BANANA_2: "nano-banana-2",
  // Wan
  WAN_I_2_6: "wan-i-2-6",
  WAN_2_5: "wan-2-5",
  // Flux
  FLUX_2_DEV: "flux-2-dev",
  FLUX_KONTEXT_PRO: "flux-kontext-pro",
  FLUX_KONTEXT_MAX: "flux-kontext-max",
  FLUX_1_SCHNELL: "flux-1-schnell",
  // Imagen
  IMAGEN_3_0: "imagen-3-0",
  IMAGEN_4_0: "imagen-4-0",
  // Ideogram
  IDEOGRAM_V2: "ideogram-v2",
  IDEOGRAM_V3: "ideogram-v3",
  // Others
  SEEDREAM_4_0: "seedream-4-0",
  STABILITY_1_0: "stability-1-0",
} as const;

/** Available music generation models */
export const MUSIC_MODELS = {
  SUNO_3_5: "suno-3.5",
  UDIO_V1_6: "udio-v1-6",
} as const;

/** All supported models */
export const ALL_MODELS = {
  ...VIDEO_MODELS,
  ...IMAGE_MODELS,
  ...MUSIC_MODELS,
} as const;

/** Model lists by type */
export const MODELS_BY_TYPE = {
  video: Object.values(VIDEO_MODELS),
  image: Object.values(IMAGE_MODELS),
  music: Object.values(MUSIC_MODELS),
} as const;
