const fs = require('fs');

function sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    // Atomics.wait unavailable; fall back to a bounded busy-wait.
    const until = Date.now() + ms;
    while (Date.now() < until) {
      /* spin */
    }
  }
}

/**
 * Synchronously acquires an exclusive-create lock file, retrying with a short backoff while
 * it's held, and stealing it if it looks abandoned (a previous process crashed while holding
 * it). Returns a release function. Kept synchronous so every existing store call site (which
 * calls upsertProfile/removeProfile/setActiveProfileName without await) keeps working unchanged.
 */
function acquireLock(lockPath, opts = {}) {
  const staleMs = opts.staleMs ?? 5000;
  const retryDelayMs = opts.retryDelayMs ?? 20;
  // Bounded well under staleMs, and kept small since acquireLock blocks its whole process
  // synchronously (including the VS Code extension host) for as long as it waits.
  const maxAttempts = opts.maxAttempts ?? 60;

  let attempts = 0;
  for (;;) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      fs.writeSync(fd, String(process.pid));
      fs.closeSync(fd);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        try {
          fs.unlinkSync(lockPath);
        } catch {
          // already gone; fine
        }
      };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;

      let stale = false;
      try {
        const stat = fs.statSync(lockPath);
        stale = Date.now() - stat.mtimeMs > staleMs;
      } catch {
        continue; // lock vanished between the failed open and this stat; just retry
      }

      if (stale) {
        try {
          fs.unlinkSync(lockPath);
        } catch {
          // someone else already cleaned it up
        }
        continue;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error(
          `Timed out waiting for lock at "${lockPath}". If no other virogit process is running, delete this file and try again.`
        );
      }
      sleepSync(retryDelayMs);
    }
  }
}

module.exports = { acquireLock };
