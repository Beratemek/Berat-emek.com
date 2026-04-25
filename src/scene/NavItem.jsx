import { useRef, useState } from 'react'
import { Float, Text3D, Center } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { THEMES } from '../data/themes.js'

const FONT_URL = 'https://threejs.org/examples/fonts/helvetiker_bold.typeface.json'

// Yumuşak radyal beyaz halo dokusu — tüm NavItem'lar paylaşır
let sharedHaloTexture = null
function getHaloTexture() {
  if (sharedHaloTexture) return sharedHaloTexture
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.7, 'rgba(255,255,255,0.15)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  sharedHaloTexture = new THREE.CanvasTexture(canvas)
  sharedHaloTexture.needsUpdate = true
  return sharedHaloTexture
}

export default function NavItem({ section, onSelect, isActive, isDimmed, theme = 'day' }) {
  const T = THEMES[theme]
  const groupRef = useRef()
  const matRef = useRef()
  const [hovered, setHovered] = useState(false)

  useFrame(({ camera }, delta) => {
    if (!groupRef.current) return

    // Tüm labellar aynı açıya baksın: origin'den kameraya yönelim (dünya seviyesinde)
    groupRef.current.rotation.y = Math.atan2(camera.position.x, camera.position.z)

    const targetScale = isActive ? 1.25 : hovered ? 1.1 : isDimmed ? 0.85 : 1
    const current = groupRef.current.scale.x
    const next = THREE.MathUtils.lerp(current, targetScale, Math.min(1, delta * 6))
    groupRef.current.scale.setScalar(next)

    if (matRef.current) {
      const targetEmissive = isActive ? 1.2 : hovered ? 0.85 : isDimmed ? 0.1 : 0.55
      matRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        matRef.current.emissiveIntensity,
        targetEmissive,
        Math.min(1, delta * 5)
      )
      const targetOpacity = isDimmed ? 0.3 : 1
      matRef.current.opacity = THREE.MathUtils.lerp(
        matRef.current.opacity,
        targetOpacity,
        Math.min(1, delta * 5)
      )
    }
  })

  return (
    <Float speed={1.6} rotationIntensity={0} floatIntensity={0.4} floatingRange={[-0.08, 0.08]}>
      <group
        ref={groupRef}
        position={section.position}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(section.id)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        {/* Arka halo — yumuşak radyal gradient, label genişliğine göre ölçeklenir */}
        <mesh position={[0, 0.1, -0.15]}>
          <planeGeometry args={[section.label.length * 0.38 + 1.1, 1.4]} />
          <meshBasicMaterial
            map={getHaloTexture()}
            transparent
            opacity={(isDimmed ? 0.35 : T.haloOpacity)}
            depthWrite={false}
          />
        </mesh>

        <Center>
          <Text3D
            font={FONT_URL}
            size={0.48}
            height={0.14}
            curveSegments={12}
            bevelEnabled
            bevelThickness={0.02}
            bevelSize={0.014}
            bevelOffset={0}
            bevelSegments={5}
            castShadow
          >
            {section.label}
            <meshStandardMaterial
              ref={matRef}
              color={section.accent ?? section.color}
              emissive={section.accent ?? section.color}
              emissiveIntensity={0.75}
              roughness={0.25}
              metalness={0.2}
              transparent
              opacity={1}
            />
          </Text3D>
        </Center>
      </group>
    </Float>
  )
}