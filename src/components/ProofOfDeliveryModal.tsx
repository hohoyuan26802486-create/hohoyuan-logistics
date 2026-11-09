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
  Plus,
  Package,
  Layers,
  PhoneCall,
  Smartphone,
} from 'lucide-react';
import type { DeliveryStop, CompanyConfig, ProofOfDeliveryRecord, PodItemDetail } from '../types/logistics';

interface ProofOfDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  stop: DeliveryStop | null;
  config: CompanyConfig;
  onConfirmDelivery: (stopId: string, podRecord: ProofOfDeliveryRecord) => Promise<void> | void;
}

// Preset common Ho Hey Yuan products for fast selection
const PRESET_HHY_PRODUCTS = [
  { sku: 'HHY-F001', name: '特級大油豆腐 (冷凍5kg)', unit: '箱' },
  { sku: 'HHY-F008', name: '日式厚炸三角豆腐 (冷凍)', unit: '箱' },
  { sku: 'HHY-C002', name: '手工精選冷藏貢丸 (3kg)', unit: '包' },
  { sku: 'HHY-C015', name: '冷鏈精選黑豬肉絲 (2kg)', unit: '包' },
  { sku: 'HHY-S003', name: '禾禾園秘傳熟成高湯 (10入)', unit: '箱' },
  { sku: 'HHY-V005', name: '手作黃金開胃泡菜 (3kg)', unit: '桶' },
  { sku: 'HHY-M020', name: '香濃冷藏鮮純豆漿 (10L)', unit: '箱' },
];

