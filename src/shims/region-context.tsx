import React, { createContext, useContext, useState, useEffect } from 'react'

interface Cluster {
  cloud_provider: string
  cloud_region: string
}

interface RegionData {
  name: string
  dns: string
  clusters: Cluster[]
}

interface RegionContextType {
  regions: RegionData[]
  region: string | null
  cloudRegion: string | null
  setRegion: (region: string | null, cloudRegion: string | null) => void
  isLoading: boolean
}

const FALLBACK_REGIONS: RegionData[] = [
  {
    name: 'us',
    dns: 'us.signoz.cloud',
    clusters: [
      {
        cloud_provider: 'gcp',
        cloud_region: 'us-central1',
      },
    ],
  },
  {
    name: 'eu',
    dns: 'eu.signoz.cloud',
    clusters: [
      {
        cloud_provider: 'gcp',
        cloud_region: 'europe-central2',
      },
    ],
  },
  {
    name: 'in',
    dns: 'in.signoz.cloud',
    clusters: [
      {
        cloud_provider: 'gcp',
        cloud_region: 'asia-south1',
      },
    ],
  },
]

const STORAGE_KEY_REGION = 'doc-editor:region'
const STORAGE_KEY_CLOUD_REGION = 'doc-editor:cloudRegion'

const RegionContext = createContext<RegionContextType | undefined>(undefined)

export const RegionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [regions] = useState<RegionData[]>(FALLBACK_REGIONS)
  const [region, setRegionState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_REGION) || 'us'
    } catch {
      return 'us'
    }
  })
  const [cloudRegion, setCloudRegionState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_CLOUD_REGION) || 'us-central1'
    } catch {
      return 'us-central1'
    }
  })

  const setRegion = (newRegion: string | null, newCloudRegion: string | null) => {
    setRegionState(newRegion)
    setCloudRegionState(newCloudRegion)
    try {
      if (newRegion) {
        localStorage.setItem(STORAGE_KEY_REGION, newRegion)
      } else {
        localStorage.removeItem(STORAGE_KEY_REGION)
      }
      if (newCloudRegion) {
        localStorage.setItem(STORAGE_KEY_CLOUD_REGION, newCloudRegion)
      } else {
        localStorage.removeItem(STORAGE_KEY_CLOUD_REGION)
      }
    } catch {
      // localStorage unavailable
    }
  }

  return (
    <RegionContext.Provider value={{ regions, region, cloudRegion, setRegion, isLoading: false }}>
      {children}
    </RegionContext.Provider>
  )
}

export const useRegion = () => {
  const context = useContext(RegionContext)
  if (context === undefined) {
    throw new Error('useRegion must be used within a RegionProvider')
  }
  return context
}
