import * as THREE from "THREE"
import { InstancedUniformsMesh } from "three-instanced-uniforms-mesh"
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler"

export default class Dance {
  public canvas: HTMLCanvasElement
  public scene: THREE.Scene
  public camera: THREE.PerspectiveCamera
  public renderer: THREE.WebGLRenderer
  public mainGroup: THREE.Group
  public listener: THREE.AudioListener
  public music: THREE.Audio
  public loader: THREE.AudioLoader
  public analyser: THREE.AudioAnalyser
  public sampler: MeshSurfaceSampler
  public geometry: THREE.SphereGeometry
  public material: THREE.MeshBasicMaterial
  public sphere: THREE.Mesh
  public particles: InstancedUniformsMesh<any>
  public sizes: {
    width: number
    height: number
  }
  public config: {
    cameraZ: number
    backgroundColor: THREE.Color
    particlesCount: number
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.scene = new THREE.Scene()
    this.mainGroup = new THREE.Group()
    this.scene.add(this.mainGroup)

    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    }
    this.camera = new THREE.PerspectiveCamera(75, this.sizes.width / this.sizes.height, 0.1, 100)

    this.config = {
      cameraZ: 4.5,
      backgroundColor: new THREE.Color(0x0d021f),
      particlesCount: 1000,
    }

    this.camera.position.z = this.config.cameraZ

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    })

    this.init()
    this.createSphere()
    this.createParticles()
    this.loadMusic()

    window.addEventListener("resize", () => {
      this.sizes.width = window.innerWidth
      this.sizes.height = window.innerHeight

      this.camera.aspect = this.sizes.width / this.sizes.height
      this.camera.updateProjectionMatrix()

      this.renderer.setSize(this.sizes.width, this.sizes.height)
      // this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    })

    this.update()
  }

  init() {
    this.renderer.setSize(this.sizes.width, this.sizes.height)
    // this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(this.config.backgroundColor)
  }

  createSphere() {
    // 创建一个球体，用于之后在球表面采点
    this.sphere = new THREE.Mesh(
      new THREE.SphereGeometry(2, 32, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        opacity: 0.1,
        transparent: true,
      })
    )
    this.scene.add(this.sphere)
    // 定义采样器
    this.sampler = new MeshSurfaceSampler(this.sphere).build()
  }

  createParticles() {
    const particlesGeometry = new THREE.SphereGeometry(0.01, 16, 16)
    const particlesMaterial = new THREE.PointsMaterial({
      color: "yellow",
    })
    this.particles = new InstancedUniformsMesh(particlesGeometry, particlesMaterial, this.config.particlesCount)
    // 设置一个临时的vector，用于存储粒子的位置
    const position = new THREE.Vector3()
    // 定义一个临时存放球体表面点的物体
    const temObject = new THREE.Object3D()
    // 定义球体的原点
    const center = new THREE.Vector3()
    const directions = [] as any
    for (let i = 0; i < this.config.particlesCount; i++) {
      this.sampler.sample(position)
      // 将采样点的位置传给临时物体
      temObject.position.copy(position)
      // 更新矩阵
      temObject.updateMatrix()
      // 将临时物体的矩阵信息传给particles的第i个粒子
      this.particles.setMatrixAt(i, temObject.matrix)
      // 设置粒子方向
      const direction = new THREE.Vector3()
      direction.subVectors(position, center).normalize()
    }

    particlesGeometry.setAttribute("aDirection", new THREE.Float32BufferAttribute(directions, 3))
    particlesGeometry.attributes.aDirection.needsUpdate = true

    this.mainGroup.add(this.particles)
  }

  loadMusic() {
    // 创建监听器
    this.listener = new THREE.AudioListener()
    this.camera.add(this.listener)

    // 创建音频
    this.music = new THREE.Audio(this.listener)
    this.scene.add(this.music)

    // 创建加载器
    this.loader = new THREE.AudioLoader()
    this.loader.load("../../assets/audio/劉嘉亮 - 你到底愛誰.mp3", (buffer) => {
      this.music.setBuffer(buffer)
      this.music.setLoop(true)
      this.music.setVolume(0.1)
      // 创建分析器
      this.analyser = new THREE.AudioAnalyser(this.music, 128)
      this.music.play()
    })
  }

  update() {
    this.renderer.render(this.scene, this.camera)
    this.mainGroup.rotation.y += 0.002
    this.mainGroup.rotation.z += 0.0012
    if (!!this.analyser) {
      // 如果有分析器
      // 获得频率
      const fre = this.analyser.getFrequencyData()
      // 需要对其加和
      const sum = fre.reduce((a, b) => a + b, 0)
      this.particles.position.z = (sum / fre.length) * 0.01
    }
    window.requestAnimationFrame(this.update.bind(this))
  }
}
