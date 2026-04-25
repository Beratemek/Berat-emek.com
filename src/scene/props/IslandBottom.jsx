import { useMemo } from 'react'
import * as THREE from 'three'

// Sade ve pürüzsüz ada altı — tek katman, düz kahverengi organik damla.
export default function IslandBottom({
  topRadius = 3.4,
  depth = 4.4,
  color = '#8f5c3a',
  segments = 48,
}) {
  const points = useMemo(() => {
    const pts = []
    pts.push(new THREE.Vector2(topRadius, 0))
    const steps = 22
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const y = -t * depth
      const e1 = 1 - Math.pow(1 - t, 2.2)
      const e2 = Math.pow(t, 1.4)
      const eased = e1 * 0.55 + e2 * 0.45
      const r = topRadius * (1 - eased) * 0.98
      pts.push(new THREE.Vector2(Math.max(r, 0.01), y))
    }
    pts.push(new THREE.Vector2(0, -depth))
    return pts
  }, [topRadius, depth])

  return (
    <mesh castShadow receiveShadow>
      <latheGeometry args={[points, segments]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  )
}