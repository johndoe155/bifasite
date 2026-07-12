import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { buildEagleHomes } from '../lib/eagleFormation.js';

// ----------------------------------------------------------------------------
// The original hero had a 2D canvas particle field (140 points, spring-to-home
// + pointer-repel physics) drawing an eagle-wing silhouette *behind* a
// separate vanilla-Three.js medallion — two different rendering technologies
// bolted together, sharing an anchor point only approximately. This is the
// same spring/repel physics, ported wholesale (SPRING/DAMPING/REPEL constants
// map directly), but as real points living in the same scene, same camera,
// same lights as the medallion — so it's one composition, not two.
// ----------------------------------------------------------------------------

const VERTEX_SHADER = `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = -mvPosition.z;
    gl_PointSize = aSize * (6.0 / max(dist, 0.001));
    float t = smoothstep(3.0, 9.0, dist);
    vFade = 1.0 - t * 0.65;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vFade;
  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    float alpha = smoothstep(0.5, 0.02, d) * vFade;
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

const COUNT = 170;
const BRASS = new THREE.Color('#e7be5a');
const PAPER = new THREE.Color('#f3ecda');

// Same spring/damping/repel shape as the original's 2D field, retuned for
// world units instead of pixels.
const SPRING = 3.4;
const DAMPING_HALF_LIFE = 0.22;
const REPEL_RADIUS = 1.15;
const REPEL_STRENGTH = 5.2;

export default function EagleParticles() {
  const pointsRef = useRef(null);
  const { raycaster, pointer, camera } = useThree();

  const { positions, velocities, homes, sizes, colors, plane, hitPoint } = useMemo(() => {
    const homes = buildEagleHomes(COUNT);
    const positions = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    const colors = new Float32Array(COUNT * 3);
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);

    for (let i = 0; i < COUNT; i++) {
      // Particles start scattered and spring into the eagle formation on
      // mount, rather than appearing already-formed.
      positions[i * 3] = (Math.random() - 0.5) * 7;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 7;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
      sizes[i] = (3 + Math.random() * 5) * dpr;
      const c = i % 6 === 0 ? BRASS : PAPER;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    return {
      positions,
      velocities,
      homes,
      sizes,
      colors,
      plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
      hitPoint: new THREE.Vector3(),
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
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
