import type { CompanyConfig, RawOrder, TruckItem } from '../types/logistics';

export const INITIAL_COMPANY_CONFIG: CompanyConfig = {
  companyName: '禾禾園物流中心',
  address: '新北市樹林區柑園街一段196-13號',
  lat: 24.9546,
  lng: 121.3965,
  departureTime: '08:00',
  defaultUnloadMinutes: 20,
  trafficCondition: 'rush_hour',
  trafficFactor: 1.25, // Morning rush hour
  truckCapacityLimit: 120000, // 貨車載貨金額上限 NT$ 120,000
  driverName: '自訂司機',
  driverPhone: '0900-000-000',
  truckPlate: '自訂車牌',
  tripName: '1號車 (自訂配送路線)',
  telegramConfig: {
    botToken: '',
    chatId: '',
    autoPushOnDispatch: true,
  },
};

/**
 * 每日起始訂單為空清單 (從零開始，司機每天拍照建單)
 */
export const SAMPLE_ORDERS: RawOrder[] = [];

/**
 * 自訂車隊名冊：清空所有預設假資料，方便主管自行增加與修改真實車輛
 */
export const INITIAL_16_TRUCKS: TruckItem[] = [
  {
    id: 'truck-1',
    truckNumber: 1,
    truckPlate: '點擊設定車牌',
    driverName: '點擊設定司機',
    driverPhone: '0900-000-000',
    zoneName: '1號車 (自訂配送專線)',
    departureTime: '08:00',
    truckCapacityLimit: 120000,
    orders: [],
  },
];

/**
 * 備用測試示範車隊 (可於需要時載入)
 */
export const DEMO_PRESET_TRUCKS: TruckItem[] = [
  {
    id: 'truck-1',
    truckNumber: 1,
    truckPlate: 'CEN-5181',
    driverName: '謝志隆',
    driverPhone: '0928-111-222',
    zoneName: '1號車 (板橋三重新莊線)',
    departureTime: '07:30',
    truckCapacityLimit: 120000,
    orders: [],
  },
  {
    id: 'truck-2',
    truckNumber: 2,
    truckPlate: '889-HHY',
    driverName: '林冠宇',
    driverPhone: '0912-345-678',
    zoneName: '2號車 (大安信義旗艦線)',
    departureTime: '08:00',
    truckCapacityLimit: 120000,
    orders: [],
  },
];

/**
 * 示範測試資料 (保留供管理者點擊「載入測試範例」時選用)
 */
