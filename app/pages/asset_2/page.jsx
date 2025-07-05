
// app/pages/asset_2/page.jsx
'use client'
import { useState, useEffect } from 'react'
import { 
  Box, 
  Button, 
  FormControl, 
  FormLabel, 
  Input, 
  VStack, 
  Heading, 
  useToast 
} from '@chakra-ui/react'

export default function Asset2Page() {
  const [asset, setAsset] = useState(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    // Fetch initial asset data
    const fetchAssetData = async () => {
      try {
        const response = await fetch('/api/get-asset-data')
        if (!response.ok) {
          throw new Error('Failed to fetch asset data')
        }
        const data = await response.json()
        setAsset(data)
      } catch (error) {
        toast({
          title: 'Error fetching asset data',
          description: error.message,
          status: 'error',
          duration: 9000,
          isClosable: true,
        })
      } finally {
        setLoading(false)
      }
    }
    fetchAssetData()
  }, [toast])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setAsset(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    try {
      const response = await fetch('/api/save-asset-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(asset),
      })

      if (!response.ok) {
        throw new Error('Failed to save asset data')
      }

      toast({
        title: 'Asset data saved.',
        description: "We've saved your asset data.",
        status: 'success',
        duration: 9000,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: 'Error saving asset data',
        description: error.message,
        status: 'error',
        duration: 9000,
        isClosable: true,
      })
    }
  }

  if (loading) {
    return <Box>Loading...</Box>
  }

  if (!asset) {
    return <Box>No asset data found.</Box>
  }

  return (
    <Box p={8}>
      <VStack spacing={8} align="stretch">
        <Heading>Asset Definition</Heading>
        <FormControl>
          <FormLabel>Asset Name</FormLabel>
          <Input name="name" value={asset.name} onChange={handleInputChange} />
        </FormControl>
        <FormControl>
          <FormLabel>State</FormLabel>
          <Input name="state" value={asset.state} onChange={handleInputChange} />
        </FormControl>
        <FormControl>
          <FormLabel>Asset Start Date</FormLabel>
          <Input name="assetStartDate" value={asset.assetStartDate} onChange={handleInputChange} />
        </FormControl>
        <FormControl>
          <FormLabel>Capacity</FormLabel>
          <Input name="capacity" value={asset.capacity} onChange={handleInputChange} type="number" />
        </FormControl>
        <FormControl>
          <FormLabel>Type</FormLabel>
          <Input name="type" value={asset.type} onChange={handleInputChange} />
        </FormControl>
        <FormControl>
          <FormLabel>Volume Loss Adjustment</FormLabel>
          <Input name="volumeLossAdjustment" value={asset.volumeLossAdjustment} onChange={handleInputChange} type="number" />
        </FormControl>
        <FormControl>
          <FormLabel>Annual Degradation</FormLabel>
          <Input name="annualDegradation" value={asset.annualDegradation} onChange={handleInputChange} type="number" />
        </FormControl>
        <FormControl>
          <FormLabel>Asset Life</FormLabel>
          <Input name="assetLife" value={asset.assetLife} onChange={handleInputChange} type="number" />
        </FormControl>
        <FormControl>
          <FormLabel>Construction Duration</FormLabel>
          <Input name="constructionDuration" value={asset.constructionDuration} onChange={handleInputChange} type="number" />
        </FormControl>
        <FormControl>
          <FormLabel>Construction Start Date</FormLabel>
          <Input name="constructionStartDate" value={asset.constructionStartDate} onChange={handleInputChange} />
        </FormControl>
        <Button colorScheme="blue" onClick={handleSave}>Save</Button>
      </VStack>
    </Box>
  )
}
