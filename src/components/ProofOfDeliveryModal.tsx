import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Upload,
  FileText,
  DollarSign,
  Send,
  Trash2,
  Edit3,
  PenTool,
  Check,
  ShieldCheck,
  Building2,
  RefreshCw,
  FolderCheck,
  ExternalLink,
} from 'lucide-react';
import type { DeliveryStop, CompanyConfig, ProofOfDeliveryRecord } from '../types/logistics';

interface ProofOfDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  stop: DeliveryStop | null;
  config: CompanyConfig;
  onConfirmDelivery: (stopId: string, podRecord: ProofOfDeliveryRecord) => Promise<void> | void;
}

export const ProofOfDeliveryModal: React.FC<ProofOfDeliveryModalProps> = ({
  isOpen,
  onClose,
  stop,
  config,
  onConfirmDelivery,
}) => {
  // Number of expected slips (default to subOrders count or 1)
  const defaultExpectedCount = stop ? Math.max(1, stop.subOrders?.length || 1) : 1;
  const [expectedSlipCount, setExpectedSlipCount] = useState<number>(defaultExpectedCount);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSignatureVerified, setIsSignatureVerified] = useState<boolean>(false);
  
  // Issue / Modification reporting state
  const [hasIssue, setHasIssue] = useState<boolean>(false);
  const [issueType, setIssueType] = useState<ProofOfDeliveryRecord['issueType']>('damaged');
  const [actualAmount, setActualAmount] = useState<number>(stop?.totalAmount || 0);
  const [issueNotes, setIssueNotes] = useState<string>('');
  const [issuePhotoUrl, setIssuePhotoUrl] = useState<string>('');

  // Digital Screen Signature
  const [showSignaturePad, setShowSignaturePad] = useState<boolean>(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  // Hidden file inputs
  const slipCameraInputRef = useRef<HTMLInputElement | null>(null);
  const issueCameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (stop) {
      const expected = Math.max(1, stop.subOrders?.length || 1);
      setExpectedSlipCount(expected);
      setPhotos(stop.proofOfDelivery?.photos || []);
      setIsSignatureVerified(stop.proofOfDelivery?.isSignatureVerified ?? false);
      setHasIssue(stop.proofOfDelivery?.hasIssue ?? false);
      setIssueType(stop.proofOfDelivery?.issueType || 'damaged');
      setActualAmount(stop.proofOfDelivery ? stop.proofOfDelivery.actualAmount : stop.totalAmount);
      setIssueNotes(stop.proofOfDelivery?.issueNotes || '');
      setIssuePhotoUrl(stop.proofOfDelivery?.issuePhotoUrl || '');
      setSignatureDataUrl(stop.proofOfDelivery?.signatureDataUrl || '');
      setShowSignaturePad(false);
      setPushStatus(null);
    }
  }, [stop]);

  if (!isOpen || !stop) return null;

  const originalAmount = stop.totalAmount;
  const differenceAmount = hasIssue ? originalAmount - actualAmount : 0;
  const isSlipCountMatched = photos.length >= expectedSlipCount;

  // Handle Photo upload / capture
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setPhotos(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleIssuePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setIssuePhotoUrl(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== index));
  };

  // Canvas drawing handlers for touch / mouse signature
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureDataUrl(canvas.toDataURL('image/png'));
      setIsSignatureVerified(true);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignatureDataUrl('');
  };

  // Issue type labels
  const issueTypeMap: Record<string, string> = {
    amount_modified: '金額現場手動更正 / 折讓',
    damaged: '貨品破損 / 瑕疵退回',
    shortage: '品項短少 / 廚房漏裝',
    defrosted: '冷鏈退冰 / 溫度異常變質',
    rejected: '客戶無故拒收 / 整批退回',
    rescheduled: '店家未開門 / 協調改期再送',
    other: '其他現場突發狀況',
  };

  // Telegram message builder
  const buildTelegramPushText = (record: ProofOfDeliveryRecord) => {
    const isIssue = record.hasIssue;
    const now = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    
    let text = isIssue
      ? `🚨 <b>【禾禾園物流 • 貨況異常/單據修改即時通報】</b>\n`
      : `✅ <b>【禾禾園物流 • 現場簽收核銷通報】</b>\n`;
    
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👤 <b>配送司機：</b>${config.driverName} (車牌: ${config.truckPlate})\n`;
    text += `🏪 <b>送達店家：</b>${stop.storeName} (${stop.floor})\n`;
    text += `📍 <b>店家地址：</b>${stop.address}\n`;
    text += `⏰ <b>完成時間：</b>${now}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📄 <b>單據核驗比對：</b>應有 ${record.expectedSlipCount} 張 ➔ 實拍 ${record.actualSlipCount} 張 ${record.isSlipCountMatched ? '✅ (張數吻合齊全)' : '⚠️ (張數不符)'}\n`;
    text += `✍️ <b>客戶簽核：</b>${record.isSignatureVerified ? '已確認蓋章/簽名 ✅' : '現場未簽章 ⚠️'}\n`;

    if (isIssue) {
      text += `━━━━━━━━━━━━━━━━━━━━\n`;
      text += `⚠️ <b>異常類別：</b>${record.issueTypeName}\n`;
      text += `💵 <b>原單應收：</b>NT$ ${record.originalAmount.toLocaleString()}\n`;
      text += `💰 <b>實收/修改後：</b>NT$ ${record.actualAmount.toLocaleString()}\n`;
      if (record.differenceAmount !== 0) {
        text += `📉 <b>差額/折讓：</b>NT$ ${record.differenceAmount.toLocaleString()}\n`;
      }
      text += `📝 <b>司機現場回報備註：</b>\n<i>${record.issueNotes || '無額外備註'}</i>\n`;
    } else {
      text += `💵 <b>含稅總金額：</b>NT$ ${record.actualAmount.toLocaleString()} (未稅: NT$ ${stop.untaxedAmount.toLocaleString()})\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📁 <b>雲端存證位置：</b>Google Drive「禾禾園物流簽收單圖庫」\n`;
    text += `📊 <b>對帳資料庫：</b>已同步備份至「禾禾園物流系統資料庫」`;
    return text;
  };

  // Push to Telegram Bot API
  const pushToTelegram = async (record: ProofOfDeliveryRecord) => {
    const botToken = config.telegramConfig?.botToken?.trim();
    const chatId = config.telegramConfig?.chatId?.trim();

    if (!botToken || !chatId) {
      return false;
    }

    try {
      const messageText = buildTelegramPushText(record);
      // 1. Try server-side proxy endpoint first to bypass browser CORS
      try {
        const proxyRes = await fetch('/api/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            botToken,
            chatId,
            message: messageText,
            parseMode: 'HTML',
          }),
        });
        const proxyData = await proxyRes.json();
        if (proxyRes.ok && proxyData.success) {
          return true;
        }
      } catch {
        // continue to fallback
      }

      // 2. Fallback direct call
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: 'HTML',
        }),
      });

      const resData = await response.json();
      return resData.ok === true;
    } catch {
      return false;
    }
  };

  // Final submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setPushStatus('正在比對單據與儲存存證...');

    const now = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    const podRecord: ProofOfDeliveryRecord = {
      photos,
      expectedSlipCount,
      actualSlipCount: photos.length,
      isSlipCountMatched: photos.length >= expectedSlipCount,
      isSignatureVerified,
      signatureDataUrl: signatureDataUrl || undefined,
      hasIssue,
      issueType: hasIssue ? issueType : undefined,
      issueTypeName: hasIssue && issueType ? issueTypeMap[issueType] : undefined,
      originalAmount,
      actualAmount: hasIssue ? Number(actualAmount) : originalAmount,
      differenceAmount: hasIssue ? originalAmount - Number(actualAmount) : 0,
      issueNotes: hasIssue ? issueNotes : undefined,
      issuePhotoUrl: hasIssue && issuePhotoUrl ? issuePhotoUrl : undefined,
      reportedAt: now,
      telegramPushed: false,
    };

    // Attempt Telegram Push
    if (config.telegramConfig?.botToken && config.telegramConfig?.chatId) {
      setPushStatus('正在推播通知至 Telegram 物流群...');
      const pushSuccess = await pushToTelegram(podRecord);
      podRecord.telegramPushed = pushSuccess;
    }

    await onConfirmDelivery(stop.id, podRecord);
    setIsSubmitting(false);
    onClose();
  };

  // One-click share to Telegram app (direct link fallback)
  const handleOpenTelegramApp = () => {
    const now = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    const sampleRecord: ProofOfDeliveryRecord = {
      photos,
      expectedSlipCount,
      actualSlipCount: photos.length,
      isSlipCountMatched: photos.length >= expectedSlipCount,
      isSignatureVerified,
      hasIssue,
      issueType: hasIssue ? issueType : undefined,
      issueTypeName: hasIssue && issueType ? issueTypeMap[issueType] : undefined,
      originalAmount,
      actualAmount: hasIssue ? Number(actualAmount) : originalAmount,
      differenceAmount: hasIssue ? originalAmount - Number(actualAmount) : 0,
      issueNotes: hasIssue ? issueNotes : undefined,
      reportedAt: now,
    };

    const text = buildTelegramPushText(sampleRecord).replace(/<[^>]*>/g, '');
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent('https://ais-pre-et32yruz3pi6ao4rddai5x-35700872035.asia-east1.run.app')}&text=${encodeURIComponent(text)}`;
    window.open(tgUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-red-950 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-rose-800 text-rose-200 px-2 py-0.5 rounded-full border border-rose-700">
                  第 {stop.sequence} 站送達核銷
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {stop.storeName}
                </h3>
              </div>
              <p className="text-xs text-rose-200 mt-0.5">
                線上單據拍照交叉比對 • 防漏簽核查 • 貨況即時連線 Telegram
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
          
          {/* Section 1: Store & Order Snapshot */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-xs">配送地址：</span>
              <span className="font-bold text-slate-800 text-right">{stop.address} ({stop.floor})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-xs">應收含稅總額：</span>
              <span className="font-mono font-extrabold text-rose-700 text-sm">
                NT$ {originalAmount.toLocaleString()}
                <span className="text-xs text-slate-400 font-normal ml-1">
                  (未稅 NT$ {stop.untaxedAmount.toLocaleString()})
                </span>
              </span>
            </div>
            {stop.subOrders && stop.subOrders.length > 1 && (
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-amber-800">
                <span>合併廚房單據：</span>
                <span className="font-bold">
                  {stop.subOrders.map(s => `${s.department} (${s.slipSequence || '單'})`).join('、')}
                </span>
              </div>
            )}
          </div>

          {/* Section 2: Slip Count Cross-Check & Camera Capture */}
          <div className="bg-rose-50/50 p-4 rounded-2xl border-2 border-rose-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-rose-950 text-sm">
                <FileText className="w-4 h-4 text-rose-700" />
                <span>送貨單據拍照與張數交叉比對</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">本站應有單據：</span>
                <select
                  value={expectedSlipCount}
                  onChange={e => setExpectedSlipCount(Number(e.target.value))}
                  className="bg-white border border-rose-300 rounded-lg px-2 py-1 font-bold text-rose-800 text-xs"
                >
                  <option value={1}>1 張單據</option>
                  <option value={2}>2 張單據 (連單/分批)</option>
                  <option value={3}>3 張單據 (三聯/多廚房)</option>
                  <option value={4}>4 張單據</option>
                  <option value={5}>5 張以上</option>
                </select>
              </div>
            </div>

            {/* Cross-Check Indicator */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                isSlipCountMatched
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-amber-50 text-amber-900 border-amber-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {isSlipCountMatched ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                )}
                <span className="font-bold">
                  {isSlipCountMatched
                    ? `✅ 單據張數核對吻合：已拍 ${photos.length} / ${expectedSlipCount} 張，資料齊全！`
                    : `⚠️ 單據尚未齊全：目前已拍 ${photos.length} 張，尚缺 ${expectedSlipCount - photos.length} 張！請補拍防漏帶回。`}
                </span>
              </div>
              <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded-full bg-white shadow-2xs">
                {photos.length} / {expectedSlipCount}
              </span>
            </div>

            {/* Photos Preview Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {photos.map((url, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white aspect-4/3 shadow-2xs">
                    <img src={url} alt={`單據 ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                      第 {idx + 1} 張
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-md shadow transition"
                      title="刪除重拍"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Trigger Camera input */}
            <div className="flex gap-2">
              <input
                ref={slipCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhotoCapture}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => slipCameraInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-xs shadow-md transition active:scale-95 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>
                  {photos.length === 0
                    ? '📸 點擊開啟相機 拍照回傳單據'
                    : `📸 繼續加拍第 ${photos.length + 1} 張單據`}
                </span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              💡 <strong>防呆小幫手：</strong>可連續拍多張紙本單據（如右上角單號、流水號 1、2、3），系統自動對照張數。
            </p>
          </div>

          {/* Section 3: Signature & Stamp Check */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSignatureVerified}
                  onChange={e => setIsSignatureVerified(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                />
                <span className="font-bold text-slate-800 text-xs sm:text-sm">
                  已確認紙本單據有「客戶簽名或店家圓戳店章」
                </span>
              </label>

              <button
                type="button"
                onClick={() => setShowSignaturePad(!showSignaturePad)}
                className="flex items-center gap-1 text-xs text-rose-700 hover:text-rose-800 font-bold underline cursor-pointer"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>{showSignaturePad ? '收合電子簽名' : '開啟手機螢幕手寫簽名'}</span>
              </button>
            </div>

            {/* Optional Digital Screen Signature Pad */}
            {showSignaturePad && (
              <div className="p-3 bg-white rounded-xl border border-slate-300 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>請讓店長或收貨同仁在下方灰色區塊用手指簽名：</span>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="flex items-center gap-1 text-slate-400 hover:text-rose-600 text-[11px]"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>清除重簽</span>
                  </button>
                </div>
                <div className="border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-slate-50 touch-none">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={120}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-28 bg-white cursor-crosshair"
                  />
                </div>
                {signatureDataUrl && (
                  <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>已成功採集電子簽名</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Exception & Slip Modification Online Form */}
          <div
            className={`p-4 rounded-2xl border-2 transition ${
              hasIssue ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'
            } space-y-3`}
          >
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasIssue}
                  onChange={e => setHasIssue(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                />
                <span className="font-extrabold text-amber-950 text-xs sm:text-sm flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>單據有修改 或 貨況商品有問題（直接線上填寫即時通報）</span>
                </span>
              </label>
              {hasIssue && (
                <span className="text-[10px] font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                  將發送異常警示
                </span>
              )}
            </div>

            {hasIssue && (
              <div className="space-y-3 pt-2 border-t border-amber-200 animate-in fade-in duration-200">
                {/* Issue Type */}
                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1">
                    異常與修改類型：
                  </label>
                  <select
                    value={issueType}
                    onChange={e => setIssueType(e.target.value as ProofOfDeliveryRecord['issueType'])}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-bold text-slate-800 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="damaged">📦 貨品破損 / 瑕疵退回</option>
                    <option value="amount_modified">💵 金額現場手動更正 / 折讓</option>
                    <option value="shortage">📉 品項短少 / 廚房漏裝</option>
                    <option value="defrosted">❄️ 冷鏈退冰 / 溫度異常變質</option>
                    <option value="rejected">❌ 客戶無故拒收 / 整批退回</option>
                    <option value="rescheduled">🕒 店家未開門 / 協調改期再送</option>
                    <option value="other">📝 其他現場突發狀況</option>
                  </select>
                </div>

                {/* Amount modification comparison */}
                <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-amber-200">
                  <div>
                    <label className="block text-slate-500 text-[11px] mb-1">原單應收金額</label>
                    <div className="font-mono font-bold text-slate-500 text-sm">
                      NT$ {originalAmount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-rose-800 font-bold text-[11px] mb-1">
                      現場實收 / 修改後金額 (NT$)
                    </label>
                    <input
                      type="number"
                      value={actualAmount}
                      onChange={e => setActualAmount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-rose-400 rounded-lg font-mono font-extrabold text-rose-700 text-sm outline-none"
                    />
                  </div>
                  {differenceAmount !== 0 && (
                    <div className="col-span-2 text-xs font-bold text-rose-600 flex items-center justify-between border-t border-slate-100 pt-1.5">
                      <span>差額 / 扣款折讓金額：</span>
                      <span className="font-mono">
                        {differenceAmount > 0 ? `-${differenceAmount.toLocaleString()}` : `+${Math.abs(differenceAmount).toLocaleString()}`} NT$
                      </span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1">
                    現場狀況說明 / 單據修改備註：
                  </label>
                  <textarea
                    rows={2}
                    value={issueNotes}
                    onChange={e => setIssueNotes(e.target.value)}
                    placeholder="例如：店長反映油豆腐破損兩箱，已在紙本單據手寫劃除扣 $450，實收 $2,800，店長已簽章核驗"
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                  />
                </div>

                {/* Issue Photo */}
                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1">
                    瑕疵商品或單據手寫更正處拍照佐證：
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={issueCameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleIssuePhotoCapture}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => issueCameraInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs border border-amber-300 transition cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-700" />
                      <span>{issuePhotoUrl ? '重新拍攝問題佐證照' : '拍下破損或修改處'}</span>
                    </button>
                    {issuePhotoUrl && (
                      <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>已附上佐證照片</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cloud Storage & Telegram Notice Banner */}
          <div className="p-3 bg-slate-100 rounded-2xl text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <FolderCheck className="w-3.5 h-3.5 text-rose-700" />
              <span>自動同步至主管與後勤雲端資料庫：</span>
            </div>
            <p>
              • 簽收單據照片將自動存入 Google Drive<strong>「禾禾園物流簽收單圖庫」</strong><br />
              • 數據與收款金額自動同步至 Google 試算表<strong>「禾禾園物流系統資料庫」</strong><br />
              • 送出後將自動發送推播卡片至 <strong>Telegram 物流群組</strong>，群內人員立即可見！
            </p>
          </div>

          {/* Push Status Notice */}
          {pushStatus && (
            <div className="p-2.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
              <span>{pushStatus}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition cursor-pointer text-xs"
              >
                取消
              </button>
              
              {/* Optional direct Telegram App share button */}
              <button
                type="button"
                onClick={handleOpenTelegramApp}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 text-xs font-bold transition cursor-pointer"
                title="直接在手機 Telegram App 開啟傳送"
              >
                <Send className="w-3.5 h-3.5 text-sky-600" />
                <span>開 Telegram App 傳送</span>
              </button>
            </div>

            {/* Confirm & Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm text-white shadow-md transition active:scale-95 cursor-pointer ${
                hasIssue
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? '處理儲存中...'
                  : hasIssue
                  ? '確認送達並即時發送異常通報'
                  : '確認送達並完成單據核銷'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
