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
  getBodyOuterRadii,
  getFloorThickness,
} from '@/services/bottleColliderBuilder';
import * as THREE from 'three';

interface BottleColliderProps {
  bottle: Bottle;
}

export default function BottleCollider({ bottle }: BottleColliderProps) {
  const { shape, dimensions, bodyColor } = bottle;
  const dimensionsKey = JSON.stringify(dimensions);
  
  const colliderGeometry = useMemo(() => {
    return buildBottleColliderGeometry(dimensions, { shape });
  }, [shape, dimensionsKey]);

  const shellGeometry = useMemo(() => {
    return buildBottleCollisionShell(dimensions, { shape });
  }, [shape, dimensionsKey]);

  const floor = useMemo(() => {
    const { rx, rz } = getBodyOuterRadii(dimensions, shape);
    return { rx, rz, halfHeight: getFloorThickness(dimensions) / 2 };
  }, [shape, dimensionsKey]);
  
  const visualGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(colliderGeometry.vertices, 3));
    geo.setIndex(new THREE.BufferAttribute(colliderGeometry.indices, 1));
    geo.computeVertexNormals();
    return geo;
  }, [colliderGeometry]);
  
  return (
    <RigidBody type="fixed" colliders={false}>
      <TrimeshCollider
        args={[shellGeometry.vertices, shellGeometry.indices]}
        friction={0.6}
        restitution={0.05}
      />
      <CuboidCollider
        args={[floor.rx, floor.halfHeight, floor.rz]}
        position={[0, floor.halfHeight, 0]}
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
