import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-leaflet";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Campaign } from "../types";

export interface MapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  panTo: (lat: number, lng: number, leftInset?: number) => void;
  recenter: (leftInset?: number) => void;
}

interface Props {
  campaigns: Campaign[];
  selectedCampaign: Campaign | null;
  onSelectCampaign: (campaign: Campaign | null) => void;
  leftInset?: number;
}

const DEFAULT_CENTER: L.LatLngExpression = [20.0, 15.0];
const DEFAULT_ZOOM = 3;

const CARTO_KEY = import.meta.env.VITE_CARTO_KEY as string | undefined;

const withKey = (url: string) =>
  CARTO_KEY
    ? `${url}${url.includes("?") ? "&" : "?"}key=${CARTO_KEY}`
    : url;

const BASEMAP_STYLE_URL = withKey(
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
);

const FALLBACK_SHOW_LABELS = true;

const BASEMAP_RASTER_FALLBACK = withKey(
  `https://basemaps.cartocdn.com/rastertiles/${
    FALLBACK_SHOW_LABELS ? "light_all" : "light_nolabels"
  }/{z}/{x}/{y}{r}.png`
);

const BASEMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const VECTOR_TIMEOUT_MS = 10000;


const PALESTINIAN_NAMES: Record<string, string[]> = {
  Palestine: [
    "Israel",
    "State of Israel",
    "Palestinian Territories",
    "Palestinian Territory",
    "State of Palestine",
    "Palestine",
  ],

  "Al-Quds": ["Jerusalem", "East Jerusalem", "West Jerusalem", "Yerushalayim"],
  Yafa: ["Tel Aviv", "Tel Aviv-Yafo", "Tel Aviv-Jaffo", "Tel-Aviv", "Jaffa", "Yafo"],
  Akka: ["Acre", "Akko", "Acco"],
  "An-Nasira": ["Nazareth"],
  Tabariyya: ["Tiberias"],
  Safad: ["Safed", "Tsfat", "Zefat"],
  Baysan: ["Beit She'an", "Beit Shean", "Beit She\u2019an"],
  "Bir as-Sabi'": [
    "Beersheba",
    "Be'er Sheva",
    "Be\u2019er Sheva",
    "Beer Sheva",
    "Beer-Sheva",
  ],
  Asqalan: ["Ashkelon"],
  Isdud: ["Ashdod"],
  "Al-Lydd": ["Lod", "Lydda"],
  "Ar-Ramla": ["Ramla", "Ramle"],
  "Umm ar-Rashrash": ["Eilat"],
  "Umm Khalid": ["Netanya"],
  "Al-Khudayra": ["Hadera"],
  "Al-Khalisa": ["Kiryat Shmona", "Qiryat Shemona"],
  Nahariyya: ["Nahariya"],
  Tarshiha: ["Ma'alot-Tarshiha", "Maalot-Tarshiha"],
  "Al-Fula": ["Afula"],
  "Al-Mujaydil": ["Migdal HaEmek", "Migdal Haemek"],
  Qira: ["Yokneam", "Yokneam Illit"],
  Zammarin: ["Zikhron Ya'akov", "Zikhron Yaakov"],
  Qisarya: ["Caesarea"],
  Karkur: ["Pardes Hanna-Karkur"],
  "Kafr Saba": ["Kfar Saba"],
  Tabsur: ["Ra'anana", "Raanana"],
  "Ras al-Ayn": ["Rosh HaAyin", "Rosh Ha'ayin"],
  Yibna: ["Yavne"],
  Mulabbis: ["Petah Tikva", "Petach Tikva"],
  "Uyun Qara": ["Rishon LeZion", "Rishon Le Zion"],
  "Ibn Ibraq": ["Bnei Brak"],
  "Iraq al-Manshiyya": ["Kiryat Gat", "Qiryat Gat"],
  Najd: ["Sderot"],
  "Al-Midya": ["Modi'in-Maccabim-Re'ut", "Modiin"],
  "Shafa Amr": ["Shefa-'Amr", "Shefa-Amr", "Shfaram"],
  "Kafr Qasim": ["Kfar Qasim"],
  "At-Tayyiba": ["Tayibe"],
  "At-Tira": ["Tira"],
  "Baqa al-Gharbiyya": ["Baqa al-Gharbiyye"],
  "Tirat al-Karmil": ["Tirat Carmel", "Tirat Karmel"],

  "Al-Khalil": ["Hebron"],
  "Bayt Lahm": ["Bethlehem"],
  "Bayt Jala": ["Beit Jala"],
  "Bayt Sahur": ["Beit Sahour"],
  Ariha: ["Jericho"],
  "Al-Bira": ["Al-Bireh", "El-Bireh"],
  Nablus: ["Nablus", "Nabulus"],
  "Jabalya": ["Jabalia"],
  "Bayt Hanun": ["Beit Hanoun"],
  "Bayt Lahya": ["Beit Lahia"],
  "Dayr al-Balah": ["Deir al-Balah", "Deir el-Balah"],
  Gaza: ["Gaza City"],

  "Lake Tabariyya": ["Sea of Galilee", "Lake Kinneret", "Lake Tiberias", "Kinneret"],
};

