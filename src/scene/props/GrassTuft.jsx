export default function GrassTuft({ position = [0, 0, 0], scale = 1, color = '#6dc470' }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 0.08, 0]}>
        <coneGeometry args={[0.05, 0.18, 4]} />
        <meshStandardMaterial color={color} roughness={0.9} flatShading />
      </mesh>
      <mesh castShadow position={[0.07, 0.06, 0.02]} rotation={[0.1, 0.3, 0.1]}>
        <coneGeometry args={[0.04, 0.14, 4]} />
        <meshStandardMaterial color="#7dd87f" roughness={0.9} flatShading />
      </mesh>
      <mesh castShadow position={[-0.06, 0.07, -0.03]} rotation={[-0.1, -0.2, -0.08]}>
        <coneGeometry args={[0.04, 0.15, 4]} />
        <meshStandardMaterial color="#5fb356" roughness={0.9} flatShading />
      </mesh>
    </group>
  )
}