/**
 * Studio render of a labelled stock bottle: softbox lighting, contact shadow
 * and PNG export. Opened with `?render=one-a-day-237`.
 */

import { useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Bottle } from '@/types';
import { buildMyerstownBottles } from '@/data/presets/myerstownStock';
import { ONE_A_DAY_MENS_100CT, ONE_A_DAY_PANELS } from '@/data/presets/labelArtwork';
import { createLabelGeometry } from '@/components/3d/drawingGeometry';
import { DrawingBottle } from '@/components/3d/Bottle3D';

type Layout = 'hero' | 'panels';

const BACKGROUND = '#e9edf2';

function useLabelledBottle(): Bottle | null {
  return useMemo(() => {
    const bottle = buildMyerstownBottles().find((b) => b.name === '237 mL');
    if (!bottle) return null;
    return { ...bottle, bodyColor: '#f7f7f4', capColor: '#fbfbf9', label: ONE_A_DAY_MENS_100CT };
  }, []);
}

/** Turn about y that brings `panel` (a fraction of the label width) to face +z. */
function panelRotation(bottle: Bottle, panel: number): number {
  const label = bottle.label!;
  const geo = createLabelGeometry(bottle.profile!, label);
  geo.computeBoundingBox();
  const radius = geo.boundingBox!.max.z;
  geo.dispose();
  const arc = label.width / radius;
  return -(panel - (label.frontCenter ?? 0.5)) * arc;
}

function RenderedBottle({ bottle, position, rotation }: { bottle: Bottle; position: [number, number, number]; rotation: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <DrawingBottle
        profile={bottle.profile!}
        closure={bottle.closure}
        label={bottle.label}
        bodyColor={bottle.bodyColor}
        capColor={bottle.capColor}
        opacity={1}
        dimmed={false}
      />
    </group>
  );
}

/** Large softboxes and a warm rim, baked into the environment map. */
function StudioLights() {
  return (
    <Environment resolution={512} background={false}>
      <color attach="background" args={['#1a1d22']} />
      <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[-5, 2, 3]} rotation={[0, Math.PI / 3, 0]} scale={[5, 7, 1]} />
      <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[5, 1.5, 3]} rotation={[0, -Math.PI / 3, 0]} scale={[4, 6, 1]} />
      <Lightformer form="rect" intensity={2} color="#ffffff" position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 10, 1]} />
      <Lightformer form="rect" intensity={1} color="#fff4e6" position={[0, 1, -5]} scale={[12, 4, 1]} />
      <Lightformer form="rect" intensity={0.6} color="#eef3ff" position={[0, 0.5, 6]} rotation={[0, Math.PI, 0]} scale={[8, 3, 1]} />
    </Environment>
  );
}

export default function ProductRender() {
  const bottle = useLabelledBottle();
  const [layout, setLayout] = useState<Layout>('panels');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!bottle?.profile) {
    return <div className="p-8 text-sm text-gray-600">237 mL stock bottle not found.</div>;
  }

  const top = 108;
  const shots =
    layout === 'hero'
      ? [{ x: 0, z: 0, rotation: panelRotation(bottle, ONE_A_DAY_PANELS.brand) + 0.3 }]
      : [
          { x: -78, z: -12, rotation: panelRotation(bottle, ONE_A_DAY_PANELS.supplementFacts) },
          { x: 0, z: 10, rotation: panelRotation(bottle, ONE_A_DAY_PANELS.brand) },
          { x: 78, z: -12, rotation: panelRotation(bottle, ONE_A_DAY_PANELS.ingredients) },
        ];
  const camera =
    layout === 'hero'
      ? { position: [75, 95, 310] as [number, number, number], fov: 30 }
      : { position: [0, 78, 370] as [number, number, number], fov: 30 };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `one-a-day-mens-237mL-${layout}.png`;
    a.click();
  };

  return (
    <div className="h-screen w-screen relative" style={{ background: BACKGROUND }}>
      <Canvas
        key={layout}
        ref={canvasRef}
        shadows
        dpr={[1, 2]}
        camera={{ position: camera.position, fov: camera.fov, near: 1, far: 3000 }}
        gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        <color attach="background" args={[BACKGROUND]} />
        <StudioLights />
        <ambientLight intensity={0.15} />
        <directionalLight
          position={[-120, 260, 180]}
          intensity={1.1}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-camera-left={-200}
          shadow-camera-right={200}
          shadow-camera-top={200}
          shadow-camera-bottom={-200}
        />

        {shots.map((s, i) => (
          <RenderedBottle key={i} bottle={bottle} position={[s.x, 0, s.z]} rotation={s.rotation} />
        ))}

        <ContactShadows position={[0, 0.01, 0]} scale={500} resolution={1024} blur={2.4} opacity={0.55} far={60} color="#2a3340" />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[4000, 4000]} />
          <shadowMaterial opacity={0.12} />
        </mesh>

        <OrbitControls makeDefault target={[0, top * 0.48, 0]} minDistance={120} maxDistance={900} enablePan />
      </Canvas>

      <div className="absolute top-4 left-4 bg-white/85 backdrop-blur rounded-lg shadow px-4 py-3 text-xs text-gray-700 space-y-1 max-w-xs">
        <div className="font-semibold text-sm text-gray-900">ONE A DAY Men's Multi, 100 ct</div>
        <div>Bottle: Myerstown 237 mL HDPE, M45SP400 (Ø60.2 × 101.6 mm)</div>
        <div>Closure: Berry CK45CRTLTASY 45 mm CR-III</div>
        <div>Label: 7.125″ × 2.5″ wrap, item 91049079 r2</div>
      </div>

      <div className="absolute top-4 right-4 flex gap-2">
        {(['panels', 'hero'] as Layout[]).map((l) => (
          <button
            key={l}
            onClick={() => setLayout(l)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium shadow ${
              layout === l ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {l === 'panels' ? 'All panels' : 'Hero'}
          </button>
        ))}
        <button onClick={download} className="px-3 py-1.5 rounded-md text-xs font-medium shadow bg-gray-900 text-white hover:bg-gray-800">
          Download PNG
        </button>
      </div>
    </div>
  );
}
