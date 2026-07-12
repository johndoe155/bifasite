import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ----------------------------------------------------------------------------
// Why a hand-built environment instead of a loaded HDRI: an actual .hdr/.exr
// asset means another network fetch, another CDN dependency, and no visual
// control over its palette (stock HDRIs skew toward literal daylight/studio
// blues and neutrals that fight the site's warm ink/brass system). A PMREM
// baked from a few large, soft, warm-toned emissive panels gets the thing
// that actually matters for "brushed architectural hardware" — broad,
// gradient-soft specular response instead of pinpoint highlights — while
// staying fully procedural, on-brand, and dependency-free.
//
// This only changes reflection quality on physically-based materials
// (MeshPhysicalMaterial/MeshStandardMaterial); it does not replace direct
// lighting, which is still handled by the hemisphere + key light in
// SealScene.jsx.
// ----------------------------------------------------------------------------
export function useStudioEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    let disposed = false;
    let pmremGenerator;
    let renderTarget;

    try {
      pmremGenerator = new THREE.PMREMGenerator(gl);
      pmremGenerator.compileEquirectangularShader();

      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color('#1b1812');

      const panelGeo = new THREE.PlaneGeometry(1, 1);
      const addPanel = (hex, brightness, position, rotation, size) => {
        const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(brightness) });
        const mesh = new THREE.Mesh(panelGeo, material);
        mesh.position.set(...position);
        mesh.rotation.set(...rotation);
        mesh.scale.set(...size);
        envScene.add(mesh);
      };

      // A soft four-panel "softbox" rig — one broad warm key from upper-left,
      // a dim cool-neutral fill from the right, a faint warm rim from behind,
      // and a gentle overhead wash. No panel is anywhere near pure white or
      // saturated; everything stays in the same desaturated warm-gray family
      // as the rest of the palette.
      addPanel('#d9c9a8', 2.6, [-4, 3, 3], [0, Math.PI / 5, 0], [7, 7, 1]);
      addPanel('#9099a3', 0.9, [5, 0.5, 2], [0, -Math.PI / 4, 0], [6, 6, 1]);
      addPanel('#c7a97a', 1.3, [0, 1.5, -5], [0, Math.PI, 0], [8, 8, 1]);
      addPanel('#d8d0bf', 1.1, [0, 6, 0], [Math.PI / 2, 0, 0], [9, 9, 1]);

      renderTarget = pmremGenerator.fromScene(envScene);
      if (!disposed) {
        scene.environment = renderTarget.texture;
      }

      panelGeo.dispose();
      envScene.traverse((obj) => obj.material?.dispose?.());
    } catch (err) {
      // Fails safe: the hemisphere + key light in SealScene still produce a
      // complete, correctly-lit (if slightly flatter) result on their own,
      // so a problem here should never blank the scene.
      // eslint-disable-next-line no-console
      console.warn('Studio environment generation skipped:', err);
    }

    return () => {
      disposed = true;
      if (scene.environment === renderTarget?.texture) {
        scene.environment = null;
      }
      renderTarget?.texture?.dispose();
      pmremGenerator?.dispose();
    };
  }, [gl, scene]);
}
