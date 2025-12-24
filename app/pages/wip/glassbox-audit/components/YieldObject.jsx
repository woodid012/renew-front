'use client'

import ObjectCard from './ObjectCard'
import { calculateYield } from '../utils/calculations'

export default function YieldObject({ 
  objectData, 
  isExpanded, 
  onToggleExpand, 
  onInputChange, 
  activeInput, 
  setActiveInput,
  allObjects 
}) {
  const calculatedOutputs = calculateYield(objectData)
  
  const calculatedObj = {
    ...objectData,
    outputs: objectData.outputs.map(output => ({
      ...output,
      value: calculatedOutputs[output.id] || 0
    }))
  }

  return (
    <ObjectCard
      objectKey="yield"
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

