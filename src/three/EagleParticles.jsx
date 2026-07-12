import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { buildEagleHomes } from '../lib/eagleFormation.js';

// ----------------------------------------------------------------------------
// Redesigned from a "snap into an eagle shape" point cloud into something
// closer to dust motes settling in still, warm-lit air. Two changes carry
// almost all of the new feel:
//
// 1. Physics: the spring constant dropped by ~4x and damping is now strong
//    enough that the system is close to critically damped rather than
//    underdamped — velocity dies out before it can build up enough to
//    overshoot and oscillate. Concretely: weak pull + strong drag = smooth
//    monotonic drift toward the target, never a springy snap. The pointer
//    repel force is a gentle eddy now, not a scatter.
// 2. Rendering: one muted warm-gray colour (no more brass/paper two-tone —
//    true monochrome), smaller point sizes, and a much lower opacity
//    ceiling, so no cluster of overlapping, additively-blended points can
//    sum past a soft glow into blown-out white.
// ----------------------------------------------------------------------------

const VERTEX_SHADER = `
  attribute float aSize;
  varying float vFade;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = -mvPosition.z;
    gl_PointSize = aSize * (6.0 / max(dist, 0.001));
    float depthFade = smoothstep(3.0, 9.0, dist);
    vFade = 1.0 - depthFade * 0.7;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// A fully soft radial falloff (smoothstep from the point's centre all the
// way to its edge, no near-hard disc in the middle as before) — this alone
// is a large part of why these now read as fine, soft motes instead of
// little glowing discs.
const FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFade;
  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    float soft = smoothstep(0.5, 0.0, d);
    float alpha = soft * vFade * uOpacity;
    if (alpha < 0.008) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

const COUNT = 240;
// A single desaturated warm gray — deliberately monochrome. Tune this one
// value to shift the whole swarm's tone; there is nowhere else to change it.
const PARTICLE_COLOR = new THREE.Color('#b7ad9c');
// Ceiling on any single point's alpha. Kept well below 1 specifically so
// that additive overlap between several overlapping points still can't sum
// to pure white — see the note on tone mapping in SealScene.jsx for the
// complementary, scene-wide half of this.
const OPACITY_CEILING = 0.34;

// Overdamped "still air" physics: weak spring, strong drag.
const SPRING = 0.85;
const DAMPING_HALF_LIFE = 0.16;
const REPEL_RADIUS = 0.95;
const REPEL_STRENGTH = 1.7;

export default function EagleParticles() {
  const pointsRef = useRef(null);
  const { raycaster, pointer, camera } = useThree();

  const { positions, velocities, homes, sizes, plane, hitPoint, uniforms } = useMemo(() => {
    const homes = buildEagleHomes(COUNT);
    const positions = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);

    for (let i = 0; i < COUNT; i++) {
      // Start scattered; the (now much gentler) spring lets them drift into
      // formation over several seconds rather than snapping together.
      positions[i * 3] = (Math.random() - 0.5) * 7.5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 7.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4.5;
      // Ultra-fine: roughly half the pixel size of the previous version.
      sizes[i] = (1.3 + Math.random() * 2.1) * dpr;
    }

    return {
      positions,
      velocities,
      homes,
      sizes,
      plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
      hitPoint: new THREE.Vector3(),
      uniforms: {
        uColor: { value: PARTICLE_COLOR },
        uOpacity: { value: OPACITY_CEILING },
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_state, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 15);
    const geometry = pointsRef.current?.geometry;
    if (!geometry) return;
    const posAttr = geometry.attributes.position;
    const arr = posAttr.array;

    raycaster.setFromCamera(pointer, camera);
    const hasHit = raycaster.ray.intersectPlane(plane, hitPoint);

    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      const iz = ix + 2;

      let ax = (homes[ix] - arr[ix]) * SPRING;
      let ay = (homes[iy] - arr[iy]) * SPRING;
      let az = (homes[iz] - arr[iz]) * SPRING;

      if (hasHit) {
        const dx = arr[ix] - hitPoint.x;
        const dy = arr[iy] - hitPoint.y;
        const dz = arr[iz] - hitPoint.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < REPEL_RADIUS * REPEL_RADIUS) {
          const dist = Math.sqrt(distSq) || 0.001;
          const force = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
          ax += (dx / dist) * force;
          ay += (dy / dist) * force;
          az += (dz / dist) * force;
        }
      }

      velocities[ix] += ax * dt;
      velocities[iy] += ay * dt;
      velocities[iz] += az * dt;

      const damp = Math.pow(2, -dt / DAMPING_HALF_LIFE);
      velocities[ix] *= damp;
      velocities[iy] *= damp;
      velocities[iz] *= damp;

      arr[ix] += velocities[ix] * dt;
      arr[iy] += velocities[iy] * dt;
      arr[iz] += velocities[iz] * dt;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