type FallbackLabel = [string, number, number, number, number, "country" | "city"];

const FALLBACK_LABELS: FallbackLabel[] = [
  ["Palestine", 30.9, 34.9, 2, 10, "country"],
  ["Al-Quds", 31.7683, 35.2137, 5, 12, "city"],
  ["Yafa", 32.0553, 34.7527, 5, 12, "city"],
  ["Haifa", 32.794, 34.9896, 5, 12, "city"],
  ["Gaza", 31.5017, 34.4668, 6, 12, "city"],
  ["Akka", 32.9234, 35.082, 7, 12, "city"],
  ["An-Nasira", 32.6996, 35.3035, 7, 12, "city"],
  ["Ramallah", 31.9038, 35.2034, 7, 12, "city"],
  ["Nablus", 32.2211, 35.2544, 7, 12, "city"],
  ["Al-Khalil", 31.5326, 35.0998, 7, 12, "city"],
  ["Bayt Lahm", 31.7054, 35.2024, 8, 12, "city"],
  ["Ariha", 31.8667, 35.45, 8, 12, "city"],
  ["Jenin", 32.4607, 35.2958, 8, 12, "city"],
  ["Tulkarm", 32.3104, 35.0286, 8, 12, "city"],
  ["Qalqilya", 32.1894, 34.9706, 8, 12, "city"],
  ["Bir as-Sabi'", 31.253, 34.7915, 7, 12, "city"],
  ["Asqalan", 31.6688, 34.5743, 8, 12, "city"],
  ["Isdud", 31.8044, 34.6553, 8, 12, "city"],
  ["Al-Lydd", 31.9516, 34.8955, 8, 12, "city"],
  ["Ar-Ramla", 31.9292, 34.8722, 8, 12, "city"],
  ["Umm ar-Rashrash", 29.5577, 34.9519, 7, 12, "city"],
  ["Tabariyya", 32.7922, 35.5312, 8, 12, "city"],
  ["Safad", 32.9646, 35.496, 8, 12, "city"],
  ["Baysan", 32.4972, 35.4966, 8, 12, "city"],
  ["Khan Yunis", 31.3462, 34.306, 8, 12, "city"],
  ["Rafah", 31.2969, 34.2435, 8, 12, "city"],
  ["Dayr al-Balah", 31.418, 34.3503, 9, 12, "city"],
  ["Umm Khalid", 32.3215, 34.8532, 8, 12, "city"],
  ["Al-Khudayra", 32.434, 34.9196, 9, 12, "city"],

  ["Beirut", 33.8938, 35.5018, 6, 12, "city"],
  ["Damascus", 33.5138, 36.2765, 6, 12, "city"],
  ["Amman", 31.9454, 35.9284, 6, 12, "city"],
  ["Aqaba", 29.5321, 35.0063, 7, 12, "city"],
  ["Cairo", 30.0444, 31.2357, 6, 12, "city"],

  ["Lebanon", 33.85, 35.86, 5, 7, "country"],
  ["Syria", 34.8, 38.99, 4, 7, "country"],
  ["Jordan", 31.3, 36.5, 5, 7, "country"],
  ["Egypt", 26.8, 30.8, 3, 7, "country"],
  ["Saudi Arabia", 24.2, 45.1, 3, 7, "country"],
  ["Iraq", 33.2, 43.7, 4, 7, "country"],
  ["Iran", 32.4, 53.7, 3, 7, "country"],
  ["Turkey", 39.0, 35.2, 3, 7, "country"],
  ["Libya", 26.3, 17.2, 3, 7, "country"],
  ["Tunisia", 34.0, 9.5, 3, 7, "country"],
  ["Algeria", 28.0, 2.6, 3, 7, "country"],
  ["Morocco", 31.8, -7.1, 3, 7, "country"],
  ["Sudan", 15.6, 30.2, 3, 7, "country"],
  ["Yemen", 15.6, 48.5, 4, 7, "country"],
  ["Oman", 21.5, 55.9, 4, 7, "country"],
  ["Greece", 39.1, 21.8, 4, 7, "country"],
  ["Cyprus", 35.0, 33.2, 5, 7, "country"],
  ["Ethiopia", 9.1, 40.5, 3, 7, "country"],
  ["Nigeria", 9.1, 8.7, 3, 7, "country"],
  ["South Africa", -29.0, 24.0, 3, 7, "country"],
  ["Pakistan", 30.4, 69.3, 3, 7, "country"],
  ["India", 22.0, 79.0, 3, 7, "country"],
  ["Afghanistan", 33.9, 67.7, 4, 7, "country"],
  ["Indonesia", -2.5, 118.0, 3, 7, "country"],
  ["China", 35.0, 103.0, 3, 7, "country"],
  ["Russia", 61.0, 99.0, 2, 7, "country"],
  ["Japan", 36.2, 138.3, 3, 7, "country"],
  ["France", 46.6, 2.4, 4, 7, "country"],
  ["Spain", 40.2, -3.7, 4, 7, "country"],
  ["Italy", 42.8, 12.6, 4, 7, "country"],
  ["Germany", 51.1, 10.4, 4, 7, "country"],
  ["United Kingdom", 54.0, -2.5, 4, 7, "country"],
  ["United States", 39.5, -98.0, 2, 7, "country"],
  ["Canada", 58.0, -100.0, 2, 7, "country"],
  ["Brazil", -10.0, -52.0, 2, 7, "country"],
  ["Mexico", 23.6, -102.5, 3, 7, "country"],
  ["Argentina", -34.0, -64.0, 3, 7, "country"],
  ["Australia", -25.0, 134.0, 2, 7, "country"],
  ["Kazakhstan", 48.0, 67.0, 3, 7, "country"],
];

