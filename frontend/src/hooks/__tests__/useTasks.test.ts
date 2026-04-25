import { minLngForLat, hashCode, applyPrivacyOffset } from '../useTasks';

// Haversine distance in meters (for verifying offset magnitude)
function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── hashCode ────────────────────────────────────────────────────────────────
describe('hashCode', () => {
  it('returns a non-negative integer', () => {
    expect(hashCode('task-123')).toBeGreaterThanOrEqual(0);
  });

  it('is deterministic — same input always gives same result', () => {
    const id = 'some-task-id';
    expect(hashCode(id)).toBe(hashCode(id));
  });

  test.each(['abc', 'task-001', 'uuid-1234-abcd', ''])(
    'produces a number for input "%s"',
    (input) => {
      expect(typeof hashCode(input)).toBe('number');
    },
  );

  it('produces different values for different inputs', () => {
    expect(hashCode('task-1')).not.toBe(hashCode('task-2'));
  });
});

// ── minLngForLat ─────────────────────────────────────────────────────────────
describe('minLngForLat', () => {
  it('returns coastline lng for a lat within Israel range', () => {
    const lng = minLngForLat(32.0); // Tel Aviv latitude
    expect(lng).toBeGreaterThan(34);
    expect(lng).toBeLessThan(36);
  });

  it('clamps to southern endpoint below Eilat', () => {
    const lng = minLngForLat(28); // below Eilat
    expect(lng).toBe(minLngForLat(29.5)); // should equal the Eilat value
  });

  it('clamps to northern endpoint above Nahariya', () => {
    const lng = minLngForLat(35); // above northern tip
    expect(lng).toBe(minLngForLat(33.1)); // should equal the Nahariya value
  });

  test.each([29.5, 31.2, 32.0, 32.8, 33.1])(
    'interpolates correctly at lat %f',
    (lat) => {
      const result = minLngForLat(lat);
      expect(result).toBeGreaterThan(34);
      expect(result).toBeLessThan(36);
    },
  );
});

// ── applyPrivacyOffset ───────────────────────────────────────────────────────
describe('applyPrivacyOffset', () => {
  const TEL_AVIV = { lat: 32.08, lng: 34.78 };
  const JERUSALEM = { lat: 31.77, lng: 35.21 };
  const HAIFA = { lat: 32.79, lng: 34.99 };

  test.each([
    ['tel-aviv-task', TEL_AVIV],
    ['jerusalem-task', JERUSALEM],
    ['haifa-task', HAIFA],
  ])('offsets %s by between 10m and 50m', (id, { lat, lng }) => {
    const result = applyPrivacyOffset(lat, lng, id);
    const dist = haversineMeters(lat, lng, result.lat, result.lng);
    expect(dist).toBeGreaterThanOrEqual(9); // allow small float error
    expect(dist).toBeLessThanOrEqual(55);
  });

  it('is deterministic — same inputs always produce the same result', () => {
    const a = applyPrivacyOffset(32.08, 34.78, 'stable-id');
    const b = applyPrivacyOffset(32.08, 34.78, 'stable-id');
    expect(a.lat).toBe(b.lat);
    expect(a.lng).toBe(b.lng);
  });

  it('produces different offsets for different task IDs', () => {
    const a = applyPrivacyOffset(32.08, 34.78, 'id-one');
    const b = applyPrivacyOffset(32.08, 34.78, 'id-two');
    expect(a).not.toEqual(b);
  });

  it('never places a coastal city marker in the sea (lng >= coastline min)', () => {
    // Tel Aviv is close to the coast — offset must not push it west into the sea
    const result = applyPrivacyOffset(TEL_AVIV.lat, TEL_AVIV.lng, 'coastal-task');
    const coastMin = minLngForLat(result.lat);
    expect(result.lng).toBeGreaterThanOrEqual(coastMin);
  });

  test.each([
    ['inland-task-1', 32.08, 35.5],
    ['inland-task-2', 31.77, 35.21],
    ['inland-task-3', 32.5, 35.0],
  ])('inland location %s stays on land', (id, lat, lng) => {
    const result = applyPrivacyOffset(lat, lng, id);
    const coastMin = minLngForLat(result.lat);
    expect(result.lng).toBeGreaterThanOrEqual(coastMin);
  });
});
