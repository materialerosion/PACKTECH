/**
 * Bottle Collider Component
 * R3F component that renders the bottle as a static trimesh collider
 * with a transparent visual mesh.
 */

import { useMemo } from 'react';
import { RigidBody, TrimeshCollider, CuboidCollider } from '@react-three/rapier';
import { Bottle } from '@/types/bottle';
import {
  buildBottleColliderGeometry,
  buildBottleCollisionShell,
  buildProfileCollisionShell,
  getBodyOuterRadii,
  getFloorThickness,
} from '@/services/bottleColliderBuilder';
import { createProfileBodyGeometry } from '@/components/3d/drawingGeometry';
import * as THREE from 'three';

interface BottleColliderProps {
  bottle: Bottle;
}

/**
 * The floor slab extends this far below the cavity floor. Drawing bottles have
 * ~1 mm floors, thinner than a pile presses a piece into a box collider.
 */
const MIN_FLOOR_SLAB = 10;

export default function BottleCollider({ bottle }: BottleColliderProps) {
  const { shape, dimensions, bodyColor, profile } = bottle;
  const dimensionsKey = JSON.stringify(dimensions);

  const shellGeometry = useMemo(() => {
    if (profile) return buildProfileCollisionShell(profile);
    return buildBottleCollisionShell(dimensions, { shape });
  }, [shape, dimensionsKey, profile]);

  const floor = useMemo(() => {
    const slab = (rx: number, rz: number, top: number) => {
      const depth = Math.max(top, MIN_FLOOR_SLAB);
      return { rx, rz, halfHeight: depth / 2, centerY: top - depth / 2 };
    };
    if (profile) {
      const r = profile.outer.reduce((m, [pr]) => Math.max(m, pr), 0);
      return slab(r, r * (profile.oval?.depthRatio ?? 1), profile.inner[0][1]);
    }
    const { rx, rz } = getBodyOuterRadii(dimensions, shape);
    return slab(rx, rz, getFloorThickness(dimensions));
  }, [shape, dimensionsKey, profile]);

  const visualGeometry = useMemo(() => {
    if (profile) return createProfileBodyGeometry(profile);
    const colliderGeometry = buildBottleColliderGeometry(dimensions, { shape });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(colliderGeometry.vertices, 3));
    geo.setIndex(new THREE.BufferAttribute(colliderGeometry.indices, 1));
    geo.computeVertexNormals();
    return geo;
  }, [shape, dimensionsKey, profile]);
  
  return (
    <RigidBody type="fixed" colliders={false}>
      <TrimeshCollider
        args={[shellGeometry.vertices, shellGeometry.indices]}
        friction={0.6}
        restitution={0.05}
      />
      <CuboidCollider
        args={[floor.rx, floor.halfHeight, floor.rz]}
        position={[0, floor.centerY, 0]}
        friction={0.6}
        restitution={0.05}
      />
      
      <mesh geometry={visualGeometry}>
        <meshStandardMaterial
          color={bodyColor}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          roughness={0.1}
          metalness={0}
          depthWrite={false}
        />
      </mesh>
      
      <mesh geometry={visualGeometry}>
        <meshBasicMaterial
          color={bodyColor}
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>
    </RigidBody>
  );
}