function addFallbackLabels(map: L.Map) {
  const group = L.layerGroup().addTo(map);

  const render = () => {
    const z = map.getZoom();
    group.clearLayers();

    for (const [name, lat, lng, minZ, maxZ, kind] of FALLBACK_LABELS) {
      if (z < minZ || z > maxZ) continue;

      const isCountry = kind === "country";
      const style = [
        "white-space:nowrap",
        "pointer-events:none",
        "transform:translate(-50%,-50%)",
        "font-family:system-ui,sans-serif",
        `font-size:${name === "Palestine" ? 13 : isCountry ? 11 : 12}px`,
        `font-weight:${name === "Palestine" ? 700 : isCountry ? 600 : 500}`,
        `color:${name === "Palestine" ? "#06402F" : isCountry ? "#8a8a8a" : "#444"}`,
        isCountry ? "letter-spacing:.12em;text-transform:uppercase" : "",
        "text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff",
      ].join(";");

      L.marker([lat, lng], {
        icon: L.divIcon({
          className: "",
          html: `<span style="${style}">${escapeHtml(name)}</span>`,
          iconSize: [0, 0],
        }),
        interactive: false,
        keyboard: false,
        zIndexOffset: -1000,
      }).addTo(group);
    }
  };

  map.on("zoomend", render);
  render();
}

type BasemapLayer = L.Layer & {
  getMaplibreMap: () => MapLibreMap;
};

