/* =========================================================
   BLOC 01 — LECTURE EXIF GPS
   ========================================================= */
export async function readPhotoGps(file) {
  // Tentative via exifr (chargé en vendor)
  try {
    if (typeof window.exifr !== 'undefined') {
      const gps = await window.exifr.gps(file);
      if (gps && gps.latitude && gps.longitude) {
        return { lat: gps.latitude, lon: gps.longitude, source: 'exif', accuracy: 'high' };
      }
    }
  } catch(e) { console.warn('[exif] lecture GPS échouée', e); }

  // Fallback : géolocalisation navigateur au moment de l'import
  return await getBrowserGps();
}

async function getBrowserGps() {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, source: 'browser', accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { timeout: 8000, enableHighAccuracy: true }
    );
  });
}

/* =========================================================
   BLOC 02 — SITE LE PLUS PROCHE
   ========================================================= */
export function findNearestSite(lat, lon, sites) {
  if (!lat || !lon || !sites?.length) return null;
  let nearest = null;
  let minDist = Infinity;
  sites.forEach(site => {
    if (!site.has_gps) return;
    const d = haversine(lat, lon, site.lat, site.lon);
    if (d < minDist) { minDist = d; nearest = site; }
  });
  return minDist < 5 ? nearest : null; // max 5 km pour association automatique
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/* =========================================================
   BLOC 03 — LECTURE EXIF DATE
   ========================================================= */
export async function readPhotoDate(file) {
  try {
    if (typeof window.exifr !== 'undefined') {
      const data = await window.exifr.parse(file, ['DateTimeOriginal', 'DateTime']);
      if (data?.DateTimeOriginal) return new Date(data.DateTimeOriginal).toISOString();
    }
  } catch(e) {}
  return new Date().toISOString();
}

/* =========================================================
   BLOC 04 — MINIATURE
   ========================================================= */
export function generateThumbnail(file, maxSize = 200) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}
