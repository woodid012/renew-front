'use client'

import ObjectCard from './ObjectCard'
import { calculateVolume } from '../utils/calculations'

export default function VolumeObject({
  objectData,
  isExpanded,
  onToggleExpand,
  onInputChange,
  activeInput,
  setActiveInput,
  allObjects
}) {
  const calculatedOutputs = calculateVolume(objectData)

  const calculatedObj = {
    ...objectData,
    outputs: objectData.outputs.map(output => ({
      ...output,
      value: calculatedOutputs[output.id] || 0
    }))
  }

  return (
    <ObjectCard
      objectKey="volume"
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