function applyPalestinianLabels(glMap: MapLibreMap) {
  const style = glMap.getStyle();
  if (!style?.layers) return;

  const englishName = [
    "to-string",
    [
      "coalesce",
      ["get", "name_en"],
      ["get", "name:en"],
      ["get", "name:latin"],
      ["get", "name"],
      "",
    ],
  ];

  const seen = new Set<string>();
  const pairs: unknown[] = [];

  for (const [display, sources] of Object.entries(PALESTINIAN_NAMES)) {
    const labels = sources
      .map((s) => s.toLowerCase())
      .filter((s) => {
        if (seen.has(s)) return false;
        seen.add(s);
        return true;
      });

    if (labels.length) pairs.push(labels, display);
  }

  const props = ["name_en", "name:en", "name:latin", "name"];
  let textField: unknown = englishName;

  for (const prop of [...props].reverse()) {
    textField = [
      "match",
      ["downcase", ["to-string", ["coalesce", ["get", prop], ""]]],
      ...pairs,
      textField,
    ];
  }

  let updated = 0;

  for (const layer of style.layers) {
    if (layer.type !== "symbol") continue;

    const current = (layer.layout as Record<string, unknown> | undefined)?.[
      "text-field"
    ];
    if (!current || !JSON.stringify(current).includes("name")) continue;

    try {
      glMap.setLayoutProperty(layer.id, "text-field", textField as never);
      updated++;
    } catch (err) {
      console.warn(`[Amanah map] could not relabel layer ${layer.id}:`, err);
    }
  }

  console.info(`[Amanah map] Relabelled ${updated} label layers`);
}

export function preloadBasemap() {
  if (typeof window === "undefined") return;
  fetch(BASEMAP_STYLE_URL).catch(() => {});
}

interface SharedMap {
  host: HTMLDivElement;
  map: L.Map;
  cluster: L.MarkerClusterGroup;
  onSelect: { current: (c: Campaign | null) => void } | null;
}

let shared: SharedMap | null = null;

