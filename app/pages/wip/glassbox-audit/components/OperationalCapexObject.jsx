'use client'

import ObjectCard from './ObjectCard'
import { calculateOperationalCapex } from '../utils/calculations'

export default function OperationalCapexObject({ 
  objectData, 
  isExpanded, 
  onToggleExpand, 
  onInputChange, 
  activeInput, 
  setActiveInput,
  allObjects 
}) {
  const calculatedOutputs = calculateOperationalCapex(objectData)
  
  const calculatedObj = {
    ...objectData,
    outputs: objectData.outputs.map(output => ({
      ...output,
      value: calculatedOutputs[output.id] || 0
    }))
  }

  return (
    <ObjectCard
      objectKey="operationalCapex"
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

