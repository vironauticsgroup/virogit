export interface AcquireLockOptions {
  staleMs?: number;
  retryDelayMs?: number;
  maxAttempts?: number;
}

export function acquireLock(lockPath: string, opts?: AcquireLockOptions): () => void;
