'use client'

import ObjectCard from './ObjectCard'
import { calculateTimeline } from '../utils/calculations'

export default function TimelineObject({ 
  objectData, 
  isExpanded, 
  onToggleExpand, 
  onInputChange, 
  activeInput, 
  setActiveInput,
  allObjects,
  dependencies
}) {
  const calculatedOutputs = calculateTimeline(objectData)
  
  const calculatedObj = {
    ...objectData,
    outputs: objectData.outputs.map(output => ({
      ...output,
      value: output.id === 'year_array' 
        ? calculatedOutputs[output.id]?.length || 0 
        : calculatedOutputs[output.id] || 0
    }))
  }

  return (
    <ObjectCard
      objectKey="timeline"
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

