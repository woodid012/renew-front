'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export default function AggregatorGroup({ 
  parentKey,
  parentObject,
  childKeys,
  allObjects,
  renderObject,
  expandedChildren,
  onToggleChildren
}) {
  const isChildrenExpanded = expandedChildren[parentKey] ?? true

  // Get the sum/formula display from parent
  const parentTotal = parentObject?.outputs?.find(o => 
    o.id === 'total_funding' || 
    o.id === 'total_revenue' || 
    o.id === 'annual_opex'
  )?.value || 0

  return (
    <div className="space-y-2">
      {/* Parent Object with expand/collapse for children */}
      <div className="relative">
        {/* Hierarchy line */}
        {childKeys.length > 0 && isChildrenExpanded && (
          <div className="absolute left-4 top-full w-0.5 bg-gray-200" style={{ height: `${childKeys.length * 80}px` }} />
        )}
        
        {/* Parent card wrapper with toggle */}
        <div className="flex items-start gap-2">
          {childKeys.length > 0 && (
            <button
              onClick={() => onToggleChildren(parentKey)}
              className="mt-4 p-1 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
              title={isChildrenExpanded ? 'Collapse children' : 'Expand children'}
            >
              {isChildrenExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          )}
          <div className="flex-1">
            {renderObject(parentKey, allObjects[parentKey])}
          </div>
        </div>
      </div>

      {/* Child Objects - indented and collapsible */}
      {isChildrenExpanded && childKeys.length > 0 && (
        <div className="ml-8 pl-4 border-l-2 border-gray-200 space-y-2">
          {childKeys.map((childKey, idx) => (
            <div key={childKey} className="relative">
              {/* Connector line */}
              <div className="absolute -left-4 top-1/2 w-4 h-0.5 bg-gray-200" />
              
              {/* Child object with visual indicator */}
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <div className="flex-1">
                  {renderObject(childKey, allObjects[childKey])}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Collapsed summary when children hidden */}
      {!isChildrenExpanded && childKeys.length > 0 && (
        <div className="ml-8 text-sm text-gray-500 flex items-center gap-2">
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
            {childKeys.length} child object{childKeys.length > 1 ? 's' : ''} hidden
          </span>
          <button 
            onClick={() => onToggleChildren(parentKey)}
            className="text-blue-600 hover:underline text-xs"
          >
            Show
          </button>
        </div>
      )}
    </div>
  )
}

