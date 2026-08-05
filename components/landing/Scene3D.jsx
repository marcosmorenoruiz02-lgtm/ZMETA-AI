'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const PALETTE = {
  web: { primary: 0x8b5cf6, secondary: 0x22d3ee },
  mobile: { primary: 0x22d3ee, secondary: 0x8b5cf6 },
}

export default function Scene3D({ scroll, mode = 'web' }) {
  const mountRef = useRef(null)
  const scrollRef = useRef(scroll)
  scrollRef.current = scroll
  const matsRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let width = mount.clientWidth || window.innerWidth
    let height = mount.clientHeight || window.innerHeight

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x05060a, 0.055)
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 0, 6)

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch (e) {
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4))
    const dir = new THREE.DirectionalLight(0xa78bfa, 1.1)
    dir.position.set(5, 5, 5)
    scene.add(dir)
    const pl1 = new THREE.PointLight(0x22d3ee, 40, 24)
    pl1.position.set(-6, -3, 2)
    scene.add(pl1)
    const pl2 = new THREE.PointLight(0x8b5cf6, 30, 24)
    pl2.position.set(6, 3, -2)
    scene.add(pl2)

    const group = new THREE.Group()
    scene.add(group)

    // Core morphing icosahedron
    const coreGeo = new THREE.IcosahedronGeometry(1.5, 10)
    const basePos = Float32Array.from(coreGeo.attributes.position.array)
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6, emissive: 0x8b5cf6, emissiveIntensity: 0.35, roughness: 0.15, metalness: 0.9, flatShading: false,
    })
    const core = new THREE.Mesh(coreGeo, coreMat)
    group.add(core)

    // Wireframe shell
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.14 })
    const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(1.95, 2), wireMat)
    group.add(wire)

    // Orbiting rings
    const rings = new THREE.Group()
    const ringMat1 = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.3 })
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(3.05, 0.02, 16, 140), ringMat1)
    ring1.rotation.set(Math.PI / 2.4, 0.4, 0)
    const ringMat2 = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x8b5cf6, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.3 })
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.015, 16, 140), ringMat2)
    ring2.rotation.set(Math.PI / 1.8, -0.3, 0.6)
    rings.add(ring1); rings.add(ring2)
    group.add(rings)

    // Floating accent shapes
    const accentDefs = [
      { pos: [3.2, 1.6, -1], geo: 'box', speed: 1.6 },
      { pos: [-3.4, -1.2, -0.5], geo: 'oct', speed: 1.2 },
      { pos: [2.6, -1.8, 0.6], geo: 'sph', speed: 1.9 },
      { pos: [-2.8, 1.9, -1.4], geo: 'sph', speed: 1.4 },
      { pos: [0.5, 2.7, -2], geo: 'box', speed: 1.5 },
      { pos: [-1.2, -2.7, -1], geo: 'oct', speed: 1.8 },
    ]
    const accents = []
    const accentMats = []
    accentDefs.forEach((a, i) => {
      let g
      if (a.geo === 'box') g = new THREE.BoxGeometry(0.24, 0.24, 0.24)
      else if (a.geo === 'oct') g = new THREE.OctahedronGeometry(0.22)
      else g = new THREE.SphereGeometry(0.15, 24, 24)
      const col = i % 2 ? 0x22d3ee : 0x8b5cf6
      const m = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.7 })
      accentMats.push(m)
      const mesh = new THREE.Mesh(g, m)
      mesh.position.set(a.pos[0], a.pos[1], a.pos[2])
      group.add(mesh)
      accents.push({ mesh, base: a.pos[1], speed: a.speed })
    })

    // Starfield
    const starCount = 1600
    const starGeo = new THREE.BufferGeometry()
    const starArr = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      const r = 14 + Math.random() * 26
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      starArr[i * 3] = r * Math.sin(ph) * Math.cos(th)
      starArr[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th)
      starArr[i * 3 + 2] = r * Math.cos(ph)
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starArr, 3))
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0.7 }))
    scene.add(stars)

    matsRef.current = { coreMat, wireMat, ringMat1, ringMat2, accentMats, pl1, pl2 }

    // Pointer parallax
    const pointer = { x: 0, y: 0 }
    const target = { x: 0, y: 0 }
    const onPointer = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('pointermove', onPointer)

    const onResize = () => {
      width = mount.clientWidth || window.innerWidth
      height = mount.clientHeight || window.innerHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', onResize)

    const posAttr = coreGeo.attributes.position
    const vCount = posAttr.count
    const clock = new THREE.Clock()
    let raf

    const animate = () => {
      raf = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      const sc = scrollRef.current
      const prog = sc && typeof sc.get === 'function' ? sc.get() : 0

      // organic vertex morph
      for (let i = 0; i < vCount; i++) {
        const ix = i * 3
        const ox = basePos[ix], oy = basePos[ix + 1], oz = basePos[ix + 2]
        const n = Math.sin(ox * 2.4 + t) * Math.sin(oy * 2.4 + t * 1.1) * Math.sin(oz * 2.4 + t * 0.9)
        const k = 1 + 0.16 * n
        posAttr.array[ix] = ox * k
        posAttr.array[ix + 1] = oy * k
        posAttr.array[ix + 2] = oz * k
      }
      posAttr.needsUpdate = true
      coreGeo.computeVertexNormals()

      target.x += (pointer.x * 0.4 - target.x) * 0.05
      target.y += (pointer.y * 0.3 - target.y) * 0.05

      group.rotation.y = t * 0.12 + prog * 3.2 + target.x
      group.rotation.x = prog * 0.7 - target.y
      group.position.y = -prog * 1.6
      const s = 1 - Math.min(prog, 1) * 0.35
      group.scale.setScalar(s)

      rings.rotation.z = t * 0.2
      accents.forEach((a, i) => {
        a.mesh.position.y = a.base + Math.sin(t * a.speed + i) * 0.32
        a.mesh.rotation.x += 0.01
        a.mesh.rotation.y += 0.013
      })
      stars.rotation.y = t * 0.02

      camera.position.z += ((6 + prog * 2.5) - camera.position.z) * 0.06
      camera.lookAt(0, 0, 0)
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('resize', onResize)
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose()
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose())
          else o.material.dispose()
        }
      })
      renderer.dispose()
      if (renderer.domElement && renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  // Recolor on mode change
  useEffect(() => {
    const m = matsRef.current
    if (!m) return
    const { primary, secondary } = PALETTE[mode] || PALETTE.web
    m.coreMat.color.setHex(primary); m.coreMat.emissive.setHex(primary)
    m.wireMat.color.setHex(secondary)
    m.ringMat1.color.setHex(secondary); m.ringMat1.emissive.setHex(secondary)
    m.ringMat2.color.setHex(primary); m.ringMat2.emissive.setHex(primary)
    m.accentMats.forEach((mat, i) => { const c = i % 2 ? secondary : primary; mat.color.setHex(c); mat.emissive.setHex(c) })
    m.pl1.color.setHex(secondary)
    m.pl2.color.setHex(primary)
  }, [mode])

  return <div ref={mountRef} className="h-full w-full" />
}
