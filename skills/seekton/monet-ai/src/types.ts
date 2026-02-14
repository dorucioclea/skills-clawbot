// ============ Configuration ============

export interface MonetAIConfig {
  /** API Key for authentication (starts with monet_) */
  apiKey: string;
  /** Request timeout in ms (default: 60000) */
  timeout?: number;
}

// ============ Task Types ============

export type TaskType = "video" | "image" | "music";

export type TaskStatus = 
  | "pending" 
  | "processing" 
  | "completed" 
  | "failed";

// ============ Input Types ============

export interface VideoInput {
  model: string;
  prompt?: string;
  duration?: number;
  aspectRatio?: string;
  images?: string[];
  videos?: string[];
}

export interface ImageInput {
  model: string;
  prompt?: string;
  aspectRatio?: string;
  style?: string;
  quality?: string;
  images?: string[];
}

export interface MusicInput {
  model: string;
  prompt?: string;
}

export type TaskInput = VideoInput | ImageInput | MusicInput;

// ============ Output Types ============

export interface Output {
  model: string;
  status: string;
  progress: number;
  url?: string;
}

// ============ Task Types ============

export interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  idempotency_key?: string;
  input: Record<string, unknown>;
  outputs: Output[];
  created_at: string;
  updated_at: string;
}

export interface TaskList {
  items: Task[];
  page: number;
  pageSize: number;
  total: number;
}

// ============ Error Types ============

export interface MonetAIError {
  code: string;
  message: string;
}
