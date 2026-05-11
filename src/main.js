import * as THREE from 'https://unpkg.com/three@0.166.1/build/three.module.js';

class Input {
  keys = new Set();
  constructor() {
    addEventListener('keydown', (e) => this.keys.add(e.code));
    addEventListener('keyup', (e) => this.keys.delete(e.code));
  }
  down(code) { return this.keys.has(code); }
}

class ThirdPersonCamera {
  constructor(camera, canvas) {
    this.camera = camera;
    this.yaw = Math.PI;
    this.pitch = -0.26;
    this.distance = 9;
    this.target = new THREE.Vector3();
    this.dragging = false;
    canvas.addEventListener('mousedown', () => this.dragging = true);
    addEventListener('mouseup', () => this.dragging = false);
    addEventListener('mousemove', (e) => {
      if (!this.dragging) return;
      this.yaw -= e.movementX * 0.003;
      this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * 0.002, -0.8, 0.25);
    });
  }
  update(followPosition, dt) {
    this.target.lerp(followPosition, 1 - Math.exp(-dt * 8));
    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(-this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch)
    ).multiplyScalar(this.distance);
    const desired = this.target.clone().add(new THREE.Vector3(offset.x, 3 + offset.y * 4, offset.z));
    this.camera.position.lerp(desired, 1 - Math.exp(-dt * 10));
    this.camera.lookAt(this.target.x, this.target.y + 1.5, this.target.z);
  }
}

class CityGenerator {
  constructor(scene) { this.scene = scene; }
  generate(radius = 7, tileSize = 120) {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ color: 0x384657 }));
    ground.rotation.x = -Math.PI / 2; this.scene.add(ground);
    for (let tx = -radius; tx <= radius; tx++) for (let tz = -radius; tz <= radius; tz++) this.#tile(tx, tz, tileSize);
  }
  #tile(tx, tz, s) {
    const x0 = tx * s, z0 = tz * s;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(s, 18), new THREE.MeshStandardMaterial({ color: 0x1d1f22 }));
    road.rotation.x = -Math.PI / 2; road.position.set(x0, 0.03, z0); this.scene.add(road);
    const road2 = road.clone(); road2.rotation.z = Math.PI / 2; this.scene.add(road2);
    for (let i = -2; i <= 2; i++) {
      const lane = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 6), new THREE.MeshStandardMaterial({ color: 0xf3f3bf }));
      lane.position.set(x0 + i * 12, 0.08, z0); this.scene.add(lane);
      const lane2 = lane.clone(); lane2.position.set(x0, 0.08, z0 + i * 12); lane2.rotation.y = Math.PI / 2; this.scene.add(lane2);
    }
    const slots = [[-36,-36],[36,-36],[-36,36],[36,36]];
    slots.forEach(([ox,oz], i) => {
      const h = 18 + ((tx * 17 + tz * 31 + i * 13) % 35 + 35) % 35;
      const b = new THREE.Mesh(new THREE.BoxGeometry(28, h, 28), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(((tx+tz+i)*0.09)%1, 0.28, 0.48) }));
      b.position.set(x0 + ox, h / 2, z0 + oz); this.scene.add(b);
    });
    const tree = new THREE.Group();
    tree.add(new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.8,4), new THREE.MeshStandardMaterial({color:0x6d4f2b})).translateY(2));
    tree.add(new THREE.Mesh(new THREE.SphereGeometry(2.5,8,8), new THREE.MeshStandardMaterial({color:0x2e6f3d})).translateY(5));
    [[-15, 48],[15,48],[-48,15],[48,-15]].forEach(([ox,oz]) => { const t = tree.clone(); t.position.set(x0+ox,0,z0+oz); this.scene.add(t); });
  }
}

class PlayerController {
  constructor(scene) {
    this.group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.1, 4, 8), new THREE.MeshStandardMaterial({ color: 0x294d9b }));
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 0.7), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    shirt.position.y = 1.1;
    this.group.add(body, shirt); this.group.position.set(0, 1, 0); scene.add(this.group);
    this.speed = 0; this.inCar = false;
  }
  update(input, dt, cameraYaw) {
    if (this.inCar) return;
    const move = new THREE.Vector2((input.down('KeyD')?1:0)-(input.down('KeyA')?1:0),(input.down('KeyW')?1:0)-(input.down('KeyS')?1:0));
    const len = move.length();
    if (len > 0) {
      move.divideScalar(len);
      const targetSpeed = input.down('ShiftLeft') ? 16 : 9;
      this.speed = THREE.MathUtils.lerp(this.speed, targetSpeed, 1 - Math.exp(-dt * 8));
      const angle = Math.atan2(move.x, move.y) + cameraYaw;
      this.group.position.x += Math.sin(angle) * this.speed * dt;
      this.group.position.z += Math.cos(angle) * this.speed * dt;
      this.group.rotation.y = angle;
    } else this.speed = THREE.MathUtils.lerp(this.speed, 0, 1 - Math.exp(-dt * 8));
  }
}

