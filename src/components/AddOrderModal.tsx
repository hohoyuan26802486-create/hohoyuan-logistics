import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Type,
  Mic,
  MicOff,
  Sparkles,
  Upload,
  AlertCircle,
  CheckCircle,
  FileText,
  DollarSign,
  Clock,
  MapPin,
  Building,
} from 'lucide-react';
import type { RawOrder } from '../types/logistics';
import { geocodeAddress } from '../utils/geo';

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddOrder: (order: RawOrder) => void;
}

export const AddOrderModal: React.FC<AddOrderModalProps> = ({
  isOpen,
  onClose,
  onAddOrder,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'text' | 'voice'>('camera');

  // Form states
  const [orderNo, setOrderNo] = useState('');
  const [slipSequence, setSlipSequence] = useState('');
  const [storeName, setStoreName] = useState('');
  const [department, setDepartment] = useState('');
  const [address, setAddress] = useState('');
  const [floor, setFloor] = useState('1F');
  const [untaxedAmount, setUntaxedAmount] = useState<number | ''>('');
  const [taxAmount, setTaxAmount] = useState<number | ''>('');
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [timeConstraint, setTimeConstraint] = useState('無限制');
  const [unloadDuration, setUnloadDuration] = useState(20);
  const [notes, setNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // OCR state
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Speech Recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  if (!isOpen) return null;

  // Auto tax calculator
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

  // OCR file handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setPhotoPreview(base64Data);
      await performOcr(base64Data, file.type);
    };
    reader.readAsDataURL(file);
  };

  const performOcr = async (base64Data: string, mimeType: string) => {
    setIsOcrLoading(true);
    setOcrError(null);
    setOcrSuccessMsg(null);

    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: mimeType || 'image/jpeg',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'OCR 辨識失敗');
      }

      const o = data.order;
      if (o.orderNo) setOrderNo(o.orderNo);
      if (o.slipSequence) setSlipSequence(o.slipSequence);
      setStoreName(o.storeName || '');
      setDepartment(o.department || '主廚房');
      setAddress(o.address || '');
      setFloor(o.floor || '1F');
      setUntaxedAmount(o.untaxedAmount || '');
      setTaxAmount(o.taxAmount || '');
      setTotalAmount(o.totalAmount || '');
      setTimeConstraint(o.timeConstraint || '無限制');
      setUnloadDuration(o.unloadDuration || 20);
      setNotes(o.notes || '');

      setOcrSuccessMsg('🎉 訂單辨識成功！請核對下方欄位，確認後點擊「加入排單」。');
    } catch (err: any) {
      console.error(err);
      setOcrError(err.message || '連線錯誤，請手動確認填寫。');
    } finally {
      setIsOcrLoading(false);
    }
  };

  // Preset sample receipts for drivers to test in 1-click
  const handleLoadSampleReceipt = (type: 'din_tai_fung' | 'shin_yeh' | 'thai_town') => {
    if (type === 'din_tai_fung') {
      setStoreName('鼎泰豐 (天母SOGO店)');
      setDepartment('蒸籠點心中央廚房');
      setAddress('台北市士林區中山北路六段77號');
      setFloor('B1');
      handleTotalChange(10500);
      setTimeConstraint('10:00前');
      setUnloadDuration(25);
      setNotes('百貨B2卸貨碼頭，自備生鮮推車');
    } else if (type === 'shin_yeh') {
      setStoreName('欣葉台菜 (南西店)');
      setDepartment('冷盤與熱炒B廚房');
      setAddress('台北市中山區南京西路12號');
      setFloor('8F');
      handleTotalChange(8400);
      setTimeConstraint('11:00前');
      setUnloadDuration(20);
      setNotes('中山北路側貨梯');
    } else {
      setStoreName('瓦城泰統 (天母大葉高島屋)');
      setDepartment('泰國米與香料庫');
      setAddress('台北市士林區忠誠路二段55號');
      setFloor('12F');
      handleTotalChange(9800);
      setTimeConstraint('11:30前');
      setUnloadDuration(20);
      setNotes('高島屋貨梯');
    }
    setOcrSuccessMsg('已載入示範出貨單資料！確認無誤可點擊加入。');
  };

  // Voice Dictation
  const handleToggleVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('您的瀏覽器不支援語音辨識 API，建議使用 Chrome 或 Edge 瀏覽器。');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-TW';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setVoiceTranscript(currentTranscript);

        // Smart parse keyword extraction
        if (currentTranscript.includes('鼎泰豐')) setStoreName('鼎泰豐');
        if (currentTranscript.includes('瓦城')) setStoreName('瓦城泰統');
        if (currentTranscript.includes('欣葉')) setStoreName('欣葉台菜');
        if (currentTranscript.includes('王品')) setStoreName('王品牛排');
        if (currentTranscript.includes('海底撈')) setStoreName('海底撈火鍋');

        // Extract amount if spoken
        const amtMatch = currentTranscript.match(/([0-9]{3,6})/);
        if (amtMatch) {
          handleTotalChange(parseInt(amtMatch[1], 10));
        }

        // Time constraint
        if (currentTranscript.includes('10點半') || currentTranscript.includes('10:30')) {
          setTimeConstraint('10:30前');
        } else if (currentTranscript.includes('11點') || currentTranscript.includes('11:00')) {
          setTimeConstraint('11:00前');
        } else if (currentTranscript.includes('9點半') || currentTranscript.includes('09:30')) {
          setTimeConstraint('09:30前');
        }
      };

      recognition.onerror = (e: any) => {
        console.error('Speech error', e);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error(e);
      setIsRecording(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !address.trim()) {
      alert('請填寫客戶店名與送貨地址！');
      return;
    }

    const total = typeof totalAmount === 'number' ? totalAmount : 0;
    const untaxed = typeof untaxedAmount === 'number' ? untaxedAmount : Math.round(total / 1.05);
    const tax = typeof taxAmount === 'number' ? taxAmount : total - untaxed;

    const geo = geocodeAddress(address);

    const newOrder: RawOrder = {
      id: 'ord-' + Date.now(),
      orderNo: orderNo.trim() || ('HHY-' + Date.now().toString().slice(-6)),
      slipSequence: slipSequence.trim() || undefined,
      storeName: storeName.trim(),
      department: department.trim() || '主廚房',
      address: address.trim(),
      floor: floor.trim() || '1F',
      untaxedAmount: untaxed,
      taxAmount: tax,
      totalAmount: total,
      timeConstraint: timeConstraint.trim() || '無限制',
      unloadDuration: Number(unloadDuration) || 20,
      notes: notes.trim(),
      directionArea: geo.area,
      lat: geo.lat,
      lng: geo.lng,
      photoUrl: photoPreview || undefined,
      status: 'pending',
      createdAt: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
    };

    onAddOrder(newOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-red-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">新增送貨點 / 訂單</h3>
              <p className="text-xs text-rose-200">
                支援拍照 OCR 自動辨識、語音聽寫建單或快速填寫
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

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 bg-slate-100 p-1 border-b border-slate-200 text-xs sm:text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`py-2.5 flex items-center justify-center gap-1.5 rounded-xl transition cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-white text-rose-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4 text-rose-600" />
            <span>1. 拍照辨識 OCR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`py-2.5 flex items-center justify-center gap-1.5 rounded-xl transition cursor-pointer ${
              activeTab === 'voice'
                ? 'bg-white text-rose-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mic className="w-4 h-4 text-amber-600" />
            <span>2. 語音聽寫建單</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`py-2.5 flex items-center justify-center gap-1.5 rounded-xl transition cursor-pointer ${
              activeTab === 'text'
                ? 'bg-white text-rose-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Type className="w-4 h-4 text-blue-600" />
            <span>3. 文字快速填寫</span>
          </button>
        </div>

        {/* Content Area */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* TAB 1: Camera & OCR */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-rose-300 rounded-2xl p-5 text-center bg-rose-50/40">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {photoPreview ? (
                  <div className="relative inline-block max-w-[200px] rounded-xl overflow-hidden shadow-md border border-rose-300">
                    <img src={photoPreview} alt="Receipt" className="w-full h-auto object-cover" />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-xs px-2 py-1 rounded-lg"
                    >
                      重新拍照
                    </button>
                  </div>
                ) : (
                  <div>
                    <Camera className="w-10 h-10 text-rose-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800">
                      點選此處啟動相機拍照或選擇出貨單照片
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Gemini AI 自動辨識店名、地址、金額、樓層及備註
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold px-4 py-2 rounded-xl shadow cursor-pointer"
                    >
                      開啟相機 / 上傳訂單
                    </button>
                  </div>
                )}

                {isOcrLoading && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-rose-800 font-bold text-xs animate-pulse">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                    <span>Gemini 3.8 正在辨識發票單據資訊中，請稍候...</span>
                  </div>
                )}
              </div>

              {/* Fast test preset buttons */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500 font-semibold mr-2">快速載入示範出貨單：</span>
                <div className="inline-flex flex-wrap gap-1.5 mt-1 sm:mt-0">
                  <button
                    type="button"
                    onClick={() => handleLoadSampleReceipt('din_tai_fung')}
                    className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded-lg"
                  >
                    鼎泰豐 (蒸籠點心廚房)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSampleReceipt('shin_yeh')}
                    className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded-lg"
                  >
                    欣葉台菜 (南西B廚房)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSampleReceipt('thai_town')}
                    className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded-lg"
                  >
                    瓦城 (天母高島屋)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Voice Dictation */}
          {activeTab === 'voice' && (
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-center space-y-3">
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-lg transition active:scale-95 cursor-pointer ${
                  isRecording
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                }`}
              >
                {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {isRecording ? '正在聆聽司機語音...請說話' : '點擊麥克風開始語音聽寫'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  例如說：「欣葉台菜 南西店 8樓B廚房 金額八千四 11點前到」
                </p>
              </div>
              {voiceTranscript && (
                <div className="bg-white p-2.5 rounded-xl border border-amber-200 text-xs text-slate-700 text-left font-mono">
                  辨識文字：{voiceTranscript}
                </div>
              )}
            </div>
          )}

          {/* OCR Feedback messages */}
          {ocrSuccessMsg && (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-300 p-2.5 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{ocrSuccessMsg}</span>
            </div>
          )}
          {ocrError && (
            <div className="bg-rose-50 text-rose-800 border border-rose-300 p-2.5 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{ocrError}</span>
            </div>
          )}

          {/* 3-Slip Invoice Photography Advice Banner */}
          <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-3.5 text-xs space-y-1.5 text-amber-950 shadow-2xs">
            <div className="font-extrabold flex items-center gap-1.5 text-amber-900 text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>拍照建議：同一客戶若有 3 張單據，強烈建議【一張一張拍 (分開拍)】！</span>
            </div>
            <div className="text-[11px] leading-relaxed text-amber-900/90 space-y-1 pl-5 list-disc">
              <div>
                <strong>① 單張近拍最清晰</strong>：能 100% 精準辨識右上角「單據號碼」、「單據流水號 (1/3、2/3)」與未稅/稅額金額，避免鏡頭拉遠邊角反光模糊。
              </div>
              <div>
                <strong>② 系統自動合併送貨點</strong>：分開拍請放心！系統會根據【同店名＋同地址】自動合併為同一個送貨站點，司機只停一次車！
              </div>
              <div>
                <strong>③ 會計 Excel 報表完整分列</strong>：匯出時系統會清楚列出每一張流水號（1/3、2/3）與對應金額，會計對帳、請款完全不混亂！
              </div>
            </div>
          </div>

          {/* Form Fields Section */}
          <div className="border-t border-slate-200 pt-3 space-y-3 text-xs sm:text-sm">
            {/* Slip Number and Sequence */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  單據號碼 (報表右上角)
                </label>
                <input
                  type="text"
                  placeholder="例如：HHY-89211 或發票號"
                  value={orderNo}
                  onChange={e => setOrderNo(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  單據流水號 / 聯次 (例如 1/3, 2/3, 3/3)
                </label>
                <input
                  type="text"
                  placeholder="例如：1/3、第1聯、A-01"
                  value={slipSequence}
                  onChange={e => setSlipSequence(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  客戶 / 店家名稱 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：欣葉台菜、瓦城泰統、鼎泰豐"
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  廚房 / 部門 / 專櫃 (同一客戶多廚房時區分)
                </label>
                <input
                  type="text"
                  placeholder="例如：A廚房、點心廚房、B2冷食部"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">
                  送貨地址 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：台北市信義區松高路12號"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  樓層 / 櫃位
                </label>
                <input
                  type="text"
                  placeholder="例如：4F、B2、1F"
                  value={floor}
                  onChange={e => setFloor(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Financials: Untaxed + Tax 5% + Total */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="font-bold text-slate-700 mb-2 flex items-center justify-between">
                <span>送貨金額 (自動拆算未稅與應稅金額)</span>
                <span className="text-[11px] font-normal text-slate-500">
                  填未稅或含稅，系統自動即時換算5%稅額
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-600 text-xs mb-1">未稅金額 (NT$)</label>
                  <input
                    type="number"
                    placeholder="例如 8000"
                    value={untaxedAmount}
                    onChange={e =>
                      handleUntaxedChange(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 text-xs mb-1">應稅金額 5% (NT$)</label>
                  <input
                    type="number"
                    placeholder="400"
                    value={taxAmount}
                    onChange={e =>
                      setTaxAmount(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-emerald-800 font-bold text-xs mb-1">含稅總計 (NT$)</label>
                  <input
                    type="number"
                    placeholder="8400"
                    value={totalAmount}
                    onChange={e =>
                      handleTotalChange(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-emerald-400 rounded-lg font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Time constraint and special unload time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  客戶時間限制 (幾點前要到)
                </label>
                <input
                  type="text"
                  placeholder="例如：09:30前、10:30前、避開12:00-13:00"
                  value={timeConstraint}
                  onChange={e => setTimeConstraint(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  預計卸貨耗時 (分鐘)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={unloadDuration}
                    onChange={e => setUnloadDuration(Number(e.target.value))}
                    className="w-24 px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <span className="text-xs text-slate-500">
                    預設20分；若大型下貨或逐箱過磅可自訂30~45分
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                特殊下貨備註
              </label>
              <input
                type="text"
                placeholder="例如：地下卸貨碼頭需向警衛換證、自備板車、貨梯限高2.1M"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition"
            >
              取消
            </button>

            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer"
            >
              確認加入排單
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
