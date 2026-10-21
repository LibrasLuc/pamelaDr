// Número do perfil @bemestarodontologiajf (bio do Instagram).
const WHATSAPP = "5532984021717";
const MSG = "Olá! Gostaria de agendar uma avaliação na Bem-Estar Odontologia.";

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
  floatBtn.classList.toggle("show", y > window.innerHeight * 0.7);
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

// Brilho de porcelana que segue o cursor (também funciona com toque)
document.querySelectorAll(".glint").forEach((el) => {
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
});

if (!reduce && window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);

  // Text reveal: palavras sobem de dentro de uma máscara (texto continua acessível)
  document.querySelectorAll("[data-split]").forEach((h) => {
    h.setAttribute("aria-label", h.textContent.replace(/\s+/g, " ").trim());
    const wrap = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(" "); return; }
            const m = document.createElement("span");
            m.className = "wm"; m.setAttribute("aria-hidden", "true");
            m.innerHTML = `<span>${part}</span>`;
            frag.append(m);
          });
          n.replaceWith(frag);
        } else if (n.nodeName !== "svg") wrap(n);
      });
    };
    wrap(h);
    const words = h.querySelectorAll(".wm > span");
    if (h.closest(".hero")) {
      gsap.from(words, { yPercent: 115, rotate: 4, duration: 1.3, ease: "expo.out", stagger: 0.07, delay: 0.25 });
    } else {
      gsap.from(words, {
        yPercent: 115, rotate: 4, duration: 1.1, ease: "expo.out", stagger: 0.05,
        scrollTrigger: { trigger: h, start: "top 85%" },
      });
    }
  });

  // Entrada do hero
  gsap.from(".hero-in", { y: 30, opacity: 0, duration: 1.2, ease: "power3.out", stagger: 0.12, delay: 0.6 });
  gsap.from(".halo", { scale: 0.6, opacity: 0, duration: 2, ease: "expo.out", delay: 0.3 });
  gsap.from(".smile-line path", { strokeDashoffset: 320, duration: 1.4, ease: "power2.inOut", delay: 1.4 });
  gsap.from(".hero-ghost", { xPercent: -8, opacity: 0, duration: 2.4, ease: "expo.out" });

  // Fades suaves
  gsap.utils.toArray("[data-fade]").forEach((el) => {
    gsap.from(el, { y: 28, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } });
  });

  // Image reveal: recorte que se abre + leve escala
  gsap.utils.toArray("[data-reveal-img]").forEach((fig) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: fig, start: "top 82%" } });
    tl.from(fig, { clipPath: "inset(22% 14% 22% 14% round 28px)", duration: 1.5, ease: "expo.out" });
    const media = fig.querySelector("img, iframe");
    if (media) tl.from(media, { scale: 1.25, duration: 1.8, ease: "expo.out" }, 0);
  });

  // Parallax multicamadas
  gsap.utils.toArray("[data-speed]").forEach((el) => {
    const s = parseFloat(el.dataset.speed);
    gsap.to(el, {
      y: () => (1 - s) * window.innerHeight * 0.5,
      ease: "none",
      scrollTrigger: { trigger: el.closest("section") || el, start: "top top", end: "bottom top", scrub: true, invalidateOnRefresh: true },
    });
  });

  // Cards de tratamento: entrada em cascata
  gsap.from(".card", {
    y: 80, opacity: 0, rotateX: -12, duration: 1.2, ease: "expo.out", stagger: 0.1,
    scrollTrigger: { trigger: ".care-grid", start: "top 80%" },
  });

  // Card no centro da tela fica "ativo" e o dente 3D reage
  document.querySelectorAll(".card").forEach((card, i) => {
    ScrollTrigger.create({
      trigger: card, start: "top 60%", end: "bottom 40%",
      onToggle: (self) => {
        card.classList.toggle("active", self.isActive);
        if (self.isActive) window.dispatchEvent(new CustomEvent("tooth:spin", { detail: i }));
      },
    });
  });

  // Sorriso que se desenha durante a seção de experiência
  document.querySelectorAll(".arc-path").forEach((p, i) => {
    const len = p.getTotalLength();
    gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, {
      strokeDashoffset: 0, ease: "none",
      scrollTrigger: { trigger: ".experience", start: `top ${70 - i * 10}%`, end: "center center", scrub: 1 },
    });
  });

  // Botões magnéticos e cards com inclinação 3D (somente mouse)
  if (finePointer) {
    document.querySelectorAll(".magnetic").forEach((b) => {
      const xTo = gsap.quickTo(b, "x", { duration: 0.6, ease: "power3" });
      const yTo = gsap.quickTo(b, "y", { duration: 0.6, ease: "power3" });
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.3);
        yTo((e.clientY - r.top - r.height / 2) * 0.4);
      });
      b.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
    });
    document.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(card, { rotateY: px * 10, rotateX: -py * 10, duration: 0.6, ease: "power3.out" });
      });
      card.addEventListener("pointerleave", () => gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.8, ease: "power3.out" }));
    });
  }

  window.addEventListener("load", () => ScrollTrigger.refresh());
}
