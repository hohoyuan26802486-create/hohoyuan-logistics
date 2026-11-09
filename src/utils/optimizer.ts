import type { CompanyConfig, DeliveryStop, RouteOptimizationResult } from '../types/logistics';
import { calculateDistanceKm, estimateTravelMinutes } from './geo';
import { normalizeBaseAddress } from './grouping';

/**
 * Parses "HH:mm" into minutes from midnight
 */
export function timeStringToMinutes(timeStr?: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 480; // Default 08:00
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Formats minutes from midnight into "HH:mm"
 */
export function minutesToTimeString(totalMinutes: number): string {
  // normalize within 24h
  const normalized = ((Math.floor(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Optimizes the route order considering:
 * 1. Customer strict time constraints (e.g. "09:30前")
 * 2. Same-building co-location (stops sharing same address are kept adjacent)
 * 3. Spatial shortest path (Greedy Nearest Neighbor from HQ + 2-Opt TSP)
 * 4. Traffic multiplier and custom unloading minutes
 */
export function optimizeRoute(
  stops: DeliveryStop[],
  config: CompanyConfig
): RouteOptimizationResult {
  if (stops.length === 0) {
    return {
      stops: [],
      totalDistanceKm: 0,
      totalTravelMinutes: 0,
      totalUnloadMinutes: 0,
      departureTime: config.departureTime,
      estimatedReturnTime: config.departureTime,
      returnTravelMinutes: 0,
      returnDistanceKm: 0,
      amountSummary: {
        totalUntaxed: 0,
        totalTax: 0,
        grandTotal: 0,
        truckLimit: config.truckCapacityLimit,
        capacityPercentage: 0,
        isOverLimit: false,
      },
    };
  }

  const hqLat = config.lat;
  const hqLng = config.lng;
  const departureMins = timeStringToMinutes(config.departureTime);

  // Group stops that share identical base address so they are visited sequentially
  // Map of base address -> stops
  const coLocatedMap = new Map<string, DeliveryStop[]>();
  stops.forEach(s => {
    const base = normalizeBaseAddress(s.address);
    if (!coLocatedMap.has(base)) {
      coLocatedMap.set(base, []);
    }
    coLocatedMap.get(base)!.push(s);
  });

  // Algorithm: Greedy insertion with time-window scoring
  const unvisited = [...stops];
  const orderedStops: DeliveryStop[] = [];

  let currentLat = hqLat;
  let currentLng = hqLng;
  let currentMins = departureMins;

  while (unvisited.length > 0) {
    let bestIndex = -1;
    let bestScore = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const candidate = unvisited[i];
      const dist = calculateDistanceKm(currentLat, currentLng, candidate.lat, candidate.lng);
      const travelMins = estimateTravelMinutes(dist, config.trafficFactor);
      const expectedArrival = currentMins + travelMins;

      // Distance score
      let score = dist * 1.5 + travelMins;

      // Time constraint score penalty/reward:
      // If candidate has a strict deadline (e.g. 09:30 = 570 mins)
      if (candidate.timeConstraintMinutes !== undefined) {
        const timeDiff = candidate.timeConstraintMinutes - expectedArrival;
        if (timeDiff < 0) {
          // Severely penalize being late
          score += 1000 + Math.abs(timeDiff) * 10;
        } else if (timeDiff < 60) {
          // Urgent! Prioritize arriving close to deadline
          score -= (60 - timeDiff) * 3;
        }
      }

      // If candidate is in the same building as the previous stop, heavily favor visiting it right now!
      if (orderedStops.length > 0) {
        const prevStop = orderedStops[orderedStops.length - 1];
        if (normalizeBaseAddress(prevStop.address) === normalizeBaseAddress(candidate.address)) {
          score -= 500; // Park once, visit both!
        }
      }

      if (score < bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    if (bestIndex === -1) bestIndex = 0;

    const chosen = unvisited.splice(bestIndex, 1)[0];
    orderedStops.push(chosen);

    // Update current position and simulation time
    const dist = calculateDistanceKm(currentLat, currentLng, chosen.lat, chosen.lng);
    const travelMins = estimateTravelMinutes(dist, config.trafficFactor);
    currentMins += travelMins + chosen.unloadDuration;
    currentLat = chosen.lat;
    currentLng = chosen.lng;
  }

  // Refine with 2-Opt pass to untangle route loops while respecting time constraints
  const optimized = twoOptRefine(orderedStops, hqLat, hqLng, config.trafficFactor);

  // Recalculate schedule times for the sequenced route
  return calculateSchedule(optimized, config);
}

/**
 * 2-Opt local search refinement for TSP
 */
function twoOptRefine(
  stops: DeliveryStop[],
  hqLat: number,
  hqLng: number,
  trafficFactor: number
): DeliveryStop[] {
  if (stops.length <= 2) return stops;
  let bestRoute = [...stops];
  let improved = true;
  let iterations = 0;

  const routeDistance = (route: DeliveryStop[]) => {
    let d = calculateDistanceKm(hqLat, hqLng, route[0].lat, route[0].lng);
    for (let i = 0; i < route.length - 1; i++) {
      d += calculateDistanceKm(route[i].lat, route[i].lng, route[i + 1].lat, route[i + 1].lng);
    }
    d += calculateDistanceKm(route[route.length - 1].lat, route[route.length - 1].lng, hqLat, hqLng);
    return d;
  };

  let bestDist = routeDistance(bestRoute);

  while (improved && iterations < 30) {
    improved = false;
    iterations++;

    for (let i = 0; i < bestRoute.length - 1; i++) {
      for (let k = i + 1; k < bestRoute.length; k++) {
        // Skip swap if it severely violates an early time window
        const newRoute = 2; // placeholder
        const candidateRoute = [
          ...bestRoute.slice(0, i),
          ...bestRoute.slice(i, k + 1).reverse(),
          ...bestRoute.slice(k + 1),
        ];

        // Check if strict deadlines are preserved
        let isValid = true;
        for (let idx = 0; idx < candidateRoute.length; idx++) {
          const s = candidateRoute[idx];
          if (s.timeConstraintMinutes !== undefined && s.timeConstraintMinutes < 570 && idx > 3) {
            // Early 09:30 morning delivery should not be pushed to the back
            isValid = false;
            break;
          }
        }

        if (isValid) {
          const newDist = routeDistance(candidateRoute);
          if (newDist < bestDist - 0.2) {
            bestRoute = candidateRoute;
            bestDist = newDist;
            improved = true;
            break;
          }
        }
      }
      if (improved) break;
    }
  }

  return bestRoute;
}

/**
 * Computes exact ETAs, ETDs, travel times and return time to HQ for an ordered list of stops
 */
export function calculateSchedule(
  orderedStops: DeliveryStop[],
  config: CompanyConfig
): RouteOptimizationResult {
  const hqLat = config.lat;
  const hqLng = config.lng;
  let currentMins = timeStringToMinutes(config.departureTime);

  let prevLat = hqLat;
  let prevLng = hqLng;
  let totalDistanceKm = 0;
  let totalTravelMinutes = 0;
  let totalUnloadMinutes = 0;

  let totalUntaxed = 0;
  let totalTax = 0;
  let grandTotal = 0;

  const scheduledStops: DeliveryStop[] = orderedStops.map((stop, index) => {
    const dist = calculateDistanceKm(prevLat, prevLng, stop.lat, stop.lng);
    // If consecutive stops are in the same building, travel distance is 0 km and travel time is 2 min
    const isSameBuilding = index > 0 && normalizeBaseAddress(orderedStops[index - 1].address) === normalizeBaseAddress(stop.address);
    const travelMins = isSameBuilding ? 2 : estimateTravelMinutes(dist, config.trafficFactor);

    totalDistanceKm += isSameBuilding ? 0.1 : dist;
    totalTravelMinutes += travelMins;
    totalUnloadMinutes += stop.unloadDuration;

    const arrivalMins = currentMins + travelMins;
    const departureMins = arrivalMins + stop.unloadDuration;

    totalUntaxed += stop.untaxedAmount;
    totalTax += stop.taxAmount;
    grandTotal += stop.totalAmount;

    currentMins = departureMins;
    prevLat = stop.lat;
    prevLng = stop.lng;

    return {
      ...stop,
      sequence: index + 1,
      estimatedArrival: minutesToTimeString(arrivalMins),
      estimatedDeparture: minutesToTimeString(departureMins),
      travelMinutesFromPrev: travelMins,
      distanceKmFromPrev: isSameBuilding ? 0.1 : dist,
    };
  });

  // Calculate return trip from last stop back to Company HQ
  let returnDistKm = 0;
  let returnTravelMins = 0;

  if (scheduledStops.length > 0) {
    const lastStop = scheduledStops[scheduledStops.length - 1];
    returnDistKm = calculateDistanceKm(lastStop.lat, lastStop.lng, hqLat, hqLng);
    returnTravelMins = estimateTravelMinutes(returnDistKm, config.trafficFactor);
  }

  totalDistanceKm += returnDistKm;
  totalTravelMinutes += returnTravelMins;
  const estimatedReturnTime = minutesToTimeString(currentMins + returnTravelMins);

  const capacityPct = config.truckCapacityLimit > 0
    ? Math.round((grandTotal / config.truckCapacityLimit) * 100)
    : 0;

  return {
    stops: scheduledStops,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    totalTravelMinutes,
    totalUnloadMinutes,
    departureTime: config.departureTime,
    estimatedReturnTime,
    returnTravelMinutes: returnTravelMins,
    returnDistanceKm: Math.round(returnDistKm * 10) / 10,
    amountSummary: {
      totalUntaxed,
      totalTax,
      grandTotal,
      truckLimit: config.truckCapacityLimit,
      capacityPercentage: capacityPct,
      isOverLimit: grandTotal > config.truckCapacityLimit,
    },
  };
}
