import type { RequestHandler, Response } from 'express';
import type { Clock } from '../domain/clock.ts';

/**
 * Adds `Server-Timing: app;dur=<ms>` to every API response: the time from this middleware
 * to the response headers, so measurements can tell server time from network time. The
 * first request on an instance also carries `cold`; its time includes the database
 * preparation (docs/performance.md). Mounted first, once per app, so once per instance.
 */
export function serverTiming(clock: Clock): RequestHandler {
  let first = true;
  return (_req, res, next) => {
    const start = clock.now();
    const cold = first;
    first = false;
    const writeHead = res.writeHead;
    res.writeHead = function (this: Response, ...args: Parameters<Response['writeHead']>) {
      const metrics = [`app;dur=${Math.round(clock.now() - start)}`];
      if (cold) metrics.push('cold;desc="first request on this instance"');
      this.setHeader('Server-Timing', metrics.join(', '));
      return writeHead.apply(this, args);
    } as Response['writeHead'];
    next();
  };
}
