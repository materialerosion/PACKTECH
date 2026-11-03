/**
 * Simulation Controller
 * Manages the drop timing, settling, redrop, and counting phases.
 * Runs inside the R3F render loop via useFrame.
 */

import { useRef, useCallback, useEffect, MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import { useStore, useFillSimulation, ProductBodyState } from '@/store';
import {
  getSpawnPosition,
  getRandomRotation,
  generateBodyId,
  isInsideBottle,
  calculateResults,
  getProductSamplePoints,
  getProductMaxDimension,
} from '@/services/fillSimulationService';
import { computeHeadspace } from '@/services/headspaceService';

// All durations are simulated seconds, read from the physics clock
const DROP_INTERVAL = 0.25; // seconds between drops (and between redrops)
const SETTLE_MAX_DURATION = 2.0; // max seconds to wait for settle
const SETTLE_MIN_DURATION = 0.5; // min settle time before velocity check
const REST_SPEED = 80; // mm/s — treat stack as settled below this
const PROGRESS_INTERVAL = 0.25; // seconds between inside-count UI updates while settling
const MAX_SIM_TIME = 60; // max total simulation time
const MAX_REDROP_PASSES = 2;

type Phase = 'dropping' | 'settling' | 'redropping' | 'idle';

function getProductId(body: RapierRigidBody): string | undefined {
  return (body.userData as { productId?: string } | undefined)?.productId;
}

interface SimulationControllerProps {
  /** Simulated seconds advanced by the physics stepper */
  physicsTimeRef: MutableRefObject<number>;
}

export default function SimulationController({ physicsTimeRef }: SimulationControllerProps) {
  const { updateFillSimProgress, setFillSimResults } = useStore();
  const fillSim = useFillSimulation();
  const { world } = useRapier();
  
  const startTimeRef = useRef<number>(0);
  const lastDropTimeRef = useRef<number>(0);
  const droppedCountRef = useRef<number>(0);
  const phaseRef = useRef<Phase>('idle');
  const settleStartRef = useRef<number>(0);
  const lastProgressRef = useRef<number>(0);
  const redropPassRef = useRef<number>(0);
  const redropQueueRef = useRef<RapierRigidBody[]>([]);
  const productBodiesRef = useRef<ProductBodyState[]>([]);
  
  const statusRef = useRef(fillSim.status);
  statusRef.current = fillSim.status;
  
  useEffect(() => {
    if (fillSim.status === 'running') {
      startTimeRef.current = physicsTimeRef.current;
      lastDropTimeRef.current = -DROP_INTERVAL;
      droppedCountRef.current = 0;
      phaseRef.current = 'dropping';
      settleStartRef.current = 0;
      lastProgressRef.current = 0;
      redropPassRef.current = 0;
      redropQueueRef.current = [];
      productBodiesRef.current = [];
    } else if (fillSim.status === 'configuring' || fillSim.status === 'idle') {
      phaseRef.current = 'idle';
      droppedCountRef.current = 0;
      redropQueueRef.current = [];
      productBodiesRef.current = [];
    }
  }, [fillSim.status, physicsTimeRef]);
  
  const forEachProduct = useCallback(
    (fn: (body: RapierRigidBody, id: string) => void) => {
      world.bodies.forEach((body) => {
        if (!body.isDynamic()) return;
        const id = getProductId(body);
        if (id) fn(body, id);
      });
    },
    [world]
  );
  
  /**
   * Spawn point above the neck, lifted clear of any products already piled
   * up near the opening so new drops never start inside another body.
   */
  const getClearSpawnPosition = useCallback((): [number, number, number] | null => {
    if (!fillSim.fillBottle || !fillSim.fillProduct) return null;
    const dims = fillSim.fillBottle.dimensions;
    const maxDim = getProductMaxDimension(fillSim.fillProduct);
    const columnR = dims.neckDiameter / 2 + maxDim;
    
    let minHeight = dims.bodyHeight + maxDim + 15;
    forEachProduct((body) => {
      const t = body.translation();
      if (Math.hypot(t.x, t.z) < columnR && t.y > dims.bodyHeight - maxDim) {
        minHeight = Math.max(minHeight, t.y + maxDim * 1.5);
      }
    });
    return getSpawnPosition(dims, minHeight);
  }, [fillSim.fillBottle, fillSim.fillProduct, forEachProduct]);
  
  const spawnProduct = useCallback((): boolean => {
    const position = getClearSpawnPosition();
    if (!position) return false;
    
    productBodiesRef.current = [
      ...productBodiesRef.current,
      { id: generateBodyId(), position, rotation: getRandomRotation(), isInside: true },
    ];
    droppedCountRef.current += 1;
    return true;
  }, [getClearSpawnPosition]);
  
  const isInside = useCallback(
    (body: RapierRigidBody): boolean => {
      if (!fillSim.fillBottle || !fillSim.fillProduct) return false;
      const t = body.translation();
      const r = body.rotation();
      return isInsideBottle([t.x, t.y, t.z], fillSim.fillBottle.dimensions, {
        shape: fillSim.fillBottle.shape,
        samplePoints: getProductSamplePoints(fillSim.fillProduct),
        rotation: [r.x, r.y, r.z, r.w],
        profile: fillSim.fillBottle.profile,
      });
    },
    [fillSim.fillBottle, fillSim.fillProduct]
  );
  
  const areBodiesSettled = useCallback((): boolean => {
    let maxSpeed = 0;
    forEachProduct((body) => {
      const v = body.linvel();
      maxSpeed = Math.max(maxSpeed, Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z));
    });
    return maxSpeed < REST_SPEED;
  }, [forEachProduct]);
  
  const isSettleComplete = useCallback((settleElapsed: number): boolean => {
    if (settleElapsed >= SETTLE_MAX_DURATION) return true;
    return settleElapsed >= SETTLE_MIN_DURATION && areBodiesSettled();
  }, [areBodiesSettled]);
  
  /**
   * Count inside/outside and refresh body state, keeping each body's
   * original id so React does not remount the pile.
   */
  const countInside = useCallback(() => {
    let inside = 0;
    let outside = 0;
    const escaped: RapierRigidBody[] = [];
    const states = new Map<string, ProductBodyState>();
    
    forEachProduct((body, id) => {
      const isIn = isInside(body);
      if (isIn) inside++;
      else {
        outside++;
        escaped.push(body);
      }
      const t = body.translation();
      const r = body.rotation();
      states.set(id, {
        id,
        position: [t.x, t.y, t.z],
        rotation: [r.x, r.y, r.z, r.w],
        isInside: isIn,
      });
    });
    
    productBodiesRef.current = productBodiesRef.current.map((b) => states.get(b.id) ?? b);
    return { inside, outside, escaped };
  }, [forEachProduct, isInside]);
  
  const redropBody = useCallback((body: RapierRigidBody) => {
    const position = getClearSpawnPosition();
    if (!position) return;
    const rot = getRandomRotation();
    body.setTranslation({ x: position[0], y: position[1], z: position[2] }, true);
    body.setRotation({ x: rot[0], y: rot[1], z: rot[2], w: rot[3] }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }, [getClearSpawnPosition]);
  
  const finishSimulation = useCallback((elapsed: number) => {
    phaseRef.current = 'idle';
    const { inside } = countInside();
    
    if (fillSim.fillProduct && fillSim.fillBottle) {
      const results = calculateResults(
        fillSim.targetQuantity,
        productBodiesRef.current,
        fillSim.fillProduct,
        fillSim.fillBottle.volume,
        elapsed
      );
      setFillSimResults({
        ...results,
        productPositions: [...productBodiesRef.current],
        headspace: computeHeadspace(fillSim.fillBottle, fillSim.fillProduct, productBodiesRef.current),
      });
    }
    
    updateFillSimProgress({
      insideCount: inside,
      elapsedTime: elapsed,
      productBodies: [...productBodiesRef.current],
    });
  }, [fillSim.fillProduct, fillSim.fillBottle, fillSim.targetQuantity, countInside, setFillSimResults, updateFillSimProgress]);
  
  const startSettling = useCallback((now: number) => {
    phaseRef.current = 'settling';
    settleStartRef.current = now;
    lastProgressRef.current = now;
  }, []);
  
  useFrame(() => {
    if (statusRef.current !== 'running' && statusRef.current !== 'settling' && statusRef.current !== 'redropping') {
      return;
    }
    
    const now = physicsTimeRef.current - startTimeRef.current;
    const elapsed = now;
    
    if (elapsed > MAX_SIM_TIME) {
      finishSimulation(elapsed);
      return;
    }
    
    switch (phaseRef.current) {
      case 'dropping': {
        if (
          now - lastDropTimeRef.current >= DROP_INTERVAL &&
          droppedCountRef.current < fillSim.targetQuantity &&
          spawnProduct()
        ) {
          lastDropTimeRef.current = now;
          updateFillSimProgress({
            droppedCount: droppedCountRef.current,
            elapsedTime: elapsed,
            productBodies: productBodiesRef.current,
          });
        }
        
        if (droppedCountRef.current >= fillSim.targetQuantity) {
          startSettling(now);
          updateFillSimProgress({ status: 'settling', elapsedTime: elapsed });
        }
        break;
      }
      
      case 'settling': {
        const settleElapsed = now - settleStartRef.current;
        
        if (now - lastProgressRef.current >= PROGRESS_INTERVAL) {
          lastProgressRef.current = now;
          const { inside } = countInside();
          updateFillSimProgress({ insideCount: inside, elapsedTime: elapsed });
        }
        
        if (isSettleComplete(settleElapsed)) {
          const { inside, outside, escaped } = countInside();
          
          if (outside > 0 && redropPassRef.current < MAX_REDROP_PASSES) {
            redropPassRef.current += 1;
            redropQueueRef.current = escaped;
            phaseRef.current = 'redropping';
            lastDropTimeRef.current = now - DROP_INTERVAL;
            updateFillSimProgress({
              status: 'redropping',
              currentPass: redropPassRef.current,
              insideCount: inside,
              elapsedTime: elapsed,
            });
          } else {
            finishSimulation(elapsed);
          }
        }
        break;
      }
      
      case 'redropping': {
        if (now - lastDropTimeRef.current >= DROP_INTERVAL) {
          const body = redropQueueRef.current.shift();
          if (body) {
            redropBody(body);
            lastDropTimeRef.current = now;
          }
        }
        
        if (redropQueueRef.current.length === 0 && now - lastDropTimeRef.current >= DROP_INTERVAL) {
          startSettling(now);
        }
        break;
      }
    }
  });
  
  return null;
}
