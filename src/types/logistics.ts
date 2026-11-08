export interface CompanyConfig {
  companyName: string;
  address: string;
  lat: number;
  lng: number;
  departureTime: string; // e.g. "08:00"
  defaultUnloadMinutes: number; // default: 20
  trafficCondition: 'normal' | 'rush_hour' | 'rainy' | 'heavy_traffic';
  trafficFactor: number; // 1.0, 1.25, 1.15, 1.4
  truckCapacityLimit: number; // Amount limit, e.g. 120000 NTD
  driverName: string;
  driverPhone: string;
  truckPlate: string;
  tripName: string;
  telegramConfig: {
    botToken: string;
    chatId: string;
    autoPushOnDispatch: boolean;
    autoPushOnDelivery?: boolean;
  };
  googleSyncConfig?: {
    driveFolder: string; // e.g. "禾禾園物流簽收單圖庫"
    spreadsheetName: string; // e.g. "禾禾園物流系統資料庫"
    spreadsheetId?: string;
    scriptWebhookUrl?: string;
  };
}

export interface ProofOfDeliveryRecord {
  photos: string[]; // 簽收單據照片 (支援多張)
  expectedSlipCount: number; // 應有單據張數 (e.g. 3)
  actualSlipCount: number; // 實際拍攝張數
  isSlipCountMatched: boolean; // 張數是否吻合
  isSignatureVerified: boolean; // 是否已確認簽名/蓋店章
  signatureDataUrl?: string; // 客戶螢幕電子簽名
  hasIssue: boolean; // 是否有修改單據或貨況問題
  issueType?: 'amount_modified' | 'damaged' | 'shortage' | 'rejected' | 'defrosted' | 'rescheduled' | 'other';
  issueTypeName?: string;
  originalAmount: number; // 原金額
  actualAmount: number; // 實收/修改後金額
  differenceAmount: number; // 差額 (originalAmount - actualAmount)
  issueNotes?: string; // 異常或修改備註
  issuePhotoUrl?: string; // 貨物受損或修改處佐證照
  reportedAt: string; // "11:42:08"
  telegramPushed?: boolean;
}

export interface RawOrder {
  id: string;
  orderNo: string;
  storeName: string;
  department: string; // 廚房/部門/專櫃 (e.g. "A廚房", "點心廚房", "生鮮冷鏈部", "外場")
  address: string;
  floor: string; // e.g. "1F", "B2", "4F"
  untaxedAmount: number; // 未稅金額
  taxAmount: number; // 稅額 (5%)
  totalAmount: number; // 含稅總金額
  timeConstraint: string; // e.g. "09:30前", "10:30前", "11:00前", "無限制"
  timeConstraintMinutes?: number; // Minutes from 00:00 for sorting
  unloadDuration: number; // 分鐘，預設 20，特殊客戶自訂
  notes: string;
  directionArea: string; // 大致方向/行政區 (e.g. "樹林區", "板橋區", "信義區")
  lat: number;
  lng: number;
  photoUrl?: string;
  slipSequence?: string; // 單據流水號 (e.g. "1/3", "2/3", "3/3")
  status: 'pending' | 'in_transit' | 'delivered' | 'issue';
  deliveredAt?: string;
  proofOfDelivery?: ProofOfDeliveryRecord;
  createdAt: string;
}

export interface SubOrderItem {
  id: string;
  orderNo: string;
  department: string;
  slipSequence?: string; // 單據流水號 (e.g. "1/3", "2/3", "3/3")
  untaxedAmount: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  photoUrl?: string;
}

export interface DeliveryStop {
  id: string; // Stop unique identifier
  sequence: number; // 1, 2, 3...
  stopKey: string; // Grouping key
  storeName: string;
  address: string;
  floor: string;
  isMultiOrderMerged: boolean; // 是否為同一客戶不同廚房合併
  subOrders: SubOrderItem[]; // 子訂單列表
  untaxedAmount: number; // 合併未稅
  taxAmount: number; // 合併稅額
  totalAmount: number; // 合併含稅
  timeConstraint: string; // 最嚴格的時間限制
  timeConstraintMinutes?: number;
  unloadDuration: number; // 預計卸貨耗時
  notes: string;
  directionArea: string;
  lat: number;
  lng: number;
  status: 'pending' | 'in_transit' | 'delivered' | 'issue';
  deliveredAt?: string;
  proofOfDelivery?: ProofOfDeliveryRecord; // 拍照回傳單據比對與異常紀錄
  // Route computation results
  estimatedArrival: string; // "08:45"
  estimatedDeparture: string; // "09:05"
  travelMinutesFromPrev: number; // 分鐘
  distanceKmFromPrev: number; // 公里
  isSameBuildingDifferentCustomer?: boolean; // 提示同百貨不同客戶
  coLocatedStopsCount?: number;
}

export interface RouteOptimizationResult {
  stops: DeliveryStop[];
  totalDistanceKm: number;
  totalTravelMinutes: number;
  totalUnloadMinutes: number;
  departureTime: string;
  estimatedReturnTime: string;
  returnTravelMinutes: number;
  returnDistanceKm: number;
  amountSummary: {
    totalUntaxed: number;
    totalTax: number;
    grandTotal: number;
    truckLimit: number;
    capacityPercentage: number;
    isOverLimit: boolean;
  };
}

export interface TruckItem {
  id: string; // "truck-1" ~ "truck-16"
  truckNumber: number; // 1 ~ 16
  truckPlate: string; // e.g. "CEN-5181", "889-HHY"
  driverName: string; // e.g. "謝志隆", "林冠宇"
  driverPhone: string;
  zoneName: string; // e.g. "板橋樹林線", "大安信義旗艦線", "三重新莊線"
  departureTime: string; // "07:30", "08:00"
  truckCapacityLimit: number;
  orders: RawOrder[];
  currentLocation?: {
    lat: number;
    lng: number;
    updatedAt: string;
    areaName?: string;
    speed?: number; // km/h
    heading?: number;
    isAutoTracking?: boolean;
  };
  isSandbox?: boolean; // 主管虛擬沙盒測試車 (不影響真實司機配送)
}