function createSharedMap(container: HTMLElement): SharedMap {
  const host = document.createElement("div");
  host.style.cssText = "width:100%;height:100%;position:absolute;inset:0;";
  container.appendChild(host);

  const map = L.map(host, {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    minZoom: 2,
    maxZoom: 12,
    worldCopyJump: true,
    zoomControl: false,
    markerZoomAnimation: false,
    fadeAnimation: false,
  });

  const state: SharedMap = { host, map, cluster: null as never, onSelect: null };

  map.on("click", () => state.onSelect?.current(null));

  let rasterLayer: L.TileLayer | null = null;
  let fallbackTimer: number | undefined;

  const activateRasterFallback = (reason: unknown) => {
    if (rasterLayer) return;
    console.warn(
      "[Amanah map] FALLBACK TO RASTER, reason:",
      reason
    );
    rasterLayer = L.tileLayer(BASEMAP_RASTER_FALLBACK, {
      attribution: BASEMAP_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);
    if (!FALLBACK_SHOW_LABELS) addFallbackLabels(map);
  };

  try {
    const basemap = (
      L as unknown as {
        maplibreGL: (o: {
          style: string;
          attribution?: string;
          updateInterval?: number;
        }) => BasemapLayer;
      }
    ).maplibreGL({
      style: BASEMAP_STYLE_URL,
      attribution: BASEMAP_ATTRIBUTION,
      updateInterval: 16,
    });

    basemap.addTo(map);
    const glMap = basemap.getMaplibreMap();

    let rendered = false;
    let sourceErrors = 0;

    const dropVector = (reason: unknown) => {
      if (rendered) return;
      window.clearTimeout(fallbackTimer);
      if (map.hasLayer(basemap)) map.removeLayer(basemap);
      activateRasterFallback(reason);
    };

    glMap.on("style.load", () => {
      console.info("[Amanah map] vector style loaded");
      try {
        applyPalestinianLabels(glMap);
      } catch (err) {
        console.warn("[Amanah map] could not rewrite labels:", err);
      }
    });

    glMap.once("idle", () => {
      try {
        const layers = (glMap.getStyle()?.layers ?? [])
          .filter((l) => l.type === "symbol")
          .map((l) => l.id);
        const hits = glMap
          .queryRenderedFeatures({ layers })
          .filter((f) =>
            Object.values(f.properties ?? {}).some(
              (v) => typeof v === "string" && /israel|palestin/i.test(v)
            )
          )
          .slice(0, 5)
          .map((f) => ({ layer: f.layer.id, props: f.properties }));
        console.info("[Amanah map] Israel/Palestine label features:", hits);
      } catch (err) {
        console.warn("[Amanah map] diagnostic failed:", err);
      }
    });

    glMap.on("load", () => {
      rendered = true;
      window.clearTimeout(fallbackTimer);
      console.info("[Amanah map] vector map rendered");
    });

    glMap.on("error", (e: { sourceId?: string; error?: unknown }) => {
      console.warn("[Amanah map] vector basemap error:", {
        sourceId: e.sourceId,
        error: e.error ?? e,
      });
      if (rendered) return;
      if (!e.sourceId) return;
      if (++sourceErrors >= 3) dropVector(e.error ?? e);
    });

    fallbackTimer = window.setTimeout(
      () => dropVector(`vector map did not render within ${VECTOR_TIMEOUT_MS}ms`),
      VECTOR_TIMEOUT_MS
    );
  } catch (err) {
    activateRasterFallback(err);
  }

  try {
    if (typeof (L as any).markerClusterGroup === "function") {
      state.cluster = (L as any).markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: false,
        maxClusterRadius: 60,
        disableClusteringAtZoom: 5,

        animate: false,
        animateAddingMarkers: false,
        chunkedLoading: true,

        iconCreateFunction: (c: any) => {
          const children = c.getAllChildMarkers();
          let top = "medium";

          for (const m of children) {
            const u = (m.options as PinOptions).urgency;
            if ((URGENCY_RANK[u] ?? 0) > (URGENCY_RANK[top] ?? 0)) top = u;
          }

          return L.divIcon({
            className: "leaflet-custom-div-icon",
            html: `<div class="map-cluster map-cluster-${top}"><span>${c.getChildCount()}</span></div>`,
            iconSize: [46, 46],
          });
        },
      });
    } else {
      const group = L.featureGroup();
      (group as any).addLayers = (layers: L.Layer[]) => {
        layers.forEach((l) => group.addLayer(l));
      };
      state.cluster = group as any;
    }
  } catch (err) {
    console.warn("[Amanah map] cluster init failed, falling back to featureGroup:", err);
    const group = L.featureGroup();
    (group as any).addLayers = (layers: L.Layer[]) => {
      layers.forEach((l) => group.addLayer(l));
    };
    state.cluster = group as any;
  }

  state.cluster.addTo(map);
  return state;
}

type PinOptions = L.MarkerOptions & {
  campaignId: Campaign["id"];
  urgency: string;
  baseZ: number;
};

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

const URGENCY_RANK: Record<string, number> = {
  critical: 3,
  high: 2,
  medium: 1,
};

