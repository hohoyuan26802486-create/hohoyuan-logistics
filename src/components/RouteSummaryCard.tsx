import React from 'react';
import {
  Clock,
  Compass,
  AlertCircle,
  TrendingUp,
  MapPin,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  FileSpreadsheet,
} from 'lucide-react';
import type { CompanyConfig, RouteOptimizationResult } from '../types/logistics';
import { generateGoogleMapsRouteUrl } from '../utils/geo';

interface RouteSummaryCardProps {
  config: CompanyConfig;
  routeResult: RouteOptimizationResult;
  onUpdateTrafficCondition: (cond: 'normal' | 'rush_hour' | 'rainy' | 'heavy_traffic') => void;
  onReOptimize: () => void;
  onClearOrders: () => void;
  onLoadDemoOrders?: () => void;
  onExportExcel?: () => void;
  isSandbox?: boolean;
  onBatchAddSandboxOrders?: (count: number) => void;
  onAddSandboxTruck?: () => void;
}

export const RouteSummaryCard: React.FC<RouteSummaryCardProps> = ({
  config,
  routeResult,
  onUpdateTrafficCondition,
  onReOptimize,
  onClearOrders,
  onLoadDemoOrders,
  onExportExcel,
  isSandbox,
  onBatchAddSandboxOrders,
  onAddSandboxTruck,
}) => {
  const {
    amountSummary = {
      totalUntaxed: 0,
      totalTax: 0,
      grandTotal: 0,
      truckLimit: config?.truckCapacityLimit || 120000,
      capacityPercentage: 0,
      isOverLimit: false,
    },
    totalDistanceKm = 0,
    totalTravelMinutes = 0,
    totalUnloadMinutes = 0,
    estimatedReturnTime = config?.departureTime || '08:00',
    stops = [],
  } = routeResult || {};

  const handleOpenGoogleMapsMultiStop = () => {
    const stopAddresses = stops.map(s => s.address);
    const url = generateGoogleMapsRouteUrl(config.address, stopAddresses, config.address);
    window.open(url, '_blank');
  };

  const trafficLabels = {
    normal: { label: '路況順暢 (1.0x)', desc: '一般平日非尖峰' },
    rush_hour: { label: '尖峰塞車 (1.25x)', desc: '上班/市區晨間尖峰' },
    rainy: { label: '雨天天候 (1.15x)', desc: '降雨視線慢速' },
    heavy_traffic: { label: '嚴重塞車 (1.4x)', desc: '暴雨或大塞車' },
  };

  return (
    <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden mb-6">
      {/* Upper header section - Soft Light Gray/Slate Eye-Friendly Theme with Enterprise Crimson Accents */}
      <div className="bg-gradient-to-r from-slate-50 via-slate-100/90 to-rose-50/40 border-b border-slate-200 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider">
                今日排程
              </span>
              <h2 className="text-base sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                {config.tripName}
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 font-medium">
              <span>司機：<strong className="text-slate-800">{config.driverName}</strong></span>
              <span>•</span>
              <span>車牌：<strong className="text-slate-800">{config.truckPlate}</strong></span>
              <span>•</span>
              <span>總停靠：<strong className="text-rose-700">{stops.length} 站</strong> (共 {stops.reduce((acc, s) => acc + s.subOrders.length, 0)} 筆單據)</span>
            </p>
          </div>

          {/* Quick buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {onExportExcel && stops.length > 0 && (
              <button
                onClick={onExportExcel}
                className="flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs sm:text-sm font-bold px-3 py-2 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                title="匯出此車送貨單據與金額明細 Excel (CSV) 供會計核帳"
              >
                <FileSpreadsheet className="w-4 h-4 text-rose-200" />
                <span>📊 匯出此車會計 Excel 報表</span>
              </button>
            )}

            {/* Supervisor Sandbox Simulation Button */}
            {!isSandbox && onAddSandboxTruck && (
              <button
                type="button"
                onClick={onAddSandboxTruck}
                className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 text-xs sm:text-sm font-bold px-3 py-2 rounded-xl shadow-2xs transition active:scale-95 cursor-pointer"
                title="進入主管模擬測試沙盒，開放無限制店家數量排單"
              >
                <span>🧪 主管模擬測試 (無限制店家)</span>
              </button>
            )}

            <button
              onClick={handleOpenGoogleMapsMultiStop}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-3 py-2 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              title="使用 Google 地圖開啟全趟最佳順序多站導航"
            >
              <ExternalLink className="w-4 h-4" />
              <span>一鍵整趟 Google 地圖導航</span>
            </button>

            <button
              onClick={onReOptimize}
              className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs sm:text-sm font-bold px-3 py-2 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              title="自動依時間限制與最短路徑重排"
            >
              <Sparkles className="w-4 h-4" />
              <span>重新最佳化</span>
            </button>
          </div>
        </div>

        {/* Departure & Arrival Schedule banner - Relaxing light card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <Clock className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">總公司出發時間</div>
              <div className="text-sm sm:text-base font-bold text-slate-900 font-mono">
                {config.departureTime}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <Compass className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-[11px] text-amber-800 font-medium">預計回到公司</div>
              <div className="text-sm sm:text-base font-bold text-amber-800 font-mono">
                {estimatedReturnTime}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <TrendingUp className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">行車 / 下貨耗時</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800">
                車程 {totalTravelMinutes}分 / 卸貨 {totalUnloadMinutes}分
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <MapPin className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">全趟估計里程</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800">
                約 {totalDistanceKm} 公里
              </div>
            </div>
          </div>
        </div>

        {/* Supervisor Sandbox Controls: Uncapped Store Count Testing */}
        {isSandbox && (
          <div className="mt-3.5 pt-3 border-t border-purple-200/80 bg-purple-50/70 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-3 sm:px-5 flex flex-wrap items-center justify-between gap-2.5 rounded-b-2xl">
            <div className="flex items-center gap-2">
              <span className="bg-purple-700 text-white font-extrabold text-[11px] px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-2xs">
                <span>🧪 主管沙盒排單模式</span>
              </span>
              <span className="text-xs text-purple-950 font-bold">
                已全面開放【無限制店家數量排單】（目前已排 {stops.length} 家門市）
              </span>
            </div>
            {onBatchAddSandboxOrders && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-600 font-medium hidden sm:inline">一鍵批量生成：</span>
                <button
                  type="button"
                  onClick={() => onBatchAddSandboxOrders(5)}
                  className="bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 font-bold px-2.5 py-1 rounded-lg transition active:scale-95 cursor-pointer text-xs"
                >
                  +5 家門市
                </button>
                <button
                  type="button"
                  onClick={() => onBatchAddSandboxOrders(10)}
                  className="bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 font-bold px-2.5 py-1 rounded-lg transition active:scale-95 cursor-pointer text-xs"
                >
                  +10 家門市
                </button>
                <button
                  type="button"
                  onClick={() => onBatchAddSandboxOrders(15)}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-bold px-3 py-1 rounded-lg shadow-xs transition active:scale-95 cursor-pointer text-xs"
                >
                  排 15 家標準路線
                </button>
                <button
                  type="button"
                  onClick={() => onBatchAddSandboxOrders(25)}
                  className="bg-purple-800 hover:bg-purple-900 text-white font-bold px-3 py-1 rounded-lg shadow-xs transition active:scale-95 cursor-pointer text-xs"
                >
                  排 25 家高密度排單
                </button>
                <button
                  type="button"
                  onClick={() => onBatchAddSandboxOrders(50)}
                  className="bg-purple-950 hover:bg-black text-white font-bold px-3 py-1 rounded-lg shadow-xs transition active:scale-95 cursor-pointer text-xs"
                >
                  +50 家極限排單
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Middle Financial Summary & Truck Load Limit */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Amount Breakdown (3 cards) */}
          <div className="md:col-span-7 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] text-slate-500 font-medium">未稅總金額 (NT$)</div>
              <div className="text-sm sm:text-lg font-bold text-slate-800 font-mono mt-0.5">
                ${amountSummary.totalUntaxed.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">所有訂單未稅加總</div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] text-slate-500 font-medium">應稅金額 5% (NT$)</div>
              <div className="text-sm sm:text-lg font-bold text-slate-700 font-mono mt-0.5">
                ${amountSummary.totalTax.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">營業稅額合計</div>
            </div>

            <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 shadow-2xs">
              <div className="text-[11px] text-rose-800 font-bold">含稅總計 (NT$)</div>
              <div className="text-sm sm:text-lg font-extrabold text-rose-700 font-mono mt-0.5">
                ${amountSummary.grandTotal.toLocaleString()}
              </div>
              <div className="text-[10px] text-rose-600 mt-0.5">本趟應收/貨物總值</div>
            </div>
          </div>

          {/* Truck Capacity Limit Meter */}
          <div className="md:col-span-5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                <span>貨車載貨金額空間上限</span>
              </span>
              <span className="font-mono text-slate-500">
                {isSandbox ? '沙盒測試模式：金額與家數無上限' : `限額 NT$ ${config.truckCapacityLimit.toLocaleString()}`}
              </span>
            </div>

            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 relative">
              <div
                className={`h-full transition-all duration-500 ${
                  isSandbox
                    ? 'bg-purple-500'
                    : amountSummary.isOverLimit
                    ? 'bg-rose-600'
                    : amountSummary.capacityPercentage > 85
                    ? 'bg-amber-500'
                    : 'bg-rose-700'
                }`}
                style={{ width: `${isSandbox ? Math.min(100, Math.round((amountSummary.grandTotal / 500000) * 100)) : Math.min(100, amountSummary.capacityPercentage)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs mt-1.5">
              <span className="text-slate-500 text-[11px]">
                目前狀態：
                <strong
                  className={`font-mono ${
                    isSandbox ? 'text-purple-700' : amountSummary.isOverLimit ? 'text-rose-600' : 'text-slate-800'
                  }`}
                >
                  {isSandbox ? `已排 ${stops.length} 站 / 總金額 $${amountSummary.grandTotal.toLocaleString()}` : `${amountSummary.capacityPercentage}%`}
                </strong>
              </span>

              {isSandbox ? (
                <span className="text-purple-700 font-bold text-[11px] flex items-center gap-1">
                  <span>✨ 自由測試排單無上限</span>
                </span>
              ) : amountSummary.isOverLimit ? (
                <span className="text-rose-600 font-bold text-[11px] flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>超出貨車金額上限 NT$ {(amountSummary.grandTotal - config.truckCapacityLimit).toLocaleString()}</span>
                </span>
              ) : (
                <span className="text-slate-600 text-[11px]">
                  安全剩餘空間 NT$ {(config.truckCapacityLimit - amountSummary.grandTotal).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Traffic condition selector & Address Reminder */}
      <div className="px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 bg-white">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-700">即時路況調整：</span>
          {(['normal', 'rush_hour', 'rainy', 'heavy_traffic'] as const).map(key => (
            <button
              key={key}
              onClick={() => onUpdateTrafficCondition(key)}
              className={`px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                config.trafficCondition === key
                  ? 'bg-rose-700 text-white border-rose-700 shadow-2xs'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {trafficLabels[key].label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {stops.length > 0 && (
            <button
              onClick={onClearOrders}
              className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer"
              title="清空今日所有排單，開啟全新的一天"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>🌅 清空今日排單 (開啟新的一天)</span>
            </button>
          )}

          {onLoadDemoOrders && (
            <button
              onClick={onLoadDemoOrders}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
              title="載入 6 筆測試示範單據進行路徑與稅額測試"
            >
              <span>🧪 載入測試示範單據</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
