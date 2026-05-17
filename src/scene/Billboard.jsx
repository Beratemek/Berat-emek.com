import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFrame } from '@react-three/fiber'
import { Float, useTexture } from '@react-three/drei'
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

const TRANSITION_MS = 800
const BASE_W = 1.55
const BASE_H = 1.0
const PANEL_ASPECT = BASE_W / BASE_H

// Slide shader: iki texture'ı yatay olarak yan yana render eder.
// `progress` 0 -> 1 arası ilerledikçe görüntü sağdan sola kayar.
const slideVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const slideFragment = /* glsl */ `
  uniform sampler2D mapA;
  uniform sampler2D mapB;
  uniform float progress;
  uniform float aspectA;
  uniform float aspectB;
  uniform float panelAspect;
  varying vec2 vUv;

  // CSS background-size: cover davranışı (kırp ve doldur)
  vec2 coverUV(vec2 uv, float texAspect) {
    float ratio = texAspect / panelAspect;
    vec2 result = uv;
    if (ratio > 1.0) {
      result.x = (uv.x - 0.5) / ratio + 0.5;
    } else {
      result.y = (uv.y - 0.5) * ratio + 0.5;
    }
    return result;
  }

  void main() {
    float uA = vUv.x + progress;
    float uB = vUv.x + progress - 1.0;
    vec3 color;
    if (uA <= 1.0) {
      // Eski görsel hâlâ bu pikselde görünüyor
      color = texture2D(mapA, coverUV(vec2(uA, vUv.y), aspectA)).rgb;
    } else {
      // Yeni görsel sağdan içeri kaymış
      color = texture2D(mapB, coverUV(vec2(uB, vUv.y), aspectB)).rgb;
    }
    gl_FragColor = vec4(color, 1.0);
  }
`

function getAspect(tex) {
  const img = tex?.image
  if (!img) return 1.0
  const w = img.width || img.naturalWidth || 1
  const h = img.height || img.naturalHeight || 1
  return w / h
}

function SlideCarousel({
  urls,
  rotateMs,
  durationMs,
  onIdxChange,
  onClick,
  onPointerOver,
  onPointerOut,
}) {
  const loaded = useTexture(urls)
  const texList = Array.isArray(loaded) ? loaded : [loaded]

  const idxARef = useRef(0)
  const idxBRef = useRef(texList.length > 1 ? 1 : 0)
  const transitionStartRef = useRef(null)

  const uniforms = useMemo(() => ({
    mapA: { value: null },
    mapB: { value: null },
    progress: { value: 0 },
    aspectA: { value: 1 },
    aspectB: { value: 1 },
    panelAspect: { value: PANEL_ASPECT },
  }), [])

  // Texture listesi değişirse (içerik yüklenince) baştan başla
  useEffect(() => {
    idxARef.current = 0
    idxBRef.current = texList.length > 1 ? 1 : 0
    transitionStartRef.current = null

    const a = texList[idxARef.current]
    const b = texList[idxBRef.current]
    uniforms.mapA.value = a || null
    uniforms.mapB.value = b || null
    uniforms.aspectA.value = getAspect(a)
    uniforms.aspectB.value = getAspect(b)
    uniforms.progress.value = 0
    onIdxChange?.(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texList.length])

  useEffect(() => {
    if (texList.length <= 1) return
    const id = setInterval(() => {
      if (transitionStartRef.current !== null) return
      transitionStartRef.current = performance.now()
    }, rotateMs)
    return () => clearInterval(id)
  }, [texList.length, rotateMs])

  useFrame(() => {
    if (transitionStartRef.current === null) return
    const t = Math.min(
      (performance.now() - transitionStartRef.current) / durationMs,
      1,
    )
    // ease-in-out cubic — başta yumuşak hızlanır, sonda yumuşak yavaşlar
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    uniforms.progress.value = eased

    if (t >= 1) {
      // B tamamen göründü; B yeni A olur, B'nin yerine sıradaki yüklenir
      const newA = idxBRef.current
      const newB = (idxBRef.current + 1) % texList.length
      idxARef.current = newA
      idxBRef.current = newB
      uniforms.mapA.value = texList[newA]
      uniforms.mapB.value = texList[newB]
      uniforms.aspectA.value = getAspect(texList[newA])
      uniforms.aspectB.value = getAspect(texList[newB])
      uniforms.progress.value = 0
      transitionStartRef.current = null
      onIdxChange?.(newA)
    }
  })

  return (
    <mesh
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <planeGeometry args={[BASE_W, BASE_H]} />
      <shaderMaterial
        vertexShader={slideVertex}
        fragmentShader={slideFragment}
        uniforms={uniforms}
      />
    </mesh>
  )
}

export default function Billboard({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  feed,
}) {
  const navigate = useNavigate()
  const posts = feed.posts ?? []
  const validPosts = useMemo(() => posts.filter((p) => p?.cover), [posts])
  const urls = useMemo(() => validPosts.map((p) => p.cover), [validPosts])
  const [idx, setIdx] = useState(0)

  const handleClick = (e) => {
    e.stopPropagation()
    const post = validPosts[idx]
    if (post?.href && post.href !== '#') navigate(post.href)
  }
  const handlePointerOver = () => { document.body.style.cursor = 'pointer' }
  const handlePointerOut = () => { document.body.style.cursor = 'auto' }

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

        {/* İçerik — slide carousel (custom shader) */}
        <group position={[0, 1.35, 0.035]}>
          {validPosts.length > 0 ? (
            <SlideCarousel
              urls={urls}
              rotateMs={ROTATE_MS}
              durationMs={TRANSITION_MS}
              onIdxChange={setIdx}
              onClick={handleClick}
              onPointerOver={handlePointerOver}
              onPointerOut={handlePointerOut}
            />
          ) : (
            <mesh
              onClick={handleClick}
              onPointerOver={handlePointerOver}
              onPointerOut={handlePointerOut}
            >
              <planeGeometry args={[BASE_W, BASE_H]} />
              <meshBasicMaterial color={feed.accent} transparent opacity={0.8} />
            </mesh>
          )}

          {/* Pagination Indicators */}
          {validPosts.length > 1 && (
            <group position={[0, -0.42, 0.01]}>
              {validPosts.map((_, i) => {
                const isSelected = i === idx
                const width = isSelected ? 0.08 : 0.03
                const spacing = 0.06
                const totalWidth = (validPosts.length - 1) * spacing
                const x = i * spacing - totalWidth / 2
                return (
                  <mesh key={i} position={[x, 0, 0]}>
                    <planeGeometry args={[width, 0.015]} />
                    <meshBasicMaterial
                      color={isSelected ? feed.accent : '#ffffff'}
                      transparent
                      opacity={isSelected ? 1 : 0.4}
                    />
                  </mesh>
                )
              })}
            </group>
          )}
        </group>
      </group>
    </Float>
  )
}
