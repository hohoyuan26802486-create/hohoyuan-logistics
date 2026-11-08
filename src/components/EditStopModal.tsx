import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  MapPin,
  Building2,
  DollarSign,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Timer,
  Save,
} from 'lucide-react';
import type { DeliveryStop } from '../types/logistics';
import { geocodeAddress } from '../utils/geo';

interface EditStopModalProps {
  isOpen: boolean;
  onClose: () => void;
  stop: DeliveryStop | null;
  onSaveStop: (
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
  ) => void;
}

export const EditStopModal: React.FC<EditStopModalProps> = ({
  isOpen,
  onClose,
  stop,
  onSaveStop,
}) => {
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [floor, setFloor] = useState('');
  const [timeConstraint, setTimeConstraint] = useState('無限制');
  const [unloadDuration, setUnloadDuration] = useState(20);
  const [notes, setNotes] = useState('');
  const [untaxedAmount, setUntaxedAmount] = useState<number | ''>('');
  const [taxAmount, setTaxAmount] = useState<number | ''>('');
  const [totalAmount, setTotalAmount] = useState<number | ''>('');

  // Preset quick time tags
  const QUICK_TIME_PRESETS = [
    '09:00前',
    '09:30前',
    '10:00前',
    '10:30前',
    '11:00前',
    '11:30前',
    '12:00前',
    '12:30前',
    '13:00前',
    '無限制',
  ];

  useEffect(() => {
    if (stop) {
      setStoreName(stop.storeName || '');
      setAddress(stop.address || '');
      setFloor(stop.floor || '1F');
      setTimeConstraint(stop.timeConstraint || '無限制');
      setUnloadDuration(stop.unloadDuration || 20);
      setNotes(stop.notes || '');
      setUntaxedAmount(stop.untaxedAmount || 0);
      setTaxAmount(stop.taxAmount || 0);
      setTotalAmount(stop.totalAmount || 0);
    }
  }, [stop]);

  if (!isOpen || !stop) return null;

  // Auto tax calculation
  const handleUntaxedChange = (val: number | '') => {
    setUntaxedAmount(val);
    if (val !== '' && !isNaN(val)) {
      const tax = Math.round(val * 0.05);
      setTaxAmount(tax);
      setTotalAmount(val + tax);
    } else {
      setTaxAmount('');
      setTotalAmount('');
    }
  };

  const handleTotalChange = (val: number | '') => {
    setTotalAmount(val);
    if (val !== '' && !isNaN(val)) {
      const untax = Math.round(val / 1.05);
      const tax = val - untax;
      setUntaxedAmount(untax);
      setTaxAmount(tax);
    } else {
      setUntaxedAmount('');
      setTaxAmount('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !address.trim()) {
      alert('請填寫店家名稱與地址！');
      return;
    }

    const total = typeof totalAmount === 'number' ? totalAmount : 0;
    const untaxed = typeof untaxedAmount === 'number' ? untaxedAmount : Math.round(total / 1.05);
    const tax = typeof taxAmount === 'number' ? taxAmount : total - untaxed;

    onSaveStop(stop.id, {
      storeName: storeName.trim(),
      address: address.trim(),
      floor: floor.trim() || '1F',
      timeConstraint: timeConstraint.trim() || '無限制',
      unloadDuration: Number(unloadDuration) || 20,
      notes: notes.trim(),
      untaxedAmount: untaxed,
      taxAmount: tax,
      totalAmount: total,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-red-950 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-bold">
                  第 {stop.sequence} 站
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  調整店家設定與到貨時間限制
                </h3>
              </div>
              <p className="text-xs text-rose-200 mt-0.5">
                設定客戶指定幾點前到，確認儲存後系統將「即時重新排定最完美路線」！
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
          {/* Key Setting 1: Time Constraint (The User's Core Question) */}
          <div className="bg-amber-50/70 p-4 rounded-2xl border-2 border-amber-300 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>客戶時間限制 (必須幾點前要到？)</span>
              </label>
              <span className="text-[11px] bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-full">
                排單優先權
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={timeConstraint}
                onChange={e => setTimeConstraint(e.target.value)}
                placeholder="例如：09:30前、10:30前、11:00前 或 無限制"
                className="w-full px-3.5 py-2.5 bg-white border-2 border-amber-400 rounded-xl font-bold text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            {/* Quick time selection buttons */}
            <div>
              <span className="text-[11px] text-slate-600 font-semibold block mb-1.5">
                ⚡ 快速填入常用送達時間限制：
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TIME_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTimeConstraint(preset)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      timeConstraint === preset
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-100 hover:border-amber-300'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-amber-900 leading-relaxed bg-amber-100/80 p-2.5 rounded-xl border border-amber-200">
              💡 <strong>排單更順暢說明：</strong>只要在此填寫時間限制（例如改為「09:30前」），按下下方確認按鈕後，禾禾園物流系統就會<strong>自動把這家客戶調到適合的時段前抵達</strong>，並即時重排所有站點抵達時間！
            </p>
          </div>

          {/* Key Setting 2: Unload Duration */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-emerald-600" />
                <span>此店家預計下貨耗時 (分鐘)</span>
              </label>
              <span className="text-xs text-slate-500">預設為 20 分鐘</span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                min={5}
                max={120}
                value={unloadDuration}
                onChange={e => setUnloadDuration(Number(e.target.value))}
                className="w-28 px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <div className="flex flex-wrap gap-1">
                {[15, 20, 25, 30, 40].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setUnloadDuration(mins)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                      unloadDuration === mins
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {mins}分
                  </button>
                ))}
              </div>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              若此客戶箱數特多或進貨驗收耗時較長，可設定為 30~45 分鐘。
            </span>
          </div>

          {/* Store Name & Floor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">店家 / 客戶名稱</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">樓層 / 櫃位</label>
              <input
                type="text"
                value={floor}
                onChange={e => setFloor(e.target.value)}
                placeholder="例如 1F, 4F, B2"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">送貨地址</label>
            <input
              type="text"
              required
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Amount Breakdown */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>送貨金額 (自動換算未稅與 5% 稅額)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-500 text-[11px] mb-1">未稅金額 (NT$)</label>
                <input
                  type="number"
                  value={untaxedAmount}
                  onChange={e =>
                    handleUntaxedChange(e.target.value ? Number(e.target.value) : '')
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] mb-1">5% 營業稅 (NT$)</label>
                <input
                  type="number"
                  value={taxAmount}
                  onChange={e => setTaxAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-rose-800 font-bold text-[11px] mb-1">
                  含稅總額 (NT$)
                </label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={e => handleTotalChange(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-2.5 py-1.5 bg-white border border-rose-400 rounded-lg font-mono font-bold text-rose-700"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">下貨注意事項 / 備註</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="例如：門口臨停卸貨，請打雙黃燈；需向警衛換證"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>

          {/* Footer Confirmation Buttons */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition cursor-pointer"
            >
              取消
            </button>

            {/* The Main Confirmation and Instant Re-optimization Button */}
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-700 to-red-800 hover:from-rose-800 hover:to-red-900 text-white font-extrabold text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>確認儲存並即時重新調整路線</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
