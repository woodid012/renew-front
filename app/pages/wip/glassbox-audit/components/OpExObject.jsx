'use client'

import ObjectCard from './ObjectCard'
import { calculateOpEx } from '../utils/calculations'

export default function OpExObject({ 
  objectData, 
  isExpanded, 
  onToggleExpand, 
  onInputChange, 
  activeInput, 
  setActiveInput,
  allObjects 
}) {
  const calculatedOutputs = calculateOpEx(objectData)
  
  const calculatedObj = {
    ...objectData,
    outputs: objectData.outputs.map(output => ({
      ...output,
      value: calculatedOutputs[output.id] || 0
    }))
  }

  return (
    <ObjectCard
      objectKey="opex"
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

