import { useEffect, useState } from 'react'
import { Html } from '@react-three/drei'
import { ROTATE_MS } from '../data/billboards.js'

export default function Billboard({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  feed,
}) {
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
    <group position={position} rotation={rotation}>
      {/* Sol direk */}
      <mesh castShadow position={[-0.65, 0.7, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 1.4, 10]} />
        <meshStandardMaterial color="#8b5a3c" roughness={0.85} />
      </mesh>
      {/* Sağ direk */}
      <mesh castShadow position={[0.65, 0.7, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 1.4, 10]} />
        <meshStandardMaterial color="#8b5a3c" roughness={0.85} />
      </mesh>

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

      {/* İçerik — HTML overlay, 3D düzlemde */}
      <Html
        transform
        occlude={false}
        position={[0, 1.35, 0.04]}
        distanceFactor={1.4}
        style={{ pointerEvents: 'auto' }}
      >
        <a
          href={post.href}
          onClick={(e) => {
            if (post.href === '#') e.preventDefault()
          }}
          style={{
            display: 'block',
            width: 220,
            padding: 14,
            background: 'transparent',
            color: '#3a2a4a',
            fontFamily: "'Inter', system-ui, sans-serif",
            textDecoration: 'none',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 10,
                letterSpacing: 2,
                fontWeight: 700,
                color: feed.accent,
                textTransform: 'uppercase',
              }}
            >
              {feed.heading}
            </span>
            <span
              style={{
                fontSize: 9,
                letterSpacing: 1.5,
                padding: '3px 8px',
                borderRadius: 999,
                background: `${feed.accent}22`,
                color: feed.accent,
                border: `1px solid ${feed.accent}55`,
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              {post.tag}
            </span>
          </div>

          {/* Cover görseli — yoksa gradient placeholder */}
          <div
            style={{
              width: '100%',
              height: 70,
              borderRadius: 6,
              marginBottom: 8,
              background: post.cover
                ? `url(${post.cover}) center/cover`
                : `linear-gradient(135deg, ${feed.accent}55 0%, #a78bfa55 100%)`,
              border: `1px solid ${feed.accent}33`,
            }}
          />

          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.25,
              marginBottom: 4,
              minHeight: 32,
            }}
          >
            {post.title}
          </div>
          <div
            style={{
              fontSize: 10,
              lineHeight: 1.4,
              color: 'rgba(58,42,74,0.65)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {post.excerpt}
          </div>

          {/* Sayfa göstergesi */}
          <div style={{ display: 'flex', gap: 3, marginTop: 8, justifyContent: 'center' }}>
            {posts.map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === idx ? 16 : 5,
                  height: 3,
                  borderRadius: 2,
                  background: i === idx ? feed.accent : 'rgba(58,42,74,0.2)',
                  transition: 'all 0.3s',
                }}
              />
            ))}
          </div>
        </a>
      </Html>
    </group>
  )
}