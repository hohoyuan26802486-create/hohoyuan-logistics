import React, { useState } from 'react';
import {
  Search,
  PhoneCall,
  User,
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Compass,
  DollarSign,
  Building,
  Layers,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  FileSpreadsheet,
  FlaskConical,
  Calendar,
  History,
  RotateCw,
} from 'lucide-react';
import type { CompanyConfig, DeliveryStop, RouteOptimizationResult, TruckItem } from '../types/logistics';
import { groupOrdersIntoStops } from '../utils/grouping';
import { optimizeRoute } from '../utils/optimizer';
import { getAvailableArchiveDates } from '../utils/historyArchive';

interface LogisticsDispatchViewProps {
  config: CompanyConfig;
  routeResult: RouteOptimizationResult;
  trucks: TruckItem[];
  activeTruckId: string;
  onSelectTruck: (truckId: string) => void;
  onOpenAddTruck: () => void;
  onEditTruck: (truck: TruckItem) => void;
  onDeleteTruck: (truckId: string) => void;
  onOpenTelegram: () => void;
  onClearAllTrucks?: () => void;
  onExportExcel?: (dateLabel?: string) => void;
  onAddSandboxTruck?: () => void;
  onRolloverUnfinished?: () => void;
}

export const LogisticsDispatchView: React.FC<LogisticsDispatchViewProps> = ({
  config,
  routeResult,
  trucks,
  activeTruckId,
  onSelectTruck,
  onOpenAddTruck,
  onEditTruck,
  onDeleteTruck,
  onOpenTelegram,
  onClearAllTrucks,
  onExportExcel,
  onAddSandboxTruck,
  onRolloverUnfinished,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArchiveDate, setSelectedArchiveDate] = useState<string>('today');

  const query = searchQuery.trim().toLowerCase();

  // Search across ALL 16 TRUCKS!
  // Supports searching by store name, address, driver name, truck plate, zone, order number, or slip sequence!
  const allTrucksSearchResults = query
    ? trucks.flatMap(truck => {
        // Group truck orders into stops for realistic ETA calculation
        const truckStops = groupOrdersIntoStops(truck.orders, config.defaultUnloadMinutes);
        const truckResult = optimizeRoute(truckStops, {
          ...config,
          departureTime: truck.departureTime,
          truckCapacityLimit: truck.truckCapacityLimit,
          driverName: truck.driverName,
          truckPlate: truck.truckPlate,
        });

        const isTruckMetaMatch =
          truck.driverName.toLowerCase().includes(query) ||
          truck.truckPlate.toLowerCase().includes(query) ||
          truck.zoneName.toLowerCase().includes(query);

        const matchedInThisTruck = truckResult.stops.filter(
          s =>
            isTruckMetaMatch ||
            s.storeName.toLowerCase().includes(query) ||
            s.address.toLowerCase().includes(query) ||
            s.floor.toLowerCase().includes(query) ||
            s.directionArea.toLowerCase().includes(query) ||
            s.subOrders.some(
              sub =>
                sub.department.toLowerCase().includes(query) ||
                sub.orderNo.toLowerCase().includes(query) ||
                (sub.slipSequence && sub.slipSequence.toLowerCase().includes(query))
            )
        );

        return matchedInThisTruck.map(stop => ({
          stop,
          truck,
          truckResult,
        }));
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Top Hotline Central Query Banner (Global Fleet Search) - Soft Light-Gray Theme with Enterprise Crimson Accents */}
      <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-rose-50/40 text-slate-900 p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                後勤客服聯絡中心
              </span>
              <span className="bg-rose-100 text-rose-800 text-xs px-2.5 py-0.5 rounded-full border border-rose-300 font-bold">
                ⚡ 全車隊即時搜尋平台
              </span>
            </div>
          </div>

          <h2 className="text-lg sm:text-2xl font-black text-slate-900 flex items-center gap-2 mb-2">
            <PhoneCall className="w-6 h-6 text-rose-700 shrink-0" />
            <span>客人打電話進來？輸入「店名」或「司機名字/車牌」1 秒查到司機與抵達時間</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed font-medium">
            系統支援 <strong>店名（如：錢都、瓦城）</strong> 或 <strong>司機姓名/車牌（如：志隆、CEN-5181）</strong> 雙向搜尋，透過 <strong>全車隊即時搜尋平台</strong> 即時回覆：「是哪位司機送？人在哪個方向？預計幾點送到？」
          </p>

          {/* Search Input Bar */}
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="輸入『店家名稱』(例如: 錢都、瓦城、鼎泰豐) 或『司機姓名/車牌』(例如: 志隆、CEN-5181)..."
              className="w-full pl-12 pr-20 py-3.5 bg-white text-slate-900 rounded-2xl font-medium border-2 border-slate-300 focus:border-rose-600 focus:ring-4 focus:ring-rose-500/10 shadow-xs outline-none text-sm sm:text-base placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg cursor-pointer"
              >
                清除
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Query Search Results */}
      {query && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-rose-500 shadow-md space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <span>查單結果：在全車隊中找到 {allTrucksSearchResults.length} 筆相符送貨點</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                關鍵字：「{searchQuery}」• 全車隊各車輛同步即時檢索
              </p>
            </div>
          </div>

          {allTrucksSearchResults.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              查無相符店家或訂單，請確認店家名稱是否正確，或該店尚未拍照建單。
            </div>
          ) : (
            <div className="space-y-4">
              {allTrucksSearchResults.map(({ stop, truck, truckResult }, idx) => {
                const isDelivered = stop.status === 'delivered';
                const isInTransit = stop.status === 'in_transit';

                // Real-time GPS distance calculation
                let gpsInfo = '';
                let distToCustomerKm: number | null = null;
                if (truck.currentLocation && truck.currentLocation.lat && truck.currentLocation.lng) {
                  distToCustomerKm = Math.round(
                    (Math.hypot(
                      (truck.currentLocation.lat - stop.lat) * 111,
                      (truck.currentLocation.lng - stop.lng) * 101
                    ) * 1.35) * 10
                  ) / 10;
                  gpsInfo = `📍 司機即時 GPS：在【${truck.currentLocation.areaName || '雙北配送中'}】(${truck.currentLocation.updatedAt} 回報，距門市約 ${distToCustomerKm} km)`;
                }

                let statusDirectionText = '';
                if (isDelivered) {
                  statusDirectionText = `✅ 已於 ${stop.deliveredAt || stop.estimatedArrival} 送達完成簽收！`;
                } else if (isInTransit) {
                  statusDirectionText = `🚚 司機正前往此站中！${distToCustomerKm ? `目前距貴店約 ${distToCustomerKm} 公里，` : ''}預計 ${stop.estimatedArrival} 抵達門市。`;
                } else {
                  statusDirectionText = `⏳ 排在該車第 ${stop.sequence} 站，司機目前朝【${stop.directionArea}】方向配送中，${distToCustomerKm ? `距門市約 ${distToCustomerKm} 公里，` : ''}預計 ${stop.estimatedArrival} 送達！`;
                }

                return (
                  <div
                    key={`${truck.id}-${stop.id}-${idx}`}
                    className="p-5 rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50/70 via-white to-amber-50/40 shadow-xs space-y-3"
                  >
                    {/* Top Truck Info Pill */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-emerald-800 text-white font-bold text-xs px-3 py-1 rounded-xl shadow-2xs">
                          {truck.zoneName}
                        </span>
                        <span className="bg-amber-400 text-slate-950 font-mono font-extrabold text-xs px-2.5 py-1 rounded-xl">
                          車牌：{truck.truckPlate}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          司機：{truck.driverName}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${truck.driverPhone}`}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow transition"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>撥打司機電話 ({truck.driverPhone})</span>
                        </a>

                        <button
                          onClick={() => onSelectTruck(truck.id)}
                          className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow transition cursor-pointer"
                        >
                          <span>查看此車路線</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Customer store details */}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-700 text-white font-bold flex items-center justify-center text-xs">
                          {stop.sequence}
                        </span>
                        <h4 className="text-base sm:text-lg font-extrabold text-slate-900">
                          {stop.storeName}
                        </h4>
                        <span className="bg-slate-200 text-slate-800 text-xs px-2 py-0.5 rounded font-mono font-bold">
                          {stop.floor}
                        </span>
                        {stop.timeConstraint !== '無限制' && (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-2 py-0.5 rounded">
                            ⏰ {stop.timeConstraint}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{stop.address}</span>
                      </p>
                    </div>

                    {/* Real-time GPS status banner */}
                    {gpsInfo && (
                      <div className="bg-sky-50 border border-sky-300 text-sky-950 px-3 py-2 rounded-xl text-xs flex items-center gap-2 shadow-2xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shrink-0"></span>
                        <span className="font-bold">{gpsInfo}</span>
                      </div>
                    )}

                    {/* Customer Service Phone Script (What to tell caller) */}
                    <div className="bg-white p-3.5 rounded-xl border border-emerald-300 text-xs space-y-1 shadow-2xs">
                      <div className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-emerald-600" />
                        <span>客服直接回覆客人話術：</span>
                      </div>
                      <p className="text-slate-800 leading-relaxed font-medium pl-2 border-l-2 border-emerald-500">
                        「您好，替您查到了！您這筆訂單是由 <strong>【{truck.zoneName}】{truck.driverName} 司機（車牌 {truck.truckPlate}）</strong> 為您配送。{truck.currentLocation?.areaName ? `司機手機最新 GPS 回報人在【${truck.currentLocation.areaName}】，` : ''}{statusDirectionText}」
                      </p>
                    </div>

                    {/* Grid of details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-500 block">預計到達時間</span>
                        <strong className="text-emerald-700 font-mono text-sm">
                          {stop.estimatedArrival}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">時間限制</span>
                        <strong className="text-amber-700 font-mono">
                          {stop.timeConstraint}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">應收含稅金額</span>
                        <strong className="text-slate-900 font-mono text-sm">
                          ${stop.totalAmount.toLocaleString()}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">司機目前方向</span>
                        <strong className="text-slate-800">{stop.directionArea}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Fleet Overview: All Trucks Live Dashboard */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-700" />
              <span>禾禾園 {trucks.length} 台貨車車隊即時儀表板</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              點選任一車輛卡片切換至該車；點選右上角可隨時「+ 新增車輛」擴充車隊規模
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="bg-rose-100 text-rose-800 font-bold px-2.5 py-1 rounded-xl">
              目前車隊：{trucks.length} 台
            </span>

            {/* Clear All Trucks Button */}
            {onClearAllTrucks && trucks.length > 0 && (
              <button
                onClick={onClearAllTrucks}
                className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold px-3 py-1.5 rounded-xl transition active:scale-95 cursor-pointer text-xs"
                title="清空所有車輛設定，重新建立禾禾園實際車輛名冊"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>清空所有車輛 (重新自訂)</span>
              </button>
            )}

            {/* Export All Excel Button with Date Selector (Handles yesterday & 3-day holidays) */}
            {onExportExcel && (
              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 p-1 rounded-xl">
                <Calendar className="w-3.5 h-3.5 text-rose-800 ml-1.5 shrink-0" />
                <select
                  value={selectedArchiveDate}
                  onChange={e => setSelectedArchiveDate(e.target.value)}
                  className="bg-white border border-rose-300 text-slate-800 font-bold text-xs py-1 px-2 rounded-lg outline-none cursor-pointer"
                  title="小姐隔天或連假上班，可自由選擇特定日期匯出"
                >
                  <option value="today">📅 今日即時數據</option>
                  <option value="yesterday">📅 昨日完整數據 (隔天匯出)</option>
                  <option value="holiday_3days">📅 連假 3 天合併數據</option>
                  <option value="week_7days">📅 最近 7 天歷史總庫</option>
                </select>
                <button
                  onClick={() => onExportExcel(selectedArchiveDate)}
                  className="flex items-center gap-1 bg-rose-700 hover:bg-rose-800 text-white font-bold px-2.5 py-1 rounded-lg shadow-xs transition active:scale-95 cursor-pointer text-xs"
                  title="依所選日期匯出全車隊送貨與會計業績 Excel 檔"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-rose-200" />
                  <span>匯出 Excel 總表</span>
                </button>
              </div>
            )}

            {/* Unfinished Orders Rollover / Return Button */}
            {onRolloverUnfinished && (
              <button
                onClick={onRolloverUnfinished}
                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer text-xs"
                title="處理司機未送完帶回之訂單：可一鍵轉派至隔天，或標記未送達退回"
              >
                <RotateCw className="w-3.5 h-3.5 text-amber-200" />
                <span>未送完訂單轉派/帶回</span>
              </button>
            )}

            {/* Sandbox Test Truck Button */}
            {onAddSandboxTruck && (
              <button
                onClick={onAddSandboxTruck}
                className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer text-xs"
                title="建立主管排單測試專用沙盒車，供主管模擬路線測試而不影響真實司機"
              >
                <FlaskConical className="w-3.5 h-3.5 text-purple-200" />
                <span>+ 🧪 主管虛擬測試車</span>
              </button>
            )}

            {/* Add Truck Button */}
            <button
              onClick={onOpenAddTruck}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold px-3.5 py-1.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer text-xs"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>+ 新增貨車</span>
            </button>

            <button
              onClick={onOpenTelegram}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
            >
              推播車隊排班到 Telegram
            </button>
          </div>
        </div>

        {/* Empty Fleet State or Grid */}
        {trucks.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl space-y-3">
            <Truck className="w-12 h-12 text-slate-400 mx-auto" />
            <h4 className="font-extrabold text-slate-700 text-base">目前車隊尚未設定任何車輛</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              您可以點選下方按鈕，開始輸入第一台貨車的車牌、司機姓名與專屬配送路線。
            </p>
            <button
              onClick={onOpenAddTruck}
              className="bg-rose-700 hover:bg-rose-800 text-white font-extrabold px-5 py-2.5 rounded-2xl shadow transition text-xs cursor-pointer"
            >
              + 立即建立第 1 台貨車
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {trucks.map(t => {
            const isActive = t.id === activeTruckId;
            const ordersCount = t.orders.length;
            const totalAmount = t.orders.reduce((sum, o) => sum + o.totalAmount, 0);
            const loadPct = t.truckCapacityLimit > 0
              ? Math.min(100, Math.round((totalAmount / t.truckCapacityLimit) * 100))
              : 0;

            return (
              <div
                key={t.id}
                onClick={() => onSelectTruck(t.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                  isActive
                    ? 'bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-600 shadow-md ring-2 ring-rose-500/20'
                    : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-xs'
                }`}
              >
                {isActive && (
                  <span className="absolute top-2 right-14 bg-rose-700 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                    當前查看中
                  </span>
                )}

                {/* Edit & Delete Mini Buttons */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-80 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTruck(t);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                    title="編輯此車資訊"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {trucks.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTruck(t.id);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-100 transition"
                      title="刪除此車"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-2 pr-16">
                  <span className="w-7 h-7 rounded-lg bg-rose-800 text-white font-extrabold flex items-center justify-center text-xs shrink-0">
                    {t.truckNumber}
                  </span>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-slate-900 text-sm truncate">
                        {t.driverName}
                      </h4>
                      {t.isSandbox && (
                        <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.2 rounded border border-purple-200">
                          沙盒測試
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                      {t.truckPlate}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1 border-t border-slate-100 pt-2">
                  <div className="text-[11px] text-rose-900 font-semibold truncate">
                    {t.zoneName}
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">出發時間：</span>
                    <strong className="font-mono text-slate-800">{t.departureTime}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">今日訂單：</span>
                    <span className="font-bold text-slate-800">
                      {ordersCount > 0 ? `${ordersCount} 筆` : '待出車 (0筆)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">裝載金額：</span>
                    <span className="font-mono font-bold text-rose-700">
                      ${totalAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    <span className="text-slate-500">手機 GPS：</span>
                    {t.currentLocation ? (
                      <span className="text-blue-700 font-bold flex items-center gap-1 truncate max-w-[120px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse shrink-0"></span>
                        <span className="truncate">{t.currentLocation.areaName || t.currentLocation.updatedAt}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">待回報</span>
                    )}
                  </div>
                </div>

                {/* Mini capacity bar */}
                <div className="mt-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span>{t.isSandbox ? '主管沙盒測試' : `負載限額 (${loadPct}%)`}</span>
                    <span className={t.isSandbox ? 'text-purple-700 font-bold' : ''}>
                      {t.isSandbox ? '✨ 無店家與金額上限' : `$${(t.truckCapacityLimit / 10000).toFixed(0)}萬`}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        t.isSandbox
                          ? 'bg-purple-500'
                          : loadPct > 90
                          ? 'bg-rose-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${t.isSandbox ? 100 : loadPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
);
};
