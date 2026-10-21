// Dente 3D em porcelana que acompanha a navegação.
// Sem WebGL ou com movimento reduzido, o hero mostra o dente em SVG (.tooth-fallback).
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/RoomEnvironment.js";
import { mergeVertices } from "three/addons/BufferGeometryUtils.js";

const root = document.documentElement;
const canvas = document.querySelector(".tooth-canvas");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch { return false; }
}

if (!canvas || reduce || !hasWebGL() || !window.gsap) root.classList.add("no-3d");
// fora do caminho crítico: não segura o primeiro render
else setTimeout(init, 0);

// Molar procedural: coroa com 4 cúspides + duas raízes (mesial e distal)
function crownGeometry() {
  let g = new THREE.SphereGeometry(1, 160, 120);
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  g = mergeVertices(g);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  const cusps = [[0.42, 0.38], [-0.42, 0.38], [0.42, -0.38], [-0.42, -0.38]];
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let { x, y, z } = v;
    const r = Math.hypot(x, z) || 1e-6;
    const ang = Math.atan2(z, x);
    // seção levemente quadrada
    const sq = 1 / Math.pow(Math.abs(Math.cos(ang)) ** 4 + Math.abs(Math.sin(ang)) ** 4, 0.25);
    const k = 0.82 + 0.18 * sq;
    if (y >= 0) {
      const rr = Math.pow(r, 0.55); // achata o topo
      x = (x / r) * rr * k * 1.0;
      z = (z / r) * rr * k * 0.9;
      let bump = 0;
      for (const [cx, cz] of cusps) bump += Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / 0.1);
      const groove = Math.exp(-(x * x) / 0.01) * 0.7 + Math.exp(-(z * z) / 0.014) * 0.35;
      y = 0.32 + 0.5 * y + y * y * (0.3 * bump - 0.16 * groove);
    } else {
      // colo: estreita suavemente e fecha por dentro das raízes
      const t = -y;
      x *= (1 - 0.42 * t) * k * 1.0;
      z *= (1 - 0.42 * t) * k * 0.9;
      y = 0.32 - 0.62 * t;
    }
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

// Raiz cônica com ápice arredondado e leve curvatura distal
function rootGeometry(len, side) {
  const pts = [];
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const r = 0.48 * Math.sqrt(1 - Math.pow(u, 2.4)) * (1 - 0.6 * u);
    pts.push(new THREE.Vector2(Math.max(r, 0.0001), -u * len));
  }
  const g = new THREE.LatheGeometry(pts, 56);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = -p.getY(i) / len;
    // raízes de molar: estreitas no sentido mesio-distal, largas no vestíbulo-lingual
    const x = p.getX(i) * 0.7 + side * (0.32 + 0.16 * u) + 0.2 * u * u;
    p.setXYZ(i, x, p.getY(i) - 0.05, p.getZ(i) * 1.02);
  }
  g.computeVertexNormals();
  return g;
}

function buildTooth(material) {
  const group = new THREE.Group();
  group.add(
    new THREE.Mesh(crownGeometry(), material),
    new THREE.Mesh(rootGeometry(1.75, -1), material),
    new THREE.Mesh(rootGeometry(1.6, 1), material)
  );
  const box = new THREE.Box3().setFromObject(group);
  const c = box.getCenter(new THREE.Vector3());
  group.children.forEach((m) => m.position.sub(c));
  group.scale.setScalar(0.62);
  return group;
}

