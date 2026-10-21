// Dente 3D em porcelana que acompanha a navegação.
// Sem WebGL ou com movimento reduzido, o hero mostra o dente em SVG (.tooth-fallback).
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/RoomEnvironment.js";
import { MarchingCubes } from "three/addons/MarchingCubes.js";

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

// Molar estilizado em peça única: campo de distância (coroa, cúspides, colo e
// três raízes fundidos com união suave) poligonizado por marching cubes.
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);
const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);

function sdRoundBox(x, y, z, bx, by, bz, r) {
  const qx = Math.abs(x) - bx + r, qy = Math.abs(y) - by + r, qz = Math.abs(z) - bz + r;
  return len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
}

// Cone de pontas arredondadas (Inigo Quilez)
function sdRoundCone(px, py, pz, a, b, r1, r2) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = px - a[0], pay = py - a[1], paz = pz - a[2];
  const y = pax * bax + pay * bay + paz * baz, z = y - l2;
  const cx = pax * l2 - bax * y, cy = pay * l2 - bay * y, cz = paz * l2 - baz * y;
  const x2 = cx * cx + cy * cy + cz * cz, y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

const CUSPS = [[-0.3, 0.2], [0.3, 0.2], [-0.3, -0.2], [0.3, -0.2]];
const ROOTS = [
  { a: [-0.34, -0.05, 0.14], b: [-0.5, -1.18, 0.2], r1: 0.3, r2: 0.13 },
  { a: [0.34, -0.05, 0.14], b: [0.48, -1.12, 0.22], r1: 0.3, r2: 0.13 },
  { a: [0, -0.05, -0.22], b: [0.04, -1.0, -0.38], r1: 0.27, r2: 0.12 },
];

function toothSDF(x, y, z) {
  // coroa: bloco arredondado, mais largo que o colo
  let d = sdRoundBox(x, y - 0.42, z, 0.66, 0.38, 0.54, 0.42);
  // cúspides suaves no topo
  for (const [cx, cz] of CUSPS) d = smin(d, len3(x - cx, y - 0.6, z - cz) - 0.3, 0.22);
  // fossa central e sulcos entre cúspides
  d = smax(d, -(len3(x, y - 1.06, z) - 0.3), 0.14);
  d = smax(d, -(Math.hypot(x, y - 0.98) - 0.12), 0.1);
  // colo: estreitamento cervical
  d = smin(d, sdRoundCone(x, y, z, [0, 0.2, 0], [0, -0.2, 0], 0.56, 0.5), 0.3);
  // raízes com leve curvatura distal
  const bx = x - 0.06 * Math.max(-y, 0) ** 2;
  for (const r of ROOTS) d = smin(d, sdRoundCone(bx, y, z, r.a, r.b, r.r1, r.r2), 0.28);
  return d;
}

