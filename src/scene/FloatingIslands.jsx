import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import Tree from './props/Tree.jsx'
import Rock from './props/Rock.jsx'
import GrassTuft from './props/GrassTuft.jsx'
import SmokeTrail from './props/SmokeTrail.jsx'
import IslandBottom from './props/IslandBottom.jsx'
import { sections } from '../data/portfolio.js'

export default function FloatingIslands() {
  return (
    <>
      <IslandBase pos={sections[0].islandPos} color="#9ae66e">
        <AboutScene />
      </IslandBase>
      <IslandBase pos={sections[1].islandPos} color="#9ae66e">
        <ProjectsScene />
      </IslandBase>
      <IslandBase pos={sections[2].islandPos} color="#9ae66e">
        <BlogScene />
      </IslandBase>
      <IslandBase pos={sections[3].islandPos} color="#9ae66e">
        <ContactScene />
      </IslandBase>
    </>
  )
}

/* --- Yüzen ada altlığı (çim + kenar overhang + ters toprak koni + sarkan kökler) --- */
function IslandBase({ pos, color, children }) {
  const groupRef = useRef()
  const seed = useRef(Math.random() * Math.PI * 2)

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.position.y = pos[1] + Math.sin(t * 0.6 + seed.current) * 0.08
  })

  return (
    <group ref={groupRef} position={[pos[0], pos[1], pos[2]]}>
      {/* Üst çim — hafif konik frustum */}
      <mesh receiveShadow position={[0, 0.2, 0]}>
        <cylinderGeometry args={[2.22, 2.12, 0.35, 56]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>

      {/* Organik toprak altı — çimin alt kenarıyla (2.12) birleşir */}
      <group position={[0, 0.025, 0]}>
        <IslandBottom topRadius={2.12} depth={3} color="#8f5c3a" segments={56} />
      </group>

      <group position={[0, 0.4, 0]}>{children}</group>
    </group>
  )
}

