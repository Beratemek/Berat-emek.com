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

const TRANSITION_MS = 750
const BASE_W = 1.55
const BASE_H = 1.0
const SLIDE_AMP = 0.05

function setImageOpacity(mesh, value) {
  if (!mesh?.material) return
  const u = mesh.material.uniforms
  if (u?.opacity) u.opacity.value = value
  else mesh.material.opacity = value
}

export default function Billboard({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  feed,
}) {
  const navigate = useNavigate()
  const posts = feed.posts ?? []
  const [idx, setIdx] = useState(0)

  const visibleIdxRef = useRef(0)
  const targetIdxRef = useRef(0)
  const transitionStartRef = useRef(null)
  const meshRefs = useRef([])

  useEffect(() => {
    visibleIdxRef.current = idx
  }, [idx])

  // posts uzunluğu değişirse ref dizisini temizle
  useEffect(() => {
    meshRefs.current.length = posts.length
  }, [posts.length])

  useEffect(() => {
    if (posts.length <= 1) return
    const id = setInterval(() => {
      if (transitionStartRef.current !== null) return
      targetIdxRef.current = (visibleIdxRef.current + 1) % posts.length
      transitionStartRef.current = performance.now()
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [posts.length])

  useFrame(() => {
    const refs = meshRefs.current

    if (transitionStartRef.current === null) {
      // Sabit durum: sadece görünür olan opaklık 1, diğerleri 0
      for (let i = 0; i < refs.length; i++) {
        const mesh = refs[i]
        if (!mesh) continue
        const visible = i === visibleIdxRef.current
        setImageOpacity(mesh, visible ? 1 : 0)
        mesh.scale.set(BASE_W, BASE_H, 1)
        mesh.position.x = 0
      }
      return
    }

    const t = Math.min((performance.now() - transitionStartRef.current) / TRANSITION_MS, 1)
    // ease-in-out cubic
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    const ci = visibleIdxRef.current
    const ti = targetIdxRef.current

    for (let i = 0; i < refs.length; i++) {
      const mesh = refs[i]
      if (!mesh) continue

      let opacity = 0
      let scaleMul = 1
      let xOff = 0

      if (i === ci) {
        // Çıkan görsel: sola süzülerek silinir
        opacity = 1 - eased
        scaleMul = 1 - eased * 0.04
        xOff = -eased * SLIDE_AMP
      } else if (i === ti) {
        // Giren görsel: sağdan kayarak belirir
        opacity = eased
        scaleMul = 0.96 + eased * 0.04
        xOff = (1 - eased) * SLIDE_AMP
      }

      setImageOpacity(mesh, opacity)
      mesh.scale.set(BASE_W * scaleMul, BASE_H * scaleMul, 1)
      mesh.position.x = xOff
    }

    if (t >= 1) {
      transitionStartRef.current = null
      visibleIdxRef.current = ti
      setIdx(ti)
    }
  })

  const handleClick = (e) => {
    e.stopPropagation()
    const post = posts[visibleIdxRef.current]
    if (post?.href && post.href !== '#') navigate(post.href)
  }
  const handlePointerOver = () => { document.body.style.cursor = 'pointer' }
  const handlePointerOut = () => { document.body.style.cursor = 'auto' }

  const hasAnyCover = posts.some((p) => p?.cover)

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

        {/* İçerik — tüm görseller üst üste, opaklık ile karıştırılır */}
        <group position={[0, 1.35, 0.035]}>
          {hasAnyCover ? (
            posts.map((post, i) => post?.cover ? (
              <Image
                key={i}
                ref={(el) => { meshRefs.current[i] = el }}
                url={post.cover}
                scale={[BASE_W, BASE_H]}
                transparent
                opacity={i === idx ? 1 : 0}
                renderOrder={i === idx ? 2 : 1}
                position={[0, 0, i * 0.0006]}
                onClick={handleClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
              />
            ) : null)
          ) : (
            <mesh
              onClick={handleClick}
              onPointerOver={handlePointerOver}
              onPointerOut={handlePointerOut}
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
