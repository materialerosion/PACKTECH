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
const SIM_TIME_MARGIN = 45; // seconds allowed after dropping for settling and redrops
const MAX_REDROP_PASSES = 2;
// Pieces buried this many product lengths under the pile top, and quiet for
// FREEZE_QUIET_TIME, become fixed: they no longer move, but every awake piece
// in the pile costs solver time on every step.
const FREEZE_DEPTH_FACTOR = 2;
const FREEZE_QUIET_TIME = 1;
const FREEZE_SPEED = 10; // mm/s
const FREEZE_SPIN = 2; // rad/s

type Phase = 'dropping' | 'settling' | 'redropping' | 'idle';

// Rapier's RigidBodyType enum; the package is only reachable through @react-three/rapier.
type BodyType = Parameters<RapierRigidBody['setBodyType']>[0];
const DYNAMIC = 0 as BodyType;
const FIXED = 1 as BodyType;

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
  const quietTimeRef = useRef(new Map<number, number>());
  const lastFrameTimeRef = useRef(0);
  const dropEndTimeRef = useRef(0);
  
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
      quietTimeRef.current.clear();
      lastFrameTimeRef.current = 0;
      dropEndTimeRef.current = 0;
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
  
  const freezeBuriedBodies = useCallback((dt: number) => {
    if (!fillSim.fillProduct || dt <= 0) return;
    const quiet = quietTimeRef.current;
    const candidates: { body: RapierRigidBody; y: number }[] = [];
    let pileTop = -Infinity;
    forEachProduct((body) => {
      if (!body.isDynamic()) return;
      const v = body.linvel();
      const w = body.angvel();
      const still =
        v.x * v.x + v.y * v.y + v.z * v.z < FREEZE_SPEED * FREEZE_SPEED &&
        w.x * w.x + w.y * w.y + w.z * w.z < FREEZE_SPIN * FREEZE_SPIN;
      if (!still) {
        quiet.delete(body.handle);
        return;
      }
      const t = (quiet.get(body.handle) ?? 0) + dt;
      quiet.set(body.handle, t);
      const y = body.translation().y;
      pileTop = Math.max(pileTop, y);
      if (t >= FREEZE_QUIET_TIME) candidates.push({ body, y });
    });
    const freezeBelow = pileTop - getProductMaxDimension(fillSim.fillProduct) * FREEZE_DEPTH_FACTOR;
    for (const { body, y } of candidates) {
      if (y < freezeBelow) {
        body.setBodyType(FIXED, false);
        quiet.delete(body.handle);
      }
    }
  }, [fillSim.fillProduct, forEachProduct]);
  
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
    body.setBodyType(DYNAMIC, true);
    quietTimeRef.current.delete(body.handle);
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
    freezeBuriedBodies(now - lastFrameTimeRef.current);
    lastFrameTimeRef.current = now;
    
    // At high sim speed only one piece drops per frame, so dropping can take
    // several times targetQuantity × DROP_INTERVAL of simulated time.
    const timeLimit =
      phaseRef.current === 'dropping'
        ? fillSim.targetQuantity * DROP_INTERVAL * 4 + SIM_TIME_MARGIN
        : dropEndTimeRef.current + SIM_TIME_MARGIN;
    if (elapsed > timeLimit) {
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
          dropEndTimeRef.current = now;
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
