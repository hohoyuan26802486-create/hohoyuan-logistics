/**
 * Geographic helper functions and Northern Taiwan database
 * Headquarters: 新北市樹林區柑園街一段196-13號
 */

export const DEFAULT_HQ_COORDS = {
  name: '禾禾園總公司物流中心',
  address: '新北市樹林區柑園街一段196-13號',
  lat: 24.9546,
  lng: 121.3965,
  area: '樹林區',
};

// Known coordinates in Greater Taipei area
export const KNOWN_LOCATIONS: Record<string, { lat: number; lng: number; area: string }> = {
  '新北市樹林區柑園街一段196-13號': { lat: 24.9546, lng: 121.3965, area: '樹林區' },
  '新北市樹林區': { lat: 24.9922, lng: 121.4243, area: '樹林區' },
  '新北市板橋區縣民大道二段7號': { lat: 25.0135, lng: 121.4651, area: '板橋區' },
  '新北市板橋區新站路28號': { lat: 25.0128, lng: 121.4648, area: '板橋區' },
  '新北市新莊區新北大道四段3號': { lat: 25.0601, lng: 121.4497, area: '新莊區' },
  '新北市中和區中山路三段122號': { lat: 25.0063, lng: 121.4938, area: '中和區' },
  '新北市三重區正義北路188號': { lat: 25.0682, lng: 121.4965, area: '三重區' },
  '台北市信義區松高路12號': { lat: 25.0388, lng: 121.5672, area: '信義區' },
  '台北市信義區松高路19號': { lat: 25.0392, lng: 121.5661, area: '信義區' },
  '台北市信義區松仁路58號': { lat: 25.0354, lng: 121.5683, area: '信義區' },
  '台北市信義區忠孝東路五段68號': { lat: 25.0409, lng: 121.5669, area: '信義區' },
  '台北市大安區忠孝東路三段300號': { lat: 25.0416, lng: 121.5428, area: '大安區' },
  '台北市大安區忠孝東路四段45號': { lat: 25.0419, lng: 121.5458, area: '大安區' },
  '台北市大安區信義路二段194號': { lat: 25.0336, lng: 121.5303, area: '大安區' },
  '台北市中山區南京西路12號': { lat: 25.0526, lng: 121.5208, area: '中山區' },
  '台北市中山區中山北路二段63號': { lat: 25.0571, lng: 121.5229, area: '中山區' },
  '台北市中山區敬業三路20號': { lat: 25.0834, lng: 121.5574, area: '中山大直' },
  '台北市松山區民生東路三段111號': { lat: 25.0578, lng: 121.5435, area: '松山區' },
  '台北市內湖區成功路四段188號': { lat: 25.0831, lng: 121.5937, area: '內湖區' },
  '台北市士林區天母東路68號': { lat: 25.1147, lng: 121.5332, area: '士林天母' },
};

/**
 * Approximate geocode for Taiwan addresses
 */
