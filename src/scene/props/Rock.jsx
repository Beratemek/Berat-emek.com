export default function Rock({ position = [0, 0, 0], scale = 1, color = '#a8a090' }) {
  return (
    <group position={position} scale={scale}>
      {/* Ana kaya */}
      <mesh castShadow receiveShadow position={[0, 0.2, 0]}>
        <dodecahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial color={color} roughness={0.9} flatShading />
      </mesh>
      {/* Yan parça */}
      <mesh castShadow receiveShadow position={[0.3, 0.12, 0.1]}>
        <dodecahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial color={color} roughness={0.9} flatShading />
      </mesh>
      {/* Arka minik parça */}
      <mesh castShadow position={[-0.22, 0.08, -0.12]}>
        <dodecahedronGeometry args={[0.1, 0]} />
        <meshStandardMaterial color="#8a8274" roughness={0.9} flatShading />
      </mesh>
      {/* Yosun lekesi — üst */}
      <mesh position={[-0.05, 0.4, 0.05]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#6dc470" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0.32, 0.22, 0.08]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#5fb356" roughness={0.95} flatShading />
      </mesh>
    </group>
  )
}