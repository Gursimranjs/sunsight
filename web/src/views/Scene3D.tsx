// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// The Three.js scene for the 3D hero view. Loaded with a dynamic import() only when the 3D tab opens,
// so Three.js is not part of the first-load bundle. Illustrative only: the numbers come from the
// horizon engine; shadows here come from the graphics engine and the nearby terrain cut.
import { useEffect, useRef } from 'preact/hooks';
import {
  AmbientLight, BufferAttribute, BufferGeometry, CanvasTexture, Color, CylinderGeometry, DirectionalLight, Group, HemisphereLight,
  LineBasicMaterial, LineLoop, Mesh, MeshBasicMaterial, MeshLambertMaterial, PCFShadowMap, PerspectiveCamera,
  Scene, SRGBColorSpace, Sprite, SpriteMaterial, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { azElToScene, groundHeight, type TerrainMeta } from './terrain3d';

export interface SkyDir { az_deg: number; el_deg: number; r_deg: number }

export interface Scene3DProps {
  heights: Int16Array;
  meta: TerrainMeta;
  /** Landing point in scene X, Z (metres from the terrain centre), or null when outside the cut. */
  landing: [number, number] | null;
  sun: SkyDir;
  earth: SkyDir;
  /** Longitude of the terrain centre: the local frame used for az/el. */
  lon_deg: number;
  mode: 'overview' | 'astronaut';
  /** Bumped by the "look toward" buttons: which body to face. */
  look: { body: 'sun' | 'earth'; n: number };
  missRadius_m: number;
  /**
   * The Sun lights nothing at this moment: add a faint, shadowless fill light so the terrain's shape
   * stays visible. Off whenever the Sun is up, so the shadows stay those the Sun casts.
   */
  fill: boolean;
  onFps: (fps: number) => void;
  onError: (msg: string) => void;
}

const SKY_DIST_M = 60_000;
/**
 * Fill light used only while the Sun is down: a dim, cool, shadowless light from high in the scene's
 * -X/-Z quarter (the usual hillshade direction, not the Sun's) plus a little even light, so slopes
 * read as shape. Display choices only; no number on screen depends on them.
 */
const FILL_KEY_INTENSITY = 1.1;
const FILL_EVEN_INTENSITY = 0.25;
const D = Math.PI / 180;

function discTexture(inner: string, outer: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 63);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.92, outer);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.beginPath(); g.arc(64, 64, 63, 0, Math.PI * 2); g.fill();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

interface World {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  sunLight: DirectionalLight;
  fillLight: Group;
  sunSprite: Sprite;
  earthSprite: Sprite;
  pin: Mesh;
  ring: LineLoop;
  base_m: number;
  yaw_rad: number;
  pitch_rad: number;
  dispose: () => void;
}

