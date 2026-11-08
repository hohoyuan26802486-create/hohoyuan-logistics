import React, { useState } from 'react';
import {
  X,
  Send,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Share2,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import type { CompanyConfig, RouteOptimizationResult } from '../types/logistics';

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CompanyConfig;
  routeResult: RouteOptimizationResult;
  onUpdateTelegramConfig: (botToken: string, chatId: string) => void;
}

export const TelegramModal: React.FC<TelegramModalProps> = ({
  isOpen,
  onClose,
  config,
  routeResult,
  onUpdateTelegramConfig,
}) => {
  const [botToken, setBotToken] = useState(config.telegramConfig.botToken || '');
  const [chatId, setChatId] = useState(config.telegramConfig.chatId || '');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const { stops, amountSummary, departureTime, estimatedReturnTime } = routeResult;

  // Determine current active stop / direction
  const inTransitStop = stops.find(s => s.status === 'in_transit');
  const deliveredCount = stops.filter(s => s.status === 'delivered').length;
  let currentDirectionText = '準備從總公司出發';
  if (inTransitStop) {
    currentDirectionText = `正前往第 ${inTransitStop.sequence} 站：${inTransitStop.storeName} (${inTransitStop.directionArea} 方向)，預計 ${inTransitStop.estimatedArrival} 抵達`;
  } else if (deliveredCount === stops.length && stops.length > 0) {
    currentDirectionText = `已全部送達完成，正回程總公司 (${config.address})，預計 ${estimatedReturnTime} 返抵`;
  } else if (deliveredCount > 0) {
    const lastDelivered = stops.filter(s => s.status === 'delivered').pop();
    currentDirectionText = `剛完成第 ${lastDelivered?.sequence} 站 (${lastDelivered?.storeName})，目前於 ${lastDelivered?.directionArea} 方向`;
  }

  // Generate structured message
  const generateTelegramMessage = () => {
    let msg = `🚚 <b>【禾禾園物流】今日出車派單與路線通知</b>\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 <b>配送司機：</b>${config.driverName} (電話: ${config.driverPhone})\n`;
    msg += `🚛 <b>車牌號碼：</b>${config.truckPlate} (${config.tripName})\n`;
    msg += `🏢 <b>出發總部：</b>${config.address}\n`;
    msg += `⏰ <b>出發時間：</b>${departureTime}\n`;
    msg += `🏁 <b>預計回廠：</b>${estimatedReturnTime} <i>(主管可依此安排下一趟車)</i>\n`;
    msg += `📍 <b>目前方向/進度：</b>${currentDirectionText}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 <b>車輛載貨金額統計 (上限 NT$ ${config.truckCapacityLimit.toLocaleString()})：</b>\n`;
    msg += ` • 未稅總計：NT$ ${amountSummary.totalUntaxed.toLocaleString()}\n`;
    msg += ` • 營業稅額 (5%)：NT$ ${amountSummary.totalTax.toLocaleString()}\n`;
    msg += ` • <b>含稅總金額：NT$ ${amountSummary.grandTotal.toLocaleString()}</b>\n`;
    msg += ` • 貨車載貨空間負載：${amountSummary.capacityPercentage}% ${amountSummary.isOverLimit ? '⚠️ <b>(已超限)</b>' : '✅ 正常'}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📋 <b>最佳送貨路線排單明細 (共 ${stops.length} 站)：</b>\n\n`;

    stops.forEach(s => {
      const tc = s.timeConstraint !== '無限制' ? ` ⚠️ <b>${s.timeConstraint}</b>` : '';
      const mergeNote = s.isMultiOrderMerged ? ` <i>[同客戶${s.subOrders.length}廚房合併]</i>` : '';
      msg += `<b>${s.sequence}. [ETA ${s.estimatedArrival}] ${s.storeName} (${s.floor})</b>${tc}${mergeNote}\n`;
      msg += `   📍 ${s.address}\n`;
      msg += `   💵 含稅: $${s.totalAmount.toLocaleString()} (未稅 $${s.untaxedAmount.toLocaleString()})\n`;
      if (s.notes) msg += `   📝 備註: ${s.notes}\n`;
      msg += `\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📞 <b>後勤客服提示：</b>當客戶來電詢問時，後勤可回報司機目前進度與預估抵達時間！`;
    return msg;
  };

  const formattedMessage = generateTelegramMessage();

  const handleCopy = () => {
    // Strip HTML tags for clean clipboard copy
    const plainText = formattedMessage.replace(/<[^>]*>/g, '');
    navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendTelegram = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      setSendResult({
        success: false,
        message: '請先填寫 Telegram Bot Token 與 Chat ID！',
      });
      return;
    }

    setIsSending(true);
    setSendResult(null);

    // Save tokens to config
    onUpdateTelegramConfig(botToken.trim(), chatId.trim());

    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: botToken.trim(),
          chatId: chatId.trim(),
          message: formattedMessage,
          parseMode: 'HTML',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '發送失敗');
      }

      setSendResult({
        success: true,
        message: '🎉 成功推播至 Telegram 群組！後勤人員已收到完整派單訊息。',
      });
    } catch (err: any) {
      console.error(err);
      setSendResult({
        success: false,
        message: err.message || 'Telegram 發送失敗，請確認 Bot Token 與群組 ID 是否正確。',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-700 via-sky-800 to-emerald-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white text-sky-700 flex items-center justify-center font-bold shadow-md">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Telegram 後勤派單推播</h3>
              <p className="text-xs text-sky-100">
                自動將司機姓名、路線店家、金額統計與即時方向推播至群組
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-sky-200 hover:text-white hover:bg-sky-900/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
          {/* Telegram Config Inputs */}
          <div className="bg-sky-50/70 p-4 rounded-2xl border border-sky-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-950 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-sky-600" />
                <span>Telegram Bot API 推播設定</span>
              </span>
              <span className="text-[11px] text-sky-700 font-semibold bg-sky-100 px-2 py-0.5 rounded-full">
                直接 API 一鍵發送
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs">
                  Telegram Bot Token
                </label>
                <input
                  type="text"
                  placeholder="例如: 123456789:ABCdefGHI..."
                  value={botToken}
                  onChange={e => setBotToken(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-sky-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs">
                  群組 Chat ID (含負號)
                </label>
                <input
                  type="text"
                  placeholder="例如: -1001987654321 或 @group_name"
                  value={chatId}
                  onChange={e => setChatId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-sky-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              💡 提示：若尚未建立 Bot，您也可以直接點選下方「一鍵複製完整訊息」手動貼到任何群組！
            </p>
          </div>

          {/* Message Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1">
                <span>自動生成派單訊息預覽</span>
                <span className="text-[11px] font-normal text-slate-500 font-mono">
                  ({stops.length} 站 / 總金額 ${amountSummary.grandTotal.toLocaleString()})
                </span>
              </label>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 transition font-semibold text-xs cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '已複製到剪貼簿！' : '一鍵複製文字'}</span>
              </button>
            </div>

            <div
              className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-xs leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap border border-slate-800 shadow-inner select-all"
              dangerouslySetInnerHTML={{ __html: formattedMessage }}
            />
          </div>

          {/* Feedback status */}
          {sendResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                sendResult.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border border-rose-300'
              }`}
            >
              {sendResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{sendResult.message}</span>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition text-xs sm:text-sm cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>複製文字訊息</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition text-xs sm:text-sm"
              >
                關閉
              </button>

              <button
                type="button"
                disabled={isSending}
                onClick={handleSendTelegram}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold transition shadow-md active:scale-95 text-xs sm:text-sm cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isSending ? '正在推播中...' : '一鍵推播至 Telegram 群組'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
