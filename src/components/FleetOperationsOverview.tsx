import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import {
  BarChart3,
  PieChart,
  Activity,
  TrendingUp,
  Truck,
  MapPin,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { TruckItem } from '../types/logistics';
import { groupOrdersIntoStops } from '../utils/grouping';

interface FleetOperationsOverviewProps {
  trucks: TruckItem[];
  activeTruckId: string;
  onSelectTruck: (truckId: string) => void;
  defaultUnloadMinutes: number;
}

export const FleetOperationsOverview: React.FC<FleetOperationsOverviewProps> = ({
  trucks,
  activeTruckId,
  onSelectTruck,
  defaultUnloadMinutes,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [viewMetric, setViewMetric] = useState<'load' | 'amount' | 'stops'>('load');
  const [hoveredTruckId, setHoveredTruckId] = useState<string | null>(null);

  // SVG Refs for D3 Charts
  const barChartSvgRef = useRef<SVGSVGElement | null>(null);
  const donutChartSvgRef = useRef<SVGSVGElement | null>(null);

  // Calculate per-truck analytics
  const truckAnalytics = useMemo(() => {
    return trucks.map(truck => {
      const stops = groupOrdersIntoStops(truck.orders || [], defaultUnloadMinutes);
      const orders = truck.orders || [];
      const totalUntaxed = orders.reduce((sum, o) => sum + (o.untaxedAmount || 0), 0);
      const totalTax = orders.reduce((sum, o) => sum + (o.taxAmount || 0), 0);
      const grandTotal = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const limit = truck.truckCapacityLimit || 120000;
      const loadPercentage = truck.isSandbox
        ? 0
        : limit > 0
        ? Math.round((grandTotal / limit) * 100)
        : 0;

      return {
        truck,
        stopsCount: stops.length,
        ordersCount: orders.length,
        totalUntaxed,
        totalTax,
        grandTotal,
        limit,
        loadPercentage,
        isOverLimit: !truck.isSandbox && grandTotal > limit,
        isActive: truck.id === activeTruckId,
      };
    });
  }, [trucks, activeTruckId, defaultUnloadMinutes]);

  // Fleet-wide summary metrics
  const fleetSummary = useMemo(() => {
    const totalOrders = truckAnalytics.reduce((sum, t) => sum + t.ordersCount, 0);
    const totalStops = truckAnalytics.reduce((sum, t) => sum + t.stopsCount, 0);
    const totalUntaxed = truckAnalytics.reduce((sum, t) => sum + t.totalUntaxed, 0);
    const totalTax = truckAnalytics.reduce((sum, t) => sum + t.totalTax, 0);
    const grandTotal = truckAnalytics.reduce((sum, t) => sum + t.grandTotal, 0);

    const activeTrucks = truckAnalytics.filter(t => t.ordersCount > 0);
    const activeCount = activeTrucks.length;
    const totalTrucks = truckAnalytics.length;

    // Average output per active truck (未稅)
    const avgUntaxedPerActiveTruck = activeCount > 0 ? Math.round(totalUntaxed / activeCount) : 0;
    // Average untaxed per stop
    const avgUntaxedPerStop = totalStops > 0 ? Math.round(totalUntaxed / totalStops) : 0;

    // Overall capacity pressure (excluding sandbox)
    const standardTrucks = truckAnalytics.filter(t => !t.truck.isSandbox);
    const totalStandardLimit = standardTrucks.reduce((sum, t) => sum + t.limit, 0);
    const totalStandardGrandTotal = standardTrucks.reduce((sum, t) => sum + t.grandTotal, 0);
    const overallLoadPct =
      totalStandardLimit > 0 ? Math.round((totalStandardGrandTotal / totalStandardLimit) * 100) : 0;

    const overloadedCount = truckAnalytics.filter(t => t.isOverLimit).length;
    const heavyLoadCount = truckAnalytics.filter(
      t => !t.truck.isSandbox && t.loadPercentage >= 80 && !t.isOverLimit
    ).length;

    return {
      totalOrders,
      totalStops,
      totalUntaxed,
      totalTax,
      grandTotal,
      activeCount,
      totalTrucks,
      avgUntaxedPerActiveTruck,
      avgUntaxedPerStop,
      overallLoadPct,
      overloadedCount,
      heavyLoadCount,
    };
  }, [truckAnalytics]);

  // -------------------------------------------------------------
  // D3 Chart 1: Horizontal Bar Chart (Load %, Amount, or Stops)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!barChartSvgRef.current || !isExpanded) return;

    const svg = d3.select(barChartSvgRef.current);
    svg.selectAll('*').remove();

    const data = truckAnalytics;
    if (data.length === 0) return;

    const margin = { top: 25, right: 90, bottom: 25, left: 110 };
    const width = 640;
    const rowHeight = 32;
    const height = margin.top + margin.bottom + data.length * rowHeight;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    // Value accessor based on selected metric
    const getVal = (d: (typeof data)[0]) => {
      if (viewMetric === 'load') return d.truck.isSandbox ? 100 : d.loadPercentage;
      if (viewMetric === 'amount') return d.totalUntaxed;
      return d.stopsCount;
    };

    const maxVal = d3.max(data, getVal) || 1;
    const domainMax = viewMetric === 'load' ? Math.max(105, maxVal) : maxVal * 1.15;

    // Scales
    const yScale = d3
      .scaleBand()
      .domain(data.map(d => d.truck.id))
      .range([margin.top, height - margin.bottom])
      .padding(0.24);

    const xScale = d3
      .scaleLinear()
      .domain([0, domainMax])
      .range([margin.left, width - margin.right]);

    // Background tracks
    svg
      .append('g')
      .selectAll('rect.track')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'track')
      .attr('x', margin.left)
      .attr('y', d => yScale(d.truck.id) || 0)
      .attr('width', width - margin.left - margin.right)
      .attr('height', yScale.bandwidth())
      .attr('rx', 6)
      .attr('fill', '#f1f5f9');

    // 100% Limit Reference Line (for load metric)
    if (viewMetric === 'load') {
      const lineX = xScale(100);
      svg
        .append('line')
        .attr('x1', lineX)
        .attr('x2', lineX)
        .attr('y1', margin.top - 6)
        .attr('y2', height - margin.bottom + 6)
        .attr('stroke', '#f43f5e')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3 3')
        .attr('opacity', 0.85);

      svg
        .append('text')
        .attr('x', lineX)
        .attr('y', margin.top - 10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#e11d48')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .text('100% 滿載限額');
    }

    // Color mapper
    const getBarColor = (d: (typeof data)[0]) => {
      if (d.truck.isSandbox) return '#a855f7'; // Purple for sandbox
      if (d.isOverLimit) return '#f43f5e'; // Rose/Red for over-capacity
      if (d.loadPercentage >= 80) return '#f59e0b'; // Amber for high load
      if (d.ordersCount === 0) return '#cbd5e1'; // Slate for idle
      return '#10b981'; // Emerald for healthy
    };

    // Bars
    const bars = svg
      .append('g')
      .selectAll('rect.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', margin.left)
      .attr('y', d => yScale(d.truck.id) || 0)
      .attr('height', yScale.bandwidth())
      .attr('rx', 6)
      .attr('fill', d => getBarColor(d))
      .attr('opacity', d => (d.isActive ? 1 : 0.82))
      .attr('cursor', 'pointer')
      .attr('stroke', d => (d.isActive ? '#be123c' : 'none'))
      .attr('stroke-width', d => (d.isActive ? 2 : 0))
      .on('mouseenter', (_, d) => setHoveredTruckId(d.truck.id))
      .on('mouseleave', () => setHoveredTruckId(null))
      .on('click', (_, d) => onSelectTruck(d.truck.id));

    // Smooth entry transition
    bars
      .attr('width', 0)
      .transition()
      .duration(650)
      .ease(d3.easeCubicOut)
      .attr('width', d => Math.max(0, xScale(getVal(d)) - margin.left));

    // Y Axis Labels (Truck Name & Driver)
    const yLabels = svg
      .append('g')
      .selectAll('text.ylabel')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'ylabel')
      .attr('x', margin.left - 8)
      .attr('y', d => (yScale(d.truck.id) || 0) + yScale.bandwidth() / 2 + 3.5)
      .attr('text-anchor', 'end')
      .attr('cursor', 'pointer')
      .on('click', (_, d) => onSelectTruck(d.truck.id));

    yLabels
      .append('tspan')
      .attr('font-size', '11px')
      .attr('font-weight', d => (d.isActive ? '800' : '600'))
      .attr('fill', d => (d.isActive ? '#be123c' : '#334155'))
      .text(d => `${d.truck.truckNumber}車 ${d.truck.driverName.slice(0, 3)}`);

    // Value Labels on the right
    svg
      .append('g')
      .selectAll('text.val-label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'val-label')
      .attr('x', d => Math.max(xScale(getVal(d)) + 8, margin.left + 8))
      .attr('y', d => (yScale(d.truck.id) || 0) + yScale.bandwidth() / 2 + 3.5)
      .attr('font-size', '10.5px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .attr('fill', d => {
        if (d.truck.isSandbox) return '#7e22ce';
        if (d.isOverLimit) return '#e11d48';
        if (d.loadPercentage >= 80) return '#b45309';
        return '#047857';
      })
      .text(d => {
        if (d.truck.isSandbox) return '沙盒無上限';
        if (viewMetric === 'load') return `${d.loadPercentage}% (${d.stopsCount}站)`;
        if (viewMetric === 'amount') return `$${Math.round(d.totalUntaxed / 1000)}k`;
        return `${d.stopsCount}站 (${d.ordersCount}單)`;
      });
  }, [truckAnalytics, viewMetric, isExpanded, onSelectTruck]);

  // -------------------------------------------------------------
  // D3 Chart 2: Donut Chart (Fleet Output / Stop Share)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!donutChartSvgRef.current || !isExpanded) return;

    const svg = d3.select(donutChartSvgRef.current);
    svg.selectAll('*').remove();

    const activeTrucks = truckAnalytics.filter(t => t.ordersCount > 0);
    const size = 230;
    const radius = size / 2;
    const innerRadius = radius * 0.62;

    svg.attr('viewBox', `0 0 ${size} ${size}`).attr('width', size).attr('height', size);

    const g = svg.append('g').attr('transform', `translate(${radius}, ${radius})`);

    // Empty state if no orders across fleet
    if (activeTrucks.length === 0) {
      g.append('circle')
        .attr('r', radius - 10)
        .attr('fill', 'none')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 22);

      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.2em')
        .attr('fill', '#94a3b8')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text('全車隊待出車');

      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.3em')
        .attr('fill', '#cbd5e1')
        .attr('font-size', '10px')
        .text('尚無排單數據');
      return;
    }

    const pie = d3
      .pie<(typeof activeTrucks)[0]>()
      .value(d => (viewMetric === 'stops' ? d.stopsCount : Math.max(1, d.totalUntaxed)))
      .sort(null)
      .padAngle(0.03);

    const arc = d3
      .arc<d3.PieArcDatum<(typeof activeTrucks)[0]>>()
      .innerRadius(innerRadius)
      .outerRadius(radius - 12)
      .cornerRadius(4);

    // Color palette: enterprise crimson, warm ruby, terracotta, coral, amber, violet
    const palette = [
      '#be123c',
      '#e11d48',
      '#c2410c',
      '#ea580c',
      '#d97706',
      '#4f46e5',
      '#7c3aed',
      '#9333ea',
      '#0284c7',
      '#059669',
      '#0d9488',
      '#e11d48',
    ];

    const pieData = pie(activeTrucks);

    const slices = g
      .selectAll('path.slice')
      .data(pieData)
      .enter()
      .append('path')
      .attr('class', 'slice')
      .attr('fill', (_, i) => palette[i % palette.length])
      .attr('cursor', 'pointer')
      .attr('stroke', d => (d.data.isActive ? '#9f1239' : '#ffffff'))
      .attr('stroke-width', d => (d.data.isActive ? 3 : 1.5))
      .attr('opacity', d =>
        hoveredTruckId
          ? d.data.truck.id === hoveredTruckId
            ? 1
            : 0.45
          : d.data.isActive
          ? 1
          : 0.88
      )
      .on('mouseenter', (_, d) => setHoveredTruckId(d.data.truck.id))
      .on('mouseleave', () => setHoveredTruckId(null))
      .on('click', (_, d) => onSelectTruck(d.data.truck.id));

    // Entry animation
    slices
      .transition()
      .duration(700)
      .attrTween('d', d => {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return t => arc(interpolate(t)) || '';
      });

    // Center Display
    const centerGroup = g.append('g').attr('class', 'center-info');

    centerGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-1em')
      .attr('fill', '#64748b')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text(viewMetric === 'stops' ? '全車隊總站數' : '全車隊未稅總值');

    centerGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.25em')
      .attr('fill', '#0f172a')
      .attr('font-size', '15px')
      .attr('font-family', 'monospace')
      .attr('font-weight', '900')
      .text(
        viewMetric === 'stops'
          ? `${fleetSummary.totalStops} 站`
          : `$${Math.round(fleetSummary.totalUntaxed / 1000)}k`
      );

    centerGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.6em')
      .attr('fill', '#be123c')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text(`均產 $${Math.round(fleetSummary.avgUntaxedPerActiveTruck / 1000)}k/車`);
  }, [truckAnalytics, fleetSummary, viewMetric, hoveredTruckId, isExpanded, onSelectTruck]);

  // Overall pressure badge styling
  const pressureLevel = useMemo(() => {
    if (fleetSummary.overloadedCount > 0) {
      return {
        label: '🚨 車隊超載警戒',
        desc: `有 ${fleetSummary.overloadedCount} 台車載貨金額超標，建議分單或調度協調！`,
        color: 'text-rose-700 bg-rose-50 border-rose-300',
        badge: 'bg-rose-600 text-white',
      };
    }
    if (fleetSummary.heavyLoadCount > 0 || fleetSummary.overallLoadPct >= 80) {
      return {
        label: '⚠️ 運能高載提醒',
        desc: `全車隊平均負載 ${fleetSummary.overallLoadPct}%，有 ${fleetSummary.heavyLoadCount} 台車達 80% 以上。`,
        color: 'text-amber-800 bg-amber-50 border-amber-300',
        badge: 'bg-amber-600 text-white',
      };
    }
    if (fleetSummary.totalOrders > 0) {
      return {
        label: '🟢 運能充裕順暢',
        desc: `全車隊平均負載 ${fleetSummary.overallLoadPct}%，行車與各站配送時效充裕。`,
        color: 'text-emerald-800 bg-emerald-50 border-emerald-300',
        badge: 'bg-emerald-600 text-white',
      };
    }
    return {
      label: '🌅 運能就緒待命',
      desc: '今日全車隊運能 100% 待命，司機拍照上傳單據即可秒級自動排單。',
      color: 'text-slate-700 bg-slate-50 border-slate-300',
      badge: 'bg-slate-600 text-white',
    };
  }, [fleetSummary]);

  return (
    <section className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden mb-6 transition-all duration-200">
      {/* Header bar: Title, Pressure Pill, Metric Toggle, Collapse button */}
      <div className="bg-gradient-to-r from-slate-50 via-slate-100/90 to-rose-50/40 p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-700 text-white flex items-center justify-center shadow-xs shrink-0">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-rose-100 text-rose-900 border border-rose-300 text-xs font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider">
                D3 實時數據
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                今日營運概覽 • 全車隊排單壓力看板
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              宏觀掌握全車隊總站點、總產值與各車裝載負載，點擊任一長條即可秒切換該車趟排單。
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pressure indicator pill */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-2xs ${pressureLevel.color}`}
          >
            <span>{pressureLevel.label}</span>
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs text-xs">
            <button
              type="button"
              onClick={() => setViewMetric('load')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                viewMetric === 'load'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="檢視各車負載佔比與上限壓力"
            >
              負載佔比 (%)
            </button>
            <button
              type="button"
              onClick={() => setViewMetric('amount')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                viewMetric === 'amount'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="檢視各車未稅裝載金額"
            >
              未稅產值 (NT$)
            </button>
            <button
              type="button"
              onClick={() => setViewMetric('stops')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                viewMetric === 'stops'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="檢視各車停靠站點數量"
            >
              站點數 (站)
            </button>
          </div>

          {/* Toggle Expand / Collapse */}
          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
            title={isExpanded ? '收合今日營運看板' : '展開今日營運看板'}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">收合看板</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">展開看板</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Body */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-5 bg-white">
          {/* 4 Core KPI Stat Cards - Soft Eye-Friendly Light Gray Palette */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Total Fleet Delivery Stops */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-medium">全車隊總配送站點</span>
                <MapPin className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
                {fleetSummary.totalStops}{' '}
                <span className="text-xs font-normal text-slate-500 font-sans">站</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                <span>出車趟次：{fleetSummary.activeCount} / {fleetSummary.totalTrucks} 台</span>
                <span className="font-semibold text-rose-800">共 {fleetSummary.totalOrders} 筆單據</span>
              </div>
            </div>

            {/* Card 2: Total Untaxed Revenue */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-medium">全車隊總未稅金額</span>
                <TrendingUp className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
                ${fleetSummary.totalUntaxed.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                <span>含稅合計：</span>
                <strong className="font-mono text-rose-800">
                  ${fleetSummary.grandTotal.toLocaleString()}
                </strong>
              </div>
            </div>

            {/* Card 3: Fleet Average Output */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-medium">車隊平均產值 (未稅)</span>
                <BarChart3 className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
                ${fleetSummary.avgUntaxedPerActiveTruck.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-500 font-sans">/ 車</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                <span>每站均額：</span>
                <strong className="font-mono text-slate-700">
                  ${fleetSummary.avgUntaxedPerStop.toLocaleString()} / 站
                </strong>
              </div>
            </div>

            {/* Card 4: Fleet Overall Load & Pressure */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span className="font-medium">車隊整體負載壓力</span>
                <Truck className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono mt-1 flex items-center gap-2">
                <span
                  className={
                    fleetSummary.overallLoadPct > 90
                      ? 'text-rose-600'
                      : fleetSummary.overallLoadPct >= 80
                      ? 'text-amber-600'
                      : 'text-rose-800'
                  }
                >
                  {fleetSummary.overallLoadPct}%
                </span>
                {fleetSummary.overloadedCount > 0 ? (
                  <span className="text-xs bg-rose-100 text-rose-800 border border-rose-300 font-bold px-1.5 py-0.2 rounded font-sans">
                    {fleetSummary.overloadedCount}車超額
                  </span>
                ) : (
                  <span className="text-xs bg-rose-100 text-rose-800 border border-rose-300 font-bold px-1.5 py-0.2 rounded font-sans">
                    正常
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                <span>高載車輛 (≥80%)：</span>
                <strong className="font-bold text-slate-800">{fleetSummary.heavyLoadCount} 台</strong>
              </div>
            </div>
          </div>

          {/* D3 Visualizations Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
            {/* Chart 1: D3 Bar Chart (8 Columns on desktop) */}
            <div className="lg:col-span-8 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-rose-700 shrink-0" />
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    {viewMetric === 'load'
                      ? '各車當前裝載負載佔比 (%)'
                      : viewMetric === 'amount'
                      ? '各車未稅產值分布 (NT$)'
                      : '各車停靠站點數 (站)'}
                  </h3>
                  <span className="text-[10px] text-slate-500 hidden sm:inline">
                    (點擊長條可即時切換至該車視角)
                  </span>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>健康 (&lt;80%)</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span>高載 (80~100%)</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span>超限 (&gt;100%)</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                    <span>沙盒測試</span>
                  </span>
                </div>
              </div>

              {/* D3 SVG Bar Container */}
              <div className="w-full overflow-x-auto scrollbar-none">
                <svg ref={barChartSvgRef} className="w-full" style={{ minWidth: 420 }} />
              </div>
            </div>

            {/* Chart 2: D3 Donut Chart (4 Columns on desktop) */}
            <div className="lg:col-span-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col items-center justify-between">
              <div className="w-full flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-rose-700 shrink-0" />
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    {viewMetric === 'stops' ? '車隊站點貢獻佔比' : '車隊產值分配佔比'}
                  </h3>
                </div>
                <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-600 font-bold">
                  D3 環狀圖
                </span>
              </div>

              {/* Donut SVG */}
              <div className="my-auto py-2">
                <svg ref={donutChartSvgRef} className="mx-auto" />
              </div>

              {/* Quick Status / Guidance Note */}
              <div className="w-full text-center text-[11px] text-slate-500 border-t border-slate-200/80 pt-2.5 mt-2">
                <p className="flex items-center justify-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>點選環形區塊即可快速切換司機排單</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

