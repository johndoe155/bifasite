import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { dampTowards } from '../lib/damp.js';
import { useStudioEnvironment } from './useStudioEnvironment.js';
import Medallion from './Medallion.jsx';
import EagleParticles from './EagleParticles.jsx';

// ----------------------------------------------------------------------------
// Lighting rewrite: the previous rig was one hard, shadow-casting directional
// "key" light at high intensity plus a second saturated "rim" light — exactly
// the setup that produces small, sharp, high-contrast specular highlights
// ("pings") on anything metallic. That's replaced here with:
//   - a HemisphereLight for soft gradient ambient fill (no hard edges at all,
//     since it isn't a point/directional source in the first place)
//   - one much dimmer directional light, softened further via PCF-soft
//     shadows and a wide shadow.radius blur
//   - a procedural studio environment map (useStudioEnvironment) supplying
//     the broad, diffuse reflected highlights that make brushed metal read
//     as brushed metal rather than flat-shaded
//
// Motion rewrite: the group previously spun continuously on its own (an
// "idleY" accumulator that never stopped). That autonomous loop is gone —
// every degree of rotation the medallion now has comes from something the
// visitor actually did: a gentle scroll-linked turn (scrollRef, written by
// Hero.jsx from Framer Motion's page-scroll progress) plus the existing
// pointer-parallax tilt, now slower and wider-damped than before.
// ----------------------------------------------------------------------------
export default function SealScene({ scrollRef }) {
  const tiltGroupRef = useRef(null);
  const tilt = useRef({ x: 0, z: 0 });
  const slowFrames = useRef(0);
  const { pointer, gl } = useThree();

  useStudioEnvironment();

  useFrame((_state, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 15);

    if (tiltGroupRef.current) {
      // Slower, wider half-life than before (0.28s -> 0.44s) and smaller
      // multipliers: the same "physics-based, frame-rate-independent"
      // damped spring as previously, just tuned to arrive later and more
      // gently rather than tracking the pointer eagerly.
      tilt.current.x = dampTowards(tilt.current.x, pointer.y * 0.14, 0.44, dt);
      tilt.current.z = dampTowards(tilt.current.z, pointer.x * 0.11, 0.44, dt);
      // Full page-scroll progress (0-1) mapped to a bounded ~23 degree turn.
      // This is the only source of Y rotation now — nothing accumulates on
      // its own when the visitor is neither scrolling nor moving the
      // pointer, which is the point: a still visitor sees a still object.
      const scrollSpin = (scrollRef?.current ?? 0) * 0.4;
      tiltGroupRef.current.rotation.set(tilt.current.x, scrollSpin, tilt.current.z);
    }

    // Lightweight adaptive-resolution guard: if frames run sustainedly slow
    // (sub-~36fps), step pixel ratio down once rather than staying pinned
    // to a resolution the device can't sustain.
    if (rawDelta > 0.028) {
      slowFrames.current += 1;
      if (slowFrames.current === 45 && gl.getPixelRatio() > 1) {
        gl.setPixelRatio(1);
      }
    } else if (slowFrames.current > 0) {
      slowFrames.current -= 1;
    }
  });

  return (
    <>
      {/* Soft gradient ambient — a warm, muted "light from above, dark
          floor bounce below" wash with no hard edges by construction. */}
      <hemisphereLight args={['#a89a86', '#242019', 0.75]} />

      {/* One soft key light: a third of the previous intensity, PCF-soft
          shadows, and a wide shadow.radius blur so any shadow it does cast
          reads as a gentle contact shadow rather than a crisp silhouette. */}
      <directionalLight
        position={[-3.2, 4.2, 4.5]}
        intensity={0.4}
        color="#f0e6d4"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={15}
        shadow-radius={9}
      />

      <group ref={tiltGroupRef}>
        <Medallion />
        <EagleParticles />
      </group>

      <mesh rotation-x={-Math.PI / 2} position-y={-1.6} receiveShadow>
        <planeGeometry args={[8, 8]} />
        <shadowMaterial opacity={0.14} />
      </mesh>
    </>
  );
}