/* ---------- HAKKIMDA: kulübe + bahçe ---------- */
function AboutScene() {
  return (
    <group>
      {/* Kulübe temel taşı */}
      <mesh receiveShadow position={[0, 0.07, 0]}>
        <boxGeometry args={[1.35, 0.14, 1.15]} />
        <meshStandardMaterial color="#9b8273" roughness={0.9} flatShading />
      </mesh>

      {/* Kulübe gövdesi */}
      <mesh castShadow receiveShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[1.2, 0.85, 1]} />
        <meshStandardMaterial color="#e8c8a0" roughness={0.8} />
      </mesh>

      {/* Köşe kiriş detayı */}
      {[
        [-0.6, 0.55, -0.5],
        [0.6, 0.55, -0.5],
        [-0.6, 0.55, 0.5],
        [0.6, 0.55, 0.5],
      ].map((p, i) => (
        <mesh key={`beam-${i}`} castShadow position={p}>
          <boxGeometry args={[0.06, 0.87, 0.06]} />
          <meshStandardMaterial color="#8b5a3c" />
        </mesh>
      ))}

      {/* Çatı — pyramid */}
      <mesh castShadow position={[0, 1.2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.02, 0.65, 4]} />
        <meshStandardMaterial color="#c2563f" roughness={0.8} flatShading />
      </mesh>
      {/* Çatı tepesi topuzu */}
      <mesh castShadow position={[0, 1.58, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#8b5a3c" />
      </mesh>

      {/* Kapı + çerçeve */}
      <mesh castShadow position={[0, 0.35, 0.51]}>
        <boxGeometry args={[0.36, 0.58, 0.03]} />
        <meshStandardMaterial color="#5a3920" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.35, 0.525]}>
        <boxGeometry args={[0.32, 0.54, 0.004]} />
        <meshStandardMaterial color="#6b3f28" />
      </mesh>
      {/* Kapı tokmağı */}
      <mesh position={[0.1, 0.35, 0.53]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.4} metalness={0.5} />
      </mesh>

      {/* Pencere + çerçeve */}
      <mesh position={[0.42, 0.65, 0.51]}>
        <boxGeometry args={[0.28, 0.28, 0.02]} />
        <meshStandardMaterial color="#6b3f28" />
      </mesh>
      <mesh position={[0.42, 0.65, 0.52]}>
        <boxGeometry args={[0.23, 0.23, 0.01]} />
        <meshStandardMaterial color="#f9e79f" emissive="#fbbf24" emissiveIntensity={0.9} roughness={0.4} />
      </mesh>
      {/* Pencere kolu — çapraz */}
      <mesh position={[0.42, 0.65, 0.525]}>
        <boxGeometry args={[0.24, 0.015, 0.006]} />
        <meshStandardMaterial color="#3a2a1a" />
      </mesh>
      <mesh position={[0.42, 0.65, 0.525]}>
        <boxGeometry args={[0.015, 0.24, 0.006]} />
        <meshStandardMaterial color="#3a2a1a" />
      </mesh>
      {/* Pencere altı saksı */}
      <mesh castShadow position={[0.42, 0.43, 0.58]}>
        <boxGeometry args={[0.3, 0.1, 0.1]} />
        <meshStandardMaterial color="#8b5a3c" />
      </mesh>
      <mesh position={[0.35, 0.52, 0.58]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#f472b6" emissive="#f472b6" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.42, 0.54, 0.58]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.49, 0.52, 0.58]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#f9a8d4" emissive="#f9a8d4" emissiveIntensity={0.3} />
      </mesh>

      {/* Baca — tuğla katmanlı */}
      <mesh castShadow position={[0.4, 1.45, 0]}>
        <boxGeometry args={[0.14, 0.3, 0.14]} />
        <meshStandardMaterial color="#9c5c4e" roughness={0.9} flatShading />
      </mesh>
      <mesh castShadow position={[0.4, 1.62, 0]}>
        <boxGeometry args={[0.17, 0.05, 0.17]} />
        <meshStandardMaterial color="#6b3f28" />
      </mesh>
      <SmokeTrail position={[0.4, 1.66, 0]} count={5} color="#f0eaf0" />

      {/* Küçük bahçe yolu */}
      {[
        [0, 0.15, 0.75],
        [0, 0.15, 1.05],
      ].map((p, i) => (
        <mesh key={`path-${i}`} receiveShadow position={p} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.18, 10]} />
          <meshStandardMaterial color="#d9c29a" roughness={0.9} />
        </mesh>
      ))}

      {/* Yan ağaçlar ve detaylar */}
      <Tree position={[-1.3, 0, 0.4]} scale={0.75} />
      <Tree position={[1.3, 0, -0.3]} scale={0.6} />
      <Rock position={[1.1, 0, 0.8]} scale={0.35} />
      <GrassTuft position={[-0.9, 0, 0.9]} scale={0.9} />
      <GrassTuft position={[0.7, 0, 0.85]} scale={0.85} />
      <GrassTuft position={[-1.6, 0, -0.6]} scale={0.7} />

      {/* Bahçe çalısı */}
      <group position={[-1.2, 0, -0.5]}>
        <mesh castShadow position={[0, 0.15, 0]}>
          <sphereGeometry args={[0.2, 10, 10]} />
          <meshStandardMaterial color="#5fb356" roughness={0.85} flatShading />
        </mesh>
        <mesh castShadow position={[0.15, 0.2, 0.08]}>
          <sphereGeometry args={[0.14, 10, 10]} />
          <meshStandardMaterial color="#6dc470" roughness={0.85} flatShading />
        </mesh>
        <mesh position={[0, 0.3, 0.14]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color="#f472b6" emissive="#f472b6" emissiveIntensity={0.3} />
        </mesh>
      </group>
    </group>
  )
}

