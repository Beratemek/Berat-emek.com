import { useMemo } from 'react'
import * as THREE from 'three'
import { Text } from '@react-three/drei'

function useArrowShape() {
  return useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, -0.13)
    s.lineTo(0.58, -0.13)
    s.lineTo(0.74, 0)
    s.lineTo(0.58, 0.13)
    s.lineTo(0, 0.13)
    s.closePath()
    return s
  }, [])
}

function ArrowSign({ y, rotY, label, color, accent }) {
  const shape = useArrowShape()

  return (
    <group position={[0, y, 0]} rotation={[0, rotY, 0]}>
      <mesh castShadow receiveShadow>
        <extrudeGeometry
          args={[
            shape,
            {
              depth: 0.05,
              bevelEnabled: true,
              bevelThickness: 0.012,
              bevelSize: 0.012,
              bevelSegments: 2,
              curveSegments: 8,
            },
          ]}
        />
        <meshStandardMaterial
          color={color}
          emissive={accent}
          emissiveIntensity={0.35}
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>

      {/* Sabit tutan küçük cıvata */}
      <mesh position={[0.04, 0, 0.052]}>
        <cylinderGeometry args={[0.018, 0.018, 0.02, 10]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#2a2438" metalness={0.8} roughness={0.3} />
      </mesh>

      <Text
        position={[0.32, 0, 0.08]}
        fontSize={0.12}
        fontWeight="bold"
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.008}
        outlineColor="#1a0f2e"
      >
        {label}
      </Text>
    </group>
  )
}

export default function SignPost({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      {/* Taban taşı */}
      <mesh castShadow receiveShadow position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.32, 0.4, 0.16, 14]} />
        <meshStandardMaterial color="#c9b896" roughness={0.85} />
      </mesh>
      <mesh receiveShadow position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.28, 0.32, 0.02, 14]} />
        <meshStandardMaterial color="#b8a680" roughness={0.85} />
      </mesh>

      {/* Ahşap direk */}
      <mesh castShadow position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.055, 0.065, 2.4, 12]} />
        <meshStandardMaterial color="#8b5a3c" roughness={0.85} />
      </mesh>
      {/* Tepe — kubbe */}
      <mesh castShadow position={[0, 2.58, 0]}>
        <coneGeometry args={[0.09, 0.16, 12]} />
        <meshStandardMaterial color="#6b3f28" roughness={0.8} />
      </mesh>
      {/* Tepe — top */}
      <mesh castShadow position={[0, 2.7, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.35} metalness={0.5} />
      </mesh>

      {/* 4 tabela — her biri kendi adasına bakıyor */}
      {/* about: NW  → rotation 3π/4 */}
      <ArrowSign y={2.3} rotY={(3 * Math.PI) / 4} label="HAKKIMDA" color="#f9b572" accent="#f59e42" />
      {/* projects: NE → rotation π/4 */}
      <ArrowSign y={1.85} rotY={Math.PI / 4} label="PROJELER" color="#7dd3fc" accent="#38bdf8" />
      {/* blog: SW → rotation -3π/4 */}
      <ArrowSign y={1.4} rotY={(-3 * Math.PI) / 4} label="BLOG" color="#c4b5fd" accent="#a78bfa" />
      {/* contact: SE → rotation -π/4 */}
      <ArrowSign y={0.95} rotY={-Math.PI / 4} label="ILETISIM" color="#f9a8d4" accent="#f472b6" />
    </group>
  )
}