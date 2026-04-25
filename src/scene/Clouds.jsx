import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { THEMES } from '../data/themes.js'

const CLOUDS = [
  { pos: [-9, 8, -7], scale: 1.2 },
  { pos: [9, 9, 6], scale: 1.1 },
  { pos: [-2, 9.5, -10], scale: 1.3 },
  { pos: [2, 8.5, 9], scale: 0.9 },
  { pos: [10, 7.5, -9], scale: 1 },
  { pos: [-10, 8, 8], scale: 0.95 },
]

export default function Clouds({ theme = 'day' }) {
  const T = THEMES[theme]
  return (
    <group>
      {CLOUDS.map((c, i) => (
        <Cloud key={i} {...c} drift={i * 0.7} main={T.cloudColor} accent={T.cloudAccent} />
      ))}
    </group>
  )
}

function Cloud({ pos, scale, drift, main, accent }) {
  const ref = useRef()

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    ref.current.position.x = pos[0] + Math.sin(t * 0.15 + drift) * 0.4
    ref.current.position.y = pos[1] + Math.sin(t * 0.3 + drift) * 0.1
  })

  return (
    <group ref={ref} position={pos} scale={scale}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial color={main} roughness={1} />
      </mesh>
      <mesh position={[0.6, 0.1, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color={main} roughness={1} />
      </mesh>
      <mesh position={[-0.5, 0, 0.1]}>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshStandardMaterial color={main} roughness={1} />
      </mesh>
      <mesh position={[0.2, -0.25, 0.2]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color={main} roughness={1} />
      </mesh>
      <mesh position={[-0.15, 0.35, -0.1]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color={accent} roughness={1} />
      </mesh>
    </group>
  )
}