export default function Tree({ position = [0, 0, 0], scale = 1, color = '#5fb356' }) {
  return (
    <group position={position} scale={scale}>
      {/* Gövde — hafif eğimli */}
      <mesh castShadow receiveShadow position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.09, 0.14, 0.7, 8]} />
        <meshStandardMaterial color="#8b5a3c" roughness={0.95} flatShading />
      </mesh>
      {/* Gövde dokusu — küçük çıkıntı */}
      <mesh castShadow position={[0.08, 0.3, 0.05]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshStandardMaterial color="#6b3f28" roughness={0.95} flatShading />
      </mesh>

      {/* Alt taç */}
      <mesh castShadow position={[0, 0.85, 0]}>
        <coneGeometry args={[0.55, 0.75, 8]} />
        <meshStandardMaterial color={color} roughness={0.85} flatShading />
      </mesh>
      {/* Orta taç */}
      <mesh castShadow position={[0, 1.2, 0]}>
        <coneGeometry args={[0.42, 0.6, 8]} />
        <meshStandardMaterial color="#6dc470" roughness={0.85} flatShading />
      </mesh>
      {/* Üst taç */}
      <mesh castShadow position={[0, 1.5, 0]}>
        <coneGeometry args={[0.28, 0.45, 8]} />
        <meshStandardMaterial color="#7dd87f" roughness={0.85} flatShading />
      </mesh>
      {/* Tepe noktası */}
      <mesh castShadow position={[0, 1.75, 0]}>
        <coneGeometry args={[0.14, 0.25, 8]} />
        <meshStandardMaterial color="#9ae66e" roughness={0.85} flatShading />
      </mesh>

      {/* Küçük meyve / renk noktaları */}
      <mesh position={[0.25, 0.95, 0.15]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#f9a8d4" emissive="#f9a8d4" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[-0.2, 1.15, -0.1]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2} />
      </mesh>
    </group>
  )
}