export function geocodeAddress(address: string): { lat: number; lng: number; area: string } {
  const trimmed = address.trim();

  // 1. Direct match in dictionary
  for (const [key, val] of Object.entries(KNOWN_LOCATIONS)) {
    if (trimmed.includes(key) || key.includes(trimmed)) {
      return val;
    }
  }

  // 2. Area based match
  if (trimmed.includes('樹林')) {
    return { lat: 24.965 + (hash(trimmed) % 20) * 0.001, lng: 121.41 + (hash(trimmed + 'b') % 20) * 0.001, area: '樹林區' };
  }
  if (trimmed.includes('板橋')) {
    return { lat: 25.012 + (hash(trimmed) % 20) * 0.001, lng: 121.465 + (hash(trimmed + 'b') % 20) * 0.001, area: '板橋區' };
  }
  if (trimmed.includes('新莊')) {
    return { lat: 25.035 + (hash(trimmed) % 20) * 0.001, lng: 121.445 + (hash(trimmed + 'b') % 20) * 0.001, area: '新莊區' };
  }
  if (trimmed.includes('中和') || trimmed.includes('永和')) {
    return { lat: 25.002 + (hash(trimmed) % 20) * 0.001, lng: 121.505 + (hash(trimmed + 'b') % 20) * 0.001, area: '雙和區' };
  }
  if (trimmed.includes('三重') || trimmed.includes('蘆洲')) {
    return { lat: 25.072 + (hash(trimmed) % 20) * 0.001, lng: 121.485 + (hash(trimmed + 'b') % 20) * 0.001, area: '三重區' };
  }
  if (trimmed.includes('信義')) {
    return { lat: 25.035 + (hash(trimmed) % 20) * 0.001, lng: 121.565 + (hash(trimmed + 'b') % 20) * 0.001, area: '信義區' };
  }
  if (trimmed.includes('大安')) {
    return { lat: 25.032 + (hash(trimmed) % 20) * 0.001, lng: 121.542 + (hash(trimmed + 'b') % 20) * 0.001, area: '大安區' };
  }
  if (trimmed.includes('中山')) {
    return { lat: 25.061 + (hash(trimmed) % 20) * 0.001, lng: 121.528 + (hash(trimmed + 'b') % 20) * 0.001, area: '中山區' };
  }
  if (trimmed.includes('松山')) {
    return { lat: 25.053 + (hash(trimmed) % 20) * 0.001, lng: 121.558 + (hash(trimmed + 'b') % 20) * 0.001, area: '松山區' };
  }
  if (trimmed.includes('內湖')) {
    return { lat: 25.075 + (hash(trimmed) % 20) * 0.001, lng: 121.585 + (hash(trimmed + 'b') % 20) * 0.001, area: '內湖區' };
  }
  if (trimmed.includes('士林') || trimmed.includes('北投')) {
    return { lat: 25.092 + (hash(trimmed) % 20) * 0.001, lng: 121.522 + (hash(trimmed + 'b') % 20) * 0.001, area: '士林區' };
  }

  // Fallback Taipei basin
  const latOffset = ((hash(trimmed) % 60) - 30) * 0.001;
  const lngOffset = ((hash(trimmed + 'x') % 60) - 30) * 0.001;
  return {
    lat: 25.033 + latOffset,
    lng: 121.515 + lngOffset,
    area: '雙北都會區',
  };
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

/**
 * Reverse geocode from lat/lng to nearest known area/district in Northern Taiwan
 */
export function reverseGeocodeToArea(lat: number, lng: number): string {
  let closestDist = Infinity;
  let closestArea = '雙北都會區';
  let closestName = '';

  for (const [name, loc] of Object.entries(KNOWN_LOCATIONS)) {
    const d = calculateDistanceKm(lat, lng, loc.lat, loc.lng);
    if (d < closestDist) {
      closestDist = d;
      closestArea = loc.area;
      closestName = name;
    }
  }

  if (closestDist <= 2.5) {
    const road = closestName.replace(/^(台北市|新北市)/, '');
    return `${closestArea} (${road.slice(0, 10)})`;
  }

  // Geographic approximate boundaries
  if (lat < 24.98 && lng < 121.43) return '新北市樹林區/三峽區周邊';
  if (lat >= 24.98 && lat <= 25.03 && lng >= 25.00 && lng <= 121.48) return '新北市板橋區周邊';
  if (lat >= 25.02 && lat <= 25.08 && lng >= 121.42 && lng <= 121.47) return '新北市新莊區周邊';
  if (lat >= 25.05 && lat <= 25.09 && lng >= 121.47 && lng <= 121.51) return '新北市三重區/蘆洲區周邊';
  if (lat >= 25.02 && lat <= 25.05 && lng >= 121.55 && lng <= 121.58) return '台北市信義區周邊';
  if (lat >= 25.02 && lat <= 25.05 && lng >= 121.52 && lng <= 121.55) return '台北市大安區周邊';
  if (lat >= 25.05 && lat <= 25.08 && lng >= 121.51 && lng <= 121.55) return '台北市中山區周邊';
  if (lat >= 25.06 && lng >= 121.57) return '台北市內湖區周邊';
  if (lat >= 25.09 && lng >= 121.51) return '台北市士林區/天母周邊';

  return `雙北都會區 (緯度:${lat.toFixed(3)}, 經度:${lng.toFixed(3)})`;
}

/**
 * Calculates straight line distance between two coordinates in kilometers
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightDist = R * c;

  // City road winding tortuosity factor (typically 1.35x in urban Taiwan road networks)
  return Math.round(straightDist * 1.38 * 10) / 10;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Estimate travel time in minutes based on distance and traffic condition
 */
export function estimateTravelMinutes(
  distanceKm: number,
  trafficFactor: number = 1.0
): number {
  // Average city logistics delivery truck speed: ~26 km/h in Taipei/New Taipei
  // Expressways / bridge links: ~40 km/h
  // Base time: 3 mins pickup/traffic light buffer + (distance / speed * 60)
  const baseMinutes = 3 + (distanceKm / 28) * 60;
  return Math.max(5, Math.round(baseMinutes * trafficFactor));
}

/**
 * Generates Google Maps multi-stop navigation URL
 */
export function generateGoogleMapsRouteUrl(
  originAddress: string,
  stopAddresses: string[],
  returnAddress?: string
): string {
  const waypoints = [...stopAddresses];
  if (returnAddress) {
    waypoints.push(returnAddress);
  }

  if (waypoints.length === 0) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(originAddress)}`;
  }

  // Google Maps URL with multiple stops:
  // https://www.google.com/maps/dir/Origin/Stop1/Stop2/.../Destination
  const encodedParts = [originAddress, ...waypoints].map(addr => encodeURIComponent(addr));
  return `https://www.google.com/maps/dir/${encodedParts.join('/')}`;
}

/**
 * Generates single-stop Google Maps direct navigation URL
 */
export function generateSingleStopNavUrl(destinationAddress: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationAddress)}&travelmode=driving`;
}
