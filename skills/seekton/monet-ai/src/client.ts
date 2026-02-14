import type {
  MonetAIConfig,
  TaskType,
  Task,
  TaskList,
  MonetAIError,
} from "./types.js";

interface CreateTaskOptions {
  type: TaskType;
  input: Record<string, unknown>;
  idempotencyKey?: string;
}

interface ListTasksOptions {
  page?: number;
  pageSize?: number;
}

export class MonetAIClient {
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly baseUrl = "https://monet.vision";

  constructor(config: MonetAIConfig) {
    if (!config.apiKey || !config.apiKey.startsWith("monet_")) {
      throw new Error("Invalid API key format. Must start with 'monet_'");
    }
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 60000;
  }

  /**
   * Create a task asynchronously (returns immediately with task ID)
   */
  async createTask(options: CreateTaskOptions): Promise<Task> {
    const response = await this.request<Task>("/api/v1/tasks/async", {
      method: "POST",
      body: JSON.stringify({
        type: options.type,
        input: options.input,
        idempotency_key: options.idempotencyKey,
      }),
    });
    return response;
  }

  /**
   * Create a task with streaming (SSE) - waits for completion
   */
  async createTaskStream(
    options: CreateTaskOptions
  ): Promise<ReadableStream> {
    const response = await fetch(`${this.baseUrl}/api/v1/tasks/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        type: options.type,
        input: options.input,
        idempotency_key: options.idempotencyKey,
      }),
    });

    if (!response.ok || !response.body) {
      const error = await this.parseError(response);
      throw new Error(error.message || "Failed to create streaming task");
    }

    return response.body;
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: string): Promise<Task> {
    return await this.request<Task>(`/api/v1/tasks/${taskId}`);
  }

  /**
   * List tasks with pagination
   */
  async listTasks(options: ListTasksOptions = {}): Promise<TaskList> {
    const params = new URLSearchParams();
    if (options.page) params.set("page", String(options.page));
    if (options.pageSize) params.set("pageSize", String(options.pageSize));

    const query = params.toString();
    const path = query 
      ? `/api/v1/tasks/list?${query}` 
      : "/api/v1/tasks/list";

    return await this.request<TaskList>(path);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    // Prepare request options
    const requestInit: RequestInit = {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...init?.headers,
      },
    };

    // Serialize body if it's an object
    if (init?.body && typeof init.body === "object" && !(init.body instanceof FormData)) {
      requestInit.body = JSON.stringify(init.body);
    }

    try {
      const response = await fetch(`${this.baseUrl}${path}`, requestInit);

      if (!response.ok) {
        const error = await this.parseError(response);
        throw new Error(error.message || `Request failed with status ${response.status}`);
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async parseError(response: Response): Promise<MonetAIError> {
    try {
      const data = await response.json() as { error?: MonetAIError };
      return data.error || { code: "unknown", message: response.statusText };
    } catch {
      return { code: "unknown", message: response.statusText };
    }
  }
}

/**
 * Default export for convenience
 */
export default MonetAIClient;
