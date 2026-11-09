import React, { useState } from 'react';
import {
  MapPin,
  Clock,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Trash2,
  DollarSign,
  Building2,
  FileCheck,
  Check,
  Info,
  Edit3,
  Sparkles,
  Camera,
} from 'lucide-react';
import type { DeliveryStop } from '../types/logistics';
import { generateSingleStopNavUrl } from '../utils/geo';

interface StopsListProps {
  stops: DeliveryStop[];
  onToggleStatus: (stopId: string, newStatus: 'pending' | 'in_transit' | 'delivered') => void;
  onMoveStop: (fromIndex: number, toIndex: number) => void;
  onDeleteStop: (stopId: string) => void;
  onEditStop: (stop: DeliveryStop) => void;
  onInstantReOptimize?: () => void;
  companyAddress: string;
  onOpenAddModal?: () => void;
  onLoadDemoOrders?: () => void;
  driverLocation?: {
    lat: number;
    lng: number;
    updatedAt: string;
    areaName?: string;
    speed?: number;
    isAutoTracking?: boolean;
  };
  onUpdateDriverLocation?: () => void;
  onOpenPODModal?: (stop: DeliveryStop) => void;
}

export const StopsList: React.FC<StopsListProps> = ({
  stops,
  onToggleStatus,
  onMoveStop,
  onDeleteStop,
  onEditStop,
  onInstantReOptimize,
  companyAddress,
  onOpenAddModal,
  onLoadDemoOrders,
  driverLocation,
  onUpdateDriverLocation,
  onOpenPODModal,
}) => {
  const safeStops = stops || [];
  const [expandedStops, setExpandedStops] = useState<Record<string, boolean>>({});

  const toggleExpand = (stopId: string) => {
    setExpandedStops(prev => ({ ...prev, [stopId]: !prev[stopId] }));
  };

  const handleSingleNav = (address: string) => {
    window.open(generateSingleStopNavUrl(address), '_blank');
  };

  if (safeStops.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border-2 border-dashed border-rose-300 shadow-sm space-y-5 max-w-2xl mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
          <span className="text-3xl">🌅</span>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-800">
            今日尚未建單 • 歡迎開啟新的一天！
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            禾禾園物流系統每天從零開始。司機只需點選下方按鈕，<strong>將今日要送的出貨單一張一張拍照上傳</strong>，AI 智慧系統就會秒自動辨識店名、地址、金額，並為您排定最完美路線！
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {onOpenAddModal && (
            <button
              type="button"
              onClick={onOpenAddModal}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-extrabold text-sm px-6 py-3.5 rounded-2xl shadow-lg transition active:scale-95 cursor-pointer"
            >
              <span className="text-lg">📷</span>
              <span>立即拍照上傳出貨單 (開啟排單)</span>
            </button>
          )}

          {onLoadDemoOrders && (
            <button
              type="button"
              onClick={onLoadDemoOrders}
              className="w-full sm:w-auto text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 font-medium px-4 py-3 rounded-2xl transition cursor-pointer"
            >
              🧪 載入測試範例 (可隨時清空)
            </button>
          )}
        </div>

        {/* Driver GPS Check-in tip in empty state */}
        {onUpdateDriverLocation && (
          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Navigation className="w-3.5 h-3.5 text-sky-600" />
            <span>司機出車前可先點此：</span>
            <button
              type="button"
              onClick={onUpdateDriverLocation}
              className="text-sky-600 hover:text-sky-700 font-bold underline cursor-pointer"
            >
              {driverLocation ? `📍 已回報目前 GPS (${driverLocation.updatedAt})` : '📍 回報目前出發 GPS 位置'}
            </button>
          </div>
        )}
      </div>
    );
  }

  const timeConstrainedCount = stops.filter(s => s.timeConstraint && s.timeConstraint !== '無限制').length;

  return (
    <div className="space-y-3">
      {/* Quick Guide & Instant Re-optimize bar */}
      <div className="bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-teal-500/10 border border-amber-300/80 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xs text-slate-800">
            <span className="font-bold text-amber-900">時間限制排單設定：</span>
            <span>點選任一卡片的</span>
            <span className="inline-block bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 mx-1 rounded font-bold text-[11px]">
              ✏️ 調整時限
            </span>
            <span>即可寫入幾點前要到，確認後系統<strong>即時重新計算最優路線</strong>！</span>
            {timeConstrainedCount > 0 && (
              <span className="ml-1 text-emerald-800 font-bold">
                (目前共 {timeConstrainedCount} 站設有時間限制)
              </span>
            )}
          </div>
        </div>

        {onInstantReOptimize && (
          <button
            type="button"
            onClick={onInstantReOptimize}
            className="flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer shrink-0"
            title="依據最新店家時間限制即時重新運算最佳順序"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>即時重排最優路線</span>
          </button>
        )}
      </div>

      {/* Driver GPS Auto-Tracking Strip */}
      <div className="bg-sky-50 border border-sky-300 px-3.5 py-2 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-sky-950 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
          <span className="font-extrabold text-blue-950">🟢 GPS 自動跟隨追蹤中：</span>
          <span className="text-slate-800 font-medium">
            {driverLocation
              ? `${driverLocation.areaName || '已連線'} (${driverLocation.updatedAt} 自動更新${driverLocation.speed ? ` • 時速 ${driverLocation.speed} km/h` : ''})`
              : '手機連線中，將自動跟隨導航持續回報位置給公司總部，司機無需每次按按鈕！'}
          </span>
        </div>
        {onUpdateDriverLocation && (
          <button
            type="button"
            onClick={onUpdateDriverLocation}
            className="flex items-center gap-1 bg-sky-600 hover:bg-sky-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs shadow-2xs transition active:scale-95 cursor-pointer shrink-0"
            title="自動追蹤中，點擊可立即強制刷新定位"
          >
            <Navigation className="w-3 h-3" />
            <span>立即刷新</span>
          </button>
        )}
      </div>

      {/* Starting point indicator - Eye-Friendly Soft Light Gray */}
      <div className="bg-slate-100 text-slate-800 px-4 py-2.5 rounded-2xl border border-slate-300/80 flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-lg bg-rose-700 flex items-center justify-center font-bold text-white text-[11px] shadow-2xs">
            起
          </span>
          <div>
            <span className="font-bold text-slate-900">出發點：禾禾園物流中心</span>
            <span className="text-slate-600 ml-2 font-mono text-[11px]">{companyAddress}</span>
          </div>
        </div>
        <span className="text-amber-800 bg-amber-50 border border-amber-300/70 px-2 py-0.5 rounded-md font-mono font-bold text-[11px]">
          首站車程即將出發
        </span>
      </div>

      {/* Stop Cards */}
      {stops.map((stop, index) => {
        const isExpanded = !!expandedStops[stop.id];
        const isDelivered = stop.status === 'delivered';
        const isInTransit = stop.status === 'in_transit';

        // Check if on-time according to constraint (Clickable to edit time constraint!)
        let timeConstraintBadge = null;
        if (stop.timeConstraint && stop.timeConstraint !== '無限制') {
          timeConstraintBadge = (
            <button
              type="button"
              onClick={() => onEditStop(stop)}
              className="inline-flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition active:scale-95"
              title="點此修改到貨時間限制與店家設定"
            >
              <Clock className="w-3 h-3 text-amber-700" />
              <span>{stop.timeConstraint}</span>
              <span className="text-[10px] text-amber-700 underline font-normal ml-0.5">點此修改</span>
            </button>
          );
        } else {
          timeConstraintBadge = (
            <button
              type="button"
              onClick={() => onEditStop(stop)}
              className="inline-flex items-center gap-1 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-900 border border-slate-200 hover:border-amber-300 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer transition"
              title="點此設定客戶時間限制"
            >
              <Clock className="w-3 h-3 text-slate-400" />
              <span>+設定時限</span>
            </button>
          );
        }

        return (
          <div
            key={stop.id}
            className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
              isDelivered
                ? 'bg-emerald-50/50 border-emerald-300/80'
                : isInTransit
                ? 'bg-amber-50/60 border-amber-400 ring-2 ring-amber-300/40'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            {/* Main Stop Bar */}
            <div className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left: Sequence number, Store Name, Badges */}
                <div className="flex items-start gap-3">
                  {/* Sequence pill */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base shadow-xs shrink-0 ${
                      isDelivered
                        ? 'bg-emerald-600 text-white'
                        : isInTransit
                        ? 'bg-amber-500 text-slate-950 animate-pulse'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    {isDelivered ? <Check className="w-5 h-5" /> : stop.sequence}
                  </div>

                  {/* Title & Info */}
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        {stop.storeName}
                      </h3>

                      <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-mono font-medium border border-slate-200">
                        {stop.floor}
                      </span>

                      {/* Requirement 9 Case A Badge: Same customer multi-kitchen auto merged */}
                      {stop.isMultiOrderMerged && (
                        <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded text-[11px] font-bold">
                          <Layers className="w-3 h-3 text-purple-600" />
                          <span>同客戶多廚房合併 ({stop.subOrders.length}單)</span>
                        </span>
                      )}

                      {/* Requirement 9 Case B Badge: Same mall different customer */}
                      {stop.isSameBuildingDifferentCustomer && (
                        <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-900 border border-sky-300 px-2 py-0.5 rounded text-[11px] font-semibold">
                          <Building2 className="w-3 h-3 text-sky-600" />
                          <span>同百貨獨立客戶</span>
                        </span>
                      )}

                      {timeConstraintBadge}

                      {/* Special unload time badge */}
                      {stop.unloadDuration > 20 && (
                        <span className="bg-orange-100 text-orange-900 border border-orange-300 px-2 py-0.5 rounded text-[11px] font-semibold">
                          ⏳ 特殊下貨 {stop.unloadDuration}分鐘
                        </span>
                      )}
                    </div>

                    {/* Address & directions */}
                    <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="flex items-center gap-1 text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>{stop.address}</span>
                      </span>

                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">{stop.directionArea}</span>

                      {stop.distanceKmFromPrev > 0 && (
                        <>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500">
                            距前站 {stop.distanceKmFromPrev} km (車程約 {stop.travelMinutesFromPrev} 分)
                          </span>
                        </>
                      )}
                    </div>

                    {/* Notes if any */}
                    {stop.notes && (
                      <div className="mt-1.5 text-xs bg-amber-50 text-amber-900 border border-amber-200/80 px-2.5 py-1 rounded-lg">
                        <strong>備註：</strong>
                        <span>{stop.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: ETA, Financials & Action Buttons */}
                <div className="flex flex-wrap sm:flex-col items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* ETA and Departure */}
                  <div className="text-right">
                    <div className="text-xs text-slate-500">預計抵達 / 完成離開</div>
                    <div className="font-mono text-sm sm:text-base font-bold text-slate-800">
                      <span className="text-rose-800 font-extrabold">{stop.estimatedArrival}</span>
                      <span className="text-slate-400 mx-1">~</span>
                      <span className="text-slate-600">{stop.estimatedDeparture}</span>
                    </div>
                  </div>

                  {/* Amount Breakdown for Stop */}
                  <div className="text-right bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1">
                    <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1.5">
                      <span>未稅 ${stop.untaxedAmount.toLocaleString()}</span>
                      <span>+</span>
                      <span>稅 ${stop.taxAmount.toLocaleString()}</span>
                    </div>
                    <div className="text-xs font-bold text-rose-700 font-mono">
                      含稅 NT$ {stop.totalAmount.toLocaleString()}
                    </div>
                  </div>

                  {/* Buttons group */}
                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end">
                    {/* Edit Stop / Time Constraint Button */}
                    <button
                      onClick={() => onEditStop(stop)}
                      className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-2xs transition active:scale-95 cursor-pointer"
                      title="調整店家設定、幾點前要到、卸貨時間與金額"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                      <span>調整時限/店家</span>
                    </button>

                    {/* Google Maps Nav button */}
                    <button
                      onClick={() => handleSingleNav(stop.address)}
                      className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-2xs transition active:scale-95 cursor-pointer"
                      title="直接開啟 Google 導航"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Google 導航</span>
                    </button>

                    {/* Status switch & POD Photo Cross-Check */}
                    {isDelivered ? (
                      <div className="flex items-center gap-1.5">
                        {stop.proofOfDelivery && (
                          <button
                            type="button"
                            onClick={() => onOpenPODModal && onOpenPODModal(stop)}
                            className={`flex items-center gap-1 text-xs font-bold px-2 py-1.5 rounded-lg border transition cursor-pointer ${
                              stop.proofOfDelivery.hasIssue
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                            }`}
                            title="點擊檢視回傳單據、簽名與貨況紀錄"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>
                              {stop.proofOfDelivery.hasIssue
                                ? `⚠️ 異常紀錄 (${stop.proofOfDelivery.photos.length}張)`
                                : `已存證 (${stop.proofOfDelivery.photos.length}張照)`}
                            </span>
                          </button>
                        )}
                        <button
                          onClick={() => onToggleStatus(stop.id, 'pending')}
                          className="flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-emerald-300 transition cursor-pointer"
                          title="點擊恢復為未完成"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>已送達 {stop.deliveredAt ? `(${stop.deliveredAt})` : ''}</span>
                        </button>
                      </div>
                    ) : isInTransit ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => (onOpenPODModal ? onOpenPODModal(stop) : onToggleStatus(stop.id, 'delivered'))}
                          className="flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-extrabold px-3 py-1.5 rounded-lg shadow-sm transition active:scale-95 cursor-pointer animate-pulse"
                          title="現場拍照、單據張數交叉比對、確認客戶簽章並回傳"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>📸 拍照比對核銷</span>
                        </button>
                        <button
                          onClick={() => onToggleStatus(stop.id, 'delivered')}
                          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
                          title="直接送達完成"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>快速簽收</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => (onOpenPODModal ? onOpenPODModal(stop) : onToggleStatus(stop.id, 'delivered'))}
                          className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-2xs transition active:scale-95 cursor-pointer"
                          title="拍照核驗送貨單"
                        >
                          <Camera className="w-3.5 h-3.5 text-rose-700" />
                          <span>拍照比對</span>
                        </button>
                        <button
                          onClick={() => onToggleStatus(stop.id, 'in_transit')}
                          className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-2xs transition active:scale-95 cursor-pointer"
                          title="標記出發前往"
                        >
                          <span>出發前往</span>
                        </button>
                      </div>
                    )}

                    {/* Move Up / Down manual sequence adjustment */}
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      <button
                        disabled={index === 0}
                        onClick={() => onMoveStop(index, index - 1)}
                        className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 hover:bg-slate-200 transition"
                        title="往前調"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={index === stops.length - 1}
                        onClick={() => onMoveStop(index, index + 1)}
                        className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 hover:bg-slate-200 transition"
                        title="往後調"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Expand Sub-orders button if merged */}
                    {stop.isMultiOrderMerged && (
                      <button
                        onClick={() => toggleExpand(stop.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
                        title="展開各廚房訂單明細"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}

                    {/* Delete stop */}
                    <button
                      onClick={() => onDeleteStop(stop.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="刪除此站"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-orders accordion for Multi-Kitchen Merged Customers (Requirement 9 Case A) */}
            {stop.isMultiOrderMerged && isExpanded && (
              <div className="bg-purple-50/50 border-t border-purple-200/80 px-4 py-3 text-xs">
                <div className="font-semibold text-purple-900 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    <span>同一客戶多廚房/訂單明細（系統已自動加成金額）：</span>
                  </span>
                  <span className="font-mono text-purple-700">
                    共 {stop.subOrders.length} 筆訂單
                  </span>
                </div>

                <div className="space-y-2">
                  {stop.subOrders.map((sub, sIdx) => (
                    <div
                      key={sub.id}
                      className="bg-white p-2.5 rounded-xl border border-purple-200 flex flex-wrap items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-[10px]">
                          {sIdx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-2">
                            <span>{sub.department}</span>
                            <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                              {sub.orderNo}
                            </span>
                          </div>
                          {sub.notes && <div className="text-[11px] text-slate-500">{sub.notes}</div>}
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div className="text-[10px] text-slate-500">
                          未稅 ${sub.untaxedAmount.toLocaleString()} + 稅 ${sub.taxAmount.toLocaleString()}
                        </div>
                        <div className="text-xs font-bold text-purple-900">
                          含稅 ${sub.totalAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Same mall alert notes (Requirement 9 Case B) */}
            {stop.isSameBuildingDifferentCustomer && (
              <div className="bg-sky-50 border-t border-sky-100 px-4 py-1.5 text-[11px] text-sky-800 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>
                  提示：同百貨商場 ({stop.floor})！注意此店與同一建築物內之其他餐廳為不同客戶，請分別由專人簽收對單。
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* Return to HQ final stop indicator - Gentle Light Gray Theme */}
      <div className="bg-slate-100 text-slate-800 px-4 py-2.5 rounded-2xl border border-slate-300/80 flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs mt-4">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[11px] shadow-2xs">
            終
          </span>
          <div>
            <span className="font-bold text-slate-900">回程總部：禾禾園物流中心 (空車返廠)</span>
            <span className="text-slate-600 ml-2 font-mono text-[11px]">{companyAddress}</span>
          </div>
        </div>
        <span className="text-emerald-800 bg-emerald-50 border border-emerald-300/70 px-2 py-0.5 rounded-md font-mono font-bold text-[11px]">
          任務完成返廠
        </span>
      </div>
    </div>
  );
};
