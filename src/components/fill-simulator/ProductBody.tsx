/**
 * Product Body Component
 * R3F component for a single dynamic product rigid body.
 * Renders the appropriate mesh shape and collider based on product type.
 */

import { memo, useMemo, useState } from 'react';
import {
  RigidBody,
  CuboidCollider,
  CylinderCollider,
  CapsuleCollider,
  BallCollider,
  ConvexHullCollider,
} from '@react-three/rapier';
import * as THREE from 'three';
import { Product } from '@/types/product';
import {
  getProductColliderParams,
  getProductMeshParams,
  getProductColor,
  ColliderPart,
} from '@/services/fillSimulationService';

interface ProductBodyProps {
  product: Product;
  position: [number, number, number];
  rotation: [number, number, number, number];
  isInside: boolean;
  isComplete: boolean;
  id: string;
}

const COLLIDER_FRICTION = 0.4;
const COLLIDER_RESTITUTION = 0.05;

function renderColliderPart(part: ColliderPart, key: string) {
  const common = {
    friction: COLLIDER_FRICTION,
    restitution: COLLIDER_RESTITUTION,
    position: part.position,
    rotation: part.rotation,
  };
  
  switch (part.type) {
    case 'cylinder':
      return (
        <CylinderCollider
          key={key}
          {...common}
          args={[part.args[0], part.args[1]]}
        />
      );
    case 'capsule':
      return (
        <CapsuleCollider
          key={key}
          {...common}
          args={[part.args[0], part.args[1]]}
        />
      );
    case 'cuboid':
      return (
        <CuboidCollider
          key={key}
          {...common}
          args={[part.args[0], part.args[1], part.args[2]]}
        />
      );
    case 'ball':
      return (
        <BallCollider
          key={key}
          {...common}
          args={[part.args[0]]}
        />
      );
    case 'convex':
      return (
        <ConvexHullCollider
          key={key}
          {...common}
          args={[new Float32Array(part.args)]}
        />
      );
    default:
      return null;
  }
}

function ProductBody({
  product,
  position,
  rotation,
  isInside,
  isComplete,
  id,
}: ProductBodyProps) {
  // Physics owns the transform after spawn; later prop updates must not teleport the body
  const [initialPose] = useState(() => ({ position, rotation }));
  
  const colliderParams = useMemo(() => getProductColliderParams(product), [product]);
  const meshParams = useMemo(() => getProductMeshParams(product), [product]);
  const userData = useMemo(() => ({ productId: id }), [id]);
  const color = getProductColor(product.color, isInside, isComplete);
  const { length, width, height } = product.dimensions;
  
  return (
    <RigidBody
      position={initialPose.position}
      quaternion={initialPose.rotation}
      colliders={false}
      type="dynamic"
      mass={product.mass}
      linearDamping={0.4}
      angularDamping={0.4}
      ccd={true}
      softCcdPrediction={2}
      userData={userData}
    >
      {colliderParams.parts.map((part, i) => renderColliderPart(part, `${id}-col-${i}`))}
      
      {product.shape !== 'dome' && (
        <mesh castShadow>
          {meshParams.geometryType === 'cylinder' && (
            <cylinderGeometry args={meshParams.args as [number, number, number, number]} />
          )}
          {meshParams.geometryType === 'capsule' && (
            <capsuleGeometry args={meshParams.args as [number, number, number, number]} />
          )}
          {meshParams.geometryType === 'box' && (
            <boxGeometry args={meshParams.args as [number, number, number]} />
          )}
          <meshStandardMaterial
            color={color}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>
      )}
      
      {/* Dome: unit half-sphere + base disc scaled to length × height × width */}
      {product.shape === 'dome' && (
        <group scale={[length / 2, height, width / 2]}>
          <mesh castShadow>
            <sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color={color}
              roughness={0.4}
              metalness={0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1, 16]} />
            <meshStandardMaterial
              color={color}
              roughness={0.4}
              metalness={0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}
    </RigidBody>
  );
}

export default memo(
  ProductBody,
  (prev, next) =>
    prev.id === next.id &&
    prev.product === next.product &&
    prev.isInside === next.isInside &&
    prev.isComplete === next.isComplete
);
