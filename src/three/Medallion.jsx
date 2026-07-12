import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

// The "seal" — a brushed-brass ring around a faceted clay-and-clearcoat
// core. Same two-geometry composition as the original vanilla scene (a
// TorusGeometry ring + an IcosahedronGeometry core at the same proven
// dimensions), elevated with material properties the original didn't reach
// for: iridescence on the ring (a subtle shifting rainbow-in-metal that only
// modern MeshPhysicalMaterial supports) and a warm emissive glow on the core
// so it reads as lit-from-within without needing bloom post-processing.
export default function Medallion() {
  const ringRef = useRef(null);
  const coreRef = useRef(null);

  useFrame((_state, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 15);
    if (ringRef.current) ringRef.current.rotation.y += dt * 0.22;
    if (coreRef.current) {
      coreRef.current.rotation.y -= dt * 0.5;
      coreRef.current.rotation.x += dt * 0.18;
    }
  });

  return (
    <group>
      <mesh ref={ringRef} castShadow receiveShadow>
        <torusGeometry args={[1.15, 0.09, 32, 100]} />
        <meshPhysicalMaterial
          color="#c4991f"
          metalness={0.88}
          roughness={0.3}
          iridescence={0.35}
          iridescenceIOR={1.3}
          iridescenceThicknessRange={[100, 400]}
        />
      </mesh>
      <mesh ref={coreRef} castShadow receiveShadow>
        <icosahedronGeometry args={[0.62, 1]} />
        <meshPhysicalMaterial
          color="#f3ecda"
          roughness={0.5}
          metalness={0.06}
          clearcoat={0.4}
          clearcoatRoughness={0.35}
          emissive="#c4991f"
          emissiveIntensity={0.06}
        />
      </mesh>
    </group>
  );
}
