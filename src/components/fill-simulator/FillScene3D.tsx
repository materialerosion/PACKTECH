/**
 * Fill Scene 3D
 * Dedicated Three.js canvas with Rapier physics for fill simulation.
 * Renders the bottle as a transparent static collider and products as dynamic bodies.
 */

import { useMemo, useRef, Suspense, MutableRefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider, useRapier } from '@react-three/rapier';
import { useStore, useFillSimulation } from '@/store';
import BottleCollider from './BottleCollider';
import ProductBody from './ProductBody';
import SimulationController from './SimulationController';
import { Droplets } from 'lucide-react';
import * as THREE from 'three';
import { Bottle } from '@/types/bottle';
import { radiusAt } from '@/services/drawingProfile';

const PHYSICS_TIME_STEP = 1 / 60;
const MAX_PHYSICS_FRAME_DELTA = 1 / 30;
const PHYSICS_FRAME_BUDGET_MS = 10;

/**
 * Drives the (paused) physics world in fixed steps within a per-frame time
 * budget. The built-in loop catches up up to 0.5 s per frame, which spirals
 * into ~1 fps once a step costs more than the time it simulates; here a heavy
 * pile plays in slow motion instead. Advances timeRef by simulated seconds.
 */
function BudgetedPhysicsStepper({ timeRef }: { timeRef: MutableRefObject<number> }) {
  const { step } = useRapier();
  const accumulator = useRef(0);
  useFrame((_, delta) => {
    accumulator.current += Math.min(delta, MAX_PHYSICS_FRAME_DELTA);
    const start = performance.now();
    while (accumulator.current >= PHYSICS_TIME_STEP) {
      step(PHYSICS_TIME_STEP);
      accumulator.current -= PHYSICS_TIME_STEP;
      timeRef.current += PHYSICS_TIME_STEP;
      if (performance.now() - start > PHYSICS_FRAME_BUDGET_MS) {
        accumulator.current = 0;
        break;
      }
    }
  });
  return null;
}

/** Translucent disc and ring at the settled fill height. */
function FillLine({ bottle, height }: { bottle: Bottle; height: number }) {
  const radius = bottle.profile
    ? radiusAt(bottle.profile.inner, height)
    : bottle.dimensions.diameter / 2 - (bottle.dimensions.wallThickness ?? 1);
  if (radius <= 0) return null;
  return (
    <group position={[0, height, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh renderOrder={2}>
        <circleGeometry args={[radius, 48]} />
        <meshBasicMaterial color="#2563eb" transparent opacity={0.18} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh renderOrder={3}>
        <ringGeometry args={[radius - 0.6, radius, 64]} />
        <meshBasicMaterial color="#1d4ed8" transparent opacity={0.9} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export default function FillScene3D() {
  const { ui } = useStore();
  const fillSim = useFillSimulation();
  const { fillBottle, fillProduct, status, productBodies } = fillSim;
  const physicsTimeRef = useRef(0);
  
  const isComplete = status === 'complete';
  
  // Camera position based on bottle height
  const cameraPosition = useMemo<[number, number, number]>(() => {
    if (fillBottle) {
      const h = fillBottle.dimensions.bodyHeight;
      return [h * 0.8, h * 0.7, h * 1.2];
    }
    return [100, 80, 150];
  }, [fillBottle]);
  
  const cameraTarget = useMemo<[number, number, number]>(() => {
    if (fillBottle) {
      return [0, fillBottle.dimensions.bodyHeight * 0.4, 0];
    }
    return [0, 40, 0];
  }, [fillBottle]);
  
  // No bottle selected - show placeholder
  if (!fillBottle) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center text-gray-400">
          <Droplets className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No bottle loaded</p>
          <p className="text-sm mt-2">
            Pick a portfolio and bottle in the sidebar to begin
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full three-canvas">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={cameraPosition} fov={50} />
        
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={50}
          maxDistance={500}
          target={cameraTarget}
        />
        
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <hemisphereLight args={['#ffffff', '#cbd5e1', 0.6]} />
        <directionalLight
          position={[100, 200, 100]}
          intensity={1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-100, 100, -100]} intensity={0.3} />
        
        {/* Grid */}
        {ui.showGrid && (
          <Grid
            position={[0, -0.5, 0]}
            args={[500, 500]}
            cellSize={10}
            cellThickness={0.5}
            cellColor="#cbd5e1"
            sectionSize={50}
            sectionThickness={1}
            sectionColor="#94a3b8"
            fadeDistance={300}
            fadeStrength={1}
            followCamera={false}
          />
        )}
        
        {isComplete && fillSim.results?.headspace && (
          <FillLine bottle={fillBottle} height={fillSim.results.headspace.fillHeightMm} />
        )}

        {/* Ground plane for catching fallen products */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
          <planeGeometry args={[500, 500]} />
          <meshStandardMaterial color="#f1f5f9" transparent opacity={0.5} />
        </mesh>
        
        {/* Physics world — mm units (lengthUnit=1000 ⇒ 1 unit = 1 mm) */}
        <Suspense fallback={null}>
          <Physics
            gravity={[0, -9810, 0]}
            timeStep={PHYSICS_TIME_STEP}
            paused
            interpolate={false}
            // Tolerance props (predictionDistance, allowedLinearError) are
            // normalized and multiplied by lengthUnit; keep library defaults.
            lengthUnit={1000}
            maxCcdSubsteps={4}
          >
            <BudgetedPhysicsStepper timeRef={physicsTimeRef} />
            
            {/* Static bottle collider */}
            <BottleCollider bottle={fillBottle} />
            
            {/* Dynamic product bodies */}
            {fillProduct && productBodies.map((body) => (
              <ProductBody
                key={body.id}
                id={body.id}
                product={fillProduct}
                position={body.position}
                rotation={body.rotation}
                isInside={body.isInside}
                isComplete={isComplete}
              />
            ))}
            
            {/* Physics ground to catch overflowed products */}
            <RigidBody type="fixed" colliders={false} position={[0, -1, 0]}>
              <CuboidCollider
                args={[250, 0.5, 250]}
                friction={0.8}
                restitution={0.02}
              />
            </RigidBody>
            
            {/* Simulation controller (no visual output) */}
            <SimulationController physicsTimeRef={physicsTimeRef} />
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  );
}
