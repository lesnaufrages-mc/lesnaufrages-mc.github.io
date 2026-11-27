// Kit de formats Les Naufragés : outils communs à tous les formats.
// Chaque format est une page HTML 1080x1920 qui définit :
//   window.DURATION  (durée en secondes)
//   window.render(t) (dessine l'image à l'instant t, sans hasard : même t = même image)
//   window.EVENTS()  (liste des instants de bruitage : [{t, type:'whoosh'|'tick'|'impact'|'fin'}])
// Les données arrivent dans window.DATA (injecté par compose.js, ou data-demo.js pour l'aperçu navigateur).
(function () {
  const css = `
  @font-face{font-family:Cinzel;src:url(../polices/cinzel-latin.woff2) format('woff2');font-weight:400 900}
  @font-face{font-family:Cinzel;src:url(../polices/cinzel-latin-ext.woff2) format('woff2');font-weight:400 900;unicode-range:U+0100-024F,U+1E00-1EFF}
  :root{--fond:#0d1626;--fond2:#16233a;--or:#e8b84a;--or2:#ffd77a;--texte:#f4ecdc;--doux:#a9b4c6;--rouge:#e0563f;--vert:#5fc28a;--bleu:#4f8fe0}
  html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:var(--fond);color:var(--texte);
    font-family:Inter,'Segoe UI','DejaVu Sans',sans-serif}
  #scene{position:absolute;inset:0;overflow:hidden}
  .titre{font-family:Cinzel,serif;font-weight:800;letter-spacing:.02em}
  .abs{position:absolute}
  #fondgrain{position:absolute;inset:0;background:
     radial-gradient(1200px 900px at 50% 18%,#22365a 0%,transparent 60%),
     radial-gradient(900px 900px at 80% 110%,#3a2a12 0%,transparent 60%),
     linear-gradient(180deg,var(--fond2),var(--fond))}
  #marque{z-index:4;position:absolute;left:0;right:0;bottom:70px;text-align:center;font-family:Cinzel,serif;font-weight:700;
     font-size:30px;letter-spacing:.18em;color:var(--or);opacity:.85}
  #source{z-index:4;position:absolute;left:60px;right:60px;bottom:24px;text-align:center;font-size:20px;color:var(--doux);opacity:.75}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const K = {
    clamp: (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)),
    // progression 0..1 entre a et b
    p: (t, a, b) => K.clamp((t - a) / (b - a)),
    easeOut: (x) => 1 - Math.pow(1 - x, 3),
    easeInOut: (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    back: (x) => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
    nombre: (v, dec = 0) => v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }),
    el: (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; (parent || document.getElementById('scene')).appendChild(e); return e; },
    esc: (s) => K.nb(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
    // espace insécable avant ? ! : ; (pas de « ? » seul en début de ligne)
    nb: (s) => String(s ?? '').replace(/ ([?!:;»])/g, '\u00a0$1'),
    // texte qui s'écrit lettre par lettre
    tape: (s, x) => { s = K.nb(s); return s.slice(0, Math.round(s.length * K.clamp(x))); },
    // base commune : fond, marque, source
    base: (data) => {
      const sc = document.getElementById('scene');
      K.el('div', '', sc).id = 'fondgrain';
      const m = K.el('div', '', sc, K.esc(data.marque || 'LES NAUFRAGÉS · lesnaufrages.net')); m.id = 'marque';
      const s = K.el('div', '', sc, data.source ? 'Source : ' + K.esc(data.source) : ''); s.id = 'source';
    },
    // carte de fin commune (question + appel à l'action), de t0 à t0+dur
    fin: (t, t0, data) => {
      let f = document.getElementById('kfin');
      if (!f) {
        f = K.el('div', 'abs'); f.id = 'kfin';
        f.style.cssText = 'left:0;right:0;top:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(9,14,24,.92);text-align:center;padding:0 90px';
        f.innerHTML = `<div class="titre" style="font-size:78px;line-height:1.15;color:var(--or2)">${K.esc(data.question || 'Et toi, tu en penses quoi ?')}</div>
          <div style="margin-top:50px;font-size:40px;color:var(--texte)">${K.esc(data.appel || 'Réponds en commentaire 👇')}</div>
          <div class="titre" style="margin-top:120px;font-size:46px;letter-spacing:.16em;color:var(--or)">LES NAUFRAGÉS</div>
          <div style="margin-top:12px;font-size:32px;color:var(--doux)">lesnaufrages.net</div>`;
      }
      const x = K.p(t, t0, t0 + .5);
      f.style.opacity = x; f.style.transform = `scale(${1.06 - .06 * K.easeOut(x)})`;
    },
  };
  window.K = K;
})();
