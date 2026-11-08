import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static assets from dist if built
app.use(express.static(path.join(__dirname, 'dist')));

// OCR endpoint
app.post('/api/ocr', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: '請提供訂單照片資料 (imageBase64)' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        success: true,
        isSimulated: true,
        order: {
          storeName: '鼎泰豐 (復興SOGO店)',
          department: '中央冷鏈廚房',
          orderNo: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
          address: '台北市大安區忠孝東路三段300號',
          floor: 'B2',
          untaxedAmount: 8400,
          taxAmount: 420,
          totalAmount: 8820,
          timeConstraint: '10:30前',
          unloadDuration: 20,
          notes: 'SOGO後方卸貨碼頭進入，需向警衛換證',
          directionArea: '大安區',
        },
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `你是一位專業的台灣物流單據與出貨發票解析專家。
請仔細辨識這張出貨單/銷貨單/訂單發票照片，精確提取以下資訊：
1. storeName (客戶店家名稱，例如：瓦城泰統、欣葉台菜、鼎泰豐、添好運、乾杯燒肉)
2. department (廚房部門/樓層專櫃/訂單類別，例如：A廚房、點心廚房、B2鮮食區、燒臘部、或單號標記)
3. orderNo (出貨單編號/訂單號)
4. address (送貨地址，請包含完整路名、巷弄與門牌)
5. floor (樓層，例如：B2, 1F, 4F, 7F；若無特別註明請填 1F)
6. untaxedAmount (未稅金額，整數或小數數值)
7. taxAmount (稅額，台灣通常為5%，整數或小數)
8. totalAmount (含稅總金額；若只有總金額，請換算 未稅=總額/1.05，稅額=總額-未稅)
9. timeConstraint (送貨時間限制，例如：10:30前、11:00前、避開12:00-13:30、15:00前；若無註明填「無限制」)
10. unloadDuration (預估下貨作業分鐘數，預設20分鐘，若訂單箱數龐大或大型百貨可設定25-35分鐘)
11. notes (特殊備註或下貨警語，例如：需換證、地下碼頭限高2.1M、需自備推車等)
12. directionArea (大致所在的行政區，例如：樹林區、板橋區、信義區、中山區、大安區、三重區等)

請務必以繁體中文回答，並輸出標準 JSON 格式。`;

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            storeName: { type: Type.STRING, description: '店家客戶名稱' },
            department: { type: Type.STRING, description: '廚房部門或櫃位' },
            orderNo: { type: Type.STRING, description: '訂單或銷貨單編號' },
            address: { type: Type.STRING, description: '送貨地址' },
            floor: { type: Type.STRING, description: '樓層' },
            untaxedAmount: { type: Type.NUMBER, description: '未稅金額' },
            taxAmount: { type: Type.NUMBER, description: '稅額 (5%)' },
            totalAmount: { type: Type.NUMBER, description: '含稅總金額' },
            timeConstraint: { type: Type.STRING, description: '時間限制' },
            unloadDuration: { type: Type.INTEGER, description: '預計下貨時間分鐘數' },
            notes: { type: Type.STRING, description: '特殊下貨備註' },
            directionArea: { type: Type.STRING, description: '行政區方向' },
          },
          required: ['storeName', 'address', 'totalAmount'],
        },
      },
    });

    const rawText = response.text || '{}';
    const parsed = JSON.parse(rawText);

    let total = Number(parsed.totalAmount) || 0;
    let untaxed = Number(parsed.untaxedAmount) || 0;
    let tax = Number(parsed.taxAmount) || 0;

    if (total > 0 && untaxed === 0) {
      untaxed = Math.round(total / 1.05);
      tax = total - untaxed;
    } else if (untaxed > 0 && total === 0) {
      tax = Math.round(untaxed * 0.05);
      total = untaxed + tax;
    }

    return res.json({
      success: true,
      order: {
        storeName: parsed.storeName || '合作門市',
        department: parsed.department || '一般門市',
        orderNo: parsed.orderNo || 'ORD-' + Date.now().toString().slice(-6),
        address: parsed.address || '新北市板橋區縣民大道二段7號',
        floor: parsed.floor || '1F',
        untaxedAmount: untaxed,
        taxAmount: tax,
        totalAmount: total,
        timeConstraint: parsed.timeConstraint || '無限制',
        unloadDuration: Number(parsed.unloadDuration) || 20,
        notes: parsed.notes || '',
        directionArea: parsed.directionArea || '雙北都會區',
      },
    });
  } catch (error: any) {
    console.error('Server OCR error:', error);
    res.status(500).json({ error: error.message || 'OCR 辨識錯誤' });
  }
});

// Telegram endpoint
app.post('/api/telegram', async (req, res) => {
  try {
    const { botToken, chatId, message, parseMode = 'HTML' } = req.body;
    if (!botToken || !chatId || !message) {
      return res.status(400).json({ error: '請提供 botToken, chatId 與 message' });
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const tgRes = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });

    const tgData = await tgRes.json();
    if (!tgRes.ok || !tgData.ok) {
      return res.status(400).json({
        success: false,
        error: tgData.description || 'Telegram API 回應錯誤',
        details: tgData,
      });
    }

    return res.json({ success: true, result: tgData.result });
  } catch (error: any) {
    console.error('Server Telegram error:', error);
    res.status(500).json({ error: error.message || 'Telegram 發送錯誤' });
  }
});

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Logistics Server running on http://localhost:${port}`);
});