export const ProofOfDeliveryModal: React.FC<ProofOfDeliveryModalProps> = ({
  isOpen,
  onClose,
  stop,
  config,
  onConfirmDelivery,
}) => {
  // Mode: regular physical slip vs office reprint electronic mode (司機忘記帶單)
  const [isOfficeReprintMode, setIsOfficeReprintMode] = useState<boolean>(false);
  const [officeReprintPhotoUrl, setOfficeReprintPhotoUrl] = useState<string>('');

  // Number of expected slips (default to subOrders count or 1)
  const defaultExpectedCount = stop ? Math.max(1, stop.subOrders?.length || 1) : 1;
  const [expectedSlipCount, setExpectedSlipCount] = useState<number>(defaultExpectedCount);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSignatureVerified, setIsSignatureVerified] = useState<boolean>(false);

  // Item comparison state (沒改品項 vs 有更改/需補貨)
  const [isItemsUnchanged, setIsItemsUnchanged] = useState<boolean>(true);

  // Issue / Modification reporting state
  const [hasIssue, setHasIssue] = useState<boolean>(false);
  const [issueType, setIssueType] = useState<ProofOfDeliveryRecord['issueType']>('replenish_needed');
  const [actualAmount, setActualAmount] = useState<number>(stop?.totalAmount || 0);
  const [issueNotes, setIssueNotes] = useState<string>('');
  const [issuePhotoUrl, setIssuePhotoUrl] = useState<string>('');

  // Replenishment Item details (料號、品名、數量、單位、原因)
  const [replacementItems, setReplacementItems] = useState<PodItemDetail[]>([
    {
      sku: 'HHY-F001',
      name: '特級大油豆腐 (冷凍5kg)',
      quantity: 1,
      unit: '箱',
      reason: '拿錯貨',
      note: '',
    },
  ]);

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
  const officeReprintInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (stop) {
      const expected = Math.max(1, stop.subOrders?.length || 1);
      setExpectedSlipCount(expected);
      setPhotos(stop.proofOfDelivery?.photos || []);
      setIsSignatureVerified(stop.proofOfDelivery?.isSignatureVerified ?? false);
      setIsItemsUnchanged(stop.proofOfDelivery?.isItemsUnchanged ?? true);
      setHasIssue(stop.proofOfDelivery?.hasIssue ?? false);
      setIssueType(stop.proofOfDelivery?.issueType || 'replenish_needed');
      setActualAmount(stop.proofOfDelivery ? stop.proofOfDelivery.actualAmount : stop.totalAmount);
      setIssueNotes(stop.proofOfDelivery?.issueNotes || '');
      setIssuePhotoUrl(stop.proofOfDelivery?.issuePhotoUrl || '');
      setSignatureDataUrl(stop.proofOfDelivery?.signatureDataUrl || '');
      setIsOfficeReprintMode(stop.proofOfDelivery?.isOfficeReprintMode ?? false);
      setOfficeReprintPhotoUrl(stop.proofOfDelivery?.officeReprintPhotoUrl || '');

      if (stop.proofOfDelivery?.replacementItems && stop.proofOfDelivery.replacementItems.length > 0) {
        setReplacementItems(stop.proofOfDelivery.replacementItems);
      } else {
        setReplacementItems([
          {
            sku: 'HHY-F001',
            name: '特級大油豆腐 (冷凍5kg)',
            quantity: 1,
            unit: '箱',
            reason: '拿錯貨',
            note: '',
          },
        ]);
      }

      setShowSignaturePad(false);
      setPushStatus(null);
    }
  }, [stop]);

  if (!isOpen || !stop) return null;

  const originalAmount = stop.totalAmount;
  const differenceAmount = hasIssue ? originalAmount - actualAmount : 0;
  const isSlipCountMatched = isOfficeReprintMode ? !!officeReprintPhotoUrl || photos.length > 0 : photos.length >= expectedSlipCount;

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

  const handleOfficeReprintCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setOfficeReprintPhotoUrl(reader.result as string);
        // Automatically open signature pad for customer screen signing
        setShowSignaturePad(true);
      }
    };
    reader.readAsDataURL(file);
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

  // Add / Edit Replenishment item
  const handleAddItem = () => {
    setReplacementItems(prev => [
      ...prev,
      {
        sku: 'HHY-F008',
        name: '日式厚炸三角豆腐 (冷凍)',
        quantity: 1,
        unit: '箱',
        reason: '報要補貨',
        note: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setReplacementItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateItem = (index: number, field: keyof PodItemDetail, value: any) => {
    setReplacementItems(prev =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSelectPreset = (index: number, sku: string) => {
    const found = PRESET_HHY_PRODUCTS.find(p => p.sku === sku);
    if (found) {
      setReplacementItems(prev =>
        prev.map((item, idx) =>
          idx === index
            ? { ...item, sku: found.sku, name: found.name, unit: found.unit }
            : item
        )
      );
    }
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
    replenish_needed: '🚨 報要補貨 (庫房漏裝/短少需緊急補送)',
    wrong_item: '🔄 拿錯貨 (現場廚房/司機規格拿錯需換補)',
    wrong_delivery: '📦 貨下錯 (下錯門市/分店品項)',
    amount_modified: '💵 金額現場手動更正 / 折讓扣款',
    damaged: '💥 貨品破損 / 瑕疵退回',
    defrosted: '❄️ 冷鏈退冰 / 溫度異常變質',
    rejected: '❌ 客戶無故拒收 / 整批退回',
    rescheduled: '🕒 店家未開門 / 協調改期再送',
    other: '📝 其他現場突發狀況',
  };

  // Telegram message builder
  const buildTelegramPushText = (record: ProofOfDeliveryRecord) => {
    const isIssue = record.hasIssue;
    const isReplenish = isIssue && (record.replacementItems && record.replacementItems.length > 0);
    const now = new Date().toLocaleTimeString('zh-TW', { hour12: false });

    let text = isReplenish
      ? `🚨 <b>【禾禾園物流 • 現場緊急補貨/改單即時通報】</b>\n`
      : isIssue
      ? `⚠️ <b>【禾禾園物流 • 貨況異常/折讓通報】</b>\n`
      : `✅ <b>【禾禾園物流 • 現場簽收核銷通報 - 品項無修改 OK】</b>\n`;

    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👤 <b>配送司機：</b>${config.driverName} (車牌: ${config.truckPlate})\n`;
    text += `🏪 <b>送達店家：</b>${stop.storeName} (${stop.floor})\n`;
    text += `📍 <b>店家地址：</b>${stop.address}\n`;
    text += `⏰ <b>完成時間：</b>${now}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;

    // Office reprint mode vs physical
    if (record.isOfficeReprintMode) {
      text += `📱 <b>單據模式：</b>【司機未帶單據 • 公司拍照補發 + 手機螢幕電子簽章】\n`;
    } else {
      text += `📄 <b>單據核驗比對：</b>應有 ${record.expectedSlipCount} 張 ➔ 實拍 ${record.actualSlipCount} 張 ${record.isSlipCountMatched ? '✅ (張數齊全)' : '⚠️ (張數不符)'}\n`;
    }

    text += `✍️ <b>客戶簽核：</b>${record.signatureDataUrl ? '手機螢幕電子手寫簽名完成 ✅' : record.isSignatureVerified ? '紙本單據已蓋章/簽名 ✅' : '現場未簽核 ⚠️'}\n`;

    // Item comparison status
    if (record.isItemsUnchanged) {
      text += `🟢 <b>品項比對：</b>客戶單據品項【無修改】➔ 會計審核自動標記 <b>【OK】</b>\n`;
      text += `💵 <b>含稅實收總額：</b>NT$ ${record.actualAmount.toLocaleString()}\n`;
    } else {
      text += `🟡 <b>品項比對：</b>現場有更改或需補貨 ➔ <b>【異常通報待調度】</b>\n`;
      
      // Detailed replenishment items list with SKU, Name, Quantity, Reason
      if (record.replacementItems && record.replacementItems.length > 0) {
        text += `━━━━━━━━━━━━━━━━━━━━\n`;
        text += `📦 <b>【現場急需補貨 / 異常品項明細】</b>\n`;
        record.replacementItems.forEach((item, idx) => {
          text += `${idx + 1}️⃣ <b>[料號: ${item.sku}]</b> ${item.name}\n`;
          text += `   ↳ 數量：<b>${item.quantity} ${item.unit}</b> | 原因：<b>【${item.reason}】</b>\n`;
          if (item.note) {
            text += `   ↳ 備註：<i>${item.note}</i>\n`;
          }
        });
      }

      text += `━━━━━━━━━━━━━━━━━━━━\n`;
      text += `💵 <b>原單應收：</b>NT$ ${record.originalAmount.toLocaleString()}\n`;
      text += `💰 <b>現場實收：</b>NT$ ${record.actualAmount.toLocaleString()}\n`;
      if (record.differenceAmount !== 0) {
        text += `📉 <b>折讓/差額：</b>NT$ ${record.differenceAmount.toLocaleString()}\n`;
      }
      text += `📝 <b>司機回報備註：</b>\n<i>${record.issueNotes || '無額外備註'}</i>\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📁 <b>雲端單據存證：</b>Google Drive「禾禾園物流簽收單圖庫」\n`;
    text += `📊 <b>對帳資料庫：</b>已即時連動同步至「禾禾園物流系統資料庫」`;
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
    const isCleanOk = isItemsUnchanged && !hasIssue && isSlipCountMatched;

    const podRecord: ProofOfDeliveryRecord = {
      photos: isOfficeReprintMode && officeReprintPhotoUrl ? [officeReprintPhotoUrl, ...photos] : photos,
      expectedSlipCount,
      actualSlipCount: isOfficeReprintMode && officeReprintPhotoUrl ? 1 : photos.length,
      isSlipCountMatched: isOfficeReprintMode ? !!officeReprintPhotoUrl || photos.length > 0 : photos.length >= expectedSlipCount,
      isSignatureVerified: isSignatureVerified || !!signatureDataUrl,
      signatureDataUrl: signatureDataUrl || undefined,
      isItemsUnchanged,
      verificationResultStatus: isCleanOk ? 'OK' : '異常通報',
      hasIssue: !isItemsUnchanged || hasIssue,
      issueType: !isItemsUnchanged ? issueType : undefined,
      issueTypeName: !isItemsUnchanged && issueType ? issueTypeMap[issueType] : undefined,
      replacementItems: !isItemsUnchanged ? replacementItems : undefined,
      isOfficeReprintMode,
      officeReprintPhotoUrl: officeReprintPhotoUrl || undefined,
      originalAmount,
      actualAmount: !isItemsUnchanged ? Number(actualAmount) : originalAmount,
      differenceAmount: !isItemsUnchanged ? originalAmount - Number(actualAmount) : 0,
      issueNotes: !isItemsUnchanged ? issueNotes : undefined,
      issuePhotoUrl: !isItemsUnchanged && issuePhotoUrl ? issuePhotoUrl : undefined,
      reportedAt: now,
      telegramPushed: false,
    };

    // Attempt Telegram Push
    if (config.telegramConfig?.botToken && config.telegramConfig?.chatId) {
      setPushStatus('正在即時發送推播至 Telegram 物流群...');
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
    const isCleanOk = isItemsUnchanged && !hasIssue && isSlipCountMatched;

    const sampleRecord: ProofOfDeliveryRecord = {
      photos,
      expectedSlipCount,
      actualSlipCount: photos.length,
      isSlipCountMatched,
      isSignatureVerified,
      signatureDataUrl,
      isItemsUnchanged,
      verificationResultStatus: isCleanOk ? 'OK' : '異常通報',
      hasIssue: !isItemsUnchanged || hasIssue,
      issueType: !isItemsUnchanged ? issueType : undefined,
      issueTypeName: !isItemsUnchanged && issueType ? issueTypeMap[issueType] : undefined,
      replacementItems: !isItemsUnchanged ? replacementItems : undefined,
      isOfficeReprintMode,
      originalAmount,
      actualAmount: !isItemsUnchanged ? Number(actualAmount) : originalAmount,
      differenceAmount: !isItemsUnchanged ? originalAmount - Number(actualAmount) : 0,
      issueNotes,
      reportedAt: now,
    };

    const text = buildTelegramPushText(sampleRecord).replace(/<[^>]*>/g, '');
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent('https://ais-pre-et32yruz3pi6ao4rddai5x-35700872035.asia-east1.run.app')}&text=${encodeURIComponent(text)}`;
    window.open(tgUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-200">
        
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
                單據比對 • 補貨商品明細通報 • 客戶電子簽名 • Telegram 即時連線
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
              <span className="text-slate-500 text-xs">配送門市：</span>
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

          {/* Special Feature: Office Reprint / Driver Forgot Slip Mode Switch */}
          <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-300 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500 text-slate-950">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-amber-950 text-xs sm:text-sm">
                  司機忘記帶單？【公司拍照補發 + 手機電子簽名】
                </span>
                <p className="text-[11px] text-amber-800">
                  公司可在辦公室將單據拍照傳給司機，司機上傳後直接讓客戶在手機螢幕電子簽名核銷！
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOfficeReprintMode(!isOfficeReprintMode);
                if (!isOfficeReprintMode) {
                  setShowSignaturePad(true);
                }
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer shadow-2xs ${
                isOfficeReprintMode
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-amber-900 border border-amber-400 hover:bg-amber-100'
              }`}
            >
              {isOfficeReprintMode ? '✓ 已開啟公司補單模式' : '開啟公司補單模式'}
            </button>
          </div>

          {/* Office Reprint Photo Upload if active */}
          {isOfficeReprintMode && (
            <div className="p-3.5 bg-amber-50/60 rounded-2xl border-2 border-dashed border-amber-400 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 text-xs">
                  載入公司行政拍照傳給您的出貨單：
                </span>
                <input
                  ref={officeReprintInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleOfficeReprintCapture}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => officeReprintInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-xs transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>上傳/拍照公司補發的單據</span>
                </button>
              </div>
              {officeReprintPhotoUrl ? (
                <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-amber-200">
                  <img
                    src={officeReprintPhotoUrl}
                    alt="公司補單"
                    className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                  />
                  <div className="text-xs space-y-1">
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      已載入公司補發單據
                    </span>
                    <p className="text-slate-500 text-[11px]">
                      請接著讓客戶在下方<strong>【手機螢幕手寫簽名】</strong>即可完成合法存證！
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-amber-800">
                  尚未載入照片。司機可開啟 LINE / Telegram 儲存公司傳來的單據照片後上傳。
                </p>
              )}
            </div>
          )}

          {/* Section 2: Slip Count Cross-Check & Camera Capture */}
          {!isOfficeReprintMode && (
            <div className="bg-rose-50/50 p-4 rounded-2xl border-2 border-rose-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold text-rose-950 text-sm">
                  <FileText className="w-4 h-4 text-rose-700" />
                  <span>現場送貨單據拍照與張數交叉比對</span>
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
                        className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-md shadow transition cursor-pointer"
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
            </div>
          )}

          {/* Section 3: Item Comparison - 沒改品項 (直接OK) vs 單據有更改 / 報補貨 */}
          <div className="p-4 rounded-2xl border-2 border-slate-200 bg-white space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-sm">
                品項交叉比對核銷判定：
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option A: Items Unchanged -> OK */}
              <button
                type="button"
                onClick={() => {
                  setIsItemsUnchanged(true);
                  setHasIssue(false);
                }}
                className={`p-3 rounded-2xl border-2 text-left transition flex items-start gap-2.5 cursor-pointer ${
                  isItemsUnchanged && !hasIssue
                    ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 opacity-70'
                }`}
              >
                <div className={`p-1.5 rounded-full mt-0.5 ${isItemsUnchanged && !hasIssue ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-emerald-950 text-xs sm:text-sm">
                    ✅ 品項完全相符，無修改
                  </div>
                  <div className="text-[11px] text-emerald-800 mt-0.5">
                    客戶驗收無誤、數量齊全。轉出 Excel 表後台自動標記 <strong>【OK】</strong>！
                  </div>
                </div>
              </button>

              {/* Option B: Has Changes / Replenish needed */}
              <button
                type="button"
                onClick={() => {
                  setIsItemsUnchanged(false);
                  setHasIssue(true);
                }}
                className={`p-3 rounded-2xl border-2 text-left transition flex items-start gap-2.5 cursor-pointer ${
                  !isItemsUnchanged || hasIssue
                    ? 'bg-amber-50 border-amber-500 shadow-sm'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 opacity-70'
                }`}
              >
                <div className={`p-1.5 rounded-full mt-0.5 ${!isItemsUnchanged || hasIssue ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-amber-950 text-xs sm:text-sm">
                    ⚠️ 單據有改 / 拿錯貨 / 報要補貨
                  </div>
                  <div className="text-[11px] text-amber-800 mt-0.5">
                    品項有異動或貨況問題，填寫料號數量，即時通報 Telegram 物流群！
                  </div>
                </div>
              </button>
            </div>

            {/* If Items Changed or Replenish Needed: Expand Replenishment Item Editor */}
            {(!isItemsUnchanged || hasIssue) && (
              <div className="space-y-3 pt-3 border-t border-amber-200 bg-amber-50/50 p-3.5 rounded-2xl animate-in fade-in duration-200">
                
                {/* Main Issue Reason */}
                <div>
                  <label className="block font-bold text-slate-800 text-xs mb-1">
                    主要通報類別：
                  </label>
                  <select
                    value={issueType}
                    onChange={e => setIssueType(e.target.value as ProofOfDeliveryRecord['issueType'])}
                    className="w-full px-3 py-2 bg-white border border-amber-400 rounded-xl font-bold text-slate-900 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="replenish_needed">🚨 報要補貨 (庫房漏裝/短少需緊急補送)</option>
                    <option value="wrong_item">🔄 拿錯貨 (現場廚房/司機規格拿錯需換補)</option>
                    <option value="wrong_delivery">📦 貨下錯 (下錯門市/分店品項)</option>
                    <option value="amount_modified">💵 金額現場手動更正 / 折讓扣款</option>
                    <option value="damaged">💥 貨品破損 / 瑕疵退回</option>
                    <option value="defrosted">❄️ 冷鏈退冰 / 溫度異常變質</option>
                    <option value="rejected">❌ 客戶無故拒收 / 整批退回</option>
                    <option value="other">📝 其他現場狀況</option>
                  </select>
                </div>

                {/* Replenishment Items List (SKU, Product Name, Quantity, Reason) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-rose-950 text-xs flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-rose-700" />
                      <span>需要補貨 / 異常商品明細清單 (將同步到 Excel 與 Telegram)：</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="flex items-center gap-1 px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold text-xs shadow-2xs transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>增加補貨品項</span>
                    </button>
                  </div>

                  {/* List of items */}
                  {replacementItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-3 rounded-xl border border-amber-300 space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span className="bg-rose-100 text-rose-900 px-2 py-0.5 rounded-md">
                          品項 {idx + 1}
                        </span>
                        {replacementItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-600 hover:text-rose-800 text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>移除</span>
                          </button>
                        )}
                      </div>

                      {/* Fast Preset Selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 shrink-0">禾禾園料號快選：</span>
                        <select
                          onChange={e => handleSelectPreset(idx, e.target.value)}
                          className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium flex-1 outline-none"
                        >
                          <option value="">-- 點此快選常用產品 --</option>
                          {PRESET_HHY_PRODUCTS.map(p => (
                            <option key={p.sku} value={p.sku}>
                              [{p.sku}] {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* SKU */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                            產品料號 (SKU)
                          </label>
                          <input
                            type="text"
                            value={item.sku}
                            onChange={e => handleUpdateItem(idx, 'sku', e.target.value)}
                            placeholder="如: HHY-F001"
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 outline-none focus:ring-1 focus:ring-rose-500"
                          />
                        </div>

                        {/* Name */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                            商品名稱 (品名與規格)
                          </label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={e => handleUpdateItem(idx, 'name', e.target.value)}
                            placeholder="如: 特級大油豆腐 (冷凍5kg)"
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-rose-500"
                          />
                        </div>

                        {/* Quantity & Unit */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                            數量
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => handleUpdateItem(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold font-mono text-slate-800 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                            單位
                          </label>
                          <select
                            value={item.unit}
                            onChange={e => handleUpdateItem(idx, 'unit', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                          >
                            <option value="箱">箱</option>
                            <option value="包">包</option>
                            <option value="桶">桶</option>
                            <option value="公斤">公斤</option>
                            <option value="條">條</option>
                            <option value="罐">罐</option>
                          </select>
                        </div>

                        {/* Reason */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                            原因
                          </label>
                          <select
                            value={item.reason}
                            onChange={e => handleUpdateItem(idx, 'reason', e.target.value)}
                            className="w-full px-2 py-1.5 border border-amber-400 bg-amber-50 rounded-lg text-xs font-bold text-amber-900 outline-none"
                          >
                            <option value="拿錯貨">拿錯貨</option>
                            <option value="貨下錯">貨下錯</option>
                            <option value="報要補貨">報要補貨</option>
                            <option value="破損退冰">破損退冰</option>
                            <option value="客戶少點/未收到">少點/未收到</option>
                            <option value="其他">其他</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Amount modification comparison */}
                <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-amber-300">
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
                    司機備註說明：
                  </label>
                  <textarea
                    rows={2}
                    value={issueNotes}
                    onChange={e => setIssueNotes(e.target.value)}
                    placeholder="例如：店家反映貢丸少送1包，已手寫改單，需請下午車班或下一趟補送至B2廚房"
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                  />
                </div>

                {/* Issue Photo */}
                <div>
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
                      <span>{issuePhotoUrl ? '重新拍攝問題佐證照' : '📸 拍下拿錯/破損商品佐證照'}</span>
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

          {/* Section 4: Signature & Stamp Check & Digital Touch Pad */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSignatureVerified || !!signatureDataUrl}
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
            {(showSignaturePad || isOfficeReprintMode) && (
              <div className="p-3 bg-white rounded-xl border border-slate-300 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-bold">請讓客戶或店長在下方灰色區塊用手指簽名：</span>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="flex items-center gap-1 text-slate-400 hover:text-rose-600 text-[11px] cursor-pointer"
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
                    <span>已成功採集電子簽名存證</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Section 5: Real-time Cloud Storage & Telegram Notice Banner */}
          <div className="p-3 bg-slate-100 rounded-2xl text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <FolderCheck className="w-3.5 h-3.5 text-rose-700" />
              <span>自動同步至主管、小姐與後勤雲端：</span>
            </div>
            <p>
              • 簽收單據照片自動存入 Google Drive<strong>「禾禾園物流簽收單圖庫」</strong><br />
              • 數據與收款金額自動同步至 Google 試算表<strong>「禾禾園物流系統資料庫」</strong><br />
              • 若有「拿錯貨/報要補貨」，系統<strong>立即發送緊急通報至 Telegram 物流群</strong>，並列出料號品項與數量！
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
                !isItemsUnchanged || hasIssue
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? '處理儲存中...'
                  : !isItemsUnchanged || hasIssue
                  ? '確認送達並即時發送【補貨/異常通報】'
                  : '確認送達 (品項無改標記 OK)'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