/* ---------- PROJELER: açık hava atölye ---------- */
function ProjectsScene() {
  return (
    <group>
      {/* Ahşap platform — masa */}
      <mesh castShadow receiveShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[1.5, 0.08, 0.85]} />
        <meshStandardMaterial color="#d4b896" roughness={0.6} />
      </mesh>
      {/* Masa kenar kirişi */}
      <mesh position={[0, 0.5, 0.42]}>
        <boxGeometry args={[1.5, 0.06, 0.04]} />
        <meshStandardMaterial color="#9c7e5a" />
      </mesh>
      <mesh position={[0, 0.5, -0.42]}>
        <boxGeometry args={[1.5, 0.06, 0.04]} />
        <meshStandardMaterial color="#9c7e5a" />
      </mesh>

      {/* Masa ayakları — X kesimli */}
      {[
        [-0.65, 0.27, -0.35],
        [0.65, 0.27, -0.35],
        [-0.65, 0.27, 0.35],
        [0.65, 0.27, 0.35],
      ].map((p, i) => (
        <mesh key={`leg-${i}`} castShadow position={p}>
          <boxGeometry args={[0.09, 0.55, 0.09]} />
          <meshStandardMaterial color="#6b3f28" />
        </mesh>
      ))}

      {/* Monitor stand */}
      <mesh castShadow position={[0, 0.65, -0.25]}>
        <boxGeometry args={[0.35, 0.05, 0.2]} />
        <meshStandardMaterial color="#1a1820" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0.85, -0.25]}>
        <boxGeometry args={[0.05, 0.4, 0.05]} />
        <meshStandardMaterial color="#1a1820" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Monitor body */}
      <mesh castShadow position={[0, 1.15, -0.25]}>
        <boxGeometry args={[1, 0.65, 0.08]} />
        <meshStandardMaterial color="#0a0a14" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Bezel ince çerçeve */}
      <mesh position={[0, 1.15, -0.21]}>
        <planeGeometry args={[0.94, 0.58]} />
        <meshStandardMaterial color="#1a1a28" />
      </mesh>
      {/* Screen */}
      <mesh position={[0, 1.15, -0.205]}>
        <planeGeometry args={[0.88, 0.53]} />
        <meshStandardMaterial color="#1a1c4a" emissive="#5b6ef5" emissiveIntensity={0.9} roughness={0.25} />
      </mesh>
      {/* Ekran içi UI barları */}
      <mesh position={[-0.25, 1.32, -0.2]}>
        <planeGeometry args={[0.32, 0.05]} />
        <meshStandardMaterial color="#7dd3fc" emissive="#7dd3fc" emissiveIntensity={1.1} />
      </mesh>
      <mesh position={[-0.1, 1.2, -0.2]}>
        <planeGeometry args={[0.55, 0.03]} />
        <meshStandardMaterial color="#f9a8d4" emissive="#f9a8d4" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[-0.2, 1.1, -0.2]}>
        <planeGeometry args={[0.45, 0.03]} />
        <meshStandardMaterial color="#bef264" emissive="#bef264" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[-0.2, 1.0, -0.2]}>
        <planeGeometry args={[0.3, 0.03]} />
        <meshStandardMaterial color="#c4b5fd" emissive="#c4b5fd" emissiveIntensity={0.9} />
      </mesh>

      {/* Klavye */}
      <mesh castShadow position={[-0.15, 0.61, 0.05]}>
        <boxGeometry args={[0.65, 0.05, 0.25]} />
        <meshStandardMaterial color="#14121f" roughness={0.6} />
      </mesh>
      {/* Klavye tuş şeridi (emissive RGB) */}
      <mesh position={[-0.15, 0.636, 0.05]}>
        <boxGeometry args={[0.6, 0.005, 0.22]} />
        <meshStandardMaterial color="#2a2438" emissive="#7c5cff" emissiveIntensity={0.5} />
      </mesh>

      {/* Mouse + pad */}
      <mesh position={[0.45, 0.595, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.28, 0.35]} />
        <meshStandardMaterial color="#1a1820" roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0.45, 0.61, 0.1]}>
        <boxGeometry args={[0.1, 0.03, 0.16]} />
        <meshStandardMaterial color="#14121f" />
      </mesh>

      {/* Kupa */}
      <mesh castShadow position={[-0.55, 0.7, 0.15]}>
        <cylinderGeometry args={[0.08, 0.07, 0.18, 20]} />
        <meshStandardMaterial color="#f9a8d4" roughness={0.5} />
      </mesh>
      <mesh position={[-0.55, 0.79, 0.15]}>
        <cylinderGeometry args={[0.075, 0.075, 0.01, 20]} />
        <meshStandardMaterial color="#3b2015" roughness={0.3} />
      </mesh>
      {/* Kulp */}
      <mesh castShadow position={[-0.47, 0.7, 0.15]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.05, 0.012, 8, 16]} />
        <meshStandardMaterial color="#f9a8d4" />
      </mesh>

      {/* Kitap yığını */}
      <mesh castShadow position={[0.5, 0.595, -0.3]}>
        <boxGeometry args={[0.28, 0.05, 0.34]} />
        <meshStandardMaterial color="#a78bfa" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0.5, 0.645, -0.3]}>
        <boxGeometry args={[0.28, 0.05, 0.34]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.7} />
      </mesh>

      {/* Saksı bitkisi */}
      <group position={[-0.55, 0.61, -0.25]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.06, 0.07, 0.1, 12]} />
          <meshStandardMaterial color="#c88b5a" roughness={0.85} />
        </mesh>
        <mesh castShadow position={[0, 0.14, 0]}>
          <coneGeometry args={[0.09, 0.2, 6]} />
          <meshStandardMaterial color="#6dc470" flatShading />
        </mesh>
        <mesh castShadow position={[-0.05, 0.22, 0.02]} rotation={[0, 0, 0.5]}>
          <coneGeometry args={[0.06, 0.15, 6]} />
          <meshStandardMaterial color="#7dd87f" flatShading />
        </mesh>
      </group>

      {/* Küçük post-it notları */}
      <mesh position={[-0.3, 1.45, -0.24]} rotation={[0, 0, 0.05]}>
        <boxGeometry args={[0.14, 0.14, 0.005]} />
        <meshStandardMaterial color="#fde047" />
      </mesh>
      <mesh position={[0.2, 1.45, -0.24]} rotation={[0, 0, -0.08]}>
        <boxGeometry args={[0.14, 0.14, 0.005]} />
        <meshStandardMaterial color="#f9a8d4" />
      </mesh>

      {/* Sandalye — arkası masanın tersine bakıyor (+z yönünde) */}
      <group position={[0, 0.08, 0.85]}>
        <mesh castShadow position={[0, 0.35, 0]}>
          <boxGeometry args={[0.45, 0.04, 0.4]} />
          <meshStandardMaterial color="#5a3920" roughness={0.7} />
        </mesh>
        <mesh castShadow position={[0, 0.6, 0.2]}>
          <boxGeometry args={[0.45, 0.45, 0.04]} />
          <meshStandardMaterial color="#5a3920" roughness={0.7} />
        </mesh>
        {[
          [-0.18, 0.17, -0.17],
          [0.18, 0.17, -0.17],
          [-0.18, 0.17, 0.17],
          [0.18, 0.17, 0.17],
        ].map((p, i) => (
          <mesh key={`chair-leg-${i}`} castShadow position={p}>
            <boxGeometry args={[0.04, 0.35, 0.04]} />
            <meshStandardMaterial color="#3a2a1a" />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/* ---------- BLOG: kitap köşesi ---------- */
function BlogScene() {
  return (
    <group>
      {/* Ahşap koltuk (okuma koltuğu) */}
      <group position={[-0.5, 0, 0.35]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow position={[0, 0.2, 0]}>
          <boxGeometry args={[0.55, 0.12, 0.5]} />
          <meshStandardMaterial color="#c2563f" roughness={0.85} />
        </mesh>
        <mesh castShadow position={[0, 0.45, -0.2]}>
          <boxGeometry args={[0.55, 0.5, 0.1]} />
          <meshStandardMaterial color="#a0522d" roughness={0.85} />
        </mesh>
        {/* Yastık */}
        <mesh castShadow position={[0, 0.3, 0.05]} rotation={[0, 0, 0.1]}>
          <boxGeometry args={[0.4, 0.1, 0.3]} />
          <meshStandardMaterial color="#f9a8d4" roughness={0.9} />
        </mesh>
        {/* Bacaklar */}
        {[
          [-0.22, 0.07, -0.2],
          [0.22, 0.07, -0.2],
          [-0.22, 0.07, 0.2],
          [0.22, 0.07, 0.2],
        ].map((p, i) => (
          <mesh key={`sofa-leg-${i}`} castShadow position={p}>
            <boxGeometry args={[0.06, 0.15, 0.06]} />
            <meshStandardMaterial color="#3a2a1a" />
          </mesh>
        ))}
      </group>

      {/* === YAZI MASASI === */}
      <group position={[0.55, 0, 0.15]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Masa tablası — üst yüzeyi y=0.505 */}
        <mesh castShadow receiveShadow position={[0, 0.48, 0]}>
          <boxGeometry args={[0.95, 0.05, 0.7]} />
          <meshStandardMaterial color="#d4b896" roughness={0.6} />
        </mesh>
        {/* Masa yan kirişleri */}
        <mesh position={[0, 0.44, 0.33]}>
          <boxGeometry args={[0.95, 0.05, 0.04]} />
          <meshStandardMaterial color="#9c7e5a" />
        </mesh>
        <mesh position={[0, 0.44, -0.33]}>
          <boxGeometry args={[0.95, 0.05, 0.04]} />
          <meshStandardMaterial color="#9c7e5a" />
        </mesh>
        {/* 4 ayak */}
        {[
          [-0.42, 0.24, -0.3],
          [0.42, 0.24, -0.3],
          [-0.42, 0.24, 0.3],
          [0.42, 0.24, 0.3],
        ].map((p, i) => (
          <mesh key={`desk-leg-${i}`} castShadow position={p}>
            <boxGeometry args={[0.07, 0.48, 0.07]} />
            <meshStandardMaterial color="#6b3f28" />
          </mesh>
        ))}

        {/* === MASANIN ÜSTÜNDEKİLER (y=0.505 üstünde) === */}

        {/* Masa lambası — sol arka köşe */}
        <group position={[-0.32, 0.53, -0.18]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.12, 0.05, 16]} />
            <meshStandardMaterial color="#8b5a3c" />
          </mesh>
          <mesh castShadow position={[0, 0.23, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.42, 8]} />
            <meshStandardMaterial color="#5a3920" />
          </mesh>
          <mesh castShadow position={[0, 0.48, 0]}>
            <coneGeometry args={[0.15, 0.22, 16, 1, true]} />
            <meshStandardMaterial
              color="#fef3c7"
              emissive="#fbbf24"
              emissiveIntensity={0.7}
              side={2}
              roughness={0.4}
            />
          </mesh>
          <pointLight position={[0, 0.35, 0]} intensity={0.55} color="#fbbf24" distance={2} />
        </group>

        {/* Açık kitap — masanın ortası */}
        <group position={[0.05, 0.515, 0.05]} rotation={[0, 0.25, 0]}>
          <mesh castShadow position={[-0.17, 0, 0]} rotation={[0, 0, 0.04]}>
            <boxGeometry args={[0.32, 0.015, 0.42]} />
            <meshStandardMaterial color="#fef8e8" roughness={0.9} />
          </mesh>
          <mesh castShadow position={[0.17, 0, 0]} rotation={[0, 0, -0.04]}>
            <boxGeometry args={[0.32, 0.015, 0.42]} />
            <meshStandardMaterial color="#fef8e8" roughness={0.9} />
          </mesh>
          <mesh castShadow position={[0, -0.01, 0]}>
            <boxGeometry args={[0.04, 0.025, 0.44]} />
            <meshStandardMaterial color="#7c5cff" roughness={0.7} />
          </mesh>
          {/* Kitap ayracı */}
          <mesh position={[0.08, 0.011, 0.13]} rotation={[0, 0, -0.04]}>
            <boxGeometry args={[0.02, 0.002, 0.28]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={`ls-${i}`} position={[-0.17, 0.009, -0.1 + i * 0.09]} rotation={[0, 0, 0.04]}>
              <boxGeometry args={[0.22, 0.004, 0.013]} />
              <meshStandardMaterial color="#b5a8c9" />
            </mesh>
          ))}
          {[0, 1, 2].map((i) => (
            <mesh key={`rs-${i}`} position={[0.17, 0.009, -0.1 + i * 0.09]} rotation={[0, 0, -0.04]}>
              <boxGeometry args={[0.22, 0.004, 0.013]} />
              <meshStandardMaterial color="#b5a8c9" />
            </mesh>
          ))}
        </group>

        {/* Çay fincanı — sağ ön */}
        <mesh castShadow position={[0.35, 0.555, 0.2]}>
          <cylinderGeometry args={[0.07, 0.06, 0.1, 20]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
        <mesh position={[0.35, 0.6, 0.2]}>
          <cylinderGeometry args={[0.065, 0.065, 0.005, 20]} />
          <meshStandardMaterial color="#3b2015" roughness={0.3} />
        </mesh>
        <mesh castShadow position={[0.42, 0.555, 0.2]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.035, 0.01, 8, 16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>

        {/* Mürekkep hokkası — sağ arka */}
        <mesh castShadow position={[0.32, 0.58, -0.2]}>
          <cylinderGeometry args={[0.075, 0.095, 0.15, 16]} />
          <meshStandardMaterial color="#1e1738" roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Tüy kalem — hokkaya daldırılmış */}
        <mesh castShadow position={[0.36, 0.78, -0.16]} rotation={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.007, 0.014, 0.4, 8]} />
          <meshStandardMaterial color="#fef8e8" />
        </mesh>
        <mesh castShadow position={[0.45, 0.95, -0.12]} rotation={[0, 0, 0.5]}>
          <coneGeometry args={[0.035, 0.18, 12]} />
          <meshStandardMaterial color="#f9a8d4" roughness={0.6} />
        </mesh>
      </group>

      {/* Küçük kitaplık-stand */}
      <mesh castShadow receiveShadow position={[-0.6, 0.15, -0.6]}>
        <boxGeometry args={[0.7, 0.3, 0.45]} />
        <meshStandardMaterial color="#c88b5a" roughness={0.75} />
      </mesh>
      {/* Alt yatay kitaplar */}
      <mesh castShadow position={[-0.6, 0.35, -0.6]}>
        <boxGeometry args={[0.62, 0.08, 0.38]} />
        <meshStandardMaterial color="#a78bfa" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[-0.6, 0.43, -0.6]}>
        <boxGeometry args={[0.62, 0.08, 0.38]} />
        <meshStandardMaterial color="#f472b6" roughness={0.7} />
      </mesh>

      {/* Dikey kitaplar */}
      <mesh castShadow position={[-0.8, 0.72, -0.6]}>
        <boxGeometry args={[0.1, 0.3, 0.3]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[-0.68, 0.74, -0.6]}>
        <boxGeometry args={[0.1, 0.34, 0.3]} />
        <meshStandardMaterial color="#ef4444" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[-0.55, 0.71, -0.6]}>
        <boxGeometry args={[0.1, 0.28, 0.3]} />
        <meshStandardMaterial color="#22c55e" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[-0.42, 0.73, -0.6]}>
        <boxGeometry args={[0.1, 0.32, 0.3]} />
        <meshStandardMaterial color="#7dd3fc" roughness={0.7} />
      </mesh>

      {/* Halı */}
      <mesh receiveShadow position={[0, 0.035, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.6, 1.2]} />
        <meshStandardMaterial color="#7c5cff" roughness={0.95} transparent opacity={0.35} />
      </mesh>

      {/* Düşen yaprak detayları */}
      <mesh position={[-1.2, 0.035, 0.6]} rotation={[-Math.PI / 2, 0, 0.3]}>
        <circleGeometry args={[0.06, 6]} />
        <meshStandardMaterial color="#f9a8d4" />
      </mesh>
      <mesh position={[1.1, 0.035, -0.8]} rotation={[-Math.PI / 2, 0, -0.5]}>
        <circleGeometry args={[0.05, 6]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>

      <GrassTuft position={[-1.4, 0, -0.3]} scale={0.7} />
    </group>
  )
}