export const InteractiveMap = forwardRef<MapHandle, Props>(
  (
    {
      campaigns,
      selectedCampaign,
      onSelectCampaign,
      leftInset = 0,
    },
    ref
  ) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
    const markersRef = useRef<L.Marker[]>([]);
    const pointsRef = useRef<L.LatLng[]>([]);

    const onSelectRef = useRef(onSelectCampaign);
    onSelectRef.current = onSelectCampaign;

    const leftInsetRef = useRef(leftInset);
    leftInsetRef.current = leftInset;

    const selectedId = selectedCampaign?.id ?? null;
    const selectedIdRef = useRef(selectedId);
    selectedIdRef.current = selectedId;

    useImperativeHandle(ref, () => ({
      zoomIn() {
        const map = mapInstanceRef.current;
        if (!map) return;

        map.stop();
        map.zoomIn(1, { animate: false });
      },

      zoomOut() {
        const map = mapInstanceRef.current;
        if (!map) return;

        map.stop();
        map.zoomOut(1, { animate: false });
      },

      panTo(lat: number, lng: number, inset?: number) {
        const map = mapInstanceRef.current;
        if (!map) return;

        map.stop();

        const current = map.getZoom();
        const zoom = Math.max(current, 6);
        const shift = (inset ?? leftInsetRef.current) / 2;

        const target = map.unproject(
          map.project([lat, lng], zoom).subtract([shift, 0]),
          zoom
        );

        map.flyTo(target, zoom, { animate: true, duration: 0.8 });
      },

      recenter(inset?: number) {
        const map = mapInstanceRef.current;
        if (!map) return;

        map.stop();

        const left = inset ?? leftInsetRef.current;
        const points = pointsRef.current;

        if (points.length === 0) {
          map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false });
          return;
        }

        map.flyToBounds(L.latLngBounds(points), {
          paddingTopLeft: [left + 40, 60],
          paddingBottomRight: [70, 60],
          maxZoom: 6,
          duration: 0.8,
        });
      },
    }));

    function applyPinState(marker: L.Marker) {
      const opts = marker.options as PinOptions;
      const selected = selectedIdRef.current === opts.campaignId;

      marker
        .getElement()
        ?.querySelector(".map-pill-pin")
        ?.classList.toggle("selected", selected);

      marker.setZIndexOffset(selected ? 1000 : opts.baseZ);
    }

    useEffect(() => {
      const container = mapContainerRef.current;
      if (!container) return;

      if (!shared) {
        shared = createSharedMap(container);
      } else {
        container.appendChild(shared.host);
      }

      const s = shared;
      s.onSelect = onSelectRef;
      mapInstanceRef.current = s.map;
      clusterRef.current = s.cluster;

      s.map.invalidateSize({ animate: false });

      return () => {
        s.map.stop();
        if (s.onSelect === onSelectRef) s.onSelect = null;
        s.host.remove();
        mapInstanceRef.current = null;
        clusterRef.current = null;
        markersRef.current = [];
      };
    }, []);

    useEffect(() => {
      const cluster = clusterRef.current;
      if (!mapInstanceRef.current || !cluster) return;

      cluster.clearLayers();

      const markers: L.Marker[] = [];
      const points: L.LatLng[] = [];

      const coordSeen: Record<string, number> = {};

      campaigns.forEach((camp) => {
        const rawLat =
          typeof camp.lat === "number" &&
          !isNaN(camp.lat) &&
          camp.lat !== 0
            ? camp.lat
            : 31.5017;

        const rawLng =
          typeof camp.lng === "number" &&
          !isNaN(camp.lng) &&
          camp.lng !== 0
            ? camp.lng
            : 34.4668;

        const key = `${rawLat.toFixed(3)}_${rawLng.toFixed(3)}`;
        const seenCount = coordSeen[key] || 0;
        coordSeen[key] = seenCount + 1;

        let lat = rawLat;
        let lng = rawLng;

        if (seenCount > 0) {
          const angle = (seenCount * 2 * Math.PI) / 6;
          const radius = 0.04 * seenCount;

          lat = rawLat + radius * Math.cos(angle);
          lng = rawLng + radius * Math.sin(angle);
        }

        points.push(L.latLng(lat, lng));

        const level =
          camp.urgency === "critical" || camp.urgency === "high"
            ? camp.urgency
            : "medium";

        const iconHtml = `
          <div class="map-pill-pin">
            <span class="urgency-dot urgency-${level}" style="width:12px;height:12px"></span>
            <span class="pin-title">${escapeHtml(camp.title)}</span>
          </div>
        `;

        const customIcon = L.divIcon({
          className: "leaflet-custom-div-icon",
          html: iconHtml,
          iconSize: [0, 0],
          iconAnchor: [16, 18],
        });

        const baseZ =
          level === "critical" ? 500 : level === "high" ? 250 : 0;

        const marker = L.marker([lat, lng], {
          icon: customIcon,
          zIndexOffset: baseZ,
          campaignId: camp.id,
          urgency: level,
          baseZ,
          bubblingMouseEvents: false,
        } as PinOptions);

        marker.on("add", () => applyPinState(marker));

        marker.on("click", () => {
          onSelectRef.current(camp);
        });

        markers.push(marker);
      });

      if (typeof (cluster as any).addLayers === "function") {
        (cluster as any).addLayers(markers);
      } else {
        markers.forEach((m) => cluster.addLayer(m));
      }

      markersRef.current = markers;
      pointsRef.current = points;

    }, [campaigns]);

    useEffect(() => {
      markersRef.current.forEach(applyPinState);

    }, [selectedId]);

    return (
      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          inset: 0,
        }}
      />
    );
  }
);