export default function Scene3D(p: Scene3DProps) {
  const box = useRef<HTMLDivElement>(null);
  const world = useRef<World | null>(null);
  const props = useRef(p);
  props.current = p;

  // Build the scene once per terrain.
  useEffect(() => {
    const el = box.current!;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    } catch (e) {
      p.onError(`WebGL could not start (${String(e)}).`);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', 'Illustrative 3D terrain around the landing point, lit from the Sun’s direction at the selected time.');
    renderer.domElement.setAttribute('data-testid', 'scene3d-canvas');
    el.appendChild(renderer.domElement);

    const { heights: h, meta } = p;
    const n = meta.size, half = (n - 1) / 2, s = meta.spacing_m;
    const base_m = h[Math.round(half) * n + Math.round(half)];
    const pos = new Float32Array(n * n * 3);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const i = (r * n + c) * 3;
        pos[i] = (c - half) * s; pos[i + 1] = h[r * n + c] - base_m; pos[i + 2] = (r - half) * s;
      }
    }
    const idx = new Uint32Array((n - 1) * (n - 1) * 6);
    let k = 0;
    for (let r = 0; r < n - 1; r++) {
      for (let c = 0; c < n - 1; c++) {
        const a = r * n + c, b = a + 1, d = a + n, e = d + 1;
        idx[k++] = a; idx[k++] = d; idx[k++] = b;
        idx[k++] = b; idx[k++] = d; idx[k++] = e;
      }
    }
    const geom = new BufferGeometry();
    geom.setAttribute('position', new BufferAttribute(pos, 3));
    geom.setIndex(new BufferAttribute(idx, 1));
    geom.computeVertexNormals();
    const ground = new Mesh(geom, new MeshLambertMaterial({ color: 0x8c8a86 }));
    ground.castShadow = true;
    ground.receiveShadow = true;

    const scene = new Scene();
    scene.background = new Color(0x000000);
    scene.add(ground);
    scene.add(new AmbientLight(0xffffff, 0.06));

    const sunLight = new DirectionalLight(0xffffff, 3.2);
    sunLight.castShadow = true;
    const extent_m = half * s * 1.45;
    Object.assign(sunLight.shadow.camera, { left: -extent_m, right: extent_m, top: extent_m, bottom: -extent_m, near: 100, far: 120_000 });
    sunLight.shadow.mapSize.set(4096, 4096);
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 4;
    scene.add(sunLight, sunLight.target);
    const fillLight = new Group();
    const fillKey = new DirectionalLight(0xc8d2e0, FILL_KEY_INTENSITY);
    fillKey.position.set(-1, 1.4, -1); // direction only; the target stays at the origin
    fillLight.add(fillKey, new HemisphereLight(0xc8d2e0, 0x1a1918, FILL_EVEN_INTENSITY));
    fillLight.visible = false;
    scene.add(fillLight);

    const sunSprite = new Sprite(new SpriteMaterial({ map: discTexture('#fffbe8', '#ffd27a'), depthWrite: false, fog: false }));
    const earthSprite = new Sprite(new SpriteMaterial({ map: discTexture('#9fd3ff', '#2f6fb3'), depthWrite: false, fog: false }));
    scene.add(sunSprite, earthSprite);

    const pin = new Mesh(new CylinderGeometry(4, 4, 80, 12), new MeshBasicMaterial({ color: 0xffffff }));
    scene.add(pin);
    const ring = new LineLoop(new BufferGeometry(), new LineBasicMaterial({ color: 0xffffff }));
    scene.add(ring);

    const camera = new PerspectiveCamera(50, 1, 0.1, 250_000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = 88 * D;

    // Look around in astronaut mode: drag or arrow keys turn the head.
    const w: World = {
      renderer, scene, camera, controls, sunLight, fillLight, sunSprite, earthSprite, pin, ring, base_m, yaw_rad: 0, pitch_rad: 0,
      dispose: () => {},
    };
    let drag: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => { if (props.current.mode === 'astronaut') drag = { x: e.clientX, y: e.clientY }; };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      w.yaw_rad -= (e.clientX - drag.x) * 0.004;
      w.pitch_rad = Math.max(-0.6, Math.min(0.6, w.pitch_rad + (e.clientY - drag.y) * 0.003));
      drag = { x: e.clientX, y: e.clientY };
    };
    const up = () => { drag = null; };
    const key = (e: KeyboardEvent) => {
      if (props.current.mode !== 'astronaut') return;
      const turn: Record<string, [number, number]> = { ArrowLeft: [0.05, 0], ArrowRight: [-0.05, 0], ArrowUp: [0, 0.03], ArrowDown: [0, -0.03] };
      const t = turn[e.key];
      if (!t) return;
      e.preventDefault();
      w.yaw_rad += t[0];
      w.pitch_rad = Math.max(-0.6, Math.min(0.6, w.pitch_rad + t[1]));
    };
    renderer.domElement.tabIndex = 0;
    renderer.domElement.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    renderer.domElement.addEventListener('keydown', key);

    const resize = () => {
      const width = Math.max(280, el.clientWidth);
      const height = Math.round(Math.max(300, Math.min(window.innerHeight * 0.7, width * 0.62)));
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(el);

    // Render loop with frame timing (requestAnimationFrame intervals).
    let raf = 0, last = performance.now(), acc = 0, frames = 0;
    const tmp = new Vector3();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      acc += now - last; last = now; frames++;
      if (acc >= 1000) {
        const fps = (frames * 1000) / acc;
        (window as unknown as { __sunsight3d?: object }).__sunsight3d = { fps, at_ms: now };
        props.current.onFps(fps);
        // Slow machine: drop to one pixel per CSS pixel before giving up smoothness.
        if (fps < 24 && renderer.getPixelRatio() > 1) renderer.setPixelRatio(1);
        acc = 0; frames = 0;
      }
      const q = props.current;
      if (q.mode === 'astronaut') {
        const dir = tmp.set(Math.sin(w.yaw_rad) * Math.cos(w.pitch_rad), Math.sin(w.pitch_rad), -Math.cos(w.yaw_rad) * Math.cos(w.pitch_rad));
        camera.lookAt(camera.position.clone().add(dir));
      } else controls.update();
      // Sun and Earth sit "at infinity": always the same distance from the camera.
      for (const [sprite, b] of [[sunSprite, q.sun], [earthSprite, q.earth]] as const) {
        const v = azElToScene(b.az_deg, b.el_deg, q.lon_deg);
        sprite.position.set(camera.position.x + v[0] * SKY_DIST_M, camera.position.y + v[1] * SKY_DIST_M, camera.position.z + v[2] * SKY_DIST_M);
        const size = 2 * SKY_DIST_M * Math.tan(b.r_deg * D);
        sprite.scale.set(size, size, 1);
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    w.dispose = () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      controls.dispose();
      geom.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    world.current = w;
    return () => { w.dispose(); world.current = null; };
  }, [p.heights, p.meta]);

  // Sun light direction, pin, ring and camera follow the props.
  useEffect(() => {
    const w = world.current;
    if (!w) return;
    const v = azElToScene(p.sun.az_deg, p.sun.el_deg, p.lon_deg);
    w.sunLight.position.set(v[0] * 50_000, v[1] * 50_000, v[2] * 50_000);
    // Below the horizon (whole disc under the level horizon) the Sun lights nothing.
    w.sunLight.intensity = p.sun.el_deg + p.sun.r_deg < 0 ? 0 : 3.2;
    w.fillLight.visible = p.fill;
    const [lx, lz] = p.landing ?? [0, 0];
    const g = groundHeight(p.heights, p.meta, lx, lz) ?? w.base_m;
    w.pin.visible = !!p.landing && p.mode === 'overview';
    w.pin.position.set(lx, g - w.base_m + 40, lz);
    const pts: number[] = [];
    for (let i = 0; i < 160; i++) {
      const a = (i / 160) * Math.PI * 2;
      const x = lx + p.missRadius_m * Math.cos(a), z = lz + p.missRadius_m * Math.sin(a);
      pts.push(x, (groundHeight(p.heights, p.meta, x, z) ?? g) - w.base_m + 3, z);
    }
    w.ring.geometry.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
    w.ring.visible = !!p.landing && p.mode === 'overview';
  }, [p.sun.az_deg, p.sun.el_deg, p.landing?.[0], p.landing?.[1], p.mode, p.missRadius_m, p.heights, p.fill]);

  useEffect(() => {
    const w = world.current;
    if (!w) return;
    const [lx, lz] = p.landing ?? [0, 0];
    const g = (groundHeight(p.heights, p.meta, lx, lz) ?? w.base_m) - w.base_m;
    if (p.mode === 'astronaut') {
      w.controls.enabled = false;
      w.camera.position.set(lx, g + 2, lz); // 2 m above the ground at the landing point
      const body = p.look.body === 'earth' ? p.earth : p.sun;
      const v = azElToScene(body.az_deg, 0, p.lon_deg);
      w.yaw_rad = Math.atan2(v[0], -v[2]);
      w.pitch_rad = 0; // eyes on the horizon
    } else {
      w.controls.enabled = true;
      w.controls.target.set(lx, g, lz);
      const v = azElToScene(p.sun.az_deg, 0, p.lon_deg);
      // Stand back on the side away from the Sun, so the lit faces and the shadows both show.
      w.camera.position.set(lx - v[0] * 5200 + v[2] * 2500, g + 3800, lz - v[2] * 5200 - v[0] * 2500);
      w.controls.update();
    }
  }, [p.mode, p.look.n, p.landing?.[0], p.landing?.[1], p.heights]);

  return <div ref={box} class="scene3d" />;
}
