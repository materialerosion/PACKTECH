/**
 * 3D Scene Component
 * Main Three.js scene using react-three-fiber
 */

import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useStore, useActiveSeries } from '@/store';
import { Bottle } from '@/types';
import { profileTop } from '@/services/drawingProfile';
import Bottle3D from './Bottle3D';
import Shelf3D from './Shelf3D';

const SHELF_TOP = 20;

/** Height of the bottle including its closure, from its base. */
function bottleTopY(bottle: Bottle): number {
  if (bottle.profile) {
    const closure = bottle.closure;
    return profileTop(bottle.profile) + (closure ? closure.height - closure.skirtDepth : 0);
  }
  return bottle.dimensions.height + bottle.dimensions.neckDiameter * 0.6;
}

export default function Scene3D() {
  const { ui, bottles, activeBottleId, lineups, activeLineupId, getBottlesForLineup, setHeroBottle } = useStore();
  const activeSeries = useActiveSeries();
  
  // Determine if we're showing a series lineup
  const isSeriesView = ui.activeTab === 'lineup' && activeSeries && activeSeries.bottles.length > 0;
  
  // Get bottles to display based on active tab
  const displayBottles = React.useMemo(() => {
    // Series view: show all bottles from the active series side by side
    if (isSeriesView) {
      return activeSeries!.bottles;
    }
    if (ui.activeTab === 'lineup' && activeLineupId) {
      return getBottlesForLineup(activeLineupId);
    }
    // In generator mode, show active bottle or all bottles
    if (activeBottleId && bottles[activeBottleId]) {
      return [bottles[activeBottleId]];
    }
    return Object.values(bottles).slice(0, 10); // Limit for performance
  }, [ui.activeTab, activeLineupId, activeBottleId, bottles, getBottlesForLineup, isSeriesView, activeSeries]);
  
  const activeLineup = activeLineupId ? lineups[activeLineupId] : null;
  
  // Calculate shelf dimensions for series view
  const seriesShelfWidth = React.useMemo(() => {
    if (!isSeriesView) return 0;
    const seriesBottles = activeSeries!.bottles;
    // Calculate total width needed: sum of diameters + spacing
    const totalDiameterWidth = seriesBottles.reduce((sum, b) => sum + b.dimensions.diameter, 0);
    const spacing = (seriesBottles.length - 1) * 30; // 30mm spacing between bottles
    return Math.max(totalDiameterWidth + spacing + 80, 400); // min 400mm shelf
  }, [isSeriesView, activeSeries]);

  const seriesPosition = (index: number, count: number): [number, number, number] => {
    const totalWidth = seriesShelfWidth - 80; // Leave margin on edges
    const spacing = count > 1 ? totalWidth / (count - 1) : 0;
    const startX = count > 1 ? -totalWidth / 2 : 0;
    return [startX + index * spacing, SHELF_TOP, 0];
  };

  const heroIndex = isSeriesView && ui.heroBottleId
    ? activeSeries!.bottles.findIndex((b) => b.id === ui.heroBottleId)
    : -1;
  const hero = heroIndex >= 0 ? activeSeries!.bottles[heroIndex] : null;
  
  // Camera framing: the hero bottle when one is chosen, otherwise the whole view
  let cameraPosition: [number, number, number] = [0, 150, 300];
  let cameraTarget: [number, number, number] = [0, 50, 0];
  if (hero) {
    const [x] = seriesPosition(heroIndex, activeSeries!.bottles.length);
    const top = bottleTopY(hero);
    const distance = Math.max(top * 2, hero.dimensions.diameter * 3, 120);
    cameraTarget = [x, SHELF_TOP + top * 0.5, 0];
    cameraPosition = [x, SHELF_TOP + top * 0.75, distance];
  } else if (isSeriesView) {
    const maxHeight = Math.max(...activeSeries!.bottles.map(b => b.dimensions.height));
    cameraPosition = [0, maxHeight * 0.8, Math.max(seriesShelfWidth * 0.8, 300)];
    cameraTarget = [0, maxHeight * 0.4, 0];
  }
  const focusKey = hero
    ? `hero:${hero.id}`
    : isSeriesView
      ? `series:${activeSeries!.id}:${activeSeries!.bottles.length}`
      : ui.activeTab;
  
  return (
    <div className="w-full h-full three-canvas">
      <Canvas shadows>
        {/* Camera */}
        <PerspectiveCamera makeDefault fov={50} />
        
        {/* Controls */}
        <OrbitControls 
          makeDefault
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={hero ? 60 : 100}
          maxDistance={1000}
        />
        <CameraRig focusKey={focusKey} position={cameraPosition} target={cameraTarget} />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[100, 200, 100]}
          intensity={1}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight position={[-100, 100, -100]} intensity={0.3} />
        
        {/* Environment */}
        <Environment preset="studio" />
        
        {/* Grid */}
        {ui.showGrid && (
          <Grid
            position={[0, 0, 0]}
            args={[1000, 1000]}
            cellSize={10}
            cellThickness={0.5}
            cellColor="#cbd5e1"
            sectionSize={50}
            sectionThickness={1}
            sectionColor="#94a3b8"
            fadeDistance={500}
            fadeStrength={1}
            followCamera={false}
          />
        )}
        
        {/* Shelf (in lineup mode with legacy lineup) */}
        {ui.activeTab === 'lineup' && activeLineup && !isSeriesView && (
          <Shelf3D 
            width={activeLineup.shelfWidth}
            depth={activeLineup.shelfDepth}
            height={20}
          />
        )}
        
        {/* Shelf for series view */}
        {isSeriesView && (
          <Shelf3D 
            width={seriesShelfWidth}
            depth={200}
            height={20}
          />
        )}
        
        {/* Bottles */}
        {displayBottles.map((bottle, index) => {
          // Calculate position
          let position: [number, number, number] = [0, 0, 0];
          
          if (isSeriesView) {
            position = seriesPosition(index, displayBottles.length);
          } else if (ui.activeTab === 'lineup' && activeLineup) {
            const lineupPosition = activeLineup.positions.find(p => p.bottleId === bottle.id);
            if (lineupPosition) {
              position = [
                lineupPosition.x - activeLineup.shelfWidth / 2,
                20, // On top of shelf
                lineupPosition.y
              ];
            }
          } else {
            // Spread bottles in generator view
            const spacing = 80;
            const cols = Math.ceil(Math.sqrt(displayBottles.length));
            const row = Math.floor(index / cols);
            const col = index % cols;
            position = [
              (col - cols / 2) * spacing,
              0,
              (row - Math.ceil(displayBottles.length / cols) / 2) * spacing
            ];
          }

          const dimmed = hero !== null && bottle.id !== hero.id;
          
          return (
            <Bottle3D
              key={bottle.id}
              bottle={bottle}
              position={position}
              isSelected={hero ? bottle.id === hero.id : bottle.id === activeBottleId}
              showMeasurements={ui.showMeasurements && !dimmed}
              dimmed={dimmed}
              onSelect={isSeriesView ? () => setHeroBottle(bottle.id) : undefined}
            />
          );
        })}
      </Canvas>
    </div>
  );
}

