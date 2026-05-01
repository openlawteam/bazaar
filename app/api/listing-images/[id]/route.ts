const PALETTES = [
  ["#ffd500", "#0b5bd3", "#e30613"],
  ["#ff7a18", "#111111", "#fff3a3"],
  ["#7dd3fc", "#0f172a", "#f472b6"],
  ["#c4b5fd", "#312e81", "#fef3c7"],
  ["#86efac", "#14532d", "#fde68a"],
  ["#f9a8d4", "#831843", "#cffafe"],
  ["#fdba74", "#7c2d12", "#d9f99d"],
  ["#93c5fd", "#1e3a8a", "#fecaca"],
] as const;

const PRODUCT_ICONS = ["BAG", "CAM", "VINYL", "LAMP", "BOOT", "TECH", "ART", "FIT", "HOME", "AUDIO"];

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const title = url.searchParams.get("title") ?? id;
  const seed = hashString(id);
  const palette = PALETTES[seed % PALETTES.length]!;
  const icon = PRODUCT_ICONS[seed % PRODUCT_ICONS.length]!;
  const accentX = 80 + (seed % 520);
  const accentY = 80 + ((seed >> 3) % 260);
  const titleLines = wrapTitle(title.toUpperCase(), 24).slice(0, 2);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="${escapeXml(title)}">
  <rect width="1200" height="900" rx="44" fill="${palette[0]}"/>
  <circle cx="${accentX}" cy="${accentY}" r="230" fill="${palette[2]}" opacity="0.42"/>
  <circle cx="980" cy="175" r="150" fill="#ffffff" opacity="0.4"/>
  <path d="M0 690 C250 610 420 760 650 685 C850 620 1000 670 1200 585 L1200 900 L0 900 Z" fill="#ffffff" opacity="0.75"/>
  <rect x="108" y="110" width="984" height="612" rx="38" fill="#ffffff" stroke="#111111" stroke-width="16"/>
  <rect x="160" y="170" width="880" height="370" rx="28" fill="${palette[1]}"/>
  <circle cx="600" cy="355" r="142" fill="${palette[0]}" stroke="#111111" stroke-width="14"/>
  <text x="600" y="384" font-family="Arial Black, Arial, sans-serif" font-size="64" text-anchor="middle" fill="#111111">${icon}</text>
  <rect x="170" y="570" width="860" height="112" rx="30" fill="#fff3a3" stroke="#111111" stroke-width="8"/>
  <text x="600" y="${titleLines.length > 1 ? 620 : 638}" font-family="Arial Black, Arial, sans-serif" font-size="28" text-anchor="middle" fill="#111111">
    ${titleLines.map((line, index) => `<tspan x="600" dy="${index === 0 ? 0 : 36}">${escapeXml(line)}</tspan>`).join("")}
  </text>
</svg>`;

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function wrapTitle(value: string, maxLineLength: number): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLineLength) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
    }
    current = word.length > maxLineLength ? `${word.slice(0, maxLineLength - 1)}…` : word;
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [value.slice(0, maxLineLength)];
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
