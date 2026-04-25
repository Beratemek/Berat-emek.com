import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const HOME_POSITION = new THREE.Vector3(12, 7, 16)
const HOME_TARGET = new THREE.Vector3(0, 1.2, 0)
const HOME_ZOOM = 55
const FOCUS_ZOOM = 120

export default function CameraController({ target }) {
  const { camera, controls } = useThree()
  const desiredPos = useRef(new THREE.Vector3())
  const desiredTarget = useRef(new THREE.Vector3())
  const desiredZoom = useRef(HOME_ZOOM)
  const prevTargetId = useRef('__init__')
  const isAnimating = useRef(false)

  // İlk mount'ta kamerayı HOME pozisyonuna zorla (HMR'dan bağımsız)
  useEffect(() => {
    camera.position.copy(HOME_POSITION)
    camera.zoom = HOME_ZOOM
    camera.updateProjectionMatrix()
    if (controls && controls.target) {
      controls.target.copy(HOME_TARGET)
      controls.update()
    } else {
      camera.lookAt(HOME_TARGET)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Kullanıcı OrbitControls ile etkileşime girerse programatik animasyonu iptal et
  useEffect(() => {
    if (!controls) return
    const handleStart = () => {
      isAnimating.current = false
    }
    controls.addEventListener('start', handleStart)
    return () => controls.removeEventListener('start', handleStart)
  }, [controls])

  // Hedef değiştiğinde animasyonu başlat
  useEffect(() => {
    const id = target?.id ?? null
    if (id === prevTargetId.current) {
      prevTargetId.current = id
      return
    }
    prevTargetId.current = id

    if (target) {
      const [x, y, z] = target.position
      desiredPos.current.set(x + 5, y + 4, z + 5)
      desiredTarget.current.set(x, y - 0.8, z)
      desiredZoom.current = FOCUS_ZOOM
    } else {
      desiredPos.current.copy(HOME_POSITION)
      desiredTarget.current.copy(HOME_TARGET)
      desiredZoom.current = HOME_ZOOM
    }
    isAnimating.current = true
  }, [target])

  useFrame((_, delta) => {
    // Aktif animasyon yoksa kullanıcı kontrolünü bozma
    if (!isAnimating.current) return

    const t = Math.min(1, delta * 2.4)

    camera.position.lerp(desiredPos.current, t)
    camera.zoom = THREE.MathUtils.lerp(camera.zoom, desiredZoom.current, t)
    camera.updateProjectionMatrix()

    if (controls && controls.target) {
      controls.target.lerp(desiredTarget.current, t)
      controls.update()
    }

    // Yeterince yaklaştıysak animasyonu durdur → kullanıcı serbest
    const posDist = camera.position.distanceTo(desiredPos.current)
    const targetDist = controls?.target
      ? controls.target.distanceTo(desiredTarget.current)
      : 0
    const zoomDist = Math.abs(camera.zoom - desiredZoom.current)

    if (posDist < 0.05 && targetDist < 0.05 && zoomDist < 0.5) {
      isAnimating.current = false
    }
  })

  return null
}