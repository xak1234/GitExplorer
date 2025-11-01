import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Pac-Man Board Designer + Playable Engine (single-file React + TS)
 * - Designer: paint tiles, symmetry, undo/redo, import/export JSON/PNG
 * - Engine: arrows/WASD, pause/reset, implicit dots on all passable cells
 * - Ghosts: BFS homing toward Pac-Man; flee during power
 * - Sprites: directional images provided at sandbox:/mnt/data/pac*.png
 */

// Sprite image paths (relative to assets folder)
const PAC_IMG_UP = "../../assets/images/pacup.png";
const PAC_IMG_DOWN = "../../assets/images/pacdown.png";
const PAC_IMG_LEFT = "../../assets/images/pacleft.png";
const PAC_IMG_RIGHT = "../../assets/images/pacright.png";

const DEFAULT_WIDTH = 28; // classic 28x31
const DEFAULT_HEIGHT = 31;

export const TileId = {
  Empty: 0,
  Wall: 1,
  Pellet: 2, // visual only in editor; gameplay dots are implicit
  PowerPellet: 3, // special pellet (explicit)
  PacSpawn: 4,
  GhostSpawn: 5,
  GhostDoor: 6,
  FruitSpawn: 7,
  PortalA: 8,
  PortalB: 9,
};


const Dir = {
  Up: 0,
  Left: 1,
  Down: 2,
  Right: 3,
  None: 4,
};

const DIRS = {
  [Dir.Up]: { x: 0, y: -1 },
  [Dir.Left]: { x: -1, y: 0 },
  [Dir.Down]: { x: 0, y: 1 },
  [Dir.Right]: { x: 1, y: 0 },
  [Dir.None]: { x: 0, y: 0 },
};

const TILE_META = {
  [TileId.Empty]: { name: "Empty", glyph: "." },
  [TileId.Wall]: { name: "Wall", glyph: "#" },
  [TileId.Pellet]: { name: "Pellet", glyph: "." },
  [TileId.PowerPellet]: { name: "Power Pellet", glyph: "O" },
  [TileId.PacSpawn]: { name: "Pac Spawn", glyph: "P" },
  [TileId.GhostSpawn]: { name: "Ghost Spawn", glyph: "G" },
  [TileId.GhostDoor]: { name: "Ghost Door", glyph: "=" },
  [TileId.FruitSpawn]: { name: "Fruit Spawn", glyph: "F" },
  [TileId.PortalA]: { name: "Portal A", glyph: "A" },
  [TileId.PortalB]: { name: "Portal B", glyph: "B" },
};

const TILE_COLORS = {
  [TileId.Empty]: "bg-black",
  [TileId.Wall]: "bg-blue-500",
  [TileId.Pellet]: "bg-black",
  [TileId.PowerPellet]: "bg-black",
  [TileId.PacSpawn]: "bg-amber-500",
  [TileId.GhostSpawn]: "bg-rose-500",
  [TileId.GhostDoor]: "bg-cyan-400",
  [TileId.FruitSpawn]: "bg-lime-500",
  [TileId.PortalA]: "bg-fuchsia-500",
  [TileId.PortalB]: "bg-emerald-500",
};

function PelletDot({ power = false }) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className={
          power
            ? "w-2.5 h-2.5 rounded-full bg-white"
            : "w-1.5 h-1.5 rounded-full bg-white"
        }
      />
    </div>
  );
}

export function makeGrid(w, h, fill = TileId.Empty) {
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => fill)
  );
}

class History {
  past = []; // kept simple for in-file usage
  future = [];
  constructor(present) { this.present = present; }
  get value() {
    return this.present;
  }
  commit(next) {
    this.past.push(this.present);
    this.present = next;
    this.future = [];
  }
  undo() {
    if (!this.past.length) return this.present;
    const prev = this.past.pop();
    this.future.push(this.present);
    this.present = prev;
    return this.present;
  }
  redo() {
    if (!this.future.length) return this.present;
    const next = this.future.pop();
    this.past.push(this.present);
    this.present = next;
    return this.present;
  }
}

// LevelData structure for import/export
// { name, width, height, tiles: number[], meta: object }

