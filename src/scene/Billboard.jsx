import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFrame } from '@react-three/fiber'
import { Float, Image } from '@react-three/drei'
import { ROTATE_MS } from '../data/billboards.js'

function Drone({ position, rotation }) {
  const prop1 = useRef()
  const prop2 = useRef()
  const prop3 = useRef()
  const prop4 = useRef()

  useFrame((state, delta) => {
    const speed = 25
    if (prop1.current) prop1.current.rotation.y += delta * speed
    if (prop2.current) prop2.current.rotation.y -= delta * speed
    if (prop3.current) prop3.current.rotation.y += delta * speed
    if (prop4.current) prop4.current.rotation.y -= delta * speed
  })

  return (
    <group position={position} rotation={rotation}>
      {/* Gövde */}
      <mesh castShadow>
        <boxGeometry args={[0.2, 0.08, 0.2]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Sensör / Göz */}
      <mesh position={[0, 0, 0.1]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={2} />
      </mesh>
      
      {/* Kollar ve Pervaneler */}
      {[
        [-0.12, -0.12, prop1],
        [0.12, -0.12, prop2],
        [-0.12, 0.12, prop3],
        [0.12, 0.12, prop4]
      ].map(([x, z, ref], i) => (
        <group key={i} position={[x, 0.02, z]}>
          <mesh castShadow position={[0, -0.02, 0]} rotation={[Math.PI/2, 0, Math.atan2(x, z)]}>
            <cylinderGeometry args={[0.012, 0.012, 0.18]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
          <mesh castShadow position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.04]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          {/* Pervane */}
          <mesh ref={ref} position={[0, 0.04, 0]}>
            <boxGeometry args={[0.16, 0.005, 0.015]} />
            <meshStandardMaterial color="#a78bfa" opacity={0.6} transparent />
          </mesh>
        </group>
      ))}
      
      {/* Pano bağlantı kablosu */}
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.16]} />
        <meshStandardMaterial color="#333" metalness={0.8} />
      </mesh>
    </group>
  )
}

export default function Billboard({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  feed,
}) {
  const navigate = useNavigate()
  const posts = feed.posts ?? []
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (posts.length <= 1) return
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % posts.length)
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [posts.length])

  const post = posts[idx]

  return (
    <Float speed={2} rotationIntensity={0.15} floatIntensity={0.25} floatingRange={[-0.08, 0.08]}>
      <group position={position} rotation={rotation}>
        {/* Sol Drone */}
        <Drone position={[-0.75, 2.15, 0]} />
        {/* Sağ Drone */}
        <Drone position={[0.75, 2.15, 0]} />

        {/* Pano arkalık — ahşap çerçeve */}
        <mesh castShadow receiveShadow position={[0, 1.35, -0.04]}>
          <boxGeometry args={[1.7, 1.15, 0.08]} />
          <meshStandardMaterial color="#c88b5a" roughness={0.8} />
        </mesh>
        {/* Pano iç — krem yüzey */}
        <mesh position={[0, 1.35, 0.005]}>
          <boxGeometry args={[1.55, 1, 0.05]} />
          <meshStandardMaterial color="#fef3e0" roughness={0.7} />
        </mesh>
        {/* Üst çatı şeridi */}
        <mesh castShadow position={[0, 1.95, 0]}>
          <boxGeometry args={[1.85, 0.1, 0.12]} />
          <meshStandardMaterial color="#a0522d" roughness={0.8} />
        </mesh>

        {/* İçerik — 3D Image (Bugsız, taşmasız, kusursuz görünüm) */}
        <group position={[0, 1.35, 0.035]}>
          {post?.cover ? (
            <Image
              url={post.cover}
              scale={[1.55, 1]}
              transparent
              onClick={(e) => {
                e.stopPropagation()
                if (post.href && post.href !== '#') navigate(post.href)
              }}
              onPointerOver={() => { document.body.style.cursor = 'pointer' }}
              onPointerOut={() => { document.body.style.cursor = 'auto' }}
            />
          ) : (
            <mesh
              onClick={(e) => {
                e.stopPropagation()
                if (post?.href && post.href !== '#') navigate(post.href)
              }}
              onPointerOver={() => { document.body.style.cursor = 'pointer' }}
              onPointerOut={() => { document.body.style.cursor = 'auto' }}
            >
              <planeGeometry args={[1.55, 1]} />
              <meshBasicMaterial color={feed.accent} transparent opacity={0.8} />
            </mesh>
          )}

          {/* Pagination Indicators (3D Meshes) */}
          {posts.length > 1 && (
            <group position={[0, -0.42, 0.01]}>
              {posts.map((_, i) => {
                const isSelected = i === idx;
                const width = isSelected ? 0.08 : 0.03;
                const spacing = 0.06;
                const totalWidth = (posts.length - 1) * spacing;
                const x = (i * spacing) - totalWidth / 2;
                return (
                  <mesh key={i} position={[x, 0, 0]}>
                    <planeGeometry args={[width, 0.015]} />
                    <meshBasicMaterial color={isSelected ? feed.accent : '#ffffff'} transparent opacity={isSelected ? 1 : 0.4} />
                  </mesh>
                );
              })}
            </group>
          )}
        </group>
      </group>
    </Float>
  )
}