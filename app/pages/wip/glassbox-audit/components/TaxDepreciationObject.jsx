'use client'

import ObjectCard from './ObjectCard'
import { calculateTaxDepreciation } from '../utils/calculations'

export default function TaxDepreciationObject({
  objectData,
  isExpanded,
  onToggleExpand,
  onInputChange,
  activeInput,
  setActiveInput,
  allObjects,
  dependencies
}) {
  const calculatedOutputs = calculateTaxDepreciation(objectData, dependencies)

  const calculatedObj = {
    ...objectData,
    outputs: objectData.outputs.map(output => ({
      ...output,
      value: calculatedOutputs[output.id] ?? 0
    }))
  }

  return (
    <ObjectCard
      objectKey="taxDepreciation"
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


