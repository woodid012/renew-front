'use client'

import ObjectCard from './ObjectCard'
import { calculateCashflowSummary } from '../utils/calculations'

export default function CashflowSummaryObject({ 
  objectData, 
  isExpanded, 
  onToggleExpand, 
  onInputChange, 
  activeInput, 
  setActiveInput,
  allObjects,
  dependencies
}) {
  const calculatedOutputs = calculateCashflowSummary(objectData, dependencies)
  
  const calculatedObj = {
    ...objectData,
    outputs: objectData.outputs.map(output => ({
      ...output,
      value: calculatedOutputs[output.id] || 0
    }))
  }

  return (
    <ObjectCard
      objectKey="cashflowSummary"
      obj={objectData}
      calculatedObj={calculatedObj}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      onInputChange={onInputChange}
      activeInput={activeInput}
      setActiveInput={setActiveInput}
      allObjects={allObjects}
    />
  )
}

