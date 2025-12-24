'use client'

import ObjectCard from './ObjectCard'
import { calculateFunding } from '../utils/calculations'

export default function FundingObject({ 
  objectData, 
  isExpanded, 
  onToggleExpand, 
  onInputChange, 
  activeInput, 
  setActiveInput,
  allObjects,
  dependencies 
}) {
  const calculatedOutputs = calculateFunding(objectData, dependencies)
  
  const calculatedObj = {
    ...objectData,
    outputs: objectData.outputs.map(output => ({
      ...output,
      value: calculatedOutputs[output.id] || 0
    }))
  }

  return (
    <ObjectCard
      objectKey="funding"
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

