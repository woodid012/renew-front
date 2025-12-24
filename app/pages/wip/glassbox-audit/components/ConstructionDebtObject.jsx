'use client'

import ObjectCard from './ObjectCard'
import { calculateConstructionDebt } from '../utils/calculations'

export default function ConstructionDebtObject({
  objectData,
  isExpanded,
  onToggleExpand,
  onInputChange,
  activeInput,
  setActiveInput,
  allObjects,
  dependencies
}) {
  const calculatedOutputs = calculateConstructionDebt(objectData, dependencies)

  const calculatedObj = {
    ...objectData,
    outputs: objectData.outputs.map(output => ({
      ...output,
      value: calculatedOutputs[output.id] ?? 0
    }))
  }

  return (
    <ObjectCard
      objectKey="constructionDebt"
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


