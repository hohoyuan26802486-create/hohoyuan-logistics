import type { RawOrder, DeliveryStop, SubOrderItem } from '../types/logistics';
import { geocodeAddress } from './geo';

/**
 * Normalizes a store name to its base brand
 * e.g., "欣葉台菜 - 點心廚房" -> "欣葉台菜"
 * "鼎泰豐 復興店 (中央廚房)" -> "鼎泰豐 復興店"
 */
export function normalizeStoreBrand(name: string): string {
  if (!name) return '未命名門市';
  return name
    .replace(/\s*[-—–(（].*?(廚房|部|課|櫃|外場|冷鏈|點心|熱炒|A廚|B廚).*?[)）]?/g, '')
    .replace(/\s*\(.*?\)/g, '')
    .trim();
}

/**
 * Normalizes street address by stripping floor/room number
 * e.g., "台北市信義區松高路12號4樓" -> "台北市信義區松高路12號"
 */
export function normalizeBaseAddress(address: string): string {
  if (!address) return '';
  return address
    .replace(/[0-9一二三四五六七八九十B]+[F樓層].*$/i, '')
    .replace(/地下[0-9一二三四五六七八九十]+層?.*$/i, '')
    .trim();
}

/**
 * Parses time constraint string into minutes from 00:00 for route sorting
 * e.g., "09:30前" -> 570, "11:00前" -> 660, "10:30" -> 630
 */
export function parseTimeConstraint(str: string): number | undefined {
  if (!str || str.includes('無') || str.includes('隨時')) return undefined;
  const match = str.match(/([0-1]?[0-9]|2[0-3]):?([0-5][0-9])/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    return hours * 60 + mins;
  }
  // Check Chinese format: 9點半, 10點
  const zhMatch = str.match(/([0-9]{1,2})點(半|[0-9]{1,2})?/);
  if (zhMatch) {
    const hours = parseInt(zhMatch[1], 10);
    const mins = zhMatch[2] === '半' ? 30 : parseInt(zhMatch[2] || '0', 10);
    return hours * 60 + mins;
  }
  return undefined;
}

/**
 * Groups raw orders into delivery stops according to business requirements:
 * 1. Same customer + same address (even with different kitchens/order numbers) -> MERGED into 1 stop with amounts summed.
 * 2. Same building/mall + different customer (different brand / different floor) -> KEPT AS SEPARATE STOPS, flagged as co-located.
 */
export function groupOrdersIntoStops(
  orders: RawOrder[],
  defaultUnloadMinutes = 20
): DeliveryStop[] {
  // Map of grouping key -> list of orders
  // Key format: `${cleanStoreBrand}:::${cleanBaseAddress}`
  const groupMap = new Map<string, RawOrder[]>();

  orders.forEach(order => {
    const brand = normalizeStoreBrand(order.storeName);
    const baseAddr = normalizeBaseAddress(order.address);
    // Unique key combines brand + base street address
    const key = `${brand.toLowerCase()}:::${baseAddr.toLowerCase()}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(order);
  });

  // Count occurrences of base addresses to detect multi-customer shopping malls
  const addressCustomerMap = new Map<string, Set<string>>();
  orders.forEach(order => {
    const baseAddr = normalizeBaseAddress(order.address);
    const brand = normalizeStoreBrand(order.storeName);
    if (!addressCustomerMap.has(baseAddr)) {
      addressCustomerMap.set(baseAddr, new Set());
    }
    addressCustomerMap.get(baseAddr)!.add(brand);
  });

  const stops: DeliveryStop[] = [];

  groupMap.forEach((groupedOrders, key) => {
    const first = groupedOrders[0];
    const brand = normalizeStoreBrand(first.storeName);
    const baseAddr = normalizeBaseAddress(first.address);

    // Sum financial amounts
    let untaxedSum = 0;
    let taxSum = 0;
    let totalSum = 0;

    // Pick strictest time constraint
    let strictestTimeMinutes: number | undefined = undefined;
    let strictestTimeStr = '無限制';

    // Combine notes and departments
    const subOrders: SubOrderItem[] = [];
    const notesArr: string[] = [];
    const floorsSet = new Set<string>();

    groupedOrders.forEach(o => {
      untaxedSum += o.untaxedAmount;
      taxSum += o.taxAmount;
      totalSum += o.totalAmount;

      if (o.floor) floorsSet.add(o.floor);
      if (o.notes) notesArr.push(o.notes);

      const tcMin = parseTimeConstraint(o.timeConstraint);
      if (tcMin !== undefined) {
        if (strictestTimeMinutes === undefined || tcMin < strictestTimeMinutes) {
          strictestTimeMinutes = tcMin;
          strictestTimeStr = o.timeConstraint;
        }
      }

      subOrders.push({
        id: o.id,
        orderNo: o.orderNo,
        department: o.department || '門市部',
        slipSequence: o.slipSequence || (groupedOrders.length > 1 ? `${subOrders.length + 1}/${groupedOrders.length}` : '1/1'),
        untaxedAmount: o.untaxedAmount,
        taxAmount: o.taxAmount,
        totalAmount: o.totalAmount,
        notes: o.notes,
        photoUrl: o.photoUrl,
      });
    });

    // Check if other customers share this same building
    const customersInSameBuilding = addressCustomerMap.get(baseAddr);
    const isSameBuildingDifferentCustomer =
      (customersInSameBuilding?.size ?? 0) > 1;

    // Unload time: If user customized unloadDuration on order, use the highest one, otherwise default
    const maxCustomUnload = Math.max(...groupedOrders.map(o => o.unloadDuration || defaultUnloadMinutes));
    // If multiple orders merged for same customer (e.g. 2-3 kitchens), add 5 mins buffer for multi-department handover
    const calculatedUnload = groupedOrders.length > 1
      ? Math.max(maxCustomUnload, defaultUnloadMinutes + (groupedOrders.length - 1) * 5)
      : maxCustomUnload;

    const floorDisplay = Array.from(floorsSet).join(', ') || first.floor || '1F';

    // Geo coordinates
    const geo = first.lat && first.lng
      ? { lat: first.lat, lng: first.lng, area: first.directionArea }
      : geocodeAddress(first.address);

    stops.push({
      id: `stop-${first.id}`,
      sequence: 0, // Will be set by optimizer
      stopKey: key,
      storeName: brand,
      address: first.address,
      floor: floorDisplay,
      isMultiOrderMerged: groupedOrders.length > 1,
      subOrders,
      untaxedAmount: untaxedSum,
      taxAmount: taxSum,
      totalAmount: totalSum,
      timeConstraint: strictestTimeStr,
      timeConstraintMinutes: strictestTimeMinutes,
      unloadDuration: calculatedUnload,
      notes: notesArr.join('； ') || first.notes || '',
      directionArea: first.directionArea || geo.area,
      lat: geo.lat,
      lng: geo.lng,
      status: groupedOrders.every(o => o.status === 'delivered')
        ? 'delivered'
        : groupedOrders.some(o => o.status === 'in_transit')
        ? 'in_transit'
        : 'pending',
      deliveredAt: groupedOrders.find(o => o.deliveredAt)?.deliveredAt,
      estimatedArrival: '',
      estimatedDeparture: '',
      travelMinutesFromPrev: 0,
      distanceKmFromPrev: 0,
      isSameBuildingDifferentCustomer,
      coLocatedStopsCount: customersInSameBuilding?.size || 1,
    });
  });

  return stops;
}