export const DEMO_PRESET_ORDERS: RawOrder[] = [
  {
    id: 'demo-01',
    orderNo: 'HHY-20261106-01',
    storeName: '鼎泰豐 (板橋大遠百店)',
    department: '中央冷鏈食材部',
    address: '新北市板橋區新站路28號',
    floor: 'B1',
    untaxedAmount: 12000,
    taxAmount: 600,
    totalAmount: 12600,
    timeConstraint: '09:30前',
    unloadDuration: 25,
    notes: '大遠百地下卸貨碼頭進入，需先向警衛換證',
    directionArea: '板橋區',
    lat: 25.0128,
    lng: 121.4648,
    status: 'pending',
    createdAt: '2026-11-06 07:15',
  },
  {
    id: 'demo-02',
    orderNo: 'HHY-20261106-02',
    storeName: '王品牛排 (板橋縣民店)',
    department: '熟成牛肉專櫃',
    address: '新北市板橋區縣民大道二段7號',
    floor: '2F',
    untaxedAmount: 8500,
    taxAmount: 425,
    totalAmount: 8925,
    timeConstraint: '10:00前',
    unloadDuration: 20,
    notes: '貨梯在後棟B梯，自備推車',
    directionArea: '板橋區',
    lat: 25.0135,
    lng: 121.4651,
    status: 'pending',
    createdAt: '2026-11-06 07:18',
  },
  {
    id: 'demo-03',
    orderNo: 'HHY-20261106-03',
    storeName: '瓦城泰統 (新光三越信義A8)',
    department: '泰式辛香料與主食區',
    address: '台北市信義區松高路12號',
    floor: '4F',
    untaxedAmount: 8200,
    taxAmount: 410,
    totalAmount: 8610,
    timeConstraint: '11:30前',
    unloadDuration: 20,
    notes: '信義A8館4樓專櫃，停B3卸貨碼頭搭4號貨梯',
    directionArea: '信義區',
    lat: 25.0388,
    lng: 121.5672,
    status: 'pending',
    createdAt: '2026-11-06 07:28',
  },
  {
    id: 'demo-04',
    orderNo: 'HHY-20261106-04',
    storeName: '添好運 點心專門店 (信義A8店)',
    department: '港式點心廚房',
    address: '台北市信義區松高路12號',
    floor: 'B2',
    untaxedAmount: 6400,
    taxAmount: 320,
    totalAmount: 6720,
    timeConstraint: '11:30前',
    unloadDuration: 20,
    notes: '信義A8館B2美食街獨立客戶',
    directionArea: '信義區',
    lat: 25.0388,
    lng: 121.5672,
    status: 'pending',
    createdAt: '2026-11-06 07:30',
  },
  {
    id: 'demo-05',
    orderNo: 'HHY-20261106-05',
    storeName: '錢都日式涮涮鍋 (三重正義旗艦店)',
    department: '鮮肉加工部',
    address: '新北市三重區正義北路188號',
    floor: '1F',
    untaxedAmount: 8900,
    taxAmount: 445,
    totalAmount: 9345,
    timeConstraint: '12:30前',
    unloadDuration: 20,
    notes: '門口臨停卸貨，請打雙黃燈',
    directionArea: '三重區',
    lat: 25.0682,
    lng: 121.4965,
    status: 'pending',
    createdAt: '2026-11-06 07:38',
  },
  {
    id: 'demo-06',
    orderNo: 'HHY-20261106-06',
    storeName: '海底撈火鍋 (新莊宏匯廣場店)',
    department: '底料調味組',
    address: '新北市新莊區新北大道四段3號',
    floor: '9F',
    untaxedAmount: 9500,
    taxAmount: 475,
    totalAmount: 9975,
    timeConstraint: '13:00前',
    unloadDuration: 20,
    notes: '宏匯廣場B2中央卸貨碼頭',
    directionArea: '新莊區',
    lat: 25.0601,
    lng: 121.4497,
    status: 'pending',
    createdAt: '2026-11-06 07:40',
  },
];

/**
 * 完整雙北連鎖餐飲門市庫 (供主管隨意測試無限制店家數量)
 */
