import React from 'react';

// The "seal" — now closer to a piece of bespoke architectural hardware than
// a game-loot medallion. Two deliberate departures from the previous
// version:
//
// 1. No iridescence, no emissive glow. Both read as "digital" the instant
//    you see them in motion — a rainbow-shifting metal or a self-lit object
//    are shorthand for game/UI chrome, not for a physical object sitting in
//    a lit room. Removing them is most of what makes this feel quieter.
// 2. No independent rotation of its own. Every degree of motion this piece
//    now has comes from the shared tilt group in SealScene.jsx, which is
//    driven entirely by scroll position and pointer parallax — so this
//    component is purely geometry + material, nothing animated locally.
export default function Medallion() {
  return (
    <group>
      <mesh castShadow receiveShadow>
        <torusGeometry args={[1.15, 0.09, 32, 100]} />
        {/* Brushed champagne-bronze metal: still reads as metal (high
            metalness) but the roughness increase from 0.3 to 0.62 is what
            actually kills the "shiny loot" specular ping — it widens the
            BRDF's highlight lobe from a tight point into a broad, soft
            gradient, which is the physical difference between polished and
            brushed/sandblasted metal. */}
        <meshPhysicalMaterial
          color="#9a8d78"
          metalness={0.82}
          roughness={0.62}
          envMapIntensity={1}
        />
      </mesh>
      <mesh castShadow receiveShadow>
        <icosahedronGeometry args={[0.62, 1]} />
        {/* A pale warm alabaster core — non-metal, low clearcoat for a soft
            satin sheen rather than a glassy double-highlight, no emissive.
            It's lit entirely by the environment/key light now, which is
            more physically honest and reads as inert stone/ceramic rather
            than a light-emitting prop. */}
        <meshPhysicalMaterial
          color="#e4dccb"
          metalness={0.04}
          roughness={0.58}
          clearcoat={0.18}
          clearcoatRoughness={0.5}
          envMapIntensity={0.85}
        />
      </mesh>
    </group>
  );
}
