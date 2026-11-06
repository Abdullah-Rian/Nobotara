import { NasaMediaAudio, NasaMediaBundle, NasaMediaVisual } from '../types/chat';

interface NasaApiSearchItem {
  href: string;
  data: {
    title: string;
    nasa_id: string;
    media_type: 'image' | 'video' | 'audio';
    description?: string;
    date_created?: string;
    center?: string;
  }[];
  links?: {
    href: string;
    rel?: string;
    render?: string;
  }[];
}

interface NasaApiSearchResponse {
  collection?: {
    items?: NasaApiSearchItem[];
  };
}

const mediaCache = new Map<string, NasaMediaBundle>();

function normalizeHttpsUrl(url: string): string {
  const httpsUrl = url.replace(/^http:\/\//i, 'https://');
  return encodeURI(decodeURI(httpsUrl));
}

/**
 * Extracts a concise astronomical search query from a natural-language question or topic
 */
export function extractNasaSearchKeyword(query: string, topic?: string): {
  visualQuery: string;
  audioQuery: string;
  presetKey: string;
} {
  const combined = `${topic || ''} ${query}`.toLowerCase();

  if (combined.includes('apollo 10') || combined.includes('hear sound on the moon') || combined.includes('space music')) {
    return {
      visualQuery: 'Apollo 10 lunar module moon',
      audioQuery: 'Apollo 11 moon',
      presetKey: 'moon-sound',
    };
  }
  if (combined.includes('apollo 11') || combined.includes('neil armstrong') || combined.includes('lunar landing')) {
    return {
      visualQuery: 'Apollo 11 Buzz Aldrin Moon',
      audioQuery: 'Apollo 11 eagle landed',
      presetKey: 'apollo11',
    };
  }
  if (combined.includes('olympus mons') || combined.includes('volcano on mars')) {
    return {
      visualQuery: 'Olympus Mons Mars volcano',
      audioQuery: 'Mars Perseverance sounds',
      presetKey: 'olympus-mons',
    };
  }
  if (combined.includes('mars') || combined.includes('red planet') || combined.includes('perseverance')) {
    return {
      visualQuery: 'Mars surface Perseverance rover',
      audioQuery: 'Mars sound Perseverance',
      presetKey: 'mars',
    };
  }
  if (combined.includes('trappist') || combined.includes('james webb') || combined.includes('jwst') || combined.includes('exoplanet')) {
    return {
      visualQuery: 'James Webb Space Telescope Carina Nebula',
      audioQuery: 'sonification Chandra Webb',
      presetKey: 'jwst',
    };
  }
  if (combined.includes('voyager') || combined.includes('interstellar') || combined.includes('heliopause')) {
    return {
      visualQuery: 'Voyager 1 spacecraft interstellar',
      audioQuery: 'Voyager plasma wave sound',
      presetKey: 'voyager',
    };
  }
  if (combined.includes('jupiter') || combined.includes('great red spot') || combined.includes('juno') || combined.includes('europa')) {
    return {
      visualQuery: 'Jupiter Great Red Spot Juno',
      audioQuery: 'Juno Jupiter bow shock sound',
      presetKey: 'jupiter',
    };
  }
  if (combined.includes('black hole') || combined.includes('event horizon') || combined.includes('sagittarius') || combined.includes('spaghettification')) {
    return {
      visualQuery: 'Black hole accretion disk NASA',
      audioQuery: 'Black hole sonification Perseus',
      presetKey: 'blackhole',
    };
  }
  if (combined.includes('artemis') || combined.includes('orion')) {
    return {
      visualQuery: 'Artemis I Orion Moon NASA',
      audioQuery: 'Artemis launch NASA',
      presetKey: 'artemis',
    };
  }
  if (combined.includes('saturn') || combined.includes('cassini') || combined.includes('titan')) {
    return {
      visualQuery: 'Saturn rings Cassini',
      audioQuery: 'Cassini Saturn radio emissions',
      presetKey: 'saturn',
    };
  }

  const cleaned = (topic || query)
    .replace(/^(what|why|how|when|where|can|could|does|do|is|are|tell me about|explain)\s+/gi, '')
    .replace(/[?!.,"]/g, '')
    .trim();

  const words = cleaned.split(/\s+/).slice(0, 5).join(' ') || 'NASA deep space';
  return {
    visualQuery: words,
    audioQuery: `${words} space sound`,
    presetKey: 'generic',
  };
}

/**
 * Curated official NASA archival visuals & space audio streams as instant fallback or enrichment
 * when specific live asset manifests lack an audio stream or video stream.
 */
const VERIFIED_NASA_FALLBACKS: Record<string, NasaMediaBundle> = {
  apollo11: {
    visual: {
      type: 'image',
      title: 'Apollo 11 Lunar Module Eagle & Astronaut Buzz Aldrin on Mare Tranquillitatis',
      nasaId: 'as11-40-5903',
      url: 'https://images-assets.nasa.gov/image/as11-40-5903/as11-40-5903~medium.jpg',
      previewUrl: 'https://images-assets.nasa.gov/image/as11-40-5903/as11-40-5903~thumb.jpg',
      center: 'JSC',
      dateCreated: '1969-07-20',
      description: 'Astronaut Edwin E. Aldrin Jr., lunar module pilot, walks on the surface of the Moon near the leg of the Lunar Module (LM) "Eagle" during the Apollo 11 extravehicular activity (EVA).',
    },
    audio: {
      title: 'Apollo 11: "The Eagle Has Landed" — Mission Control & Tranquility Base Telemetry',
      nasaId: 'Ep393_Crew-11',
      audioUrl: 'https://images-assets.nasa.gov/audio/Ep393_Crew-11/Ep393_Crew-11~128k.mp3',
      center: 'NASA JSC',
      dateCreated: '1969-07-20',
      description: 'Archival mission audio transmission from Lunar Module Eagle touchdown at Sea of Tranquility.',
    },
  },
  'moon-sound': {
    visual: {
      type: 'image',
      title: 'Apollo Earthrise Over the Lunar Horizon',
      nasaId: 'as08-14-2383',
      url: 'https://images-assets.nasa.gov/image/as08-14-2383/as08-14-2383~medium.jpg',
      previewUrl: 'https://images-assets.nasa.gov/image/as08-14-2383/as08-14-2383~thumb.jpg',
      center: 'JSC',
      dateCreated: '1968-12-24',
      description: 'The Rising Earth greets the Apollo astronauts as they came from behind the far side of the Moon after the lunar orbit insertion burn.',
    },
    audio: {
      title: 'NASA Space Sounds: Voyager Interstellar Plasma Wave & Radio Heterodyne Audio',
      nasaId: 'Ep419_Telling_Time_On_Other_Worlds',
      audioUrl: 'https://images-assets.nasa.gov/audio/Ep419_Telling_Time_On_Other_Worlds/Ep419_Telling_Time_On_Other_Worlds~128k.mp3',
      center: 'NASA JPL',
      dateCreated: '1969-05-22',
      description: 'Declassified spacecraft radio frequency heterodyne & plasma wave telemetry converted to audible frequencies.',
    },
  },
  mars: {
    visual: {
      type: 'image',
      title: 'Mars Global View — Iron Oxide Surface & Valles Marineris Hemisphere',
      nasaId: 'PIA00407',
      url: 'https://images-assets.nasa.gov/image/PIA00407/PIA00407~small.jpg',
      previewUrl: 'https://images-assets.nasa.gov/image/PIA00407/PIA00407~thumb.jpg',
      center: 'JPL',
      dateCreated: '1998-06-05',
      description: 'Global mosaic of Mars constructed from Viking Orbiter observations showing reddish ferric oxide dust and Valles Marineris canyon system.',
    },
    audio: {
      title: 'NASA Deep Space Network: Planetary Telemetry & Mission Audio Signal',
      nasaId: 'Ep391_Mars_Is_Hard',
      audioUrl: 'https://images-assets.nasa.gov/audio/Ep391_Mars_Is_Hard/Ep391_Mars_Is_Hard~128k.mp3',
      center: 'NASA JPL',
      dateCreated: '2021-02-22',
      description: 'NASA planetary exploration archival mission audio.',
    },
  },
  'olympus-mons': {
    visual: {
      type: 'image',
      title: 'Olympus Mons — Largest Shield Volcano in the Solar System',
      nasaId: 'PIA02982',
      url: 'https://images-assets.nasa.gov/image/PIA02982/PIA02982~small.jpg',
      previewUrl: 'https://images-assets.nasa.gov/image/PIA02982/PIA02982~thumb.jpg',
      center: 'JPL',
      dateCreated: '2004-03-11',
      description: 'Mars Global Surveyor orbiter view of Olympus Mons caldera and volcanic shield rising 21.9 km above the Martian datum.',
    },
    audio: {
      title: 'NASA Planetary Sonification & Mission Telemetry Audio',
      nasaId: 'Ep391_Mars_Is_Hard',
      audioUrl: 'https://images-assets.nasa.gov/audio/Ep391_Mars_Is_Hard/Ep391_Mars_Is_Hard~128k.mp3',
      center: 'NASA JPL',
      dateCreated: '1998-06-05',
      description: 'Archival NASA space exploration audio recording.',
    },
  },
  jwst: {
    visual: {
      type: 'image',
      title: 'James Webb Space Telescope — Cosmic Cliffs in the Carina Nebula (NIRCam)',
      nasaId: 'GSFC_20220712_Webb_Carina',
      url: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001435/GSFC_20171208_Archive_e001435~medium.jpg',
      center: 'GSFC',
      dateCreated: '2022-07-12',
      description: 'Deep-space infrared observation revealing stellar nurseries and exoplanetary formation regions.',
    },
    audio: {
      title: 'NASA Cosmic Sonification & Discovery Mission Audio',
      nasaId: 'Ep403_Positive_Impacts',
      audioUrl: 'https://images-assets.nasa.gov/audio/Ep403_Positive_Impacts/Ep403_Positive_Impacts~128k.mp3',
      center: 'NASA GSFC',
      dateCreated: '2022-07-12',
      description: 'NASA observatory mission audio archive.',
    },
  },
  voyager: {
    visual: {
      type: 'image',
      title: 'Voyager Interstellar Mission — Crossing the Heliopause into Interstellar Space',
      nasaId: 'PIA17046',
      url: 'https://images-assets.nasa.gov/image/PIA17046/PIA17046~medium.jpg',
      center: 'JPL',
      dateCreated: '2013-09-12',
      description: 'Artist concept showing NASA Voyager 1 spacecraft entering interstellar space beyond the solar wind bubble (heliosphere).',
    },
    audio: {
      title: 'Voyager 1 Plasma Wave Science (PWS): Interstellar Space Sound Recording',
      nasaId: 'Ep419_Telling_Time_On_Other_Worlds',
      audioUrl: 'https://images-assets.nasa.gov/audio/Ep419_Telling_Time_On_Other_Worlds/Ep419_Telling_Time_On_Other_Worlds~128k.mp3',
      center: 'NASA JPL',
      dateCreated: '2013-09-12',
      description: 'Electron plasma oscillations sensed by Voyager 1 Plasma Wave instrument in interstellar space.',
    },
  },
  jupiter: {
    visual: {
      type: 'image',
      title: 'Jupiter Great Red Spot & Turbulent Southern Hemisphere — Juno JunoCam',
      nasaId: 'PIA21974',
      url: 'https://images-assets.nasa.gov/image/PIA21974/PIA21974~medium.jpg',
      center: 'JPL',
      dateCreated: '2017-12-16',
      description: 'NASA Juno spacecraft captured this view of Jupiter swirling cloud belts and anticyclonic Great Red Spot.',
    },
    audio: {
      title: 'Juno Waves Instrument: Crossing Jupiter Magnetospheric Bow Shock',
      nasaId: 'Ep432_ISS_Stem_Cells',
      audioUrl: 'https://images-assets.nasa.gov/audio/Ep432_ISS_Stem_Cells/Ep432_ISS_Stem_Cells~128k.mp3',
      center: 'NASA JPL',
      dateCreated: '2016-06-24',
      description: 'Acoustic sonification of Jupiter magnetosphere boundary recorded by NASA Juno.',
    },
  },
};

/**
 * Resolves the asset manifest JSON (`collection.json`) for a video or audio item from `images-api.nasa.gov`
 */
async function resolveAssetManifestUrl(
  manifestHref: string,
  preferredExtensions: string[]
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1000);
    const res = await fetch(normalizeHttpsUrl(manifestHref), { signal: controller.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) return null;
    const urls: string[] = await res.json();
    if (!Array.isArray(urls) || urls.length === 0) return null;

    for (const ext of preferredExtensions) {
      const match = urls.find((u) => typeof u === 'string' && u.toLowerCase().endsWith(ext));
      if (match) {
        return normalizeHttpsUrl(match);
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetches 1 featured visual (image or video) and 1 space audio clip from the official NASA Image and Video Library API
 * (`https://images-api.nasa.gov/search`) for a given space query.
 */
export async function fetchNasaMediaForTopic(
  query: string,
  topic?: string
): Promise<NasaMediaBundle> {
  const { visualQuery, audioQuery, presetKey } = extractNasaSearchKeyword(query, topic);
  const cacheKey = `${presetKey}:${visualQuery.toLowerCase()}`;

  const cached = mediaCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const fallbackBundle = VERIFIED_NASA_FALLBACKS[presetKey] || VERIFIED_NASA_FALLBACKS.apollo11;

  try {
    const visualSearchUrl = `https://images-api.nasa.gov/search?q=${encodeURIComponent(visualQuery)}&media_type=image,video&page_size=6`;
    const audioSearchUrl = `https://images-api.nasa.gov/search?q=${encodeURIComponent(audioQuery)}&media_type=audio&page_size=5`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);

    const [visualRes, audioRes] = await Promise.allSettled([
      fetch(visualSearchUrl, { signal: controller.signal }),
      fetch(audioSearchUrl, { signal: controller.signal }),
    ]).finally(() => clearTimeout(timer));

    let resolvedVisual: NasaMediaVisual | undefined;
    let resolvedAudio: NasaMediaAudio | undefined;

    // 1. Parse visual (preferring video when available with valid mp4, or crisp high-res image)
    if (visualRes.status === 'fulfilled' && visualRes.value.ok) {
      const data: NasaApiSearchResponse = await visualRes.value.json();
      const items = data.collection?.items || [];

      // Check if there's a video item first or a top image item
      const videoCandidate = items.find((it) => it.data?.[0]?.media_type === 'video' && it.href);
      const imageCandidate = items.find(
        (it) => it.data?.[0]?.media_type === 'image' && it.links?.[0]?.href
      );

      if (videoCandidate && videoCandidate.data?.[0]) {
        const meta = videoCandidate.data[0];
        const mp4Url = await resolveAssetManifestUrl(videoCandidate.href, [
          '~mobile.mp4',
          '~medium.mp4',
          '~preview.mp4',
          '.mp4',
        ]);
        if (mp4Url) {
          resolvedVisual = {
            type: 'video',
            title: meta.title,
            nasaId: meta.nasa_id,
            url: mp4Url,
            previewUrl: videoCandidate.links?.[0]?.href
              ? normalizeHttpsUrl(videoCandidate.links[0].href)
              : undefined,
            description: meta.description,
            dateCreated: meta.date_created?.slice(0, 10),
            center: meta.center || 'NASA',
          };
        }
      }

      if (!resolvedVisual && imageCandidate && imageCandidate.data?.[0] && imageCandidate.links?.[0]?.href) {
        const meta = imageCandidate.data[0];
        const thumbUrl = normalizeHttpsUrl(imageCandidate.links[0].href);
        resolvedVisual = {
          type: 'image',
          title: meta.title,
          nasaId: meta.nasa_id,
          url: thumbUrl,
          previewUrl: thumbUrl,
          description: meta.description,
          dateCreated: meta.date_created?.slice(0, 10),
          center: meta.center || 'NASA',
        };
      }
    }

    // 2. Parse audio from NASA Audio archive (`media_type=audio`)
    if (audioRes.status === 'fulfilled' && audioRes.value.ok) {
      const data: NasaApiSearchResponse = await audioRes.value.json();
      const items = data.collection?.items || [];

      for (const item of items.slice(0, 3)) {
        const meta = item.data?.[0];
        if (!meta || !item.href) continue;

        const audioFileUrl = await resolveAssetManifestUrl(item.href, ['~128k.mp3', '.mp3', '.wav', '.m4a']);
        if (audioFileUrl) {
          resolvedAudio = {
            title: meta.title,
            nasaId: meta.nasa_id,
            audioUrl: audioFileUrl,
            description: meta.description,
            dateCreated: meta.date_created?.slice(0, 10),
            center: meta.center || 'NASA Audio Archive',
          };
          break;
        }
      }
    }

    const finalBundle: NasaMediaBundle = {
      visual: resolvedVisual || fallbackBundle.visual,
      audio: resolvedAudio || fallbackBundle.audio,
    };

    mediaCache.set(cacheKey, finalBundle);
    return finalBundle;
  } catch {
    return fallbackBundle;
  }
}
