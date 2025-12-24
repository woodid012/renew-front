'use client'

import { useMemo } from 'react'

export default function TimelineBar({ 
  timelineOutputs, 
  contractYears = 10,
  debtTerm = 15,
  majorCapexYear = 10,
  majorCapexInterval = 5
}) {
  const {
    construction_start_year = -1,
    cod_year = 1,
    operations_end_year = 21,
    terminal_year = 21
  } = timelineOutputs || {}

  const timeline = useMemo(() => {
    const totalYears = terminal_year - construction_start_year + 1
    const constructionYears = cod_year - construction_start_year
    const operatingYears = operations_end_year - cod_year
    
    // Calculate percentages for bar widths
    const constructionPct = (constructionYears / totalYears) * 100
    const operationsPct = (operatingYears / totalYears) * 100
    const terminalPct = (1 / totalYears) * 100 // Terminal is single year

    // Revenue timeline: Contracted (Years 1-10) vs Merchant (Years 11+)
    const contractedYears = Math.min(contractYears, operatingYears)
    const merchantYears = Math.max(0, operatingYears - contractYears)
    const contractedPct = (contractedYears / totalYears) * 100
    const merchantPct = (merchantYears / totalYears) * 100

    // Funding timeline: Construction Funding overlaps construction, Operating Debt starts at COD
    const operatingDebtYears = Math.min(debtTerm, operatingYears)
    const operatingDebtPct = (operatingDebtYears / totalYears) * 100

    // Generate major capex events based on inputs
    const majorCapexEvents = []
    for (let opYear = majorCapexYear; opYear <= operatingYears; opYear += majorCapexInterval) {
      majorCapexEvents.push(opYear)
    }
    
    return {
      totalYears,
      constructionYears,
      operatingYears,
      constructionPct,
      operationsPct,
      terminalPct,
      contractedYears,
      merchantYears,
      contractedPct,
      merchantPct,
      operatingDebtYears,
      operatingDebtPct,
      majorCapexEvents
    }
  }, [construction_start_year, cod_year, operations_end_year, terminal_year, contractYears, debtTerm, majorCapexYear, majorCapexInterval])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Timeline</h3>
      
      {/* Timeline Bar */}
      <div className="relative">
        {/* Main bar */}
        <div className="flex h-12 rounded-lg overflow-hidden border-2 border-gray-300">
          {/* Construction Period */}
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-400 flex items-center justify-center text-white text-sm font-medium relative"
            style={{ width: `${timeline.constructionPct}%`, minWidth: '80px' }}
          >
            <span className="z-10">Construction</span>
            {/* Overlap indicator with Operations */}
            <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-r from-blue-400 to-green-500" />
          </div>
          
          {/* Operations Period */}
          <div 
            className="bg-gradient-to-r from-green-500 to-green-400 flex items-center justify-center text-white text-sm font-medium relative"
            style={{ width: `${timeline.operationsPct}%`, minWidth: '120px' }}
          >
            <span className="z-10">Operations</span>
            {/* Overlap indicator with Terminal */}
            <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-r from-green-400 to-amber-500" />
          </div>
          
          {/* Terminal Period */}
          <div 
            className="bg-gradient-to-r from-amber-500 to-amber-400 flex items-center justify-center text-white text-sm font-medium"
            style={{ width: `${Math.max(timeline.terminalPct, 5)}%`, minWidth: '60px' }}
          >
            <span className="z-10 text-xs">Term</span>
          </div>
        </div>
        
        {/* Milestone markers */}
        <div className="relative mt-2 text-xs text-gray-600 h-14">
          {/* Construction Start - left aligned */}
          <div className="absolute left-0 flex flex-col items-start">
            <div className="w-0.5 h-2 bg-gray-400 mb-1" />
            <span className="font-medium">Year {construction_start_year}</span>
            <span className="text-gray-400">Const. Start</span>
          </div>
          
          {/* COD */}
          <div 
            className="absolute flex flex-col items-center"
            style={{ left: `${timeline.constructionPct}%`, transform: 'translateX(-50%)' }}
          >
            <div className="w-0.5 h-2 bg-gray-400 mb-1" />
            <span className="font-medium">Year {cod_year}</span>
            <span className="text-gray-400">COD</span>
          </div>
          
          {/* Ops End - offset left to avoid overlap with Terminal */}
          <div 
            className="absolute flex flex-col items-end"
            style={{ left: `${timeline.constructionPct + timeline.operationsPct - 2}%`, transform: 'translateX(-100%)' }}
          >
            <div className="w-0.5 h-2 bg-gray-400 mb-1" />
            <span className="font-medium">Year {operations_end_year}</span>
            <span className="text-gray-400">Ops End</span>
          </div>
          
          {/* Terminal - right aligned */}
          <div className="absolute right-0 flex flex-col items-end">
            <div className="w-0.5 h-2 bg-gray-400 mb-1" />
            <span className="font-medium">Year {terminal_year}</span>
            <span className="text-gray-400">Terminal</span>
          </div>
        </div>
      </div>
      
      {/* Revenue Timeline */}
      <div className="mt-6">
        <div className="text-sm font-medium text-gray-600 mb-2">Revenue Structure</div>
        <div className="flex h-8 rounded-lg overflow-hidden border border-gray-200">
          {/* Construction - No Revenue */}
          <div 
            className="bg-gray-100 flex items-center justify-center text-gray-400 text-xs"
            style={{ width: `${timeline.constructionPct}%`, minWidth: '60px' }}
          >
            <span>No Revenue</span>
          </div>
          
          {/* Contracted Revenue Period */}
          <div 
            className="bg-gradient-to-r from-amber-500 to-amber-400 flex items-center justify-center text-white text-xs font-medium"
            style={{ width: `${timeline.contractedPct}%`, minWidth: '80px' }}
          >
            <span>Contracted ({timeline.contractedYears}y)</span>
          </div>
          
          {/* Merchant Revenue Period */}
          {timeline.merchantYears > 0 && (
            <div 
              className="bg-gradient-to-r from-green-600 to-green-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${timeline.merchantPct}%`, minWidth: '80px' }}
            >
              <span>Merchant ({timeline.merchantYears}y)</span>
            </div>
          )}
          
          {/* Terminal */}
          <div 
            className="bg-gray-200 flex items-center justify-center text-gray-500 text-xs"
            style={{ width: `${Math.max(timeline.terminalPct, 3)}%`, minWidth: '30px' }}
          >
            <span>T</span>
          </div>
        </div>
      </div>

      {/* Funding Timeline */}
      <div className="mt-4">
        <div className="text-sm font-medium text-gray-600 mb-2">Funding & Debt Structure</div>
        <div className="flex h-8 rounded-lg overflow-hidden border border-gray-200">
          {/* Construction Funding Period */}
          <div 
            className="bg-gradient-to-r from-indigo-600 to-indigo-500 flex items-center justify-center text-white text-xs font-medium"
            style={{ width: `${timeline.constructionPct}%`, minWidth: '80px' }}
          >
            <span>Const. Funding</span>
          </div>
          
          {/* Operating Debt Period */}
          <div 
            className="bg-gradient-to-r from-purple-600 to-purple-500 flex items-center justify-center text-white text-xs font-medium"
            style={{ width: `${timeline.operatingDebtPct}%`, minWidth: '80px' }}
          >
            <span>Op. Debt ({timeline.operatingDebtYears}y)</span>
          </div>
          
          {/* Post-Debt / Unlevered Period */}
          {timeline.operatingYears > timeline.operatingDebtYears && (
            <div 
              className="bg-gradient-to-r from-gray-400 to-gray-300 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${((timeline.operatingYears - timeline.operatingDebtYears) / timeline.totalYears) * 100}%`, minWidth: '50px' }}
            >
              <span>Unlevered</span>
            </div>
          )}
          
          {/* Terminal */}
          <div 
            className="bg-gray-200 flex items-center justify-center text-gray-500 text-xs"
            style={{ width: `${Math.max(timeline.terminalPct, 3)}%`, minWidth: '30px' }}
          >
            <span>T</span>
          </div>
        </div>
      </div>

      {/* Operational Capex Timeline */}
      <div className="mt-4">
        <div className="text-sm font-medium text-gray-600 mb-2">Capital Expenditure</div>
        <div className="relative h-8 rounded-lg border border-gray-200 bg-gray-50">
          {/* Construction Capex - solid bar */}
          <div 
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-teal-600 to-teal-500 flex items-center justify-center text-white text-xs font-medium rounded-l-lg"
            style={{ width: `${timeline.constructionPct}%`, minWidth: '80px' }}
          >
            <span>Const. CAPEX</span>
          </div>
          
          {/* Operating Capex - discrete data points based on majorCapexYear and interval */}
          {timeline.majorCapexEvents.map((opYear) => {
            // Calculate position: construction years + operating year position
            const yearFromStart = timeline.constructionYears + opYear
            const positionPct = (yearFromStart / timeline.totalYears) * 100
            
            return (
              <div
                key={`opcapex-${opYear}`}
                className="absolute top-1 bottom-1 flex flex-col items-center justify-center"
                style={{ left: `${positionPct}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-6 h-6 rounded-full bg-teal-500 border-2 border-white shadow-md flex items-center justify-center">
                  <span className="text-[8px] text-white font-bold">Y{opYear}</span>
                </div>
              </div>
            )
          })}
          
          {/* Terminal marker */}
          <div 
            className="absolute top-0 bottom-0 right-0 bg-gray-200 flex items-center justify-center text-gray-500 text-xs rounded-r-lg"
            style={{ width: `${Math.max(timeline.terminalPct, 3)}%`, minWidth: '30px' }}
          >
            <span>T</span>
          </div>
          
          {/* Legend for Op Capex - dynamically show the years */}
          {timeline.majorCapexEvents.length > 0 && (
            <div 
              className="absolute top-1/2 flex items-center gap-1 text-xs text-teal-700"
              style={{ left: `${timeline.constructionPct + 2}%`, transform: 'translateY(-50%)' }}
            >
              <span className="bg-teal-100 px-2 py-0.5 rounded text-teal-700 font-medium">
                Major Op. CAPEX @ {timeline.majorCapexEvents.map(y => `Y${y}`).join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-100">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{timeline.constructionYears}</div>
          <div className="text-xs text-gray-500">Construction Years</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{timeline.operatingYears}</div>
          <div className="text-xs text-gray-500">Operating Years</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-600">{timeline.contractedYears}</div>
          <div className="text-xs text-gray-500">Contracted Years</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{timeline.operatingDebtYears}</div>
          <div className="text-xs text-gray-500">Debt Term Years</div>
        </div>
      </div>
    </div>
  )
}

