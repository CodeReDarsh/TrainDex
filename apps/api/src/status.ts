import GtfsRealtimeBindings from "gtfs-realtime-bindings";

const { FeedMessage } = GtfsRealtimeBindings.transit_realtime;
const BASE = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/";

// which MTA feed carries each line
const FEEDS: Record<string, string> = {
  "1": "nyct%2Fgtfs", "2": "nyct%2Fgtfs", "3": "nyct%2Fgtfs", "4": "nyct%2Fgtfs",
  "5": "nyct%2Fgtfs", "6": "nyct%2Fgtfs", "7": "nyct%2Fgtfs", S: "nyct%2Fgtfs",
  A: "nyct%2Fgtfs-ace", C: "nyct%2Fgtfs-ace", E: "nyct%2Fgtfs-ace",
  B: "nyct%2Fgtfs-bdfm", D: "nyct%2Fgtfs-bdfm", F: "nyct%2Fgtfs-bdfm", M: "nyct%2Fgtfs-bdfm",
  G: "nyct%2Fgtfs-g", J: "nyct%2Fgtfs-jz", Z: "nyct%2Fgtfs-jz", L: "nyct%2Fgtfs-l",
  N: "nyct%2Fgtfs-nqrw", Q: "nyct%2Fgtfs-nqrw", R: "nyct%2Fgtfs-nqrw", W: "nyct%2Fgtfs-nqrw",
};

// MTA route ids that count as one of our lines (express runs, the three shuttles)
const ALIASES: Record<string, string[]> = {
  "6": ["6", "6X"], "7": ["7", "7X"], F: ["F", "FX"], S: ["GS", "FS", "H"],
};

const FRESH_MS = 30_000;
const cache = new Map<string, { at: number; data: Promise<unknown> }>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.data as Promise<T>;
  const data = load();
  cache.set(key, { at: Date.now(), data });
  // a failed fetch shouldn't stick around for 30s
  data.catch(() => cache.delete(key));
  return data;
}

async function get(path: string) {
  const res = await fetch(BASE + path, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`MTA feed ${path} returned ${res.status}`);
  return res;
}

const trainsByRoute = (feed: string) =>
  cached(feed, async () => {
    const msg = FeedMessage.decode(new Uint8Array(await (await get(feed)).arrayBuffer()));
    const counts: Record<string, number> = {};
    for (const e of msg.entity) {
      const route = e.vehicle?.trip?.routeId;
      if (route) counts[route] = (counts[route] ?? 0) + 1;
    }
    return { counts, at: Number(msg.header.timestamp) * 1000 };
  });

interface Alert {
  alert: {
    active_period?: { start?: number; end?: number }[];
    informed_entity?: { route_id?: string }[];
    header_text?: { translation?: { text: string; language: string }[] };
    "transit_realtime.mercury_alert"?: { alert_type?: string };
  };
}

const alerts = () =>
  cached("alerts", async () => (await (await get("camsys%2Fsubway-alerts.json")).json()) as { entity: Alert[] });

export interface LineStatus {
  route: string;
  trains: number;
  alerts: { type: string; text: string }[];
  updatedAt: string;
}

export async function lineStatus(route: string): Promise<LineStatus | null> {
  const feed = FEEDS[route];
  if (!feed) return null;
  const ids = ALIASES[route] ?? [route];
  const [{ counts, at }, { entity }] = await Promise.all([trainsByRoute(feed), alerts()]);

  const now = Date.now() / 1000;
  const live = entity
    .filter(({ alert: a }) => a.informed_entity?.some((ie) => ids.includes(ie.route_id ?? "")))
    .filter(({ alert: a }) => !a.active_period?.length || a.active_period.some((p) => (p.start ?? 0) <= now && now <= (p.end ?? Infinity)))
    .map(({ alert: a }) => ({
      type: a["transit_realtime.mercury_alert"]?.alert_type ?? "Alert",
      text: a.header_text?.translation?.find((t) => t.language === "en")?.text ?? "",
    }))
    .filter((a) => a.text);

  // delays matter more than planned work, and the same notice is often listed per stop
  const seen = new Set<string>();
  const unique = live.filter((a) => !seen.has(a.text) && seen.add(a.text));
  unique.sort((a, b) => Number(b.type.includes("Delay")) - Number(a.type.includes("Delay")));

  return {
    route,
    trains: ids.reduce((n, id) => n + (counts[id] ?? 0), 0),
    alerts: unique.slice(0, 3),
    updatedAt: new Date(at).toISOString(),
  };
}
