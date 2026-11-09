import React, { useState, useEffect } from 'react';
import {
  Truck,
  MapPin,
  Clock,
  PlusCircle,
  Settings,
  Send,
  Headphones,
  Navigation,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import type { CompanyConfig, RouteOptimizationResult, TruckItem } from '../types/logistics';

interface NavbarProps {
  currentTab: 'driver' | 'map' | 'dispatch' | 'telegram' | 'settings';
  setCurrentTab: (tab: 'driver' | 'map' | 'dispatch' | 'telegram' | 'settings') => void;
  config: CompanyConfig;
  routeResult: RouteOptimizationResult;
  trucks?: TruckItem[];
  activeTruckId?: string;
  onSelectTruck?: (truckId: string) => void;
  onOpenAddModal: () => void;
  onOpenSettingsModal: () => void;
  driverLocation?: {
    lat: number;
    lng: number;
    updatedAt: string;
    areaName?: string;
    speed?: number;
    isAutoTracking?: boolean;
  };
  onUpdateDriverLocation?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  config,
  routeResult,
  trucks,
  activeTruckId,
  onSelectTruck,
  onOpenAddModal,
  onOpenSettingsModal,
  driverLocation,
  onUpdateDriverLocation,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('zh-TW', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const totalStops = routeResult?.stops?.length || 0;
  const deliveredCount = (routeResult?.stops || []).filter(s => s && s.status === 'delivered').length;
  const progressPct = totalStops > 0 ? Math.round((deliveredCount / totalStops) * 100) : 0;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md text-slate-900 shadow-xs border-b border-slate-200">
      {/* Top utility bar - Soft Eye-Friendly Light Gray */}
      <div className="bg-slate-100/90 px-4 py-1.5 text-xs border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-slate-600">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="font-bold text-slate-800">總公司：</span>
            <span className="truncate max-w-[240px] sm:max-w-none text-slate-600">{config.address}</span>
          </span>
          <button
            onClick={onOpenSettingsModal}
            className="text-rose-700 hover:text-rose-900 underline font-bold cursor-pointer"
          >
            [可隨時更改地址]
          </button>
        </div>

        <div className="flex items-center gap-4 text-slate-600">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>即時時間：</span>
            <span className="font-mono font-bold text-slate-900">{timeStr}</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs text-slate-700">
            <span>出發：</span>
            <strong className="text-slate-900 font-mono">{config.departureTime}</strong>
            <span className="text-slate-300">→</span>
            <span>預計回公司：</span>
            <strong className="text-amber-700 font-mono font-bold">{routeResult.estimatedReturnTime}</strong>
          </span>
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-700 text-white flex items-center justify-center shadow-xs shrink-0">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                禾禾園物流
                <span className="text-xs bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md font-bold">
                  智慧排單系統
                </span>
              </h1>
            </div>
            <div className="text-xs text-slate-600 flex items-center gap-2 mt-0.5">
              <span>司機：<strong className="text-slate-900 font-bold">{config.driverName}</strong> ({config.truckPlate})</span>
              <span className="text-slate-300">•</span>
              <span className="hidden md:inline text-slate-500 font-medium">{config.tripName}</span>
            </div>
          </div>
        </div>

        {/* Quick Driver Stats & Action buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Truck Selector */}
          {trucks && trucks.length > 0 && onSelectTruck && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1 text-xs shadow-2xs">
              <Truck className="w-3.5 h-3.5 text-rose-700 shrink-0" />
              <span className="text-slate-500 font-bold hidden md:inline">車輛切換:</span>
              <select
                value={activeTruckId}
                onChange={e => onSelectTruck(e.target.value)}
                className="bg-white text-slate-800 font-bold text-xs py-1 px-2 rounded-lg outline-none border border-slate-200 cursor-pointer shadow-2xs"
                title="切換當前司機車次"
              >
                {trucks.map(t => (
                  <option key={t.id} value={t.id} className="bg-white text-slate-900">
                    {t.zoneName} - {t.driverName} ({t.truckPlate})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Automatic Real-Time Continuous GPS Tracking Pill */}
          <div className="flex items-center gap-1.5 bg-rose-50/80 border border-rose-200/80 px-2.5 py-1.5 rounded-xl text-xs shadow-2xs text-rose-950 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] hidden sm:inline">
                {driverLocation
                  ? `自動追蹤：${driverLocation.areaName || '已連線'} (${driverLocation.updatedAt})`
                  : 'GPS 自動持續追蹤中'}
              </span>
              <span className="text-[11px] sm:hidden">
                {driverLocation ? `${driverLocation.updatedAt}` : '追蹤中'}
              </span>
              {onUpdateDriverLocation && (
                <button
                  onClick={onUpdateDriverLocation}
                  className="text-rose-700 hover:text-rose-900 underline text-[10px] ml-1 cursor-pointer font-normal"
                  title="手機自動持續回報中，點此可強制更新定位"
                >
                  刷新
                </button>
              )}
            </div>
          </div>

          {/* Progress pill */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <div className="text-right">
              <div className="text-slate-400 text-[10px]">送貨進度</div>
              <div className="font-bold text-slate-800">
                {deliveredCount}/{totalStops} 站 ({progressPct}%)
              </div>
            </div>
            <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-600 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Add Order Button (Primary Camera/Voice/Text) */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-bold px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95 text-xs sm:text-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>拍照/語音加單</span>
          </button>

          {/* Settings button */}
          <button
            onClick={onOpenSettingsModal}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
            title="系統設定"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs bar - Clean soft light tab navigation with Enterprise Rose/Crimson Active State */}
      <div className="max-w-7xl mx-auto px-4 flex gap-1 sm:gap-2 overflow-x-auto scrollbar-none border-t border-slate-200 bg-slate-50/70 pt-1">
        <button
          onClick={() => setCurrentTab('driver')}
          className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-bold rounded-t-xl transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            currentTab === 'driver'
              ? 'bg-white text-rose-800 border-rose-600 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>司機送貨排單 ({totalStops}站)</span>
        </button>

        <button
          onClick={() => setCurrentTab('map')}
          className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-bold rounded-t-xl transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            currentTab === 'map'
              ? 'bg-white text-rose-800 border-rose-600 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>Google 地圖路線與路況</span>
        </button>

        <button
          onClick={() => setCurrentTab('dispatch')}
          className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-bold rounded-t-xl transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            currentTab === 'dispatch'
              ? 'bg-white text-rose-800 border-rose-600 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
          }`}
        >
          <Headphones className="w-4 h-4" />
          <span>後勤調度與客服查單</span>
        </button>

        <button
          onClick={() => setCurrentTab('telegram')}
          className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-bold rounded-t-xl transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            currentTab === 'telegram'
              ? 'bg-white text-rose-800 border-rose-600 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Telegram 群組推播</span>
        </button>
      </div>
    </header>
  );
};
