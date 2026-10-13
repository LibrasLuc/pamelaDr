// PENDENTE: confirmar com a Dra. Pâmela o número de agendamento.
// Provisório: telefone do perfil do consultório no Google. (O Linktree usa outro número — não misturar.)
const WHATSAPP = "5532984021717";
const MSG = "Olá, Dra. Pâmela! Gostaria de agendar uma avaliação.";

document.documentElement.classList.add("js");

document.querySelectorAll(".js-whats").forEach((a) => {
  a.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(MSG)}`;
  a.target = "_blank";
  a.rel = "noopener";
});

const nav = document.querySelector(".nav");
const floatBtn = document.querySelector(".float-whats");
const onScroll = () => {
  const y = window.scrollY;
  nav.classList.toggle("scrolled", y > 8);
  floatBtn.classList.toggle("show", y > window.innerHeight * 0.6);
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

const items = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -10% 0px" });
  items.forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 80}ms`; io.observe(el); });
} else {
  items.forEach((el) => el.classList.add("in"));
}

// ---------- Animações profissionais ----------
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reduce) {
  // Título do hero palavra por palavra (mantém o texto acessível)
  const h1 = document.querySelector(".stage h1");
  h1.setAttribute("aria-label", h1.textContent.replace(/\s+/g, " ").trim());
  let i = 0;
  const split = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(" "); return; }
          const w = document.createElement("span");
          w.className = "w"; w.setAttribute("aria-hidden", "true");
          w.innerHTML = `<span style="--i:${i++}">${part}</span>`;
          frag.append(w);
        });
        n.replaceWith(frag);
      } else split(n);
    });
  };
  split(h1);
  h1.classList.add("split");

  // Barra de progresso, parallax da foto e brilho do encerramento
  const bar = document.createElement("div");
  bar.className = "progress"; bar.setAttribute("aria-hidden", "true");
  document.body.prepend(bar);
  const img = document.querySelector(".stage-photo img");
  const closing = document.querySelector(".closing");
  let ticking = false;
  const frame = () => {
    const y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    if (y < innerHeight * 1.2) img.style.setProperty("--py", `${y * 0.08}px`);
    const r = closing.getBoundingClientRect();
    const p = Math.min(Math.max(1 - r.top / innerHeight, 0), 1);
    closing.style.setProperty("--glow", (0.2 + p * 0.8).toFixed(3));
    ticking = false;
  };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  frame();

  // Botões magnéticos (apenas com mouse)
  if (window.matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll(".btn:not(.btn-sm)").forEach((b) => {
      b.classList.add("magnetic");
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.18;
        const yy = (e.clientY - r.top - r.height / 2) * 0.25;
        b.style.transform = `translate(${x}px, ${yy}px)`;
      });
      b.addEventListener("pointerleave", () => { b.style.transform = ""; });
    });
  }
}

// Digitação da primeira mensagem no hero
const typed = document.querySelector(".typed");
if (typed && !reduce) {
  const full = typed.dataset.text;
  typed.parentElement.setAttribute("aria-label", full);
  typed.setAttribute("aria-hidden", "true");
  typed.textContent = "";
  const chars = [...full];
  let k = 0;
  setTimeout(function type() {
    typed.textContent += chars[k++];
    if (k < chars.length) setTimeout(type, 38 + Math.random() * 60);
  }, 1300);
}
