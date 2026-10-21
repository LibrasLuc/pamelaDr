# Bem-Estar Odontologia

Prévia do site da Bem-Estar Odontologia (Juiz de Fora/MG). Site estático, sem build.

Para ver localmente, sirva a pasta por HTTP (o `tooth.js` é um módulo ES e não carrega via `file://`):

```
npx http-server .
```

- `script.js`: WhatsApp, navegação e animações (GSAP + ScrollTrigger)
- `tooth.js`: dente 3D em porcelana (Three.js) que acompanha a rolagem. Sem WebGL ou com `prefers-reduced-motion`, o hero mostra um dente em SVG.
- `vendor/`: GSAP 3.12.5 e Three.js r160 servidos localmente