export const EXPANDED_STORE_POOL = [
  { storeName: '鼎泰豐 (板橋大遠百店)', address: '新北市板橋區新站路28號', floor: 'B1', dept: '生鮮蒸籠部', area: '板橋區', lat: 25.0128, lng: 121.4648, time: '09:30前', amount: 12600, unload: 25, notes: '地下卸貨碼頭進入' },
  { storeName: '王品牛排 (板橋縣民店)', address: '新北市板橋區縣民大道二段7號', floor: '2F', dept: '牛排熟成專區', area: '板橋區', lat: 25.0135, lng: 121.4651, time: '10:00前', amount: 8925, unload: 20, notes: '貨梯在後棟B梯' },
  { storeName: '瓦城泰統 (新光信義A8)', address: '台北市信義區松高路12號', floor: '4F', dept: '主廚房冷藏部', area: '信義區', lat: 25.0388, lng: 121.5672, time: '11:00前', amount: 8610, unload: 20, notes: '停B3卸貨碼頭' },
  { storeName: '添好運 (新光信義A8)', address: '台北市信義區松高路12號', floor: 'B2', dept: '點心甜品廚房', area: '信義區', lat: 25.0388, lng: 121.5672, time: '11:00前', amount: 6720, unload: 15, notes: '信義A8館B2獨立專櫃' },
  { storeName: '錢都日式涮涮鍋 (三重正義店)', address: '新北市三重區正義北路188號', floor: '1F', dept: '冷藏鮮肉部', area: '三重區', lat: 25.0682, lng: 121.4965, time: '11:30前', amount: 9345, unload: 20, notes: '門口臨停打雙黃燈' },
  { storeName: '海底撈火鍋 (新莊宏匯店)', address: '新北市新莊區新北大道四段3號', floor: '9F', dept: '底料調味組', area: '新莊區', lat: 25.0601, lng: 121.4497, time: '12:00前', amount: 9975, unload: 25, notes: '宏匯B2中央卸貨碼頭' },
  { storeName: '欣葉台菜 (台北南西店)', address: '台北市中山區南京西路12號', floor: '8F', dept: '宴席主廚房', area: '中山區', lat: 25.0526, lng: 121.5208, time: '10:30前', amount: 11500, unload: 20, notes: '中山北路側卸貨電梯' },
  { storeName: '涓豆腐 (微風台北車站店)', address: '台北市中正區北平西路3號', floor: '2F', dept: '豆腐煲高湯部', area: '中正區', lat: 25.0478, lng: 121.5171, time: '10:00前', amount: 7800, unload: 25, notes: '台北車站東一門地下卸貨' },
  { storeName: '點點心 (微風信義店)', address: '台北市信義區忠孝東路五段68號', floor: 'B1', dept: '蒸點烘焙部', area: '信義區', lat: 25.0402, lng: 121.5677, time: '11:00前', amount: 6450, unload: 20, notes: '微風B2卸貨碼頭需換證' },
  { storeName: '築間幸福鍋物 (永和得和店)', address: '新北市永和區得和路411號', floor: '1F', dept: '海鮮冷凍櫃', area: '永和區', lat: 25.0004, lng: 121.5201, time: '12:00前', amount: 8400, unload: 15, notes: '店前卸貨請速停' },
  { storeName: '壽司郎 (中和環球店)', address: '新北市中和區中山路三段122號', floor: 'B1', dept: '低溫鮮魚直送部', area: '中和區', lat: 25.0062, lng: 121.4746, time: '10:30前', amount: 14200, unload: 25, notes: '環球購物中心西側碼頭' },
  { storeName: '藏壽司 (三重集賢店)', address: '新北市三重區集賢路99號', floor: '1F', dept: '生鮮專櫃', area: '三重區', lat: 25.0831, lng: 121.4912, time: '11:30前', amount: 9600, unload: 20, notes: '獨立街邊店好停車' },
  { storeName: '饗食天堂 (大直美麗華)', address: '台北市中山區敬業三路20號', floor: '4F', dept: '生食冷盤總部', area: '中山區', lat: 25.0836, lng: 121.5574, time: '10:00前', amount: 18500, unload: 30, notes: '大直美麗華大貨梯' },
  { storeName: '陶板屋 (新店中正店)', address: '新北市新店區中正路328號', floor: '2F', dept: '精緻排餐部', area: '新店區', lat: 24.9702, lng: 121.5367, time: '11:00前', amount: 8200, unload: 20, notes: '新店中正路貨梯' },
  { storeName: '爭鮮迴轉壽司 (蘆洲三民店)', address: '新北市蘆洲區三民路112號', floor: '1F', dept: '生魚冷藏組', area: '蘆洲區', lat: 25.0837, lng: 121.4728, time: '11:00前', amount: 5600, unload: 15, notes: '門口停車卸貨' },
  { storeName: '春水堂 (天母SOGO店)', address: '台北市士林區中山北路六段77號', floor: '2F', dept: '茶飲原物料部', area: '士林區', lat: 25.1054, lng: 121.5235, time: '11:30前', amount: 7100, unload: 20, notes: 'SOGO地下一樓碼頭' },
  { storeName: '肉多多火鍋 (淡水中山店)', address: '新北市淡水區中山路8號', floor: '3F', dept: '肉品急速冷凍部', area: '淡水區', lat: 25.1706, lng: 121.4442, time: '13:00前', amount: 9900, unload: 20, notes: '捷運站前大樓貨梯' },
  { storeName: '乾杯燒肉居酒屋 (台北中山店)', address: '台北市中山區南京西路25巷2-1號', floor: '1F', dept: '澳洲和牛冷藏組', area: '中山區', lat: 25.0531, lng: 121.5215, time: '12:00前', amount: 13200, unload: 20, notes: '巷內臨停自備推車' },
  { storeName: '屋馬燒肉 (大安旗艦店)', address: '台北市大安區忠孝東路四段216巷11號', floor: '1F', dept: '極上肉品專櫃', area: '大安區', lat: 25.0416, lng: 121.5518, time: '11:30前', amount: 16500, unload: 25, notes: '216巷卸貨' },
  { storeName: '馬辣頂級麻辣鍋 (西門漢中店)', address: '台北市萬華區西寧南路157號', floor: '2F', dept: '麻辣鴨血牛肚組', area: '萬華區', lat: 25.0435, lng: 121.5065, time: '11:00前', amount: 10800, unload: 20, notes: '西門町徒步區前停靠' },
  { storeName: '雙月食品社 (青島東路店)', address: '台北市中正區青島東路6-2號', floor: '1F', dept: '燉湯生鮮食材組', area: '中正區', lat: 25.0438, lng: 121.5228, time: '10:00前', amount: 8900, unload: 20, notes: '立法院旁門市' },
  { storeName: '貳樓餐廳 (敦南店)', address: '台北市大安區敦化南路二段63巷14號', floor: '1F', dept: '美式烘焙早午餐部', area: '大安區', lat: 25.0315, lng: 121.5492, time: '10:30前', amount: 7900, unload: 20, notes: '敦南巷弄停靠' },
  { storeName: '開飯川食堂 (板橋小遠百店)', address: '新北市板橋區中山路一段152號', floor: '12F', dept: '辛辣冷鏈辛香料部', area: '板橋區', lat: 25.0101, lng: 121.4678, time: '11:00前', amount: 8500, unload: 25, notes: '小遠百後門碼頭貨梯' },
  { storeName: '莫凡彼餐廳 (南港中信店)', address: '台北市南港區經貿二路168號', floor: '2F', dept: '歐風烘焙乳酪部', area: '南港區', lat: 25.0592, lng: 121.6165, time: '11:30前', amount: 9200, unload: 20, notes: '中信金融園區碼頭' },
  { storeName: '靜岡勝政日式豬排 (大直店)', address: '台北市中山區敬業三路20號', floor: 'B1', dept: '日式豚肉生鮮部', area: '中山區', lat: 25.0836, lng: 121.5574, time: '11:00前', amount: 7400, unload: 20, notes: '美麗華地下街獨立專櫃' },
  { storeName: '大呼過癮 (樹林中山店)', address: '新北市樹林區中山路一段88號', floor: '1F', dept: '鍋物火鍋料部', area: '樹林區', lat: 24.9922, lng: 121.4245, time: '11:00前', amount: 6200, unload: 15, notes: '樹林火車站前街邊店' },
  { storeName: '三媽臭臭鍋 (樹林柑園店)', address: '新北市樹林區柑園街一段110號', floor: '1F', dept: '新鮮臭豆腐組', area: '樹林區', lat: 24.9575, lng: 121.3995, time: '10:30前', amount: 5500, unload: 15, notes: '柑園總部鄰近門市' },
  { storeName: '金色三麥 (板橋大遠百店)', address: '新北市板橋區新站路28號', floor: '9F', dept: '精釀與冷食調味部', area: '板橋區', lat: 25.0128, lng: 121.4648, time: '12:00前', amount: 11200, unload: 25, notes: '大遠百9樓異國美饌' },
];

