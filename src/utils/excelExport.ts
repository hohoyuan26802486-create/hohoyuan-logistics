import type { CompanyConfig, RouteOptimizationResult, TruckItem } from '../types/logistics';
import { groupOrdersIntoStops } from './grouping';
import { optimizeRoute } from './optimizer';

/**
 * Escapes CSV field value and wraps with quotes if needed
 */
function escapeCsv(val: any): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export interface ExcelExportOptions {
  dateLabel?: string;
  filterStatus?: 'all' | 'delivered_only';
}

/**
 * Generates and downloads Excel-compatible CSV for current active truck or all trucks
 */
export function exportLogisticsToExcel(
  config: CompanyConfig,
  targetTrucks: TruckItem[],
  scope: 'current' | 'all' = 'current',
  options?: ExcelExportOptions
) {
  const todayStr = options?.dateLabel || new Date().toISOString().split('T')[0];
  const timeNow = new Date().toLocaleTimeString('zh-TW', { hour12: false });

  // CSV Columns Header
  const headers = [
    '送貨日期',
    '車次名稱',
    '車牌號碼',
    '負責司機',
    '司機電話',
    '停靠站序',
    '客戶店名',
    '門市地址',
    '樓層',
    '訂單編號 (單據號碼)',
    '單據流水號 (聯次)',
    '廚房/部門/專櫃',
    '未稅金額 (NT$)',
    '營業稅 5% (NT$)',
    '含稅總金額 (NT$)',
    '現場實收金額 (NT$)',
    '折讓/差額 (NT$)',
    '預計到達時間',
    '實際送達時間',
    '簽收狀態',
    '單據拍照核驗 (張數)',
    '客戶店章/簽核',
    '貨況異常/修改單據說明',
    '司機最新GPS位置',
    '客戶時間限制',
    '備註/卸貨事項',
  ];

  const rows: string[][] = [];

  let grandUntaxed = 0;
  let grandTax = 0;
  let grandTotal = 0;
  let totalOrderCount = 0;

  targetTrucks.forEach(truck => {
    // Group orders and compute schedule for this truck
    const truckStops = groupOrdersIntoStops(truck.orders, config.defaultUnloadMinutes);
    const truckResult = optimizeRoute(truckStops, {
      ...config,
      departureTime: truck.departureTime,
      truckCapacityLimit: truck.truckCapacityLimit,
      driverName: truck.driverName,
      truckPlate: truck.truckPlate,
    });

    truckResult.stops.forEach(stop => {
      // Each sub-order gets its own row for detailed accounting breakdown!
      stop.subOrders.forEach((sub, sIdx) => {
        grandUntaxed += sub.untaxedAmount;
        grandTax += sub.taxAmount;
        grandTotal += sub.totalAmount;
        totalOrderCount += 1;

        const slipSeq = sub.slipSequence || (stop.subOrders.length > 1 ? `${sIdx + 1}/${stop.subOrders.length}` : '1/1');
        const statusText =
          stop.status === 'delivered'
            ? '已完成簽收'
            : stop.status === 'in_transit'
            ? '配送途中'
            : stop.status === 'issue'
            ? '未送達帶回 (待改派)'
            : '待出車配送';

        rows.push([
          todayStr,
          truck.zoneName,
          truck.truckPlate,
          truck.driverName,
          truck.driverPhone,
          String(stop.sequence),
          stop.storeName,
          stop.address,
          stop.floor || '1F',
          sub.orderNo || `HHY-${todayStr}-${stop.sequence}`,
          slipSeq,
          sub.department || '門市廚房',
          String(sub.untaxedAmount),
          String(sub.taxAmount),
          String(sub.totalAmount),
          String(stop.proofOfDelivery ? stop.proofOfDelivery.actualAmount : sub.totalAmount),
          String(stop.proofOfDelivery?.differenceAmount || 0),
          stop.estimatedArrival,
          stop.deliveredAt || (stop.status === 'delivered' ? stop.estimatedArrival : '未簽收'),
          statusText,
          stop.proofOfDelivery
            ? `已拍 ${stop.proofOfDelivery.actualSlipCount}/${stop.proofOfDelivery.expectedSlipCount} 張 (比對${stop.proofOfDelivery.isSlipCountMatched ? '齊全' : '不符'})`
            : '未拍照比對',
          stop.proofOfDelivery?.isSignatureVerified ? '已確認簽核/店章' : '未簽核',
          stop.proofOfDelivery?.hasIssue
            ? `[${stop.proofOfDelivery.issueTypeName || '異常'}] ${stop.proofOfDelivery.issueNotes || ''}`
            : '正常無異常',
          truck.currentLocation?.areaName || '出發總部',
          stop.timeConstraint || '無限制',
          sub.notes || stop.notes || '',
        ]);
      });
    });
  });

  // Summary footer row for Accountant
  const summaryRow = [
    '【全表總計】',
    `共 ${targetTrucks.length} 台車輛`,
    '',
    '',
    '',
    '',
    `共 ${totalOrderCount} 筆單據`,
    '',
    '',
    '',
    '',
    '未稅/含稅總計',
    String(grandUntaxed),
    String(grandTax),
    String(grandTotal),
    String(grandTotal), // 實收預設同總額
    '0',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    `報表產生時間：${todayStr} ${timeNow}`,
  ];

  // Convert to CSV string with UTF-8 BOM (\uFEFF) so Excel opens Chinese perfectly without garbled text
  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCsv).join(','), ...rows.map(r => r.map(escapeCsv).join(',')), summaryRow.map(escapeCsv).join(',')].join('\r\n');

  // Trigger browser download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename =
    scope === 'all'
      ? `禾禾園物流_全車隊今日送貨與會計業績報表_${todayStr.replace(/-/g, '')}.csv`
      : `禾禾園物流_${targetTrucks[0]?.zoneName || '車輛'}_會計對帳表_${todayStr.replace(/-/g, '')}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