// Actor structure: { pos: {x, y}, dir: number, intent: number }

// Helper for alerts string composition
function formatIssues(issues) {
  return issues.length
    ? `Validation issues (\n- ${issues.join("\n- ")})`
    : "Looks good! Basic checks passed.";
}

export default function PacmanBoardDesigner() {
  // Designer state
  const [name, setName] = useState("My Pac-Board");
  const [gridHist, setGridHist] = useState(
    () => new History(makeGrid(DEFAULT_WIDTH, DEFAULT_HEIGHT))
  );
  const grid = gridHist.value;
const [tool, setTool] = useState(TileId.Wall);
  const [cellSize, setCellSize] = useState(20);
  const [symH, setSymH] = useState(true);
  const [symV, setSymV] = useState(false);
  const [isPainting, setPainting] = useState(false);
  const [eraseMode, setEraseMode] = useState(false);

  const width = grid[0]?.length ?? DEFAULT_WIDTH;
  const height = grid.length;

  // Engine state
const [mode, setMode] = useState('edit');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [paused, setPaused] = useState(false);
  const [powerTicks, setPowerTicks] = useState(0);
const loopRef = useRef(null);
  const stepMs = 90;
const [pac, setPac] = useState(null);
const [ghosts, setGhosts] = useState([]);
const dotsRef = useRef(new Set()); // implicit dots (all passable cells minus power)
const powerRef = useRef(new Set()); // explicit power pellets

const keyFrom = (x, y) => `${x},${y}`;
const inBounds = (x, y) => x >= 0 && x < width && y >= 0 && y < height;
const tileAt = (x, y) => (inBounds(x, y) ? grid[y][x] : TileId.Wall);
const isWall = (x, y) => tileAt(x, y) === TileId.Wall;
const isGhostDoor = (x, y) => tileAt(x, y) === TileId.GhostDoor;
const isPortal = (x, y) => tileAt(x, y) === TileId.PortalA || tileAt(x, y) === TileId.PortalB;
const passableForPac = (x, y) => inBounds(x, y) && !isWall(x, y) && !isGhostDoor(x, y) && !isPortal(x, y);
const passableForGhost = (x, y) => inBounds(x, y) && !isWall(x, y);

const findFirst = (id) => {
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) if (grid[y][x] === id) return { x, y };
    return null;
  };

  // Portals map (pair A<->B by index)
  const portals = useMemo(() => {
const a = [],
      b = [];
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        if (grid[y][x] === TileId.PortalA) a.push({ x, y });
        if (grid[y][x] === TileId.PortalB) b.push({ x, y });
      }
    const map = new Map();
    if (a.length === 0 || b.length === 0) return map; // Guard against empty arrays
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const A = a[i % a.length];
      const B = b[i % b.length];
      if (A && B) {
        map.set(keyFrom(A.x, A.y), B);
        map.set(keyFrom(B.x, B.y), A);
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, grid]);

  // Dots rebuild (implicit on passable cells, exclude power pellets)
  const rebuildDots = () => {
const dots = new Set();
const pow = new Set();
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        if (grid[y][x] === TileId.PowerPellet) pow.add(keyFrom(x, y));
        if (passableForPac(x, y)) dots.add(keyFrom(x, y));
      }
    pow.forEach((k) => dots.delete(k));
    dotsRef.current = dots;
    powerRef.current = pow;
  };

  // Actors reset
  const resetActors = () => {
    const pacSpawn = findFirst(TileId.PacSpawn);
    const ghostSpawn = findFirst(TileId.GhostSpawn);
    setPac(pacSpawn ? { pos: { ...pacSpawn }, dir: Dir.Left, intent: Dir.Left, prevPos: { ...pacSpawn } } : null);
const gs = [];
    if (ghostSpawn) {
      const prefs = [Dir.Left, Dir.Up, Dir.Down, Dir.Right];
      for (let i = 0; i < 4; i++)
        gs.push({ pos: { ...ghostSpawn }, dir: prefs[i] ?? Dir.Left, intent: prefs[i] ?? Dir.Left });
    }
    setGhosts(gs);
  };

  const startPlay = () => {
    if (!findFirst(TileId.PacSpawn) || !findFirst(TileId.GhostSpawn)) {
      alert('Need at least one Pac Spawn and one Ghost Spawn.');
      return;
    }
    rebuildDots();
    resetActors();
    setScore(0);
    setLives(3);
    setPowerTicks(0);
    setMode('play');
    setPaused(false);
  };
  const stopPlay = () => {
    setMode('edit');
    setPac(null);
    setGhosts([]);
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
  };

  // Painting
  const paintAt = (gx, gy, tile, base) => {
    const src = base ?? grid;
    const next = src.map((r) => r.slice());
const pts = [[gx, gy]];
    if (symH) pts.push([width - 1 - gx, gy]);
    if (symV) pts.push([gx, height - 1 - gy]);
    if (symH && symV) pts.push([width - 1 - gx, height - 1 - gy]);
    for (const [x, y] of pts)
      if (x >= 0 && x < width && y >= 0 && y < height) next[y][x] = tile;
    return next;
  };
  const handlePointer = (e, x, y) => {
    e.preventDefault();
    const tile = eraseMode ? TileId.Empty : tool;
    const next = paintAt(x, y, tile);
    setGridHist((h) => {
      const nh = new History(next);
      nh.past = [...h.past];
      nh.future = [];
      return nh;
    });
  };
  const commitCell = (x, y) => {
    const tile = eraseMode ? TileId.Empty : tool;
    const next = paintAt(x, y, tile);
    setGridHist((h) => {
      const newHist = new History(h.present);
      newHist.past = [...h.past];
      newHist.future = [];
      newHist.commit(next);
      return newHist;
    });
  };

  // Keyboard handler with useCallback to prevent memory leaks
  const onKey = useCallback((e) => {
      if (mode === 'edit') {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          setGridHist((h) => {
            const newHist = new History(h.present);
            newHist.past = [...h.past];
            newHist.future = [...h.future];
            newHist.undo();
            return newHist;
          });
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
          e.preventDefault();
          setGridHist((h) => {
            const newHist = new History(h.present);
            newHist.past = [...h.past];
            newHist.future = [...h.future];
            newHist.redo();
            return newHist;
          });
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          exportJSON();
        } else if (e.key >= '1' && e.key <= '9') {
          const idx = Number(e.key) - 1;
          const ids = Object.values(TileId).filter((v) => typeof v === 'number');
          const t = ids[idx];
          if (t !== undefined) setTool(t);
        }
      } else {
        const k = e.key.toLowerCase();
        const toDir = (x) =>
          x === 'arrowup' || x === 'w'
            ? Dir.Up
            : x === 'arrowleft' || x === 'a'
            ? Dir.Left
            : x === 'arrowdown' || x === 's'
            ? Dir.Down
            : x === 'arrowright' || x === 'd'
            ? Dir.Right
            : Dir.None;
        if (k === 'p') setPaused((v) => !v);
        if (k === 'r') {
          rebuildDots();
          resetActors();
          setPowerTicks(0);
          setScore(0);
          setLives(3);
        }
        const nd = toDir(k);
        if (nd !== Dir.None) setPac((cur) => (cur ? { ...cur, intent: nd } : cur));
      }
  }, [mode, exportJSON, rebuildDots, resetActors]);

  // Keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  // Resize
  const resize = (w, h) => {
    const next = makeGrid(w, h, TileId.Empty);
    for (let y = 0; y < Math.min(h, height); y++)
      for (let x = 0; x < Math.min(w, width); x++) next[y][x] = grid[y][x];
    setGridHist((hs) => {
      hs.commit(next);
      return new History(hs.value);
    });
  };

  // Export / Import
  const exportJSON = () => {
    const data = {
      name,
      width,
      height,
      tiles: grid.flat(),
      meta: { createdAt: new Date().toISOString(), format: 'pacman-level-v1' },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/[^a-z0-9_-]/gi, '_')}.pac.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const exportPNG = () => {
    const px = cellSize;
    const canvas = document.createElement('canvas');
    canvas.width = width * px;
    canvas.height = height * px;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const colorOf = (id) =>
      id === TileId.Wall
        ? '#3b82f6'
        : id === TileId.PacSpawn
        ? '#f59e0b'
        : id === TileId.GhostSpawn
        ? '#f43f5e'
        : id === TileId.GhostDoor
        ? '#22d3ee'
        : id === TileId.FruitSpawn
        ? '#84cc16'
        : id === TileId.PortalA
        ? '#a21caf'
        : id === TileId.PortalB
        ? '#10b981'
        : '#000';
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const id = grid[y][x];
        if (id === TileId.Empty) continue;
        if (id === TileId.Pellet || id === TileId.PowerPellet) {
          const r = id === TileId.PowerPellet ? px * 0.17 : px * 0.11;
          ctx.beginPath();
          ctx.arc(x * px + px / 2, y * px + px / 2, r, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.fill();
        } else {
          ctx.fillStyle = colorOf(id);
          ctx.fillRect(x * px, y * px, px, px);
        }
      }
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/[^a-z0-9_-]/gi, '_')}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };
  const onImport = async (file) => {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.tiles) || !data.width || !data.height) {
      alert('Invalid level JSON');
      return;
    }
    const next = makeGrid(data.width, data.height, TileId.Empty);
    for (let y = 0; y < data.height; y++)
      for (let x = 0; x < data.width; x++)
        next[y][x] = data.tiles[y * data.width + x] ?? TileId.Empty;
    setName(data.name || 'Imported Pac-Board');
    setGridHist((h) => {
      h.commit(next);
      return new History(h.value);
    });
  };

  // Validate
  const validate = () => {
    const counts = {
      [TileId.Empty]: 0,
      [TileId.Wall]: 0,
      [TileId.Pellet]: 0,
      [TileId.PowerPellet]: 0,
      [TileId.PacSpawn]: 0,
      [TileId.GhostSpawn]: 0,
      [TileId.GhostDoor]: 0,
      [TileId.FruitSpawn]: 0,
      [TileId.PortalA]: 0,
      [TileId.PortalB]: 0,
    };
    for (const row of grid) for (const id of row) counts[id]++;
    const issues = [];
    if (counts[TileId.PacSpawn] < 1) issues.push('No Pac-Man spawn set.');
    if (counts[TileId.GhostSpawn] < 1) issues.push('No Ghost spawn set.');
    if (counts[TileId.PortalA] !== counts[TileId.PortalB]) issues.push('Portal A and B counts must match.');
    alert(formatIssues(issues));
  };

  // BFS helper for ghosts (component-local, portal-aware)
  function bfsNextDir(start, target) {
    const key = (x, y) => `${x},${y}`;
    const q = [start];
    const prev = new Map();
    prev.set(key(start.x, start.y), null);
    const dirs = [
      [Dir.Up, { x: 0, y: -1 }],
      [Dir.Left, { x: -1, y: 0 }],
      [Dir.Down, { x: 0, y: 1 }],
      [Dir.Right, { x: 1, y: 0 }],
    ];
    while (q.length) {
      const cur = q.shift();
      if (cur.x === target.x && cur.y === target.y) break;
      for (const [, v] of dirs) {
        let nx = cur.x + v.x,
          ny = cur.y + v.y;
        if (!passableForGhost(nx, ny)) continue;
        const k1 = key(nx, ny);
        if (portals.has(k1)) {
          const dest = portals.get(k1);
          nx = dest.x;
          ny = dest.y;
        }
        const k = key(nx, ny);
        if (prev.has(k)) continue;
        prev.set(k, cur);
        q.push({ x: nx, y: ny });
      }
    }
    const tgtK = key(target.x, target.y);
    if (!prev.has(tgtK)) return Dir.None;
    let cur = target;
    let parent = prev.get(tgtK);
    while (parent && !(parent.x === start.x && parent.y === start.y)) {
      cur = parent;
      parent = prev.get(key(cur.x, cur.y));
    }
    if (!parent) return Dir.None;
    const dx = cur.x - start.x,
      dy = cur.y - start.y;
    if (dx === 0 && dy === -1) return Dir.Up;
    if (dx === -1 && dy === 0) return Dir.Left;
    if (dx === 0 && dy === 1) return Dir.Down;
    if (dx === 1 && dy === 0) return Dir.Right;
    return Dir.None;
  }

  // Engine loop
  useEffect(() => {
    if (mode !== 'play') {
      if (loopRef.current) {
        clearInterval(loopRef.current);
        loopRef.current = null;
      }
      return;
    }
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    loopRef.current = window.setInterval(() => {
      if (paused) return;
      setPac((cur) => {
        if (!cur) return cur;
        const turn = DIRS[cur.intent];
        const nx = cur.pos.x + turn.x,
          ny = cur.pos.y + turn.y;
        const canTurn = passableForPac(nx, ny);
        const fwd = DIRS[cur.dir];
        const fx = cur.pos.x + fwd.x,
          fy = cur.pos.y + fwd.y;
        let nextDir = cur.dir;
        let nextPos = { ...cur.pos };
        if (canTurn) {
          nextDir = cur.intent;
          nextPos = { x: nx, y: ny };
        } else if (passableForPac(fx, fy)) {
          nextPos = { x: fx, y: fy };
        }
        let k = keyFrom(nextPos.x, nextPos.y);
if (portals.has(k)) {
          const dest = portals.get(k);
          if (dest) {
            nextPos = { ...dest };
            k = keyFrom(nextPos.x, nextPos.y);
          }
        }
        if (powerRef.current.has(k)) {
          powerRef.current.delete(k);
          setScore((s) => s + 50);
          setPowerTicks(200);
        }
        if (dotsRef.current.has(k)) {
          dotsRef.current.delete(k);
          setScore((s) => s + 10);
        }
        return { pos: nextPos, dir: nextDir, intent: cur.intent, prevPos: cur.pos };
      });

      setPowerTicks((t) => (t > 0 ? t - 1 : 0));

      setGhosts((gs) => {
        const pacPos = pac?.pos ?? gs[0]?.pos ?? { x: 0, y: 0 };
        const nextGs = gs.map((g) => {
          let chosen = Dir.None;
          if (powerTicks <= 0) chosen = bfsNextDir(g.pos, pacPos);
          if (chosen === Dir.None) {
            // Greedy fallback or fleeing
            let best = g.dir;
            let bestMetric = Number.POSITIVE_INFINITY;
            const options = [
              [Dir.Up, { x: 0, y: -1 }],
              [Dir.Left, { x: -1, y: 0 }],
              [Dir.Down, { x: 0, y: 1 }],
              [Dir.Right, { x: 1, y: 0 }],
            ];
            for (const [d, v] of options) {
              const x = g.pos.x + v.x,
                y = g.pos.y + v.y;
              if (!passableForGhost(x, y)) continue;
              const dx = x - pacPos.x,
                dy = y - pacPos.y;
              const m =
                powerTicks > 0
                  ? -(Math.abs(dx) + Math.abs(dy))
                  : Math.abs(dx) + Math.abs(dy);
              if (m < bestMetric) {
                bestMetric = m;
                best = d;
              }
            }
            chosen = best;
          }
          const v = DIRS[chosen];
          let nx = g.pos.x + v.x,
            ny = g.pos.y + v.y;
          const kg = keyFrom(nx, ny);
if (portals.has(kg)) {
            const dest = portals.get(kg);
            if (dest) {
              nx = dest.x;
              ny = dest.y;
            }
          }
          return { pos: { x: nx, y: ny }, dir: chosen, intent: chosen };
        });

        // Collisions
        setPac((cur) => {
          if (!cur) return cur;
          const hit = nextGs.find((g) => {
            // Check exact position collision
            const exactCollision = g.pos.x === cur.pos.x && g.pos.y === cur.pos.y;
            
            // Also check movement path collision for fast movement (when prevPos exists)
            let pathCollision = false;
            if (cur.prevPos && (cur.pos.x !== cur.prevPos.x || cur.pos.y !== cur.prevPos.y)) {
              const dx = Math.sign(cur.pos.x - cur.prevPos.x);
              const dy = Math.sign(cur.pos.y - cur.prevPos.y);
              
              let checkX = cur.prevPos.x;
              let checkY = cur.prevPos.y;
              
              while (checkX !== cur.pos.x || checkY !== cur.pos.y) {
                if (checkX !== cur.pos.x) checkX += dx;
                if (checkY !== cur.pos.y) checkY += dy;
                
                if (g.pos.x === checkX && g.pos.y === checkY) {
                  pathCollision = true;
                  break;
                }
              }
            }
            
            return exactCollision || pathCollision;
          });
          if (!hit) return cur;
          if (powerTicks > 0) {
            const gSpawn = findFirst(TileId.GhostSpawn) ?? { x: 0, y: 0 };
            for (let i = 0; i < nextGs.length; i++) {
              if (
                nextGs[i].pos.x === hit.pos.x &&
                nextGs[i].pos.y === hit.pos.y
              )
                nextGs[i] = {
                  pos: { ...gSpawn },
                  dir: Dir.Left,
                  intent: Dir.Left,
                };
            }
            setScore((s) => s + 200);
            return cur;
          }
          setLives((L) => {
            const left = L - 1;
            if (left <= 0) {
              alert('Game Over');
              stopPlay();
              return 0;
            }
            return left;
          });
          resetActors();
          setPowerTicks(0);
          return cur;
        });

        if (dotsRef.current.size === 0) {
          alert('You Win! All dots collected!');
          stopPlay();
        }
        return nextGs;
      });
    }, stepMs);
    return () => {
      if (loopRef.current) {
        clearInterval(loopRef.current);
        loopRef.current = null;
      }
    };
  }, [mode, paused, stepMs, portals, powerTicks]);

  // UI helpers