/**
 * 產生指定數量的真實測試單據 (供主管無上限測試排單)
 */
export function generateRealisticDemoOrders(count: number = 15): RawOrder[] {
  const result: RawOrder[] = [];
  const nowStr = new Date().toISOString().split('T')[0];

  for (let i = 0; i < count; i++) {
    const template = EXPANDED_STORE_POOL[i % EXPANDED_STORE_POOL.length];
    const totalAmount = template.amount + (i % 5) * 500;
    const untaxedAmount = Math.round(totalAmount / 1.05);
    const taxAmount = totalAmount - untaxedAmount;

    result.push({
      id: `sandbox-ord-${Date.now()}-${i + 1}`,
      orderNo: `TEST-${nowStr.replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`,
      storeName: i >= EXPANDED_STORE_POOL.length ? `${template.storeName} #${Math.floor(i / EXPANDED_STORE_POOL.length) + 1}` : template.storeName,
      department: template.dept,
      address: template.address,
      floor: template.floor,
      untaxedAmount,
      taxAmount,
      totalAmount,
      timeConstraint: template.time,
      unloadDuration: template.unload,
      notes: template.notes,
      directionArea: template.area,
      lat: template.lat + (Math.random() - 0.5) * 0.003,
      lng: template.lng + (Math.random() - 0.5) * 0.003,
      slipSequence: `${(i % 3) + 1}/3`,
      status: 'pending',
      createdAt: `${nowStr} 08:00`,
    });
  }

  return result;
}
