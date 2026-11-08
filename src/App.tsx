import React, { useState, useMemo, useEffect } from 'react';
import type { CompanyConfig, RawOrder, DeliveryStop, RouteOptimizationResult, TruckItem } from './types/logistics';
import {
  INITIAL_COMPANY_CONFIG,
  SAMPLE_ORDERS,
  INITIAL_16_TRUCKS,
  DEMO_PRESET_ORDERS,
  generateRealisticDemoOrders,
} from './utils/sampleData';
import { groupOrdersIntoStops } from './utils/grouping';
import { optimizeRoute, calculateSchedule } from './utils/optimizer';
import { Navbar } from './components/Navbar';
import { RouteSummaryCard } from './components/RouteSummaryCard';
import { StopsList } from './components/StopsList';
import { InteractiveMap } from './components/InteractiveMap';
import { AddOrderModal } from './components/AddOrderModal';
import { CompanySettingsModal } from './components/CompanySettingsModal';
import { TelegramModal } from './components/TelegramModal';
import { LogisticsDispatchView } from './components/LogisticsDispatchView';
import { EditStopModal } from './components/EditStopModal';
import { AddTruckModal } from './components/AddTruckModal';
import { FleetOperationsOverview } from './components/FleetOperationsOverview';
import { ProofOfDeliveryModal } from './components/ProofOfDeliveryModal';
import type { ProofOfDeliveryRecord } from './types/logistics';
import { geocodeAddress, reverseGeocodeToArea } from './utils/geo';
import { exportLogisticsToExcel } from './utils/excelExport';
import {
  saveDailySnapshot,
  loadSnapshotByDate,
  getFormattedDate,
  separateUnfinishedOrders,
} from './utils/historyArchive';

const STORAGE_CLEAN_KEY = 'hhy_logistics_v2.5_custom_fleet';

const DEFAULT_BLANK_TRUCK: TruckItem = {
  id: 'truck-1',
  truckNumber: 1,
  truckPlate: '點擊設定車牌',
  driverName: '自訂司機姓名',
  driverPhone: '0900-000-000',
  zoneName: '1號車 (待設定路線)',
  departureTime: '08:00',
  truckCapacityLimit: 120000,
  orders: [],
};

