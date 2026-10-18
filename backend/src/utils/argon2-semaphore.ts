/**
 * In-memory semaphore to throttle concurrent Argon2id operations (ADR-003).
 * Limits memory spikes to at most 4 * 64 MB = 256 MB on the host.
 */
class Semaphore {
  private current = 0;
  private queue: (() => void)[] = [];

  constructor(private readonly maxConcurrency: number) {}

  public async acquire(): Promise<void> {
    if (this.current < this.maxConcurrency) {
      this.current++;
      return;
    }

    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.current++;
        resolve();
      });
    });
  }

  public release(): void {
    this.current--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    }
  }

  public async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

export const argon2Semaphore = new Semaphore(4);

export async function withArgon2Semaphore<T>(fn: () => Promise<T>): Promise<T> {
  return argon2Semaphore.run(fn);
}
