import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function SmokeTrail({ position = [0, 0, 0], count = 5, color = '#e8e8f0' }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const seeds = useMemo(
    () =>
      new Array(count).fill(0).map((_, i) => ({
        offset: i / count,
        driftX: (Math.random() - 0.5) * 0.2,
        driftZ: (Math.random() - 0.5) * 0.2,
      })),
    [count]
  )

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.elapsedTime
    seeds.forEach((s, i) => {
      const life = ((t * 0.25 + s.offset) % 1)
      const y = position[1] + life * 1.6
      const spread = 0.05 + life * 0.25
      dummy.position.set(
        position[0] + Math.sin(t * 0.8 + i) * s.driftX * (life + 0.3),
        y,
        position[2] + Math.cos(t * 0.8 + i) * s.driftZ * (life + 0.3)
      )
      const scale = 0.15 + spread * 1.8
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)

      const mat = meshRef.current.material
      if (mat && !mat.__opacityAdjusted) {
        mat.transparent = true
        mat.__opacityAdjusted = true
      }
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial color={color} roughness={1} transparent opacity={0.4} depthWrite={false} />
    </instancedMesh>
  )
}