function init() {
  const isMobile = matchMedia("(max-width: 899px)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0, 7);

  const material = new THREE.MeshPhysicalMaterial({
    color: 0xf3ece0,
    roughness: 0.2,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    sheen: 0.6,
    sheenColor: new THREE.Color(0xfff1dc),
    sheenRoughness: 0.4,
    ior: 1.55,
    specularIntensity: 0.9,
  });
  const tooth = buildTooth(material);
  const pivot = new THREE.Group();
  pivot.add(tooth);
  scene.add(pivot);

  const key = new THREE.DirectionalLight(0xfff4e6, 2.2);
  key.position.set(3, 4, 5);
  const rim = new THREE.DirectionalLight(0x9fd0c4, 1.8);
  rim.position.set(-4, 1, -3);
  const glint = new THREE.PointLight(0xffffff, 6, 12);
  glint.position.set(1, 1, 4);
  scene.add(key, rim, glint, new THREE.AmbientLight(0xffffff, 0.25));

  // Estado animado pelo scroll (x/y em -1..1 da viewport)
  const state = { x: 0, y: 0, s: 1, rx: 0, ry: 0, rz: 0, op: 1 };
  const intro = { k: 0 };
  const spin = { v: 0 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  // Coreografia por seção: desktop / mobile
  const D = {
    hero:       { x: 0.5,   y: -0.04, s: 1.3,  rx: 0.2,  ry: 0.5,  rz: -0.18, op: 1 },
    about:      { x: 0.8,   y: 0.12,  s: 0.7,  rx: -0.2, ry: 2.6,  rz: 0.2,   op: 1 },
    care:       { x: -0.66, y: -0.42, s: 0.72, rx: 0.3,  ry: 4.6,  rz: -0.1,  op: 1 },
    experience: { x: 0,     y: 0.08,  s: 1.3,  rx: 0.15, ry: 7,    rz: 0,     op: 0.92 },
    team:       { x: 0.78,  y: 0.5,   s: 0.45, rx: -0.3, ry: 9,    rz: 0.3,   op: 1 },
    faq:        { x: 0.95,  y: 0.9,   s: 0.3,  rx: 0,    ry: 10,   rz: 0,     op: 0 },
    contact:    { x: 0,     y: 0.42,  s: 0.85, rx: 0.2,  ry: 12.6, rz: 0,     op: 1 },
  };
  const M = {
    hero:       { x: 0,     y: -0.62, s: 0.62, rx: 0.2,  ry: 0.5, rz: -0.18, op: 1 },
    about:      { x: 0.7,   y: 0.7,   s: 0.3,  rx: 0,    ry: 3,   rz: 0,    op: 0 },
    experience: { x: 0,     y: 0.5,   s: 0.5,  rx: 0.1,  ry: 7,   rz: 0,    op: 0.9 },
    team:       { x: 0.8,   y: 0.8,   s: 0.3,  rx: 0,    ry: 9,   rz: 0,    op: 0 },
    contact:    { x: 0,     y: 0.7,   s: 0.38, rx: 0.2,  ry: 12.6, rz: 0,   op: 1 },
  };

  let st, tl;
  function build() {
    if (st) st.kill();
    if (tl) tl.kill();
    const mobile = matchMedia("(max-width: 899px)").matches;
    const map = mobile ? M : D;
    const vh = innerHeight;
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    const stops = [{ pos: 0, kf: map.hero }];
    document.querySelectorAll("[data-tooth]").forEach((sec) => {
      const kf = map[sec.dataset.tooth];
      if (!kf) return;
      const top = sec.getBoundingClientRect().top + scrollY;
      const pos = Math.min(max, Math.max(0, top - vh * 0.35));
      if (pos > stops[stops.length - 1].pos) stops.push({ pos, kf });
    });
    Object.assign(state, map.hero);
    tl = gsap.timeline({ paused: true });
    for (let i = 1; i < stops.length; i++) {
      const a = stops[i - 1], b = stops[i];
      const dur = b.pos - a.pos;
      // x e y com curvas diferentes = trajetória em arco
      tl.to(state, { x: b.kf.x, duration: dur, ease: "sine.inOut" }, a.pos);
      tl.to(state, { y: b.kf.y, duration: dur, ease: "power2.inOut" }, a.pos);
      tl.to(state, { s: b.kf.s, rx: b.kf.rx, ry: b.kf.ry, rz: b.kf.rz, op: b.kf.op, duration: dur, ease: "power1.inOut" }, a.pos);
    }
    tl.to({}, { duration: Math.max(0.001, max - stops[stops.length - 1].pos) }, stops[stops.length - 1].pos);
    st = ScrollTrigger.create({ start: 0, end: max, scrub: 1.2, animation: tl });
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  build();
  addEventListener("load", () => { build(); ScrollTrigger.refresh(); }, { once: true });

  let rt;
  addEventListener("resize", () => {
    resize();
    clearTimeout(rt);
    rt = setTimeout(() => { build(); ScrollTrigger.refresh(); }, 250);
  });

  addEventListener("pointermove", (e) => {
    pointer.tx = (e.clientX / innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  // Ao ativar um card de tratamento, o dente dá um giro curto
  addEventListener("tooth:spin", () => {
    gsap.to(spin, { v: spin.v + Math.PI / 2, duration: 1.4, ease: "expo.out" });
  });

  // Entrada: surge de baixo, girando, com fade
  gsap.to(intro, { k: 1, duration: 2.2, ease: "expo.out", delay: 0.5 });
  root.classList.add("has-3d");

  const clock = new THREE.Clock();
  const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;

  function frame() {
    const t = clock.getElapsedTime();
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    const op = state.op * intro.k;
    canvas.style.visibility = op < 0.01 ? "hidden" : "visible";
    canvas.style.opacity = op.toFixed(3);
    if (op >= 0.01) {
      const halfW = halfH * camera.aspect;
      const k = intro.k;
      pivot.position.set(
        state.x * halfW,
        state.y * halfH + Math.sin(t * 1.1) * 0.06 - (1 - k) * 1.2,
        0
      );
      pivot.scale.setScalar(state.s * (0.6 + 0.4 * k));
      tooth.rotation.set(
        state.rx + pointer.y * 0.25,
        state.ry + spin.v + t * 0.18 + pointer.x * 0.4 - (1 - k) * 2,
        state.rz + Math.sin(t * 0.7) * 0.05
      );
      // brilho de porcelana que acompanha o cursor
      glint.position.set(pointer.x * 4, -pointer.y * 3 + 1, 4);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
