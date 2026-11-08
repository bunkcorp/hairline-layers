/**
 * Layers: a thangka taken apart into throne, lama and halo. The pointer's x
 * scrubs the gap through a spring; its y picks a layer, which gets the bright
 * edge and its name. At rest the lama sits slightly raised and bright. The
 * slider is the gap, in world units.
 *
 * The pattern: scrub and pick, as Exploded. Picking uses the target gap, never
 * the gap on screen. Identity is the wide plinth with its wheel, the seated
 * body under a pointed pandit's hat, and the circular halo.
 */
const {
  Cam, circ, clamp, extremes, facing, fit, hull, open, poly, prism, proj, ringAt,
  rings, rrect, run, seg, spring, stepS, disposer, mk, pointer, put, register, solid,
} = HL;

const TK = 3.4, REST = 0.24, CX = 56, CY = 48;
const THRONE = [0, 0, 112, 96], BODY = [28, 28, 84, 78], SEAT = [22, 70, 90, 92];
const NAMES = ["throne", "lama", "halo"];
const HALO_R = 42, HALO_IN = 34;

function inside(pt, pg) {
  let c = false;
  for (let i = 0, j = pg.length - 1; i < pg.length; j = i++) {
    const [xi, yi] = pg[i], [xj, yj] = pg[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

const at = (ring, cx, cy) => ring.map((q) => ({ ...q, u: q.u + cx, v: q.v + cy }));

/** A tapering solid: foot ring up to a smaller top ring, with an inset crease. */
function taper(P, front, foot, top, inner, z0, z1) {
  return {
    sil: poly(hull(ringAt(P, foot, z0).concat(ringAt(P, top, z1)))),
    crease: open(ringAt(P, run(inner, front), z1)),
  };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let GAP = value, act = -1, lastP = null;
  const e = spring(REST, { eps: 0.002 });

  const C = Cam(45, 0.5, 1.72);
  const H = 2 * 42 + TK + 22;
  fit(C, [
    [0, 0, 0], [112, 96, 0], [112, 0, 0], [0, 96, 0],
    [0, 0, H], [112, 0, H], [0, 96, H],
  ], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  // throne: wide plinth, Dharma wheel, two lion pads
  const [tR, tI] = rings(...THRONE, 9, 1.8);
  const throne = solid(g);
  const wheel = at(circ(12, 22), CX, 52), hubR = at(circ(3.4, 14), CX, 52);
  const wheelEl = mk("path", { class: "nf" }, throne.g);
  const hubEl = mk("path", { class: "nf lo" }, throne.g);
  const spokes = [0, 45, 90, 135].map((d) => {
    const a = (d * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    return [[CX + 4 * c, 52 + 4 * s], [CX + 11 * c, 52 + 11 * s]];
  });
  const spokeEl = mk("path", { class: "nf lo" }, throne.g);
  const pads = [[10, 74, 32, 92], [80, 74, 102, 92]].map((r) => {
    const [ring, inner] = rings(...r, 4.5, 1.1);
    return { ring, inner, el: solid(g) };
  });

  // lama: lotus seat, body, tapering pandit's hat
  const lGuide = mk("path", { class: "nf dash" }, g);
  const [sR, sI] = rings(...SEAT, 6, 1.4);
  const seat = solid(g);
  const [bR, bI] = rings(...BODY, 5, 1.3);
  const body = solid(g);
  const hatFoot = rrect(40, 8, 72, 32, 2.4, 6);
  const hatTop = rrect(50, -6, 62, 8, 1.2, 6);
  const hatIn = rrect(51, -5, 61, 7, 0.9, 6);
  const hat = solid(g);
  const mudra = mk("path", { class: "nf lo" }, body.g);
  // lotus petal marks on the seat
  const petals = mk("path", { class: "nf lo" }, seat.g);

  // halo: circular nimbus
  const oGuide = mk("path", { class: "nf dash" }, g);
  const haloR = at(circ(HALO_R, 28), CX, 22);
  const haloI = at(circ(HALO_IN, 24), CX, 22);
  const halo = solid(g);
  const rays = mk("path", { class: "nf lo" }, halo.g);
  const RAY = [15, 45, 75, 105, 135, 165].map((d) => {
    const a = (d * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    return [[CX + 20 * c, 22 + 20 * s], [CX + 38 * c, 22 + 38 * s]];
  });

  const extB = extremes(P, bR), extH = extremes(P, haloR);
  const sils = [throne.sil, body.sil, halo.sil];

  const corners = (r, z) => {
    const [x0, y0, x1, y1] = r;
    return [P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)];
  };

  function pick(p) {
    if (!p) return -1;
    const z = (i) => i * GAP * e.t + TK;
    if (inside(p, ringAt(P, haloR, z(2)))) return 2;
    if (inside(p, corners(BODY, z(1))) || inside(p, corners(SEAT, z(1)))) return 1;
    if (inside(p, corners(THRONE, z(0)))) return 0;
    return -1;
  }
  function setAct(a) {
    if (a === act) return;
    act = a;
    const on = (i) => (a < 0 ? i === 1 : i === a);
    sils.forEach((s, i) => s.classList.toggle("hi", on(i)));
    seat.sil.classList.toggle("hi", on(1));
    hat.sil.classList.toggle("hi", on(1));
    B.wake();
  }

  sils[1].classList.add("hi");
  seat.sil.classList.add("hi");
  hat.sil.classList.add("hi");

  const B = register(stage, (dt) => {
    const m = stepS(e, dt), z = (i) => i * GAP * e.x;
    const z0 = z(0), z1 = z(1), z2 = z(2);

    put(throne, prism(P, front, tR, tI, z0, z0 + TK));
    const zt = z0 + TK;
    wheelEl.setAttribute("d", poly(ringAt(P, wheel, zt)));
    hubEl.setAttribute("d", poly(ringAt(P, hubR, zt)));
    spokeEl.setAttribute("d", spokes.map(([a, b]) => seg(P(a[0], a[1], zt), P(b[0], b[1], zt))).join(""));
    pads.forEach((p) => put(p.el, prism(P, front, p.ring, p.inner, z0 + 0.5, z0 + TK - 0.3)));

    lGuide.setAttribute("d", extB.slice(0, 2).map((q) => seg(P(q.u, q.v, z1), P(q.u, q.v, z0 + TK))).join(""));
    put(seat, prism(P, front, sR, sI, z1, z1 + TK));
    const zs = z1 + TK;
    petals.setAttribute("d", [
      seg(P(30, 78, zs), P(40, 86, zs)), seg(P(48, 74, zs), P(56, 88, zs)),
      seg(P(64, 74, zs), P(72, 88, zs)), seg(P(80, 78, zs), P(90, 86, zs)),
    ].join(""));
    put(body, prism(P, front, bR, bI, zs, zs + 10));
    const zb = zs + 10;
    put(hat, taper(P, front, hatFoot, hatTop, hatIn, zb, zb + 16));
    mudra.setAttribute("d", seg(P(42, 52, zb), P(70, 52, zb)) + seg(P(56, 46, zb), P(56, 58, zb)));

    oGuide.setAttribute("d", extH.slice(0, 2).map((q) => seg(P(q.u, q.v, z2), P(q.u, q.v, zb))).join(""));
    put(halo, prism(P, front, haloR, haloI, z2, z2 + TK));
    const zh = z2 + TK;
    rays.setAttribute("d", RAY.map(([a, b]) => seg(P(a[0], a[1], zh), P(b[0], b[1], zh))).join(""));

    read.textContent = act >= 0 ? NAMES[act] : "rest";
    return m;
  });
  bag.add(B.unregister);

  bag.add(pointer(stage, {
    move: (p) => {
      lastP = p;
      e.t = REST + (1 - REST) * clamp((p[0] - 40) / 320, 0, 1);
      setAct(pick(p));
      B.wake();
    },
    leave: () => { lastP = null; e.t = REST; setAct(-1); B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { GAP = v; if (lastP) setAct(pick(lastP)); B.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "layers",
  means: "A thangka in three slabs: throne, lama and halo. Drag across to open them; height picks which is bright.",
  rules: [1, 3, 5, 8],
  range: [12, 28, 40],
  tour: [[200, 220], [200, 155], [200, 90], null],
  mount,
});