const pacSpriteFor = (d) =>
    d === Dir.Up
      ? PAC_IMG_UP
      : d === Dir.Down
      ? PAC_IMG_DOWN
      : d === Dir.Left
      ? PAC_IMG_LEFT
      : PAC_IMG_RIGHT;

  // Ensure default board only when absolutely empty, but do NOT auto-start (designer-first UX)
  useEffect(() => {
    if (findFirst(TileId.PacSpawn) && findFirst(TileId.GhostSpawn)) return;
    const w = 19,
      h = 17;
    const g = makeGrid(w, h, TileId.Empty);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (y === 0 || y === h - 1 || x === 0 || x === w - 1) g[y][x] = TileId.Wall;
    for (let x = 3; x < w - 3; x++) g[5][x] = TileId.Wall;
    for (let x = 2; x < w - 2; x++) if (x % 2 === 0) g[9][x] = TileId.Wall;
    g[1][1] = TileId.PacSpawn;
    g[Math.floor(h / 2)][Math.floor(w / 2)] = TileId.GhostSpawn;
    g[1][w - 2] = TileId.PowerPellet;
    g[h - 2][1] = TileId.PowerPellet;
    setGridHist(new History(g));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render
  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <header className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              Pac-Man Board Designer {mode === 'play' && (
                <span className="text-sm font-normal text-neutral-400">- Play Mode</span>
              )}
            </h1>
            <input
              className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Level name"
              disabled={mode === 'play'}
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {mode === 'edit' ? (
              <>
                <label className="flex items-center gap-2 text-sm">
                  Cell px
                  <input
                    type="number"
                    className="w-20 px-2 py-1 rounded bg-neutral-800 border border-neutral-700"
                    min={8}
                    max={48}
                    value={cellSize}
                    onChange={(e) =>
                      setCellSize(
                        Math.max(8, Math.min(48, Number(e.target.value) || 8))
                      )
                    }
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  W
                  <input
                    type="number"
                    className="w-20 px-2 py-1 rounded bg-neutral-800 border border-neutral-700"
                    min={5}
                    max={100}
                    value={width}
                    onChange={(e) =>
                      resize(
                        Math.max(5, Math.min(100, Number(e.target.value) || width)),
                        height
                      )
                    }
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  H
                  <input
                    type="number"
                    className="w-20 px-2 py-1 rounded bg-neutral-800 border border-neutral-700"
                    min={5}
                    max={100}
                    value={height}
                    onChange={(e) =>
                      resize(
                        width,
                        Math.max(5, Math.min(100, Number(e.target.value) || height))
                      )
                    }
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={symH}
                    onChange={(e) => setSymH(e.target.checked)}
                  />{' '}
                  Sym H
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={symV}
                    onChange={(e) => setSymV(e.target.checked)}
                  />{' '}
                  Sym V
                </label>
                <button
                  className="px-3 py-1 rounded bg-neutral-800 border border-neutral-700 hover:bg-neutral-700"
                  onClick={validate}
                >
                  Validate
                </button>
                <button
                  className="px-3 py-1 rounded bg-neutral-800 border border-neutral-700 hover:bg-neutral-700"
                  onClick={exportJSON}
                  title="Export JSON (Ctrl+S)"
                >
                  Export JSON
                </button>
                <button
                  className="px-3 py-1 rounded bg-neutral-800 border border-neutral-700 hover:bg-neutral-700"
                  onClick={exportPNG}
                >
                  Export PNG
                </button>
                <label className="px-3 py-1 rounded bg-neutral-800 border border-neutral-700 cursor-pointer hover:bg-neutral-700">
                  Import JSON
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onImport(f);
                      if (e.currentTarget) e.currentTarget.value = '';
                    }}
                  />
                </label>
                <button
                  className="px-3 py-1 rounded bg-emerald-700 border border-emerald-600 hover:bg-emerald-600"
                  onClick={startPlay}
                  title="Play (Arrow keys/WASD)"
                >
                  Play
                </button>
              </>
            ) : (
              <>
                <div className="text-sm flex items-center gap-3 px-3 py-1 rounded bg-neutral-900 border border-neutral-800">
                  <span>
                    Score: <b>{score}</b>
                  </span>
                  <span>
                    Lives: <b>{lives}</b>
                  </span>
                  <span>
                    Power: <b>{powerTicks}</b>
                  </span>
                </div>
                <button
                  className="px-3 py-1 rounded bg-neutral-800 border border-neutral-700 hover:bg-neutral-700"
                  onClick={() => setPaused((p) => !p)}
                >
                  {paused ? 'Resume' : 'Pause'}
                </button>
                <button
                  className="px-3 py-1 rounded bg-amber-700 border border-amber-600 hover:bg-amber-600"
                  onClick={() => {
                    rebuildDots();
                    resetActors();
                    setPowerTicks(0);
                    setScore(0);
                    setLives(3);
                  }}
                >
                  Reset
                </button>
                <button
                  className="px-3 py-1 rounded bg-rose-700 border border-rose-600 hover:bg-rose-600"
                  onClick={stopPlay}
                >
                  Stop
                </button>
              </>
            )}
          </div>
        </header>

        <section className="grid grid-cols-12 gap-4">
          <aside className="col-span-12 md:col-span-3 lg:col-span-2 space-y-3">
            {mode === 'edit' ? (
              <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold">Tools</h2>
                  <label className="text-sm flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={eraseMode}
                      onChange={(e) => setEraseMode(e.target.checked)}
                    />{' '}
                    Erase (RMB)
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      TileId.Wall,
                      TileId.Empty,
                      TileId.Pellet,
                      TileId.PowerPellet,
                      TileId.PacSpawn,
                      TileId.GhostSpawn,
                      TileId.GhostDoor,
                      TileId.FruitSpawn,
                      TileId.PortalA,
                      TileId.PortalB,
]
                  ).map((id) => (
                    <button
                      key={id}
                      onClick={() => setTool(id)}
                      className={
                        'flex items-center gap-2 px-2 py-2 rounded-lg border text-left ' +
                        (tool === id
                          ? 'bg-neutral-700 border-neutral-600'
                          : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800')
                      }
                      title={TILE_META[id].name}
                    >
                      <span
                        className={`inline-block w-4 h-4 rounded ${TILE_COLORS[id]} border border-neutral-700`}
                      />
                      <span className="text-sm">{TILE_META[id].name}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs mt-2 text-neutral-400">
                  Keys: 1-9 tools, Ctrl+Z/Y undo/redo, Ctrl+S save
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-sm">
                <h2 className="font-semibold mb-2">Play Controls</h2>
                <ul className="list-disc pl-4 space-y-1 text-neutral-300">
                  <li>Move: Arrow keys / WASD</li>
                  <li>P: Pause/Resume</li>
                  <li>R: Reset (score &amp; lives)</li>
                  <li>Dots exist on all passable cells; Power +50</li>
                </ul>
              </div>
            )}
          </aside>

          <main className="col-span-12 md:col-span-9 lg:col-span-10">
            <div
              className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-auto p-4"
              style={{ maxHeight: '75vh' }}
            >
              <div className="inline-block" onContextMenu={(e) => e.preventDefault()}>
                {grid.map((row, y) => (
                  <div key={y} className="flex">
                    {row.map((id, x) => (
                      <div
                        key={`${x}-${y}`}
                        style={{ width: cellSize, height: cellSize }}
                        className={`border border-neutral-800 ${TILE_COLORS[id]} relative select-none`}
                        onPointerDown={(e) => {
                          if (mode === 'play') return;
                          setPainting(true);
                          setEraseMode(e.button === 2 ? true : eraseMode);
handlePointer(e, x, y);
                        }}
                        onPointerEnter={(e) => {
                          if (isPainting && mode === 'edit')
handlePointer(e, x, y);
                        }}
                        onPointerUp={() => {
                          if (mode === 'edit') {
                            setPainting(false);
                            commitCell(x, y);
                          }
                        }}
                      >
                        {mode === 'play' ? (
                          powerRef.current.has(keyFrom(x, y)) ? (
                            <PelletDot power />
                          ) : dotsRef.current.has(keyFrom(x, y)) ? (
                            <PelletDot />
                          ) : null
                        ) : (
                          <>
                            {id === TileId.Pellet && <PelletDot />}
                            {id === TileId.PowerPellet && <PelletDot power />}
                          </>
                        )}
                        {id === TileId.GhostDoor && (
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full h-0.5 bg-white opacity-90" />
                          </div>
                        )}
                        {mode === 'edit' && id === TileId.PacSpawn && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-yellow-300" />
                          </div>
                        )}
                        {mode === 'edit' && id === TileId.GhostSpawn && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 rounded bg-rose-200" />
                          </div>
                        )}
                        {id === TileId.FruitSpawn && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-lime-200" />
                          </div>
                        )}
                        {(id === TileId.PortalA || id === TileId.PortalB) && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-white" />
                          </div>
                        )}

                        {/* Actors */}
                        {mode === 'play' && pac && pac.pos.x === x && pac.pos.y === y && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <img
                              src={pacSpriteFor(pac.dir)}
                              alt="pacman"
                              style={{
                                width: Math.max(2, cellSize * 0.9),
                                height: Math.max(2, cellSize * 0.9),
                                imageRendering: 'pixelated',
                              }}
                            />
                          </div>
                        )}
                        {mode === 'play' &&
                          ghosts.map(
                            (g, idx) =>
                              g.pos.x === x && g.pos.y === y ? (
                                <div key={idx} className="absolute inset-0 flex items-center justify-center">
                                  <div
                                    className={`rounded ${powerTicks > 0 ? 'bg-sky-300' : 'bg-rose-400'}`}
                                    style={{ width: Math.max(2, cellSize * 0.8), height: Math.max(2, cellSize * 0.8) }}
                                  />
                                </div>
                              ) : null
                          )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </main>
        </section>

        <footer className="text-xs text-neutral-400">
          <p>
            The designer and engine are one app: design in Edit, then Play to test instantly. Export JSON for your runtime; PNG is for sharing.
          </p>
        </footer>
      </div>
    </div>
  );
}

// Dev tests (console.assert)
(function () {
  try {
    const g = makeGrid(3, 2, TileId.Wall);
    console.assert(g.length === 2 && g[0].length === 3, 'makeGrid dims');
    console.assert(g[1][2] === TileId.Wall, 'makeGrid fill');
    const hist = new (class extends History {
      constructor() {
        super(0);
      }
    })();
    console.assert(hist.value === 0, 'History init');
    hist.commit(1);
    hist.undo();
    console.assert(hist.value === 0, 'History undo');
    console.assert(
      formatIssues([]) === 'Looks good! Basic checks passed.',
      'formatIssues empty'
    );
    const fi = formatIssues(['A', 'B']);
    console.assert(fi.includes('- A') && fi.includes('- B'), 'formatIssues list');
  } catch (e) {
    console.warn('Dev tests warning:', e);
  }
})();
