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

  // CSV Columns Header - Tailored for Ho Hey Yuan Logistics Accounting & Dispatch
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
    '會計核銷審核 (OK/異常)',
    '補貨商品明細 (產品料號/商品名稱/數量/原因)',
    '預計到達時間',
    '實際送達時間',
    '配送狀態',
    '單據拍照核驗 (張數)',
    '簽核存證模式',
    '貨況異常/修改單據說明',
    '司機最新GPS位置',
    '客戶時間限制',
    '備註/卸貨事項',
  ];

  const rows: string[][] = [];

  let grandUntaxed = 0;
  let grandTax = 0;
  let grandTotal = 0;
  let grandActual = 0;
  let grandDifference = 0;
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
      // Each sub-order gets its own row for detailed accounting breakdown
      stop.subOrders.forEach((sub, sIdx) => {
        grandUntaxed += sub.untaxedAmount;
        grandTax += sub.taxAmount;
        grandTotal += sub.totalAmount;
        totalOrderCount += 1;

        const slipSeq = sub.slipSequence || (stop.subOrders.length > 1 ? `${sIdx + 1}/${stop.subOrders.length}` : '1/1');
        const pod = stop.proofOfDelivery;

        // Accounting Audit Status:
        // When items are unchanged and there are no issues -> direct "OK"!
        let accountingAuditStatus = '待核銷';
        if (stop.status === 'delivered') {
          if (pod) {
            if (pod.isItemsUnchanged && !pod.hasIssue) {
              accountingAuditStatus = 'OK';
            } else if (pod.hasIssue) {
              accountingAuditStatus = '⚠️ 需補貨/改單';
            } else {
              accountingAuditStatus = 'OK';
            }
          } else {
            accountingAuditStatus = 'OK';
          }
        }

        // Detailed Replenishment Items with SKU, Name, Quantity, and Reason
        let replenishmentSummary = '無 (品項齊全無修改)';
        if (pod?.replacementItems && pod.replacementItems.length > 0) {
          replenishmentSummary = pod.replacementItems
            .map(
              (item, idx) =>
                `[${idx + 1}] 料號:${item.sku} 品名:${item.name} 數量:${item.quantity}${item.unit} (原因:${item.reason}${item.note ? ` - ${item.note}` : ''})`
            )
            .join('； ');
        } else if (pod?.hasIssue) {
          replenishmentSummary = `[${pod.issueTypeName || '異常'}] ${pod.issueNotes || '無品項拆分'}`;
        }

        // Signing Mode
        let signMode = '未核銷';
        if (pod?.isOfficeReprintMode) {
          signMode = '公司拍照補單 + 手機電子簽名';
        } else if (pod?.signatureDataUrl) {
          signMode = '紙本拍照 + 手機螢幕手寫電子簽名';
        } else if (pod?.isSignatureVerified) {
          signMode = '紙本單據已蓋章/簽名';
        } else if (stop.status === 'delivered') {
          signMode = '現場已簽收';
        }

        const actualSubAmount = pod ? pod.actualAmount : sub.totalAmount;
        const diffAmount = pod ? pod.differenceAmount : 0;
        grandActual += actualSubAmount;
        grandDifference += diffAmount;

        const deliveryStatusText =
          stop.status === 'delivered'
            ? accountingAuditStatus === 'OK'
              ? '已送達 (OK)'
              : '已送達 (有異常/待補貨)'
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
          String(actualSubAmount),
          String(diffAmount),
          accountingAuditStatus, // 會計核銷審核 (OK/異常)
          replenishmentSummary, // 補貨商品明細 (料號/名稱/數量/原因)
          stop.estimatedArrival,
          stop.deliveredAt || (stop.status === 'delivered' ? stop.estimatedArrival : '未簽收'),
          deliveryStatusText,
          pod
            ? pod.isOfficeReprintMode
              ? '公司補單存證 (1張)'
              : `已拍 ${pod.actualSlipCount}/${pod.expectedSlipCount} 張 (比對${pod.isSlipCountMatched ? '齊全' : '不符'})`
            : '未拍照比對',
          signMode,
          pod?.hasIssue ? `[${pod.issueTypeName || '異常'}] ${pod.issueNotes || ''}` : '正常無異常',
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
    String(grandActual || grandTotal),
    String(grandDifference),
    '後台核對完畢',
    '補貨商品總計如上',
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
