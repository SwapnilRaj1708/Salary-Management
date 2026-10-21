import { describe, expect, it } from 'vitest';
import { createAppTheme, MOTION_CEILING_MS } from './theme.ts';

describe('createAppTheme', () => {
  it("follows the operating system's reduce-motion setting by default", () => {
    expect(createAppTheme().motion.reducedMotion).toBe('system');
  });

  it('can always reduce motion, which tests use to finish transitions immediately', () => {
    expect(createAppTheme({ reducedMotion: 'always' }).motion.reducedMotion).toBe('always');
  });

  it('keeps every transition duration at or under the motion ceiling', () => {
    const durations = Object.values(createAppTheme().transitions.duration);

    expect(durations.length).toBeGreaterThan(0);
    for (const duration of durations) {
      expect(duration).toBeLessThanOrEqual(MOTION_CEILING_MS);
    }
  });

  it('adds the Material 3 emphasized easings for our own enter and exit motion', () => {
    const { easing } = createAppTheme().transitions;

    expect(easing.emphasizedDecelerate).toBe('cubic-bezier(0.05, 0.7, 0.1, 1)');
    expect(easing.emphasizedAccelerate).toBe('cubic-bezier(0.3, 0, 0.8, 0.15)');
  });
});
