import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  OrbitControls,
  OrthographicCamera,
  SoftShadows,
  Stars,
} from '@react-three/drei'
import { useThree } from '@react-three/fiber'

import CentralIsland from './CentralIsland.jsx'
import FloatingIslands from './FloatingIslands.jsx'
import Clouds from './Clouds.jsx'
import NavItem from './NavItem.jsx'
import CameraController from './CameraController.jsx'
import Fireflies from './props/Fireflies.jsx'
import { sections } from '../data/portfolio.js'
import { THEMES } from '../data/themes.js'

export default function Scene({ activeSection, onSelect, theme = 'day', content }) {
  const active = sections.find((s) => s.id === activeSection) ?? null
  const T = THEMES[theme]

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{
        position: 'fixed',
        inset: 0,
        background: T.bg,
        transition: 'background 0.8s ease',
      }}
    >
      <OrthographicCamera makeDefault position={[12, 7, 16]} zoom={55} near={0.1} far={120} />
      <ResponsiveZoom />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 1.9}
      />

      <CameraController target={active} />

      <fog attach="fog" args={[T.fog.color, T.fog.near, T.fog.far]} />

      <ambientLight intensity={T.ambient.intensity} color={T.ambient.color} />
      <hemisphereLight args={[T.hemi.sky, T.hemi.ground, T.hemi.intensity]} />
      <directionalLight
        position={T.sun.position}
        intensity={T.sun.intensity}
        color={T.sun.color}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      >
        <orthographicCamera attach="shadow-camera" args={[-16, 16, 16, -16, 0.1, 50]} />
      </directionalLight>

      {/* Gece modunda ay ışığı parıltısı */}
      {theme === 'night' && (
        <pointLight
          position={[-8, 14, 10]}
          intensity={0.8}
          color="#c4d4ff"
          distance={30}
        />
      )}

      <SoftShadows size={28} samples={12} focus={0.9} />

      <Suspense fallback={null}>
        {T.stars && <Stars radius={60} depth={40} count={2000} factor={4} fade speed={0.5} />}
        {theme === 'night' && (
          <Fireflies count={40} radius={12} height={5} color="#fef3c7" />
        )}
        <CentralIsland content={content} />
        <FloatingIslands />
        <Clouds theme={theme} />
        {sections.map((s) => (
          <NavItem
            key={s.id}
            section={s}
            onSelect={onSelect}
            isActive={activeSection === s.id}
            isDimmed={!!activeSection && activeSection !== s.id}
            theme={theme}
          />
        ))}
      </Suspense>
    </Canvas>
  )
}

/* Mobilde kamera zoom'unu ekrana sığacak şekilde ayarla */
function ResponsiveZoom() {
  const { camera, size } = useThree()

  useEffect(() => {
    const w = size.width
    let zoom = 55 // masaüstü varsayılan
    if (w < 480) zoom = 28
    else if (w < 640) zoom = 32
    else if (w < 768) zoom = 38
    else if (w < 1024) zoom = 45
    camera.zoom = zoom
    camera.updateProjectionMatrix()
  }, [size.width, camera])

  return null
}