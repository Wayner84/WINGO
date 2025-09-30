import { describe, expect, it } from 'vitest';
import { SeededRng } from '../src/engine';

describe('SeededRng', () => {
  it('produces deterministic sequences for identical seeds', () => {
    const rngA = new SeededRng(12345);
    const rngB = new SeededRng(12345);
    const seqA = Array.from({ length: 10 }, () => rngA.next());
    const seqB = Array.from({ length: 10 }, () => rngB.next());
    expect(seqA).toEqual(seqB);
  });

  it('shuffles arrays deterministically with same seed', () => {
    const base = [1, 2, 3, 4, 5, 6];
    const rngA = new SeededRng(9);
    const rngB = new SeededRng(9);
    const shuffleA = rngA.shuffle([...base]);
    const shuffleB = rngB.shuffle([...base]);
    expect(shuffleA).toEqual(shuffleB);
    expect(shuffleA).not.toEqual(base);
  });
});
