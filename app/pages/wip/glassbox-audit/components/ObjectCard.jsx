'use client'

import { Info, Eye, CheckCircle, ChevronUp, ChevronDown } from 'lucide-react'
import { formatValue, getColorClasses, getColorAccent } from '../utils/constants'

export default function ObjectCard({ 
  objectKey, 
  obj, 
  calculatedObj, 
  isExpanded, 
  onToggleExpand, 
  onInputChange, 
  activeInput, 
  setActiveInput,
  allObjects 
}) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 ${isExpanded ? 'border-gray-300' : 'border-gray-200'} transition-all`}>
      <div
        className={`p-4 cursor-pointer ${getColorClasses(obj.color)}`}
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${getColorAccent(obj.color)} rounded-lg flex items-center justify-center text-white`}>
              {obj.icon}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{obj.name}</h3>
              <p className="text-sm opacity-75">{obj.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs opacity-75">Inputs: {obj.inputs.length}</div>
              <div className="text-xs opacity-75">Outputs: {obj.outputs.length}</div>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Inputs Panel */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-gray-500" />
              Inputs
            </h4>
            <div className="space-y-2">
              {calculatedObj.inputs.map((input) => (
                <div key={input.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        {input.label}
                        {input.required && <span className="text-red-500 text-xs">*</span>}
                        <span className="text-xs text-gray-500">({input.unit})</span>
                      </label>
                      {input.description && (
                        <p className="text-xs text-gray-500 mt-1">{input.description}</p>
                      )}
                    </div>
                  </div>
                  {input.type === 'select' ? (
                    <select
                      value={input.value}
                      onChange={(e) => onInputChange(objectKey, input.id, e.target.value)}
                      onFocus={() => setActiveInput(`${objectKey}-${input.id}`)}
                      onBlur={() => setActiveInput(null)}
                      className={`w-full mt-2 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        activeInput === `${objectKey}-${input.id}` ? 'border-blue-500' : 'border-gray-300'
                      }`}
                    >
                      {input.options?.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      value={input.value}
                      onChange={(e) => onInputChange(objectKey, input.id, e.target.value)}
                      onFocus={() => setActiveInput(`${objectKey}-${input.id}`)}
                      onBlur={() => setActiveInput(null)}
                      className={`w-full mt-2 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        activeInput === `${objectKey}-${input.id}` ? 'border-blue-500' : 'border-gray-300'
                      }`}
                    />
                  )}
                  <div className="mt-1 text-sm font-medium text-gray-900">
                    Current: {formatValue(input.value, input.unit)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Logic Panel */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-500" />
              Logic (Human-Readable)
            </h4>
            <div className="bg-gray-900 rounded-lg p-4 space-y-2">
              {calculatedObj.logic.map((formula, idx) => (
                <div key={idx} className="font-mono text-sm text-green-400">
                  {formula}
                </div>
              ))}
            </div>
          </div>

          {/* Outputs Panel */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-gray-500" />
              Outputs
            </h4>
            <div className="space-y-2">
              {calculatedObj.outputs.map((output) => (
                <div key={output.id} className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-green-900">
                        {output.label}
                        <span className="text-xs text-gray-500 ml-2">({output.unit})</span>
                      </label>
                      {output.usedBy && output.usedBy.length > 0 && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                          <span>Used by:</span>
                          {output.usedBy.map((used, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-green-100 rounded text-green-700">
                              {allObjects[used]?.name || used}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-lg font-bold text-green-900">
                      {formatValue(output.value || 0, output.unit)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