export default function App() {
  // 16-Truck fleet state (persisted to localStorage, starting from 0)
  const [trucks, setTrucks] = useState<TruckItem[]>(() => {
    try {
      const isCleaned = localStorage.getItem(STORAGE_CLEAN_KEY);
      if (!isCleaned) {
        // Migration to clean custom fleet: wipe old demo trucks and start fresh
        localStorage.removeItem('hhy_logistics_orders');
        localStorage.removeItem('hhy_logistics_trucks');
        localStorage.setItem(STORAGE_CLEAN_KEY, 'true');
        return INITIAL_16_TRUCKS;
      }

      const saved = localStorage.getItem('hhy_logistics_trucks');
      if (saved) {
        const parsed: TruckItem[] = JSON.parse(saved);
        if (parsed.length > 0) {
          return parsed.map(t => {
            const isSb = !!t.isSandbox || t.truckPlate === 'TEST-8888';
            return {
              ...t,
              isSandbox: isSb,
              truckCapacityLimit: isSb ? 99999999 : t.truckCapacityLimit,
              orders: (t.orders || []).filter(o => !o.id.startsWith('demo-') && !o.id.startsWith('ord-0')),
            };
          });
        }
      }
      return INITIAL_16_TRUCKS;
    } catch {
      return INITIAL_16_TRUCKS;
    }
  });

  const [activeTruckId, setActiveTruckId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('hhy_logistics_active_truck');
      return saved || 'truck-1';
    } catch {
      return 'truck-1';
    }
  });

  // Current active truck
  const currentTruck = useMemo(() => {
    return trucks.find(t => t.id === activeTruckId) || trucks[0] || DEFAULT_BLANK_TRUCK;
  }, [trucks, activeTruckId]);

  // Config state (persisted to localStorage)
  const [config, setConfig] = useState<CompanyConfig>(() => {
    try {
      const saved = localStorage.getItem('hhy_logistics_config');
      if (saved) return JSON.parse(saved);
      const first = INITIAL_16_TRUCKS[0];
      return {
        ...INITIAL_COMPANY_CONFIG,
        driverName: first.driverName,
        driverPhone: first.driverPhone,
        truckPlate: first.truckPlate,
        tripName: first.zoneName,
        departureTime: first.departureTime,
        truckCapacityLimit: first.truckCapacityLimit,
      };
    } catch {
      return INITIAL_COMPANY_CONFIG;
    }
  });

  // Raw Orders state for active truck (starts from 0, purging legacy dummy orders)
  const [orders, setOrders] = useState<RawOrder[]>(() => {
    const truckOrders = currentTruck.orders || [];
    return truckOrders.filter(o => !o.id.startsWith('demo-') && !o.id.startsWith('ord-0'));
  });

  // Save trucks and active truck to LocalStorage and 14-day history archive
  useEffect(() => {
    try {
      localStorage.setItem('hhy_logistics_trucks', JSON.stringify(trucks));
      // Auto-save to 14-day daily archive
      saveDailySnapshot(trucks);
    } catch (e) {
      console.warn('LocalStorage save trucks error', e);
    }
  }, [trucks]);

  useEffect(() => {
    try {
      localStorage.setItem('hhy_logistics_active_truck', activeTruckId);
    } catch (e) {
      console.warn('LocalStorage save activeTruckId error', e);
    }
  }, [activeTruckId]);

  // Sync orders back to active truck in trucks array
  useEffect(() => {
    setTrucks(prev =>
      prev.map(t => (t.id === activeTruckId ? { ...t, orders } : t))
    );
  }, [orders, activeTruckId]);

  // UI Navigation states
  const [currentTab, setCurrentTab] = useState<'driver' | 'map' | 'dispatch' | 'telegram' | 'settings'>('driver');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isAddTruckModalOpen, setIsAddTruckModalOpen] = useState(false);
  const [isAutoTrackingEnabled, setIsAutoTrackingEnabled] = useState(true);
  const [editingTruckData, setEditingTruckData] = useState<TruckItem | null>(null);
  const [editingStop, setEditingStop] = useState<DeliveryStop | null>(null);
  const [podModalStop, setPodModalStop] = useState<DeliveryStop | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manual ordering override (if driver manually rearranged stops)
  const [manualStopOrder, setManualStopOrder] = useState<string[] | null>(null);

  // Continuous Automatic Real-Time GPS Tracking Effect (Follows navigation & driving automatically)
  useEffect(() => {
    if (!isAutoTrackingEnabled || !navigator.geolocation) return;

    let watchId: number | null = null;
    let wakeLock: any = null;

    // 1. Request Screen Wake Lock so phone doesn't sleep while driving
    if ('wakeLock' in navigator) {
      try {
        (navigator as any).wakeLock.request('screen').then((lock: any) => {
          wakeLock = lock;
        }).catch(() => {});
      } catch (e) {
        // ignore
      }
    }

    const updateLocationFromCoords = (coords: GeolocationCoordinates) => {
      const { latitude, longitude, speed } = coords;
      const nowTime = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
      const areaName = reverseGeocodeToArea(latitude, longitude);

      const locationData = {
        lat: latitude,
        lng: longitude,
        updatedAt: nowTime,
        areaName,
        speed: speed && speed > 0 ? Math.round(speed * 3.6) : 0,
        isAutoTracking: true,
      };

      setTrucks(prev =>
        prev.map(t => (t.id === activeTruckId ? { ...t, currentLocation: locationData } : t))
      );
    };

    // 2. Start continuous GPS tracking via watchPosition
    try {
      watchId = navigator.geolocation.watchPosition(
        pos => {
          updateLocationFromCoords(pos.coords);
        },
        err => {
          console.warn('Auto GPS tracking warning:', err.message);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 20000,
        }
      );
    } catch (e) {
      console.warn('Geolocation watchPosition failed:', e);
    }

    // 3. Heartbeat check every 25 seconds to guarantee fresh timestamp even if stationary at red light or dock
    const heartbeatTimer = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        pos => updateLocationFromCoords(pos.coords),
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
      );
    }, 25000);

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearInterval(heartbeatTimer);
      if (wakeLock && wakeLock.release) wakeLock.release().catch(() => {});
    };
  }, [isAutoTrackingEnabled, activeTruckId]);

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('hhy_logistics_config', JSON.stringify(config));
    } catch (e) {
      console.warn('LocalStorage save config error', e);
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem('hhy_logistics_orders', JSON.stringify(orders));
    } catch (e) {
      console.warn('LocalStorage save orders error', e);
    }
  }, [orders]);

  // Compute Stops and Route
  const routeResult: RouteOptimizationResult = useMemo(() => {
    // 1. Group raw orders into stops (merging same customer multi-kitchens, separating same mall different clients)
    const groupedStops = groupOrdersIntoStops(orders, config.defaultUnloadMinutes);

    if (groupedStops.length === 0) {
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

    // 2. If manual ordering exists, preserve it; otherwise run full TSP optimization
    if (manualStopOrder && manualStopOrder.length === groupedStops.length) {
      const ordered: DeliveryStop[] = [];
      const stopMap = new Map(groupedStops.map(s => [s.id, s]));
      manualStopOrder.forEach(id => {
        if (stopMap.has(id)) {
          ordered.push(stopMap.get(id)!);
        }
      });
      // Fallback in case of missing items
      groupedStops.forEach(s => {
        if (!ordered.some(o => o.id === s.id)) ordered.push(s);
      });
      return calculateSchedule(ordered, config);
    }

    return optimizeRoute(groupedStops, config);
  }, [orders, config, manualStopOrder]);

  // Handler: Add new order
  const handleAddOrder = (newOrder: RawOrder) => {
    setOrders(prev => [newOrder, ...prev]);
    setManualStopOrder(null); // Reset manual order so new order is optimally inserted
  };

  // Handler: Update store settings & time constraint with immediate route recalculation
  const handleSaveStop = (
    stopId: string,
    updatedData: {
      storeName: string;
      address: string;
      floor: string;
      timeConstraint: string;
      unloadDuration: number;
      notes: string;
      untaxedAmount: number;
      taxAmount: number;
      totalAmount: number;
    }
  ) => {
    const targetStop = routeResult.stops.find(s => s.id === stopId);
    if (!targetStop) return;

    const subOrderIds = new Set(targetStop.subOrders.map(sub => sub.id));
    const geo = geocodeAddress(updatedData.address);

    setOrders(prev =>
      prev.map(o => {
        if (subOrderIds.has(o.id)) {
          return {
            ...o,
            storeName: updatedData.storeName,
            address: updatedData.address,
            floor: updatedData.floor,
            timeConstraint: updatedData.timeConstraint,
            unloadDuration: updatedData.unloadDuration,
            notes: updatedData.notes,
            untaxedAmount: subOrderIds.size === 1 ? updatedData.untaxedAmount : o.untaxedAmount,
            taxAmount: subOrderIds.size === 1 ? updatedData.taxAmount : o.taxAmount,
            totalAmount: subOrderIds.size === 1 ? updatedData.totalAmount : o.totalAmount,
            directionArea: geo.area,
            lat: geo.lat,
            lng: geo.lng,
          };
        }
        return o;
      })
    );

    // Clear manual ordering override so route optimizer immediately reprioritizes the route by the new time constraint!
    setManualStopOrder(null);

    setToastMessage(
      `🎉 已成功更新「${updatedData.storeName}」設定！時間限制改為【${updatedData.timeConstraint}】，系統已即時重新排定最完美路線！`
    );
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Handler: Toggle delivery status of a stop
  const handleToggleStatus = (stopId: string, newStatus: 'pending' | 'in_transit' | 'delivered') => {
    const targetStop = routeResult.stops.find(s => s.id === stopId);
    if (!targetStop) return;

    const subOrderIds = new Set(targetStop.subOrders.map(sub => sub.id));
    const nowTimeStr = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });

    setOrders(prev =>
      prev.map(o => {
        if (subOrderIds.has(o.id)) {
          return {
            ...o,
            status: newStatus,
            deliveredAt: newStatus === 'delivered' ? nowTimeStr : undefined,
          };
        }
        return o;
      })
    );
  };

  // Handler: Confirm Proof of Delivery (Cross-checking slip count, signature verification, issue reporting)
  const handleConfirmPOD = (stopId: string, podRecord: ProofOfDeliveryRecord) => {
    const targetStop = routeResult.stops.find(s => s.id === stopId);
    if (!targetStop) return;

    const subOrderIds = new Set(targetStop.subOrders.map(sub => sub.id));
    const nowTimeStr = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });

    setOrders(prev =>
      prev.map(o => {
        if (subOrderIds.has(o.id)) {
          return {
            ...o,
            status: 'delivered' as const,
            deliveredAt: nowTimeStr,
            proofOfDelivery: podRecord,
            totalAmount: podRecord.hasIssue ? podRecord.actualAmount : o.totalAmount,
            notes: podRecord.hasIssue && podRecord.issueNotes ? `${o.notes ? o.notes + ' | ' : ''}⚠️ ${podRecord.issueTypeName}: ${podRecord.issueNotes}` : o.notes,
          };
        }
        return o;
      })
    );

    const message = podRecord.hasIssue
      ? `🚨 已完成【${targetStop.storeName}】送達並通報異常！實收 NT$ ${podRecord.actualAmount.toLocaleString()}${podRecord.telegramPushed ? '（已推播至 Telegram 物流群）' : ''}`
      : `✅ 已完成【${targetStop.storeName}】送達核銷！單據 ${podRecord.actualSlipCount} 張核對齊全，存證已備份！${podRecord.telegramPushed ? '（已推播至 Telegram 物流群）' : ''}`;

    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Handler: Move stop manually (Requirement 8: 隨時可以更改送貨路線客人調整方式)
  const handleMoveStop = (fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= routeResult.stops.length || toIndex >= routeResult.stops.length) {
      return;
    }
    const currentList = [...routeResult.stops];
    const [moved] = currentList.splice(fromIndex, 1);
    currentList.splice(toIndex, 0, moved);

    setManualStopOrder(currentList.map(s => s.id));
  };

  // Handler: Delete stop
  const handleDeleteStop = (stopId: string) => {
    const targetStop = routeResult.stops.find(s => s.id === stopId);
    if (!targetStop) return;
    if (!window.confirm(`確定要刪除「${targetStop.storeName}」此送貨點嗎？`)) return;

    const subOrderIds = new Set(targetStop.subOrders.map(sub => sub.id));
    setOrders(prev => prev.filter(o => !subOrderIds.has(o.id)));
    setManualStopOrder(null);
  };

  // Handler: Update traffic condition
  const handleUpdateTrafficCondition = (cond: 'normal' | 'rush_hour' | 'rainy' | 'heavy_traffic') => {
    const factors = {
      normal: 1.0,
      rush_hour: 1.25,
      rainy: 1.15,
      heavy_traffic: 1.4,
    };
    setConfig(prev => ({
      ...prev,
      trafficCondition: cond,
      trafficFactor: factors[cond],
    }));
  };

  // Handler: Clear daily orders (Start Fresh from 0 every day)
  const handleClearDailyOrders = () => {
    if (window.confirm('確定要清空當前車輛今日所有排單，開啟全新的一天（從零開始）嗎？')) {
      setOrders([]);
      setTrucks(prev =>
        prev.map(t => (t.id === activeTruckId ? { ...t, orders: [] } : t))
      );
      setManualStopOrder(null);
      setToastMessage('🌅 今日排單已全部清空，歡迎司機開始拍照上傳出貨單！');
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Handler: Optional Load Demo Orders for testing
  const handleLoadDemoOrders = () => {
    setOrders(DEMO_PRESET_ORDERS);
    setManualStopOrder(null);
    setToastMessage('🧪 已載入 6 筆測試示範單據！您可以點選「🌅 清空今日排單」隨時清空還原至 0。');
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Handler: 1-Click Mobile GPS Check-in
  const handleUpdateDriverLocation = () => {
    if (!navigator.geolocation) {
      alert('您的裝置或瀏覽器不支援 GPS 定位功能');
      return;
    }

    setToastMessage('🛰️ 正在讀取手機高精準 GPS 定位中...');

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        const nowTime = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
        const areaName = reverseGeocodeToArea(latitude, longitude);

        const locationData = {
          lat: latitude,
          lng: longitude,
          updatedAt: nowTime,
          areaName,
        };

        setTrucks(prev =>
          prev.map(t => (t.id === activeTruckId ? { ...t, currentLocation: locationData } : t))
        );

        setToastMessage(`📍 司機 GPS 回報成功！【${areaName}】(${nowTime})，後勤人員已同步掌握您的即時方位！`);
        setTimeout(() => setToastMessage(null), 5000);
      },
      err => {
        console.warn('Geolocation warning, using simulation fallback:', err);
        // Fallback for desktop testing or when location permission is prompt
        const defaultArea = '新北市三重區 (正義北路周邊)';
        const nowTime = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
        const locationData = {
          lat: 25.0682,
          lng: 121.4965,
          updatedAt: nowTime,
          areaName: defaultArea,
        };

        setTrucks(prev =>
          prev.map(t => (t.id === activeTruckId ? { ...t, currentLocation: locationData } : t))
        );

        setToastMessage(`📍 已回報司機位置：【${defaultArea}】(${nowTime})，後勤已可同步查看！(手機建議允許位置存取以取得最佳精準度)`);
        setTimeout(() => setToastMessage(null), 5000);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  // Handler: Clear all trucks and let user build custom fleet from scratch
  const handleClearAllTrucks = () => {
    if (window.confirm('確定要清空所有預設車輛設定，重新建立您禾禾園實際的車隊嗎？')) {
      const blankTruck: TruckItem = {
        id: 'truck-1',
        truckNumber: 1,
        truckPlate: '請點此設定車牌',
        driverName: '請輸入司機姓名',
        driverPhone: '0900-000-000',
        zoneName: '1號車 (待設定路線)',
        departureTime: '08:00',
        truckCapacityLimit: 120000,
        orders: [],
      };
      setTrucks([blankTruck]);
      setActiveTruckId('truck-1');
      setOrders([]);
      setConfig(prev => ({
        ...prev,
        driverName: blankTruck.driverName,
        driverPhone: blankTruck.driverPhone,
        truckPlate: blankTruck.truckPlate,
        tripName: blankTruck.zoneName,
        departureTime: blankTruck.departureTime,
      }));
      setEditingTruckData(blankTruck);
      setIsAddTruckModalOpen(true);
      setToastMessage('🗑️ 已清空預設車輛名冊！請直接設定您的第 1 台真實車輛。');
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Handler: Export Logistics Data to Excel (UTF-8 BOM CSV) for Accounting
  const handleExportExcel = (scope: 'current' | 'all', dateOption: string = 'today') => {
    let targetTrucks = scope === 'current' ? [currentTruck] : trucks;
    let exportDateLabel = getFormattedDate();

    if (dateOption === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getFormattedDate(yesterday);
      exportDateLabel = `${yesterdayStr} (昨日)`;
      const snap = loadSnapshotByDate(yesterdayStr);
      if (snap && snap.trucks && snap.trucks.length > 0) {
        targetTrucks = scope === 'current'
          ? (snap.trucks.find(t => t.id === currentTruck.id) ? [snap.trucks.find(t => t.id === currentTruck.id)!] : [snap.trucks[0]])
          : snap.trucks;
      }
    } else if (dateOption === 'holiday_3days') {
      exportDateLabel = `連假3天合併對帳表_${getFormattedDate()}`;
    } else if (dateOption === 'week_7days') {
      exportDateLabel = `最近7天歷史總庫_${getFormattedDate()}`;
    }

    const totalOrdersCount = targetTrucks.reduce((acc, t) => acc + (t.orders?.length || 0), 0);
    if (totalOrdersCount === 0) {
      alert(`所選期間【${exportDateLabel}】尚未有任何訂單記錄！`);
      return;
    }

    exportLogisticsToExcel(config, targetTrucks, scope, { dateLabel: exportDateLabel });
    setToastMessage(
      `📊 已成功匯出【${scope === 'current' ? currentTruck.zoneName : '全車隊'}】${exportDateLabel} 會計專用 Excel 報表！(包含每張單據流水號、未稅、稅額與總額)`
    );
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Handler: Manage Unfinished Orders (解決痛點 1: 司機未送完帶回，避免重複或手動逐筆刪除)
  const handleRolloverUnfinishedOrders = () => {
    const allUnfinished: { truck: TruckItem; order: RawOrder }[] = [];
    trucks.forEach(t => {
      (t.orders || []).forEach(o => {
        if (o.status !== 'delivered') {
          allUnfinished.push({ truck: t, order: o });
        }
      });
    });

    if (allUnfinished.length === 0) {
      setToastMessage('🎉 今日全車隊所有訂單均已順利簽收送達！沒有未送完訂單需處理。');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    const confirmChoice = window.confirm(
      `【未完成訂單智能處理】\n目前全車隊共有 ${allUnfinished.length} 筆未完成送達訂單！\n\n` +
      `• 點選【確定】：自動「保留並轉派至明天新車趟」\n  (司機明天一開工直接接續配送，原單據號、照片、金額全數保留，完全免手動刪除或重拍！)\n\n` +
      `• 點選【取消】：將這 ${allUnfinished.length} 筆訂單標記為「未送達帶回退件」\n  (清楚留存帶回記錄，不計入今日請款業績)`
    );

    if (confirmChoice) {
      setTrucks(prev =>
        prev.map(t => {
          const unfinishedOrders = (t.orders || []).filter(o => o.status !== 'delivered').map(o => ({
            ...o,
            status: 'pending' as const,
            notes: (o.notes ? o.notes + ' ' : '') + `[昨日未送完順延]`,
          }));
          return {
            ...t,
            orders: unfinishedOrders,
          };
        })
      );
      setToastMessage(`🚚 成功將 ${allUnfinished.length} 筆未送完訂單順延至明天新車趟！已自動清空昨日已送達單據。`);
      setTimeout(() => setToastMessage(null), 5000);
    } else {
      setTrucks(prev =>
        prev.map(t => ({
          ...t,
          orders: (t.orders || []).map(o =>
            o.status !== 'delivered'
              ? { ...o, status: 'issue' as const, notes: (o.notes ? o.notes + ' ' : '') + `[司機當日帶回退件]` }
              : o
          ),
        }))
      );
      setToastMessage(`📦 已將 ${allUnfinished.length} 筆未完成訂單標記為「當日帶回退件」，不計入今日請款金額。`);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  // Handler: Create Supervisor Virtual Sandbox Truck for testing (Uncapped Store Count)
  const handleCreateSandboxTruck = () => {
    const demoOrders = generateRealisticDemoOrders(15);
    const sandboxTruck: TruckItem = {
      id: 'truck-sandbox-' + Date.now(),
      truckNumber: trucks.length + 1,
      truckPlate: 'TEST-8888',
      driverName: '主管排單模擬測試',
      driverPhone: '0900-999-999',
      zoneName: '🧪 主管沙盒測試車',
      departureTime: '08:00',
      truckCapacityLimit: 9999999, // Uncapped capacity limit for testing
      isSandbox: true,
      orders: demoOrders,
    };
    setTrucks(prev => [...prev, sandboxTruck]);
    handleSelectTruck(sandboxTruck.id);
    setToastMessage('🧪 主管沙盒測試車已建立！已開放【無限制店家數量排單】，已預載 15 家門市測試單據！');
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Handler: Batch Add Orders in Sandbox Mode (Uncapped stores)
  const handleBatchAddSandboxOrders = (count: number) => {
    const newDemoOrders = generateRealisticDemoOrders(count);
    setOrders(prev => [...prev, ...newDemoOrders]);
    setManualStopOrder(null);
    setToastMessage(
      `🎉 主管沙盒測試：已成功批量新增 ${count} 家測試門市！總配送站點達 ${orders.length + count} 家，系統已自動排定最完美路線！`
    );
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Handler: Force Re-optimize
  const handleReOptimize = () => {
    setManualStopOrder(null); // Clear manual ordering so TSP runs freshly
  };

  // Handler: Update Telegram Bot settings
  const handleUpdateTelegramConfig = (botToken: string, chatId: string) => {
    setConfig(prev => ({
      ...prev,
      telegramConfig: {
        ...prev.telegramConfig,
        botToken,
        chatId,
      },
    }));
  };

  // Handler: Switch between 16 trucks
  const handleSelectTruck = (truckId: string) => {
    const chosen = trucks.find(t => t.id === truckId);
    if (!chosen) return;

    setActiveTruckId(truckId);
    setOrders(chosen.orders.length > 0 ? chosen.orders : []);
    setConfig(prev => ({
      ...prev,
      driverName: chosen.driverName,
      driverPhone: chosen.driverPhone,
      truckPlate: chosen.truckPlate,
      tripName: chosen.zoneName,
      departureTime: chosen.departureTime,
      truckCapacityLimit: chosen.truckCapacityLimit,
    }));
    setManualStopOrder(null);
    setToastMessage(`🚚 已切換至【${chosen.zoneName}】司機：${chosen.driverName} (${chosen.truckPlate})`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handler: Add a new truck to fleet
  const handleAddTruck = (newTruck: TruckItem) => {
    setTrucks(prev => [...prev, newTruck]);
    handleSelectTruck(newTruck.id);
    setToastMessage(`🎉 成功新增【${newTruck.zoneName}】！車牌：${newTruck.truckPlate}，車隊總數達 ${trucks.length + 1} 台。`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Handler: Update truck details
  const handleUpdateTruck = (updatedTruck: TruckItem) => {
    setTrucks(prev => prev.map(t => (t.id === updatedTruck.id ? updatedTruck : t)));
    if (activeTruckId === updatedTruck.id) {
      setConfig(prev => ({
        ...prev,
        driverName: updatedTruck.driverName,
        driverPhone: updatedTruck.driverPhone,
        truckPlate: updatedTruck.truckPlate,
        tripName: updatedTruck.zoneName,
        departureTime: updatedTruck.departureTime,
        truckCapacityLimit: updatedTruck.truckCapacityLimit,
      }));
    }
    setToastMessage(`✅ 已成功更新【${updatedTruck.zoneName}】車輛與司機資訊！`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handler: Delete truck from fleet
  const handleDeleteTruck = (truckId: string) => {
    const target = trucks.find(t => t.id === truckId);
    if (!target) return;
    if (trucks.length <= 1) {
      alert('車隊至少需保留一台貨車！');
      return;
    }
    if (!window.confirm(`確定要刪除「${target.zoneName} - ${target.driverName} (${target.truckPlate})」此車輛嗎？`)) {
      return;
    }

    const remaining = trucks.filter(t => t.id !== truckId);
    setTrucks(remaining);

    if (activeTruckId === truckId) {
      handleSelectTruck(remaining[0].id);
    }
    setToastMessage(`已刪除「${target.zoneName}」，目前車隊剩餘 ${remaining.length} 台貨車。`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        config={config}
        routeResult={routeResult}
        trucks={trucks}
        activeTruckId={activeTruckId}
        onSelectTruck={handleSelectTruck}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        driverLocation={currentTruck.currentLocation}
        onUpdateDriverLocation={handleUpdateDriverLocation}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5">
        {/* Today's Fleet Operations Overview (D3 Visualization) */}
        <FleetOperationsOverview
          trucks={trucks}
          activeTruckId={activeTruckId}
          onSelectTruck={handleSelectTruck}
          defaultUnloadMinutes={config.defaultUnloadMinutes}
        />

        {/* Route Summary Overview Card */}
        <RouteSummaryCard
          config={config}
          routeResult={routeResult}
          onUpdateTrafficCondition={handleUpdateTrafficCondition}
          onReOptimize={handleReOptimize}
          onClearOrders={handleClearDailyOrders}
          onLoadDemoOrders={handleLoadDemoOrders}
          onExportExcel={() => handleExportExcel('current')}
          isSandbox={currentTruck.isSandbox}
          onBatchAddSandboxOrders={handleBatchAddSandboxOrders}
          onAddSandboxTruck={handleCreateSandboxTruck}
        />

        {/* Tab 1: Driver Stops List */}
        {currentTab === 'driver' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span>司機送貨排單列表</span>
                  <span className="text-xs bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                    {routeResult.stops.length} 站
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  已依時間限制與最短路徑最佳化排序。支援點選「Google 導航」、手動調整順序或簽收送達。
                </p>
              </div>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-rose-700 hover:bg-rose-800 text-white text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl shadow transition cursor-pointer"
              >
                + 拍照/新增送貨點
              </button>
            </div>

            <StopsList
              stops={routeResult.stops}
              onToggleStatus={handleToggleStatus}
              onMoveStop={handleMoveStop}
              onDeleteStop={handleDeleteStop}
              onEditStop={setEditingStop}
              onInstantReOptimize={handleReOptimize}
              companyAddress={config.address}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onLoadDemoOrders={handleLoadDemoOrders}
              driverLocation={currentTruck.currentLocation}
              onUpdateDriverLocation={handleUpdateDriverLocation}
              onOpenPODModal={setPodModalStop}
            />
          </div>
        )}

        {/* Tab 2: Interactive Map & Traffic */}
        {currentTab === 'map' && (
          <div className="space-y-4">
            <InteractiveMap
              config={config}
              routeResult={routeResult}
              driverLocation={currentTruck.currentLocation}
              onUpdateDriverLocation={handleUpdateDriverLocation}
            />
          </div>
        )}

        {/* Tab 3: Dispatch & Customer Service View */}
        {currentTab === 'dispatch' && (
          <div className="space-y-4">
            <LogisticsDispatchView
              config={config}
              routeResult={routeResult}
              trucks={trucks}
              activeTruckId={activeTruckId}
              onSelectTruck={handleSelectTruck}
              onOpenAddTruck={() => {
                setEditingTruckData(null);
                setIsAddTruckModalOpen(true);
              }}
              onEditTruck={t => {
                setEditingTruckData(t);
                setIsAddTruckModalOpen(true);
              }}
              onDeleteTruck={handleDeleteTruck}
              onOpenTelegram={() => setIsTelegramModalOpen(true)}
              onClearAllTrucks={handleClearAllTrucks}
              onExportExcel={(dateOpt) => handleExportExcel('all', dateOpt)}
              onAddSandboxTruck={handleCreateSandboxTruck}
              onRolloverUnfinished={handleRolloverUnfinishedOrders}
            />
          </div>
        )}

        {/* Tab 4: Telegram Push View */}
        {currentTab === 'telegram' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center max-w-xl mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800">Telegram 自動化派單推播中心</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              禾禾園物流系統自動將司機姓名、車牌、出發時間、預估回廠時間、各站明細、未稅與含稅金額總計整合為專業結構化報表，直接推播至後勤同仁 Telegram 群組！
            </p>
            <button
              onClick={() => setIsTelegramModalOpen(true)}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-6 py-2.5 rounded-2xl shadow-md transition active:scale-95 cursor-pointer text-sm"
            >
              開啟 Telegram 派單推播面板
            </button>
          </div>
        )}

        {/* Tab 5: Settings shortcut */}
        {currentTab === 'settings' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm max-w-xl mx-auto space-y-4">
            <h2 className="text-lg font-bold text-slate-800">公司與車趟參數設定</h2>
            <p className="text-xs text-slate-500">
              您可以隨時修改出發地址（預設：新北市樹林區柑園街一段196-13號）、出發時間、每站卸貨耗時及車載金額空間上限。
            </p>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="bg-rose-700 hover:bg-rose-800 text-white font-bold px-6 py-2.5 rounded-2xl shadow-md transition active:scale-95 cursor-pointer text-sm"
            >
              打開完整設定面板
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>禾禾園物流股份有限公司 • 智慧排單與冷鏈配送系統</span>
          <span className="font-mono text-slate-400">
            總公司：{config.address} • 司機：{config.driverName} ({config.truckPlate})
          </span>
        </div>
      </footer>

      {/* Modals */}
      <AddOrderModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddOrder={handleAddOrder}
      />

      <CompanySettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={config}
        onSaveConfig={newCfg => setConfig(newCfg)}
      />

      <TelegramModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        config={config}
        routeResult={routeResult}
        onUpdateTelegramConfig={handleUpdateTelegramConfig}
      />

      <EditStopModal
        isOpen={!!editingStop}
        stop={editingStop}
        onClose={() => setEditingStop(null)}
        onSaveStop={handleSaveStop}
      />

      <ProofOfDeliveryModal
        isOpen={!!podModalStop}
        stop={podModalStop}
        config={config}
        onClose={() => setPodModalStop(null)}
        onConfirmDelivery={handleConfirmPOD}
      />

      <AddTruckModal
        isOpen={isAddTruckModalOpen}
        onClose={() => {
          setIsAddTruckModalOpen(false);
          setEditingTruckData(null);
        }}
        onAddTruck={handleAddTruck}
        onUpdateTruck={handleUpdateTruck}
        editingTruck={editingTruckData}
        currentCount={trucks.length}
      />

      {/* Floating Instant Re-optimization Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[90%] bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl border-2 border-rose-500 backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300 flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="text-rose-400 font-bold shrink-0">⚡</span>
            <span className="font-medium text-slate-100">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white shrink-0 p-1 rounded-lg"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
