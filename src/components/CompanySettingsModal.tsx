import React, { useState } from 'react';
import {
  X,
  Building2,
  MapPin,
  Clock,
  ShieldAlert,
  User,
  Truck,
  Send,
  Save,
  CheckCircle,
} from 'lucide-react';
import type { CompanyConfig } from '../types/logistics';
import { geocodeAddress } from '../utils/geo';

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CompanyConfig;
  onSaveConfig: (newConfig: CompanyConfig) => void;
}

export const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [companyName, setCompanyName] = useState(config.companyName);
  const [address, setAddress] = useState(config.address);
  const [departureTime, setDepartureTime] = useState(config.departureTime);
  const [defaultUnloadMinutes, setDefaultUnloadMinutes] = useState(config.defaultUnloadMinutes);
  const [truckCapacityLimit, setTruckCapacityLimit] = useState(config.truckCapacityLimit);
  const [driverName, setDriverName] = useState(config.driverName);
  const [driverPhone, setDriverPhone] = useState(config.driverPhone);
  const [truckPlate, setTruckPlate] = useState(config.truckPlate);
  const [tripName, setTripName] = useState(config.tripName);
  const [telegramBotToken, setTelegramBotToken] = useState(config.telegramConfig?.botToken || '');
  const [telegramChatId, setTelegramChatId] = useState(config.telegramConfig?.chatId || '');
  const [autoPushOnDelivery, setAutoPushOnDelivery] = useState(config.telegramConfig?.autoPushOnDelivery ?? true);
  const [driveFolder, setDriveFolder] = useState(config.googleSyncConfig?.driveFolder || '禾禾園物流簽收單圖庫');
  const [spreadsheetName, setSpreadsheetName] = useState(config.googleSyncConfig?.spreadsheetName || '禾禾園物流系統資料庫');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleQuickAddress = (presetAddr: string) => {
    setAddress(presetAddr);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const geo = geocodeAddress(address);

    const updated: CompanyConfig = {
      ...config,
      companyName,
      address,
      lat: geo.lat,
      lng: geo.lng,
      departureTime,
      defaultUnloadMinutes: Number(defaultUnloadMinutes) || 20,
      truckCapacityLimit: Number(truckCapacityLimit) || 120000,
      driverName,
      driverPhone,
      truckPlate,
      tripName,
      telegramConfig: {
        ...config.telegramConfig,
        botToken: telegramBotToken,
        chatId: telegramChatId,
        autoPushOnDelivery,
      },
      googleSyncConfig: {
        driveFolder,
        spreadsheetName,
      },
    };

    onSaveConfig(updated);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-red-950 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">公司與車趟設定</h3>
              <p className="text-xs text-rose-200">
                可隨時更改總公司出發地址、出發時間、每站預設耗時與貨車金額空間限制
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-rose-200 hover:text-white hover:bg-rose-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
          {/* Company address section */}
          <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-rose-950 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-700" />
                <span>總公司 / 集貨倉出發與返廠地址 (可隨時修改)</span>
              </label>
              <span className="text-[11px] text-rose-700 font-semibold bg-rose-100 px-2 py-0.5 rounded-full">
                即改即生效
              </span>
            </div>

            <input
              type="text"
              required
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="例如：新北市樹林區柑園街一段196-13號"
              className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
            />

            {/* Quick Presets */}
            <div className="text-[11px] text-slate-600 flex items-center gap-1.5 flex-wrap">
              <span>常用集貨點切換：</span>
              <button
                type="button"
                onClick={() => handleQuickAddress('新北市樹林區柑園街一段196-13號')}
                className="bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[11px]"
              >
                樹林柑園總公司 (預設)
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddress('新北市板橋區新站路28號')}
                className="bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[11px]"
              >
                板橋轉運集貨倉
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddress('台北市中山區民權東路三段')}
                className="bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[11px]"
              >
                台北中山集貨站
              </button>
            </div>
          </div>

          {/* Departure & Unload Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>總公司出發時間</span>
              </label>
              <input
                type="time"
                value={departureTime}
                onChange={e => setDepartureTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-base font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                所有下貨點預計抵達 (ETA) 及回到公司時間以此起算
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>預計每家客戶下貨時間 (分鐘)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={90}
                  value={defaultUnloadMinutes}
                  onChange={e => setDefaultUnloadMinutes(Number(e.target.value))}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <span className="text-xs text-slate-600 font-medium">預設為 20 分鐘</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                個別特殊大型客戶可在排單中單獨調整為 35~45 分鐘
              </span>
            </div>
          </div>

          {/* Truck Capacity limit */}
          <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200">
            <label className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>貨車裝載金額空間上限 (NT$)</span>
            </label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                step={5000}
                value={truckCapacityLimit}
                onChange={e => setTruckCapacityLimit(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono text-base font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              每輛貨車裝載數量/貨物價值有安全上限。若整趟訂單總金額超過此限額，系統將主動發出警戒提示。
            </p>
          </div>

          {/* Driver & Vehicle Profile */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-600" />
                <span>配送司機姓名</span>
              </label>
              <input
                type="text"
                value={driverName}
                onChange={e => setDriverName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-slate-600" />
                <span>車牌號碼</span>
              </label>
              <input
                type="text"
                value={truckPlate}
                onChange={e => setTruckPlate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                司機聯絡手機
              </label>
              <input
                type="text"
                value={driverPhone}
                onChange={e => setDriverPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              車趟班次名稱
            </label>
            <input
              type="text"
              value={tripName}
              onChange={e => setTripName(e.target.value)}
              placeholder="例如：第 1 趟 (雙北餐飲連鎖旗艦線)"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Telegram Settings */}
          <div className="bg-sky-50/60 p-3.5 rounded-2xl border border-sky-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Send className="w-4 h-4 text-sky-600" />
                <span>Telegram 物流群即時推播設定</span>
              </div>
              <span className="text-[11px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">
                支援群組 ID 聯動
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              填入 Telegram 物流群 ID 與 Bot Token，司機在現場完成單據拍照、客戶簽核或回報貨況異常時，系統將**自動推播圖文卡片至物流群**！
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Telegram 群組 Chat ID</label>
                <input
                  type="text"
                  placeholder="例如 -100123456789 或群組ID"
                  value={telegramChatId}
                  onChange={e => setTelegramChatId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-sky-300 rounded-lg font-mono text-xs outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Telegram Bot Token</label>
                <input
                  type="text"
                  placeholder="Bot Father 給予的 Token"
                  value={telegramBotToken}
                  onChange={e => setTelegramBotToken(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-sky-300 rounded-lg font-mono text-xs outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPushOnDelivery}
                onChange={e => setAutoPushOnDelivery(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
              />
              <span className="text-xs font-bold text-slate-800">
                司機拍照完成送達或填寫貨況異常時，自動推播至 Telegram 物流群
              </span>
            </label>
          </div>

          {/* Google Cloud Drive & Spreadsheet Integration */}
          <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>Google 雲端與試算表資料庫對接</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                已連結
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              系統資料已自動對齊您的 Google Drive 資料夾與 Google 試算表：
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-emerald-200">
                <span className="block text-slate-400 text-[10px]">📁 雲端硬碟存放照片資料夾：</span>
                <span className="font-bold text-emerald-900">{driveFolder}</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-emerald-200">
                <span className="block text-slate-400 text-[10px]">📊 Google 試算表對帳總表：</span>
                <span className="font-bold text-emerald-900">{spreadsheetName}</span>
              </div>
            </div>
            <p className="text-[10px] text-emerald-800">
              💡 <strong>說明：</strong>送貨單據拍照、客戶簽章、未稅/稅額及異常備註，均可一鍵匯出或透過 Google Apps Script 雲端同步至該表！
            </p>
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            {saveSuccess && (
              <span className="text-emerald-600 text-xs font-bold flex items-center gap-1 mr-2">
                <CheckCircle className="w-4 h-4" />
                <span>設定已儲存並重新計算路線！</span>
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition"
            >
              關閉
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>儲存並更新排單</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
