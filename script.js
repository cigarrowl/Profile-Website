(() => {
  document.getElementById('yr').textContent = new Date().getFullYear();

  const canvas = document.getElementById('net');
  const ctx = canvas.getContext('2d');
  const root = getComputedStyle(document.documentElement);
  const LINE = root.getPropertyValue('--line').trim();
  const NODE = root.getPropertyValue('--node').trim();
  const SIGNAL = root.getPropertyValue('--signal').trim();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let w, h, range, nodes = [], packets = [], running = false;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    range = Math.min(190, Math.max(110, w / 5));
    const count = Math.min(70, Math.round((w * h) / 16000));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
    }));
    packets = [];
    draw();
  }

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const neighbors = (n) => nodes.filter((m) => m !== n && dist(n, m) < range);

  function send(from, hops) {
    const options = neighbors(from);
    if (!options.length) return;
    const to = options[Math.floor(Math.random() * options.length)];
    packets.push({ from, to, t: 0, speed: 0.012 + Math.random() * 0.01, hops });
  }

  function step() {
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    }
    if (packets.length < 14 && Math.random() < 0.05) {
      send(nodes[Math.floor(Math.random() * nodes.length)], 3 + Math.floor(Math.random() * 4));
    }
    packets = packets.filter((p) => {
      p.t += p.speed;
      if (p.t < 1) return true;
      if (p.hops > 0) send(p.to, p.hops - 1);
      return false;
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = dist(nodes[i], nodes[j]);
        if (d < range) {
          ctx.globalAlpha = (1 - d / range) * 0.45;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = NODE;
    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = SIGNAL;
    for (const p of packets) {
      const x = p.from.x + (p.to.x - p.from.x) * p.t;
      const y = p.from.y + (p.to.y - p.from.y) * p.t;
      ctx.globalAlpha = 0.25;
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function loop() {
    if (!running) return;
    step();
    draw();
    requestAnimationFrame(loop);
  }

  // Clicking sends a burst of packets from the nearest node.
  canvas.addEventListener('click', (e) => {
    if (reduceMotion || !nodes.length) return;
    const r = canvas.getBoundingClientRect();
    const pt = { x: e.clientX - r.left, y: e.clientY - r.top };
    const nearest = nodes.reduce((a, b) => (dist(pt, a) < dist(pt, b) ? a : b));
    for (let i = 0; i < 5; i++) send(nearest, 4);
  });

  window.addEventListener('resize', resize);
  resize();

  if (!reduceMotion) {
    // Only animate while the hero is on screen.
    new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting;
      if (visible && !running) { running = true; loop(); }
      if (!visible) running = false;
    }).observe(canvas);
  }
})();