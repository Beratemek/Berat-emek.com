import Tree from './props/Tree.jsx'
import Rock from './props/Rock.jsx'
import GrassTuft from './props/GrassTuft.jsx'
import IslandBottom from './props/IslandBottom.jsx'
import Billboard from './Billboard.jsx'
import SignPost from './SignPost.jsx'
import { billboardFeeds } from '../data/billboards.js'

function toFeed(posts, heading, accent) {
  if (!posts || posts.length === 0) return null
  return {
    heading,
    accent,
    posts: posts.slice(0, 5).map((p) => ({
      id: p.id,
      kind: p.kind,
      title: p.title,
      excerpt: p.excerpt || '',
      tag: (p.tags && p.tags[0]) || p.kind.toUpperCase(),
      href: p.slug ? `/${p.kind}/${p.slug}` : '#',
      cover: p.cover || null,
    })),
  }
}

export default function CentralIsland({ content }) {
  const leftFeed = toFeed(content?.blogPosts, 'BLOG', '#a78bfa') ?? billboardFeeds.left
  const rightFeed = toFeed(content?.projectPosts, 'PROJELER', '#38bdf8') ?? billboardFeeds.right

  return (
    <group position={[0, 0, 0]}>
      {/* Ana çim — hafif konik frustum (üst 3.42, alt 3.3) — kenarlar yumuşak eğim */}
      <mesh receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[3.42, 3.3, 0.4, 64]} />
        <meshStandardMaterial color="#9ae66e" roughness={0.85} />
      </mesh>

      {/* Organik toprak altı — çimin alt kenarıyla (3.3) pürüzsüz birleşir */}
      <group position={[0, -0.2, 0]}>
        <IslandBottom topRadius={3.3} depth={4.4} color="#8f5c3a" segments={64} />
      </group>


      {/* Taş yolu — merkez halka */}
      <mesh receiveShadow position={[0, 0.21, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.9, 24]} />
        <meshStandardMaterial color="#d9c29a" roughness={0.9} />
      </mesh>

      {/* Ayak taşları — 4 yöne dağınık */}
      {[
        [-1.4, -1.4, 0.35],
        [-2.1, -2.1, 0.3],
        [-2.7, -2.7, 0.25],
        [1.4, -1.4, 0.35],
        [2.1, -2.1, 0.3],
        [2.7, -2.7, 0.25],
        [-1.4, 1.4, 0.35],
        [-2.1, 2.1, 0.3],
        [1.4, 1.4, 0.35],
        [2.1, 2.1, 0.3],
      ].map(([x, z, r], i) => (
        <mesh
          key={`step-${i}`}
          receiveShadow
          position={[x, 0.21, z]}
          rotation={[-Math.PI / 2, 0, Math.random() * Math.PI]}
        >
          <circleGeometry args={[r, 8]} />
          <meshStandardMaterial color="#e8d4a8" roughness={0.9} />
        </mesh>
      ))}

      {/* === REKLAM PANOLARI === */}
      <Billboard position={[-1.5, 0.2, 0.2]} rotation={[0, Math.PI / 5, 0]} feed={leftFeed} />
      <Billboard position={[1.5, 0.2, 0.2]} rotation={[0, -Math.PI / 5, 0]} feed={rightFeed} />

      {/* Ağaçlar — köşelere yerleşik */}
      <Tree position={[-2.5, 0.2, -1.2]} scale={1.0} />
      <Tree position={[2.5, 0.2, -1.2]} scale={0.9} />
      <Tree position={[0, 0.2, -2.7]} scale={1.05} />
      <Tree position={[-1.6, 0.2, -2.3]} scale={0.7} />

      {/* Taşlar */}
      <Rock position={[-2.6, 0.2, 1.6]} scale={0.5} />
      <Rock position={[2.6, 0.2, 1.6]} scale={0.55} />
      <Rock position={[-0.3, 0.2, 2.8]} scale={0.35} />

      {/* Çim tutamları — farklı yerlerde */}
      {[
        [1.8, 0.2, 2.2, 1],
        [-1.8, 0.2, 2.2, 0.9],
        [2.2, 0.2, -0.2, 1.1],
        [-2.3, 0.2, 0.3, 1.0],
        [0.7, 0.2, -1.8, 0.8],
        [-0.7, 0.2, -1.6, 0.85],
      ].map(([x, y, z, s], i) => (
        <GrassTuft key={`tuft-${i}`} position={[x, y, z]} scale={s} />
      ))}

      {/* Çiçekler — sap + taç */}
      {[
        [1, 1.9, '#f472b6'],
        [-1, 2, '#fbbf24'],
        [2.3, 0.9, '#f9a8d4'],
        [-2.3, 0.9, '#fde047'],
        [0.3, 2.5, '#f472b6'],
        [-0.4, 2.4, '#fbbf24'],
        [1.9, 1.2, '#c4b5fd'],
        [-1.5, 1.2, '#7dd3fc'],
      ].map(([x, z, color], i) => (
        <group key={`flower-${i}`} position={[x, 0.21, z]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.008, 0.008, 0.15, 4]} />
            <meshStandardMaterial color="#5fb356" />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <sphereGeometry args={[0.065, 10, 10]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#fde047" emissive="#fde047" emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}

      {/* Fener direkleri — panoların iki yanı, belirgin aralıklı */}
      {[
        [-2.5, 0.21, 1.4],
        [2.5, 0.21, 1.4],
      ].map(([x, y, z], i) => (
        <group key={`lamp-${i}`} position={[x, y, z]}>
          {/* Direk — taban çimde (y=0 local), tepesi y=0.9'da */}
          <mesh castShadow position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 0.9, 8]} />
            <meshStandardMaterial color="#2a2438" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Direk tabanı — çim üstü */}
          <mesh castShadow position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.07, 0.09, 0.06, 12]} />
            <meshStandardMaterial color="#2a2438" metalness={0.5} />
          </mesh>
          {/* Üst platform / montaj kutusu */}
          <mesh castShadow position={[0, 0.93, 0]}>
            <boxGeometry args={[0.18, 0.06, 0.18]} />
            <meshStandardMaterial color="#2a2438" metalness={0.5} />
          </mesh>
          {/* Bulb */}
          <mesh position={[0, 1.04, 0]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial
              color="#fef3c7"
              emissive="#fbbf24"
              emissiveIntensity={1.2}
              roughness={0.3}
            />
          </mesh>
          <pointLight position={[0, 1.04, 0]} intensity={0.5} color="#fbbf24" distance={3.5} />
          {/* Şapka */}
          <mesh castShadow position={[0, 1.17, 0]}>
            <coneGeometry args={[0.1, 0.1, 8]} />
            <meshStandardMaterial color="#2a2438" />
          </mesh>
        </group>
      ))}

      {/* Yönlendirme tabelası — merkez */}
      <SignPost position={[0, 0.21, 0]} />
    </group>
  )
}