/* ---------- İLETİŞİM: göl + posta kutusu + iskele ---------- */
function ContactScene() {
  const lakeRef = useRef()
  useFrame(({ clock }) => {
    if (!lakeRef.current) return
    const t = clock.elapsedTime
    lakeRef.current.material.emissiveIntensity = 0.2 + Math.sin(t * 1.5) * 0.08
  })

  return (
    <group>
      {/* Göl çerçevesi — taş kenar */}
      <mesh receiveShadow position={[0.3, 0.04, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.1, 1.35, 32]} />
        <meshStandardMaterial color="#c4b89e" roughness={0.9} flatShading />
      </mesh>

      {/* Göl suyu */}
      <mesh
        ref={lakeRef}
        receiveShadow
        position={[0.3, 0.05, 0.3]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[1.1, 40]} />
        <meshStandardMaterial
          color="#7dd3fc"
          emissive="#38bdf8"
          emissiveIntensity={0.22}
          roughness={0.05}
          metalness={0.7}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Dalga halkaları */}
      {[0.35, 0.6, 0.85].map((r, i) => (
        <mesh key={`wave-${i}`} position={[0.3, 0.055, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r, r + 0.02, 40]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.25 - i * 0.05} />
        </mesh>
      ))}

      {/* İskele */}
      <group position={[-0.7, 0, 0.5]}>
        <mesh castShadow receiveShadow position={[0, 0.15, 0]}>
          <boxGeometry args={[0.8, 0.05, 0.32]} />
          <meshStandardMaterial color="#9c7e5a" roughness={0.85} flatShading />
        </mesh>
        {/* Iskele tahta çizgileri */}
        {[-0.25, -0.08, 0.08, 0.25].map((x, i) => (
          <mesh key={`plank-${i}`} position={[x, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.03, 0.32]} />
            <meshStandardMaterial color="#6b3f28" />
          </mesh>
        ))}
        {/* Iskele ayakları */}
        <mesh castShadow position={[0.35, 0.07, -0.13]}>
          <cylinderGeometry args={[0.025, 0.025, 0.3, 6]} />
          <meshStandardMaterial color="#5a3920" />
        </mesh>
        <mesh castShadow position={[0.35, 0.07, 0.13]}>
          <cylinderGeometry args={[0.025, 0.025, 0.3, 6]} />
          <meshStandardMaterial color="#5a3920" />
        </mesh>
      </group>

      {/* Posta kutusu — direk */}
      <group position={[-1.2, 0, -0.7]}>
        <mesh castShadow position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.8, 8]} />
          <meshStandardMaterial color="#6b3f28" />
        </mesh>
        {/* Kutu */}
        <mesh castShadow position={[0, 0.9, 0]}>
          <boxGeometry args={[0.28, 0.22, 0.38]} />
          <meshStandardMaterial color="#ef4444" roughness={0.6} />
        </mesh>
        {/* Kapı çerçevesi */}
        <mesh position={[0, 0.9, 0.19]}>
          <boxGeometry args={[0.22, 0.16, 0.01]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
        {/* Mektup — yarı görünür */}
        <mesh position={[0, 0.93, 0.2]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.18, 0.11, 0.005]} />
          <meshStandardMaterial color="#fef8e8" />
        </mesh>
        {/* Bayrak */}
        <mesh position={[-0.15, 1, 0]}>
          <boxGeometry args={[0.015, 0.22, 0.015]} />
          <meshStandardMaterial color="#1e1738" />
        </mesh>
        <mesh position={[-0.1, 1.04, 0]}>
          <boxGeometry args={[0.09, 0.07, 0.015]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
        </mesh>
        {/* Numara */}
        <mesh position={[0, 0.83, 0.2]}>
          <circleGeometry args={[0.03, 12]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.4} />
        </mesh>
      </group>

      {/* Nilüferler */}
      <group position={[0, 0.06, 0.5]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.2, 12]} />
          <meshStandardMaterial color="#6dc470" flatShading />
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#f9a8d4" emissive="#f9a8d4" emissiveIntensity={0.4} />
        </mesh>
      </group>
      <mesh position={[0.7, 0.06, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.16, 12]} />
        <meshStandardMaterial color="#7dd87f" flatShading />
      </mesh>

      {/* Küçük kurbağa — nilüferin üstünde */}
      <group position={[0, 0.11, 0.5]}>
        <mesh castShadow>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color="#5fb356" roughness={0.8} />
        </mesh>
        <mesh position={[0.035, 0.05, 0.04]}>
          <sphereGeometry args={[0.022, 10, 10]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-0.035, 0.05, 0.04]}>
          <sphereGeometry args={[0.022, 10, 10]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.035, 0.055, 0.055]}>
          <sphereGeometry args={[0.011, 10, 10]} />
          <meshStandardMaterial color="#0a0a14" />
        </mesh>
        <mesh position={[-0.035, 0.055, 0.055]}>
          <sphereGeometry args={[0.011, 10, 10]} />
          <meshStandardMaterial color="#0a0a14" />
        </mesh>
      </group>

      {/* Kamışlar */}
      {[
        [-1.0, 0, 1.1],
        [1.2, 0, 1.3],
        [1.5, 0, -0.1],
      ].map((p, i) => (
        <group key={`reed-${i}`} position={p}>
          {[0, 1, 2].map((j) => (
            <mesh key={j} castShadow position={[(j - 1) * 0.08, 0.15 + (j % 2) * 0.05, 0]}>
              <cylinderGeometry args={[0.015, 0.02, 0.35, 6]} />
              <meshStandardMaterial color="#6dc470" />
            </mesh>
          ))}
          {[0, 1, 2].map((j) => (
            <mesh key={`top-${j}`} position={[(j - 1) * 0.08, 0.38 + (j % 2) * 0.05, 0]}>
              <coneGeometry args={[0.025, 0.08, 6]} />
              <meshStandardMaterial color="#8b5a3c" />
            </mesh>
          ))}
        </group>
      ))}

      {/* Küçük kağıt gemi — gölde süzülüyor */}
      <FloatingBoat />

      <Tree position={[1, 0, -1]} scale={0.65} />
      <Rock position={[-1.5, 0, 0]} scale={0.4} />
      <GrassTuft position={[-1.2, 0, 1.1]} scale={0.8} />
    </group>
  )
}

function FloatingBoat() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.position.x = 0.3 + Math.sin(t * 0.4) * 0.5
    ref.current.position.z = 0.3 + Math.cos(t * 0.4) * 0.5
    ref.current.rotation.y = Math.cos(t * 0.4) * 0.4
    ref.current.position.y = 0.1 + Math.sin(t * 2) * 0.015
  })
  return (
    <group ref={ref}>
      <mesh castShadow rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.12, 0.02, 0.04]} />
        <meshStandardMaterial color="#fef8e8" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 0.04, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[0.12, 0.02, 0.04]} />
        <meshStandardMaterial color="#fef8e8" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <coneGeometry args={[0.04, 0.08, 4]} />
        <meshStandardMaterial color="#f9a8d4" />
      </mesh>
    </group>
  )
}