class CarController {
  constructor(scene) {
    this.group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4dc7ff, roughness: 0.34, metalness: 0.32 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f223c, roughness: 0.22, metalness: 0.55 });
    const detailMat = new THREE.MeshStandardMaterial({ color: 0x15212d, roughness: 0.38, metalness: 0.45 });

    const floor = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.26, 4.35), bodyMat);
    floor.position.y = 0.42;

    const center = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.38, 2.4), bodyMat);
    center.position.y = 0.72;

    const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.88, 1.25, 24), bodyMat);
    hood.rotation.z = Math.PI / 2;
    hood.scale.set(0.95, 0.4, 1.0);
    hood.position.set(0, 0.68, 1.67);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.82, 20), bodyMat);
    nose.rotation.x = Math.PI / 2;
    nose.scale.set(1.35, 0.55, 1.0);
    nose.position.set(0, 0.61, 2.2);

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.62, 0.9, 24), bodyMat);
    tail.rotation.z = Math.PI / 2;
    tail.scale.set(0.95, 0.45, 1.0);
    tail.position.set(0, 0.7, -1.95);

    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.55, 1.55, 24), glassMat);
    roof.rotation.z = Math.PI / 2;
    roof.scale.set(0.98, 0.52, 1.0);
    roof.position.set(0, 1.1, -0.1);

    const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.09, 0.2), detailMat);
    splitter.position.set(0, 0.33, 2.38);

    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.1, 0.26), detailMat);
    diffuser.position.set(0, 0.35, -2.28);

    this.group.add(floor, center, hood, nose, tail, roof, splitter, diffuser);

    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.78, metalness: 0.12 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xc9d3de, roughness: 0.31, metalness: 0.9 });
    const wheelOffsets = [
      [-0.98, 0.36, 1.34],
      [0.98, 0.36, 1.34],
      [-0.98, 0.36, -1.34],
      [0.98, 0.36, -1.34],
    ];
    for (const [x, y, z] of wheelOffsets) {
      const wheel = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.35, 20), wheelMat);
      tire.rotation.z = Math.PI / 2;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.36, 14), rimMat);
      rim.rotation.z = Math.PI / 2;
      wheel.add(tire, rim);
      wheel.position.set(x, y, z);
      this.group.add(wheel);
    }

    this.group.position.set(6, 0, 6); scene.add(this.group);
    this.velocity = 0;
  }
  update(input, dt, controlled) {
    if (!controlled) { this.velocity *= 0.96; return; }
    const accel = (input.down('KeyW')?1:0) - (input.down('KeyS')?1:0);
    this.velocity += accel * 18 * dt;
    if (input.down('Space')) this.velocity *= 0.9;
    this.velocity = THREE.MathUtils.clamp(this.velocity * 0.985, -18, 38);
    const steer = (input.down('KeyD')?1:0) - (input.down('KeyA')?1:0);
    this.group.rotation.y -= steer * Math.min(Math.abs(this.velocity)/32,1) * dt * 1.5;
    this.group.position.x += Math.sin(this.group.rotation.y) * this.velocity * dt;
    this.group.position.z += Math.cos(this.group.rotation.y) * this.velocity * dt;
  }
}

class GameManager {
  constructor() {
    this.canvas = document.getElementById('game');
    this.scene = new THREE.Scene(); this.scene.fog = new THREE.Fog(0x8899aa, 150, 1600);
    this.camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 5000);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(innerWidth, innerHeight); this.renderer.setPixelRatio(devicePixelRatio);
    this.input = new Input();
    this.player = new PlayerController(this.scene);
    this.car = new CarController(this.scene);
    this.city = new CityGenerator(this.scene); this.city.generate(8, 120);
    this.cameraRig = new ThirdPersonCamera(this.camera, this.canvas);
    this.playerDriving = false; this.eLatch = false;
    this.#lights();
    addEventListener('resize', () => { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); });
  }
  #lights() {
    this.scene.add(new THREE.HemisphereLight(0xcde3ff, 0x1b1f24, 1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(120, 200, 80); this.scene.add(sun);
  }
  start() { this.last = performance.now(); this.loop(); }
  loop = () => {
    const now = performance.now(); const dt = Math.min((now - this.last) / 1000, 0.05); this.last = now;
    const nearCar = this.player.group.position.distanceTo(this.car.group.position) < 4;
    if (this.input.down('KeyE') && !this.eLatch && (nearCar || this.playerDriving)) {
      this.playerDriving = !this.playerDriving; this.player.inCar = this.playerDriving;
      if (this.playerDriving) this.player.group.visible = false;
      else {
        this.player.group.visible = true;
        const exit = new THREE.Vector3(2.5, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), this.car.group.rotation.y);
        this.player.group.position.copy(this.car.group.position).add(exit).setY(1);
      }
    }
    this.eLatch = this.input.down('KeyE');

    this.player.update(this.input, dt, this.cameraRig.yaw);
    this.car.update(this.input, dt, this.playerDriving);
    const focus = this.playerDriving ? this.car.group.position.clone().setY(1.2) : this.player.group.position.clone().setY(1.4);
    this.cameraRig.update(focus, dt);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  }
}

const startMenu = document.getElementById('startMenu');
const hud = document.getElementById('hud');
document.getElementById('startButton').addEventListener('click', () => {
  startMenu.classList.add('hidden');
  hud.classList.remove('hidden');
  const game = new GameManager();
  game.start();
});