function buildTooth(material, res) {
  const S = 1.42; // domínio [-S, S] em cada eixo
  const mc = new MarchingCubes(res, material, false, false, 160000);
  const f = mc.field, n = mc.size, h = mc.halfsize, oy = -0.08;
  for (let k = 0; k < n; k++) {
    const z = ((k - h) / h) * S;
    for (let j = 0; j < n; j++) {
      const y = ((j - h) / h) * S + oy;
      for (let i = 0; i < n; i++) {
        const x = ((i - h) / h) * S;
        f[k * n * n + j * n + i] = -toothSDF(x, y, z);
      }
    }
  }
  mc.isolation = 0;
  mc.update();
  mc.scale.setScalar(S * 0.62);
  mc.position.y = oy * 0.62;
  return mc;
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
  const tooth = buildTooth(material, isMobile ? 64 : 88);
  const pivot = new THREE.Group();
  pivot.add(tooth);
  scene.add(pivot);

  const key = new THREE.DirectionalLight(0xfff4e6, 2.2);
  key.position.set(3, 4, 5);
  const rim = new THREE.DirectionalLight(0xb9c6ff, 1.6);
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
    hero:       { x: 0.03,  y: -0.4,  s: 0.72, rx: 0.2,  ry: 0.5,  rz: -0.18, op: 1 },
    about:      { x: 0.8,   y: 0.12,  s: 0.7,  rx: -0.2, ry: 2.6,  rz: 0.2,   op: 1 },
    care:       { x: -0.66, y: -0.42, s: 0.72, rx: 0.3,  ry: 4.6,  rz: -0.1,  op: 1 },
    experience: { x: 0,     y: 0.08,  s: 1.3,  rx: 0.15, ry: 7,    rz: 0,     op: 1 },
    team:       { x: 0.78,  y: 0.5,   s: 0.45, rx: -0.3, ry: 9,    rz: 0.3,   op: 1 },
    faq:        { x: 0.95,  y: 0.9,   s: 0.3,  rx: 0,    ry: 10,   rz: 0,     op: 0 },
    contact:    { x: 0,     y: 0.42,  s: 0.85, rx: 0.2,  ry: 12.6, rz: 0,     op: 1 },
  };
  // No celular o dente se ancora em elementos da página: y (e x, se omitido)
  // vêm do centro do elemento; dy desloca em unidades de viewport (-1..1).
  const M = {
    hero:       { x: 0.55,  y: -0.2,  s: 0.42, rx: 0.2, ry: 0.5,  rz: -0.18, op: 1 },
    about:      { anchor: "#sobre .eyebrow", x: 0.62, dy: 0.07, s: 0.24, rx: 0.1, ry: 3, rz: 0.2, op: 1 },
    care:       { anchor: "#tratamentos .eyebrow", x: 0.7, s: 0.2, rx: 0, ry: 5, rz: 0, op: 0 },
    experience: { anchor: ".exp-stage", s: 0.6, rx: 0.15, ry: 7, rz: 0, op: 1 },
    team:       { anchor: "#equipe .eyebrow", x: 0.62, dy: 0.02, s: 0.24, rx: 0.1, ry: 9, rz: 0.2, op: 1 },
    faq:        { anchor: "#duvidas h2", x: 0.8, s: 0.2, rx: 0, ry: 10, rz: 0, op: 0 },
    contact:    { anchor: ".contact-cta .eyebrow", dy: 0.24, s: 0.36, rx: 0.2, ry: 12.6, rz: 0, op: 1 },
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
      let kf = map[sec.dataset.tooth];
      if (!kf) return;
      let pos;
      const el = kf.anchor && document.querySelector(kf.anchor);
      if (el) {
        // rola até o elemento ficar no centro e converte a posição dele para -1..1
        const r = el.getBoundingClientRect();
        const cy = r.top + scrollY + r.height / 2;
        pos = Math.min(max, Math.max(0, cy - vh * 0.5));
        const vy = cy - pos;
        kf = {
          ...kf,
          x: kf.x ?? ((r.left + r.width / 2) / innerWidth) * 2 - 1,
          y: -((vy / vh) * 2 - 1) + (kf.dy || 0),
        };
      } else {
        const top = sec.getBoundingClientRect().top + scrollY;
        pos = Math.min(max, Math.max(0, top - vh * 0.35));
      }
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
        state.y * halfH + Math.sin(t * 0.9) * 0.1 - (1 - k) * 1.2,
        0
      );
      pivot.scale.setScalar(state.s * (0.6 + 0.4 * k));
      tooth.rotation.set(
        state.rx + pointer.y * 0.25 + Math.sin(t * 0.8) * 0.06,
        state.ry + spin.v + t * 0.18 + pointer.x * 0.4 - (1 - k) * 2,
        state.rz + Math.sin(t * 0.6) * 0.08
      );
      // brilho de porcelana que acompanha o cursor
      glint.position.set(pointer.x * 4, -pointer.y * 3 + 1, 4);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
