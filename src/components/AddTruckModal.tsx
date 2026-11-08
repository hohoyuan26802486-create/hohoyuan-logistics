import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  User,
  PhoneCall,
  Clock,
  ShieldCheck,
  MapPin,
  PlusCircle,
  Save,
} from 'lucide-react';
import type { TruckItem } from '../types/logistics';

interface AddTruckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTruck: (newTruck: TruckItem) => void;
  onUpdateTruck?: (updatedTruck: TruckItem) => void;
  editingTruck?: TruckItem | null;
  currentCount: number;
}

export const AddTruckModal: React.FC<AddTruckModalProps> = ({
  isOpen,
  onClose,
  onAddTruck,
  onUpdateTruck,
  editingTruck,
  currentCount,
}) => {
  const [truckNumber, setTruckNumber] = useState<number>(currentCount + 1);
  const [truckPlate, setTruckPlate] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [zoneName, setZoneName] = useState('');
  const [departureTime, setDepartureTime] = useState('08:00');
  const [truckCapacityLimit, setTruckCapacityLimit] = useState(120000);

  useEffect(() => {
    if (editingTruck) {
      setTruckNumber(editingTruck.truckNumber);
      setTruckPlate(editingTruck.truckPlate);
      setDriverName(editingTruck.driverName);
      setDriverPhone(editingTruck.driverPhone);
      setZoneName(editingTruck.zoneName);
      setDepartureTime(editingTruck.departureTime || '08:00');
      setTruckCapacityLimit(editingTruck.truckCapacityLimit || 120000);
    } else {
      const nextNum = currentCount + 1;
      setTruckNumber(nextNum);
      setTruckPlate('');
      setDriverName('');
      setDriverPhone('');
      setZoneName(`${nextNum}號車 (新增路線)`);
      setDepartureTime('08:00');
      setTruckCapacityLimit(120000);
    }
  }, [editingTruck, currentCount, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!truckPlate.trim() || !driverName.trim()) {
      alert('請填寫車牌號碼與司機姓名！');
      return;
    }

    if (editingTruck && onUpdateTruck) {
      onUpdateTruck({
        ...editingTruck,
        truckNumber: Number(truckNumber) || editingTruck.truckNumber,
        truckPlate: truckPlate.trim().toUpperCase(),
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        zoneName: zoneName.trim() || `${truckNumber}號車`,
        departureTime: departureTime.trim() || '08:00',
        truckCapacityLimit: Number(truckCapacityLimit) || 120000,
      });
    } else {
      const newId = `truck-${Date.now()}`;
      const newTruck: TruckItem = {
        id: newId,
        truckNumber: Number(truckNumber) || currentCount + 1,
        truckPlate: truckPlate.trim().toUpperCase(),
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim() || '0900-000-000',
        zoneName: zoneName.trim() || `${truckNumber}號車 (新路線)`,
        departureTime: departureTime.trim() || '08:00',
        truckCapacityLimit: Number(truckCapacityLimit) || 120000,
        orders: [],
      };
      onAddTruck(newTruck);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-red-950 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {editingTruck ? '編輯貨車車輛資訊' : '新增車隊貨車 (擴充車隊)'}
              </h3>
              <p className="text-xs text-rose-200">
                {editingTruck ? '修改該車司機、車牌或責任路線' : '隨時擴充第 17 台、18 台或更多貨車'}
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
          {/* Truck Number & Plate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                車輛編號 (第幾號車) <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={999}
                  required
                  value={truckNumber}
                  onChange={e => setTruckNumber(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <span className="text-xs text-slate-500 font-bold shrink-0">號車</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                車牌號碼 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="例如：ABC-5678"
                value={truckPlate}
                onChange={e => setTruckPlate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Driver Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>配送司機姓名 <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                required
                placeholder="例如：黃俊宏"
                value={driverName}
                onChange={e => setDriverName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <PhoneCall className="w-3.5 h-3.5 text-slate-500" />
                <span>司機聯絡手機</span>
              </label>
              <input
                type="tel"
                placeholder="例如：0912-345-678"
                value={driverPhone}
                onChange={e => setDriverPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Zone / Trip Name */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>責任路線 / 車次名稱</span>
            </label>
            <input
              type="text"
              placeholder={`例如：${truckNumber}號車 (基隆汐止暖暖專線)`}
              value={zoneName}
              onChange={e => setZoneName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
            />
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              讓後勤與司機一眼辨別負責區域，例如「汐止基隆線」、「新竹竹北線」。
            </span>
          </div>

          {/* Departure Time & Capacity Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>總公司預設出發時間</span>
              </label>
              <input
                type="time"
                value={departureTime}
                onChange={e => setDepartureTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>載貨金額空間上限 (NT$)</span>
              </label>
              <input
                type="number"
                step={5000}
                value={truckCapacityLimit}
                onChange={e => setTruckCapacityLimit(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
          </div>

          <div className="p-3 bg-rose-50 text-rose-900 border border-rose-200 rounded-2xl text-[11px] leading-relaxed">
            💡 <strong>即時連網提示：</strong>新增後，該台貨車會立刻出現在頂部切換選單與後勤查單大看板，司機即可在車上打開手機切換到該車開始拍照送貨！
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-extrabold shadow-md transition active:scale-95 cursor-pointer"
            >
              {editingTruck ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
              <span>{editingTruck ? '儲存車輛修改' : '確認新增貨車'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
