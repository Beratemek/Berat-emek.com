import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Fireflies({ count = 30, radius = 10, height = 4, color = '#f9e79f' }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const seeds = useMemo(
    () =>
      new Array(count).fill(0).map(() => ({
        x: (Math.random() - 0.5) * radius * 2,
        y: Math.random() * height + 0.5,
        z: (Math.random() - 0.5) * radius * 2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.6,
        driftX: 0.3 + Math.random() * 0.4,
        driftY: 0.15 + Math.random() * 0.2,
        driftZ: 0.3 + Math.random() * 0.4,
      })),
    [count, radius, height]
  )

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.elapsedTime
    seeds.forEach((s, i) => {
      dummy.position.set(
        s.x + Math.sin(t * s.speed + s.phase) * s.driftX,
        s.y + Math.sin(t * s.speed * 1.3 + s.phase) * s.driftY,
        s.z + Math.cos(t * s.speed * 0.8 + s.phase) * s.driftZ
      )
      const scale = 0.6 + 0.4 * Math.sin(t * 2 + s.phase)
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[0.04, 8, 8]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </instancedMesh>
  )
}