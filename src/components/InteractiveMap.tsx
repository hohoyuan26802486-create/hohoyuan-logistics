import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  ExternalLink,
  Navigation,
  MapPin,
  Clock,
  DollarSign,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { CompanyConfig, DeliveryStop, RouteOptimizationResult } from '../types/logistics';
import { generateGoogleMapsRouteUrl, generateSingleStopNavUrl } from '../utils/geo';

interface InteractiveMapProps {
  config: CompanyConfig;
  routeResult: RouteOptimizationResult;
  onSelectStop?: (stopId: string) => void;
  driverLocation?: {
    lat: number;
    lng: number;
    updatedAt: string;
    areaName?: string;
  };
  onUpdateDriverLocation?: () => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  config,
  routeResult,
  onSelectStop,
  driverLocation,
  onUpdateDriverLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineLayerRef = useRef<L.Polyline | null>(null);

  const { stops, totalDistanceKm, totalTravelMinutes, estimatedReturnTime } = routeResult;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Leaflet Map centered around Shulin / Greater Taipei
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [config.lat, config.lng],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | 禾禾園物流',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (!map || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    if (polylineLayerRef.current) {
      polylineLayerRef.current.remove();
      polylineLayerRef.current = null;
    }

    const latLngs: L.LatLngExpression[] = [];

    // 1. Headquarters Marker (Depot)
    const hqLatLng: L.LatLngTuple = [config.lat, config.lng];
    latLngs.push(hqLatLng);

    const hqIcon = L.divIcon({
      className: 'custom-hq-marker',
      html: `
        <div style="background-color: #064e3b; color: #f59e0b; border: 2px solid #f59e0b; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
          總部
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const hqMarker = L.marker(hqLatLng, { icon: hqIcon }).bindPopup(`
      <div style="font-family: sans-serif; min-width: 200px;">
        <h4 style="margin: 0; color: #064e3b; font-weight: bold; font-size: 14px;">🏢 禾禾園總公司物流中心</h4>
        <p style="margin: 4px 0 0; font-size: 12px; color: #475569;">${config.address}</p>
        <div style="margin-top: 8px; font-size: 12px; background: #ecfdf5; padding: 4px 8px; border-radius: 6px; color: #065f46;">
          <strong>出發：</strong> ${config.departureTime} | <strong>預計返廠：</strong> ${estimatedReturnTime}
        </div>
      </div>
    `);
    markersLayerRef.current.addLayer(hqMarker);

    // 2. Stop Markers
    stops.forEach(stop => {
      const stopLatLng: L.LatLngTuple = [stop.lat, stop.lng];
      latLngs.push(stopLatLng);

      const isDelivered = stop.status === 'delivered';
      const isInTransit = stop.status === 'in_transit';

      let bg = '#1e293b';
      let textColor = '#ffffff';
      if (isDelivered) {
        bg = '#059669';
      } else if (isInTransit) {
        bg = '#d97706';
        textColor = '#0f172a';
      }

      const stopIcon = L.divIcon({
        className: 'custom-stop-marker',
        html: `
          <div style="background-color: ${bg}; color: ${textColor}; border: 2px solid #ffffff; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; box-shadow: 0 3px 8px rgba(0,0,0,0.3);">
            ${stop.sequence}
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const navUrl = generateSingleStopNavUrl(stop.address);

      const marker = L.marker(stopLatLng, { icon: stopIcon }).bindPopup(`
        <div style="font-family: sans-serif; min-width: 220px; line-height: 1.4;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="background: #e2e8f0; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: bold;">第 ${stop.sequence} 站</span>
            <span style="font-weight: bold; color: #059669; font-size: 12px;">ETA: ${stop.estimatedArrival}</span>
          </div>
          <h4 style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a;">${stop.storeName} (${stop.floor})</h4>
          <p style="margin: 2px 0 6px; font-size: 11px; color: #64748b;">${stop.address}</p>

          ${
            stop.isMultiOrderMerged
              ? `<div style="background: #faf5ff; border: 1px solid #e9d5ff; padding: 4px 6px; border-radius: 6px; font-size: 11px; color: #6b21a8; margin-bottom: 6px;">
                  ✨ 同客戶 ${stop.subOrders.length} 筆廚房訂單合併
                </div>`
              : ''
          }

          <div style="font-size: 11px; background: #f8fafc; padding: 4px 6px; border-radius: 4px; margin-bottom: 8px;">
            <span>含稅金額：</span><strong>NT$ ${stop.totalAmount.toLocaleString()}</strong>
            ${stop.timeConstraint !== '無限制' ? `<br/><span style="color: #b45309;">⚠️ 時間限制：${stop.timeConstraint}</span>` : ''}
          </div>

          <a href="${navUrl}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: bold; width: 100%; text-align: center; box-sizing: border-box;">
            🧭 一鍵進入 Google 地圖導航
          </a>
        </div>
      `);

      markersLayerRef.current?.addLayer(marker);
    });

    // 3. Driver Real-time GPS Location Marker (if available)
    if (driverLocation && driverLocation.lat && driverLocation.lng) {
      const driverLatLng: L.LatLngTuple = [driverLocation.lat, driverLocation.lng];
      const driverIcon = L.divIcon({
        className: 'custom-driver-marker',
        html: `
          <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: rgba(59, 130, 246, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="background-color: #2563eb; color: #ffffff; border: 2.5px solid #ffffff; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(37,99,235,0.6); position: relative; z-index: 1;">
              🚚
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const driverMarker = L.marker(driverLatLng, { icon: driverIcon, zIndexOffset: 1000 }).bindPopup(`
        <div style="font-family: sans-serif; min-width: 210px; line-height: 1.4;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="background: #dbeafe; color: #1e40af; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: bold;">📍 司機即時定位</span>
            <span style="font-size: 11px; color: #64748b;">${driverLocation.updatedAt} 更新</span>
          </div>
          <h4 style="margin: 0; font-size: 14px; font-weight: bold; color: #1e3a8a;">${config.driverName} (${config.truckPlate})</h4>
          <p style="margin: 4px 0 0; font-size: 12px; color: #334155; font-weight: 500;">
            ${driverLocation.areaName || '目前配送區域'}
          </p>
          <div style="margin-top: 6px; font-size: 11px; color: #64748b;">
            經度: ${driverLocation.lng.toFixed(4)}, 緯度: ${driverLocation.lat.toFixed(4)}
          </div>
        </div>
      `);
      markersLayerRef.current?.addLayer(driverMarker);
    }

    // 4. Return to HQ line
    latLngs.push(hqLatLng);

    // Draw route Polyline
    if (latLngs.length > 1) {
      polylineLayerRef.current = L.polyline(latLngs, {
        color: '#059669',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 6',
      }).addTo(map);

      // Fit map bounds to show all stops and HQ
      map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
    }
  }, [config, stops, estimatedReturnTime, driverLocation]);

  const handleOpenGoogleMapsMultiStop = () => {
    const stopAddresses = stops.map(s => s.address);
    const url = generateGoogleMapsRouteUrl(config.address, stopAddresses, config.address);
    window.open(url, '_blank');
  };

  const handleOpenGoogleTraffic = () => {
    // Open Google Maps Live Traffic in Greater Taipei
    const trafficUrl = `https://www.google.com/maps/@${config.lat},${config.lng},12z/data=!5m1!1e1`;
    window.open(trafficUrl, '_blank');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Top Map Control Bar - Eye-Friendly Soft Light Gray */}
      <div className="p-4 bg-slate-100 text-slate-800 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-rose-600" />
              <span>全線配送路線與即時路況圖</span>
            </h3>
            <span className="text-xs bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full border border-rose-300 font-bold">
              共 {stops.length} 站點巡迴
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            起點：{config.address} → 順序送達 1~{stops.length} 站 → 預計 {estimatedReturnTime} 返抵公司
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onUpdateDriverLocation && (
            <button
              onClick={onUpdateDriverLocation}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow transition active:scale-95 cursor-pointer"
              title="使用手機 GPS 定位回報目前車輛所在位置"
            >
              <Navigation className="w-4 h-4" />
              <span>{driverLocation ? `📍 刷新定位 (${driverLocation.updatedAt})` : '📍 回報目前 GPS 定位'}</span>
            </button>
          )}

          <button
            onClick={handleOpenGoogleTraffic}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-3 py-2 rounded-xl shadow transition active:scale-95 cursor-pointer"
            title="開啟 Google 即時塞車路況圖層"
          >
            <Clock className="w-4 h-4" />
            <span>Google 即時塞車路況</span>
          </button>

          <button
            onClick={handleOpenGoogleMapsMultiStop}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition active:scale-95 cursor-pointer"
            title="將整條最佳化路線載入 Google 導航"
          >
            <ExternalLink className="w-4 h-4" />
            <span>開啟整趟多點 Google 導航</span>
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative">
        <div ref={mapContainerRef} className="w-full h-[520px] z-0" />

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-xs p-3 rounded-2xl shadow-lg border border-slate-200 text-xs space-y-1.5 max-w-xs">
          <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>圖例與路線說明</span>
          </div>
          {driverLocation && (
            <div className="flex items-center gap-2 bg-blue-50 p-1 rounded-lg border border-blue-200">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white inline-block text-[10px] text-center font-bold">
                🚚
              </span>
              <span className="text-blue-900 font-bold">
                司機即時定位 ({driverLocation.updatedAt})
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-emerald-900 border border-amber-400 inline-block text-[9px] text-amber-300 text-center font-bold">
              部
            </span>
            <span className="text-slate-700">禾禾園總公司 (起點與終點)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-slate-800 text-white inline-block text-[9px] text-center font-bold">
              1
            </span>
            <span className="text-slate-700">待配送停靠站點 (點擊查看詳情)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 inline-block text-[9px] text-center font-bold">
              2
            </span>
            <span className="text-slate-700">進行前往中</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white inline-block text-[9px] text-center font-bold">
              ✓
            </span>
            <span className="text-slate-700">已完成送達</span>
          </div>
        </div>
      </div>
    </div>
  );
};