/**
 * Glides the camera and orbit target to a new framing whenever `focusKey`
 * changes. Edits that don't change the key (e.g. resizing the hero) leave the
 * user's camera alone; grabbing the controls cancels an in-flight glide.
 */
function CameraRig({
  focusKey,
  position,
  target,
}: {
  focusKey: string;
  position: [number, number, number];
  target: [number, number, number];
}) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const goal = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const snap = useRef(true);

  useEffect(() => {
    goal.current = {
      position: new THREE.Vector3(...position),
      target: new THREE.Vector3(...target),
    };
  }, [focusKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!controls) return;
    const cancel = () => {
      goal.current = null;
    };
    controls.addEventListener('start', cancel);
    return () => controls.removeEventListener('start', cancel);
  }, [controls]);

  useFrame((_, delta) => {
    const g = goal.current;
    if (!g || !controls) return;
    if (snap.current) {
      camera.position.copy(g.position);
      controls.target.copy(g.target);
      snap.current = false;
      goal.current = null;
    } else {
      const k = 1 - Math.exp(-delta * 6);
      camera.position.lerp(g.position, k);
      controls.target.lerp(g.target, k);
      if (camera.position.distanceTo(g.position) < 0.5 && controls.target.distanceTo(g.target) < 0.5) {
        goal.current = null;
      }
    }
    controls.update();
  });

  return null;
}
