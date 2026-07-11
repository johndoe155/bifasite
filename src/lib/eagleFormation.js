// src/lib/eagleFormation.js
// ----------------------------------------------------------------------------
// The original 2D-canvas particle field arranged points into an eagle-wing
// silhouette using a simple angular sweep per wing, flattened onto the hero's
// 2D plane. It was, on its own terms, the nicest bespoke touch in the whole
// build — worth carrying forward rather than discarding for something
// unrelated just to say "3D" once more. This is the same sweep, given an
// actual third dimension: each wing now arcs backward in Z as it extends
// outward, so the silhouette reads as a real, camera-facing 3D form (wings
// sweeping back from a central body) rather than a flat card facing the
// viewer full-on.
export function eagleHome(i, count) {
  const half = Math.floor(count / 2);
  const onLeft = i < half;
  const localCount = onLeft ? half : count - half;
  const localI = onLeft ? i : i - half;
  const t = localI / Math.max(localCount - 1, 1);
  const side = onLeft ? -1 : 1;
  const angle = onLeft ? t * (Math.PI / 2) : (1 - t) * (Math.PI / 2);

  const spanX = 1.95;
  const spanY = 1.05;
  const spanZ = 1.1;

  const x = Math.cos(angle) * spanX * side;
  const y = Math.sin(angle) * -spanY + (1 - Math.abs(Math.cos(angle))) * 0.4 + 0.1;
  const z = -Math.sin(angle) * spanZ - 0.15;

  const jitterX = Math.sin(i * 12.9) * 0.045;
  const jitterY = Math.cos(i * 7.3) * 0.045;
  const jitterZ = Math.sin(i * 5.7) * 0.045;

  return [x + jitterX, y + jitterY, z + jitterZ];
}

export function buildEagleHomes(count) {
  const homes = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const [x, y, z] = eagleHome(i, count);
    homes[i * 3] = x;
    homes[i * 3 + 1] = y;
    homes[i * 3 + 2] = z;
  }
  return homes;
}
