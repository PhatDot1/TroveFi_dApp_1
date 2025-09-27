"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { getCoreVaultContractReadOnly, getVaultExtensionContractReadOnly } from "@/lib/web3"
import { useWallet } from "./useWallet"
import { ethers } from "ethers"

interface VaultMetrics {
  totalValueLocked: string
  totalUsers: number
  totalSupply: string
  managementFee: number
  performanceFee: number
  assetsCount: number
  totalPrincipal: string
  totalYieldGenerated: string
  totalYieldDistributed: string
}

interface EpochInfo {
  epochNumber: number
  timeRemaining: number
  yieldPool: string
  participantCount: number
}

interface UserPosition {
  totalShares: string
  lastDeposit: number
  withdrawalRequested: boolean
  withdrawalAvailableAt: number
  riskLevel: number
  totalDeposited: string
}

interface UserDeposit {
  totalDeposited: string
  currentBalance: string
  firstDepositEpoch: number
  lastDepositEpoch: number
  riskLevel: number
  timeWeightedBalance: string
}

interface EpochRewardInfo {
  epochNumber: number
  isEligible: boolean
  hasClaimed: boolean
  canClaim: boolean
  winProbability: number
  potentialPayout: string
  baseWeight: string
  timeWeight: string
  riskMultiplier: number
  won?: boolean
}

interface UserDashboard {
  claimInfo: {
    status: number
    claimableEpochs: number[]
    currentEpoch: number
    timeUntilNextEpoch: number
    hasActiveDeposit: boolean
    riskLevel: number
    totalDeposited: string
    eligibleEpochsCount: number
  }
  recentEpochsInfo: EpochRewardInfo[]
  totalClaimableRewards: string
  estimatedNextEpochReward: string
}

interface OptimisticState {
  pendingDeposits: Array<{
    id: string
    amount: string
    asset: string
    riskLevel: number
    timestamp: number
  }>
  pendingWithdrawals: Array<{
    id: string
    timestamp: number
  }>
  pendingClaims: Array<{
    id: string
    epochNumber: number
    timestamp: number
  }>
  pendingRiskUpdates: Array<{
    id: string
    newRiskLevel: number
    timestamp: number
  }>
}

// Persistent cache to maintain data across re-renders
const dataCache = new Map<string, any>()
const CACHE_DURATION = 60000 // 1 minute cache

export function useOptimisticContractData() {
  const { isConnected, address } = useWallet()
  
  // Core data state - Initialize with cached data if available
  const [epochInfo, setEpochInfo] = useState<EpochInfo | null>(() => 
    dataCache.get('epochInfo') || null
  )
  const [userDashboard, setUserDashboard] = useState<UserDashboard | null>(() => 
    address ? dataCache.get(`userDashboard_${address}`) || null : null
  )
  const [vaultMetrics, setVaultMetrics] = useState<VaultMetrics | null>(() => 
    dataCache.get('vaultMetrics') || null
  )
  const [userPosition, setUserPosition] = useState<UserPosition | null>(() => 
    address ? dataCache.get(`userPosition_${address}`) || null : null
  )
  const [userDeposit, setUserDeposit] = useState<UserDeposit | null>(() => 
    address ? dataCache.get(`userDeposit_${address}`) || null : null
  )
  
  // UX state
  const [initialLoading, setInitialLoading] = useState(() => {
    // Only show initial loading if we have no cached data for this user
    if (!address) return false
    const hasUserData = dataCache.get(`userPosition_${address}`) || dataCache.get(`userDashboard_${address}`)
    return !hasUserData
  })
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSuccessfulFetch, setLastSuccessfulFetch] = useState<number>(() => 
    dataCache.get('lastSuccessfulFetch') || 0
  )
  
  // Optimistic updates state
  const [optimisticState, setOptimisticState] = useState<OptimisticState>({
    pendingDeposits: [],
    pendingWithdrawals: [],
    pendingClaims: [],
    pendingRiskUpdates: []
  })
  
  // Refs for managing intervals and preventing race conditions
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isRefreshingRef = useRef(false)
  const lastAddressRef = useRef<string | null>(null)

  // Cache data with expiration
  const cacheData = useCallback((key: string, data: any) => {
    dataCache.set(key, data)
    dataCache.set(`${key}_timestamp`, Date.now())
  }, [])

  // Check if cached data is still valid
  const isCacheValid = useCallback((key: string): boolean => {
    const timestamp = dataCache.get(`${key}_timestamp`)
    if (!timestamp) return false
    return Date.now() - timestamp < CACHE_DURATION
  }, [])

  // Clear optimistic updates after timeout
  const clearExpiredOptimisticUpdates = useCallback(() => {
    const now = Date.now()
    const timeout = 30000 // 30 seconds
    
    setOptimisticState(prev => ({
      pendingDeposits: prev.pendingDeposits.filter(d => now - d.timestamp < timeout),
      pendingWithdrawals: prev.pendingWithdrawals.filter(w => now - w.timestamp < timeout),
      pendingClaims: prev.pendingClaims.filter(c => now - c.timestamp < timeout),
      pendingRiskUpdates: prev.pendingRiskUpdates.filter(r => now - r.timestamp < timeout)
    }))
  }, [])

  // Fetch functions with caching
  const fetchEpochInfo = async (): Promise<EpochInfo | null> => {
    try {
      // Check cache first
      if (isCacheValid('epochInfo')) {
        return dataCache.get('epochInfo')
      }

      const vaultExtension = getVaultExtensionContractReadOnly()
      const result = await vaultExtension.getCurrentEpochStatus()
      
      const epochData = {
        epochNumber: Number(result[0]),
        timeRemaining: Number(result[1]),
        yieldPool: ethers.formatUnits(result[2], 18),
        participantCount: Number(result[3]),
      }

      cacheData('epochInfo', epochData)
      return epochData
    } catch (err: any) {
      console.error("[OptimisticData] Failed to fetch epoch info:", err)
      // Return cached data if available
      return dataCache.get('epochInfo') || null
    }
  }

  const fetchVaultMetrics = async (): Promise<VaultMetrics | null> => {
    try {
      // Check cache first
      if (isCacheValid('vaultMetrics')) {
        return dataCache.get('vaultMetrics')
      }

      const coreVault = getCoreVaultContractReadOnly()
      const result = await coreVault.getVaultMetrics()
      
      const metricsData = {
        totalValueLocked: ethers.formatUnits(result[0], 18),
        totalUsers: Number(result[1]),
        totalSupply: ethers.formatUnits(result[2], 18),
        managementFee: Number(result[3]),
        performanceFee: Number(result[4]),
        assetsCount: Number(result[5]),
        totalPrincipal: ethers.formatUnits(result[6], 18),
        totalYieldGenerated: ethers.formatUnits(result[7], 18),
        totalYieldDistributed: ethers.formatUnits(result[8], 18),
      }

      cacheData('vaultMetrics', metricsData)
      return metricsData
    } catch (err: any) {
      console.error("[OptimisticData] Failed to fetch vault metrics:", err)
      return dataCache.get('vaultMetrics') || null
    }
  }

  const fetchUserPosition = async (userAddress: string): Promise<UserPosition | null> => {
    try {
      const cacheKey = `userPosition_${userAddress}`
      
      // Check cache first
      if (isCacheValid(cacheKey)) {
        return dataCache.get(cacheKey)
      }

      const coreVault = getCoreVaultContractReadOnly()
      const result = await coreVault.getUserPosition(userAddress)
      
      const positionData = {
        totalShares: ethers.formatUnits(result[0], 18),
        lastDeposit: Number(result[1]),
        withdrawalRequested: result[2],
        withdrawalAvailableAt: Number(result[3]),
        riskLevel: Number(result[4]),
        totalDeposited: ethers.formatUnits(result[5], 18),
      }

      cacheData(cacheKey, positionData)
      return positionData
    } catch (err: any) {
      console.error("[OptimisticData] Failed to fetch user position:", err)
      return dataCache.get(`userPosition_${userAddress}`) || null
    }
  }

  const fetchUserDeposit = async (userAddress: string): Promise<UserDeposit | null> => {
    try {
      const cacheKey = `userDeposit_${userAddress}`
      
      // Check cache first
      if (isCacheValid(cacheKey)) {
        return dataCache.get(cacheKey)
      }

      const vaultExtension = getVaultExtensionContractReadOnly()
      const result = await vaultExtension.getUserDeposit(userAddress)
      
      const depositData = {
        totalDeposited: ethers.formatUnits(result[0], 18),
        currentBalance: ethers.formatUnits(result[1], 18),
        firstDepositEpoch: Number(result[2]),
        lastDepositEpoch: Number(result[3]),
        riskLevel: Number(result[4]),
        timeWeightedBalance: ethers.formatUnits(result[5], 18),
      }

      cacheData(cacheKey, depositData)
      return depositData
    } catch (err: any) {
      console.error("[OptimisticData] Failed to fetch user deposit:", err)
      return dataCache.get(`userDeposit_${userAddress}`) || null
    }
  }

  const fetchUserDashboard = async (userAddress: string, epochData: EpochInfo | null, positionData: UserPosition | null): Promise<UserDashboard | null> => {
    try {
      const cacheKey = `userDashboard_${userAddress}`
      
      // Check cache first
      if (isCacheValid(cacheKey)) {
        return dataCache.get(cacheKey)
      }

      const vaultExtension = getVaultExtensionContractReadOnly()
      
      const claimableEpochs = await vaultExtension.getClaimableEpochs(userAddress)
      
      let totalClaimableRewards = "0"
      const recentEpochsInfo: EpochRewardInfo[] = []

      const epochsToProcess = claimableEpochs.slice(0, 10)
      
      for (const epochNumber of epochsToProcess) {
        try {
          const epochNum = Number(epochNumber)
          
          const rewardParams = await vaultExtension.calculateRewardParameters(userAddress, epochNum)
          const isEligible = await vaultExtension.isEligibleForEpoch(userAddress, epochNum)
          const hasClaimed = await vaultExtension.hasClaimedEpoch(userAddress, epochNum)

          const epochInfo: EpochRewardInfo = {
            epochNumber: epochNum,
            isEligible,
            hasClaimed,
            canClaim: isEligible && !hasClaimed,
            winProbability: Number(rewardParams[4]),
            potentialPayout: ethers.formatUnits(rewardParams[5], 18),
            baseWeight: ethers.formatUnits(rewardParams[0], 18),
            timeWeight: ethers.formatUnits(rewardParams[1], 18),
            riskMultiplier: Number(rewardParams[2]),
          }

          recentEpochsInfo.push(epochInfo)
          
          if (epochInfo.canClaim) {
            totalClaimableRewards = (
              Number.parseFloat(totalClaimableRewards) + Number.parseFloat(epochInfo.potentialPayout)
            ).toString()
          }
        } catch (err) {
          console.error(`[OptimisticData] Failed to get reward params for epoch ${epochNumber}:`, err)
        }
      }

      let estimatedNextEpochReward = "0"
      if (epochData && positionData && Number.parseFloat(positionData.totalDeposited) > 0) {
        try {
          const isEligibleNext = await vaultExtension.isEligibleForEpoch(userAddress, epochData.epochNumber)
          if (isEligibleNext) {
            const nextEpochRewardParams = await vaultExtension.calculateRewardParameters(userAddress, epochData.epochNumber)
            estimatedNextEpochReward = ethers.formatUnits(nextEpochRewardParams[5], 18)
          }
        } catch (err) {
          console.error("[OptimisticData] Failed to calculate next epoch reward:", err)
        }
      }

      const dashboardData = {
        claimInfo: {
          status: claimableEpochs.length > 0 ? 1 : 0,
          claimableEpochs: claimableEpochs.map((n: any) => Number(n)),
          currentEpoch: epochData?.epochNumber || 0,
          timeUntilNextEpoch: epochData?.timeRemaining || 0,
          hasActiveDeposit: positionData ? Number.parseFloat(positionData.totalShares) > 0 : false,
          riskLevel: positionData?.riskLevel || 0,
          totalDeposited: positionData?.totalDeposited || "0",
          eligibleEpochsCount: recentEpochsInfo.filter(e => e.isEligible).length,
        },
        recentEpochsInfo,
        totalClaimableRewards,
        estimatedNextEpochReward,
      }

      cacheData(cacheKey, dashboardData)
      return dashboardData
    } catch (err: any) {
      console.error("[OptimisticData] Failed to fetch user dashboard:", err)
      return dataCache.get(`userDashboard_${userAddress}`) || null
    }
  }

  // Main refresh function
  const refreshData = useCallback(async (showLoading = false, forceRefresh = false) => {
    if (isRefreshingRef.current && !forceRefresh) return
    
    isRefreshingRef.current = true
    
    if (showLoading && !initialLoading) {
      setBackgroundRefreshing(true)
    }
    
    try {
      // Always fetch global data
      const [newEpochInfo, newVaultMetrics] = await Promise.all([
        fetchEpochInfo(),
        fetchVaultMetrics()
      ])

      // Update global data immediately
      if (newEpochInfo) setEpochInfo(newEpochInfo)
      if (newVaultMetrics) setVaultMetrics(newVaultMetrics)

      // Fetch user data if connected
      if (isConnected && address) {
        const [newUserPosition, newUserDeposit] = await Promise.all([
          fetchUserPosition(address),
          fetchUserDeposit(address)
        ])

        if (newUserPosition) setUserPosition(newUserPosition)
        if (newUserDeposit) setUserDeposit(newUserDeposit)

        // Fetch dashboard data
        const newUserDashboard = await fetchUserDashboard(address, newEpochInfo, newUserPosition)
        if (newUserDashboard) setUserDashboard(newUserDashboard)
      } else {
        // Clear user data if not connected
        setUserPosition(null)
        setUserDeposit(null)
        setUserDashboard(null)
      }

      const now = Date.now()
      setLastSuccessfulFetch(now)
      cacheData('lastSuccessfulFetch', now)
      setError(null)
      
      // Clear expired optimistic updates
      clearExpiredOptimisticUpdates()
      
    } catch (err: any) {
      console.error("[OptimisticData] Refresh failed:", err)
      if (lastSuccessfulFetch === 0) {
        setError(`Failed to load data: ${err.message}`)
      }
    } finally {
      setInitialLoading(false)
      setBackgroundRefreshing(false)
      isRefreshingRef.current = false
    }
  }, [isConnected, address, initialLoading, lastSuccessfulFetch, clearExpiredOptimisticUpdates, fetchEpochInfo, fetchVaultMetrics, fetchUserPosition, fetchUserDeposit, fetchUserDashboard, cacheData])

  // Handle wallet connection changes
  useEffect(() => {
    const addressChanged = lastAddressRef.current !== address
    lastAddressRef.current = address

    if (addressChanged) {
      console.log("[OptimisticData] Address changed:", { from: lastAddressRef.current, to: address })
      
      if (address) {
        // Load cached data immediately for new address
        const cachedPosition = dataCache.get(`userPosition_${address}`)
        const cachedDashboard = dataCache.get(`userDashboard_${address}`)
        const cachedDeposit = dataCache.get(`userDeposit_${address}`)
        
        if (cachedPosition) setUserPosition(cachedPosition)
        if (cachedDashboard) setUserDashboard(cachedDashboard)
        if (cachedDeposit) setUserDeposit(cachedDeposit)
        
        // Only show loading if no cached data exists
        const hasUserData = cachedPosition || cachedDashboard
        if (!hasUserData) {
          setInitialLoading(true)
        }
      } else {
        // Clear user data when disconnecting
        setUserPosition(null)
        setUserDeposit(null)
        setUserDashboard(null)
        setInitialLoading(false)
      }
      
      // Refresh data for new address
      refreshData(false, true)
    }
  }, [address, refreshData])

  // Initial load
  useEffect(() => {
    if (initialLoading || (!epochInfo && !vaultMetrics)) {
      refreshData(false, true)
    }
  }, [initialLoading, epochInfo, vaultMetrics, refreshData])

  // Background refresh interval
  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
    }

    refreshIntervalRef.current = setInterval(() => {
      refreshData(false, false) // Silent background refresh
    }, 30000) // 30 seconds

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [refreshData])

  // Optimistic update functions
  const addOptimisticDeposit = useCallback((amount: string, asset: string, riskLevel: number) => {
    const id = `deposit_${Date.now()}_${Math.random()}`
    setOptimisticState(prev => ({
      ...prev,
      pendingDeposits: [...prev.pendingDeposits, {
        id,
        amount,
        asset,
        riskLevel,
        timestamp: Date.now()
      }]
    }))

    // Optimistically update user position
    if (userPosition) {
      const currentDeposited = Number.parseFloat(userPosition.totalDeposited)
      const newAmount = Number.parseFloat(amount)
      
      const updatedPosition = {
        ...userPosition,
        totalDeposited: (currentDeposited + newAmount).toString(),
        riskLevel: riskLevel // Update risk level if this is first deposit
      }
      
      setUserPosition(updatedPosition)
      
      // Cache the optimistic update
      if (address) {
        cacheData(`userPosition_${address}`, updatedPosition)
      }
    }

    return id
  }, [userPosition, address, cacheData])

  const addOptimisticWithdrawal = useCallback(() => {
    const id = `withdrawal_${Date.now()}_${Math.random()}`
    setOptimisticState(prev => ({
      ...prev,
      pendingWithdrawals: [...prev.pendingWithdrawals, {
        id,
        timestamp: Date.now()
      }]
    }))

    // Optimistically update withdrawal status
    if (userPosition) {
      const updatedPosition = {
        ...userPosition,
        withdrawalRequested: true
      }
      
      setUserPosition(updatedPosition)
      
      // Cache the optimistic update
      if (address) {
        cacheData(`userPosition_${address}`, updatedPosition)
      }
    }

    return id
  }, [userPosition, address, cacheData])

  const addOptimisticClaim = useCallback((epochNumber: number) => {
    const id = `claim_${Date.now()}_${Math.random()}`
    setOptimisticState(prev => ({
      ...prev,
      pendingClaims: [...prev.pendingClaims, {
        id,
        epochNumber,
        timestamp: Date.now()
      }]
    }))

    // Optimistically update dashboard
    if (userDashboard) {
      const updatedDashboard = {
        ...userDashboard,
        recentEpochsInfo: userDashboard.recentEpochsInfo.map(epoch => 
          epoch.epochNumber === epochNumber 
            ? { ...epoch, hasClaimed: true, canClaim: false }
            : epoch
        ),
        claimInfo: {
          ...userDashboard.claimInfo,
          claimableEpochs: userDashboard.claimInfo.claimableEpochs.filter(e => e !== epochNumber)
        }
      }
      
      setUserDashboard(updatedDashboard)
      
      // Cache the optimistic update
      if (address) {
        cacheData(`userDashboard_${address}`, updatedDashboard)
      }
    }

    return id
  }, [userDashboard, address, cacheData])

  const addOptimisticRiskUpdate = useCallback((newRiskLevel: number) => {
    const id = `risk_${Date.now()}_${Math.random()}`
    setOptimisticState(prev => ({
      ...prev,
      pendingRiskUpdates: [...prev.pendingRiskUpdates, {
        id,
        newRiskLevel,
        timestamp: Date.now()
      }]
    }))

    // Optimistically update risk level
    if (userPosition) {
      const updatedPosition = {
        ...userPosition,
        riskLevel: newRiskLevel
      }
      
      setUserPosition(updatedPosition)
      
      // Cache the optimistic update
      if (address) {
        cacheData(`userPosition_${address}`, updatedPosition)
      }
    }

    return id
  }, [userPosition, address, cacheData])

  const removeOptimisticUpdate = useCallback((id: string) => {
    setOptimisticState(prev => ({
      pendingDeposits: prev.pendingDeposits.filter(d => d.id !== id),
      pendingWithdrawals: prev.pendingWithdrawals.filter(w => w.id !== id),
      pendingClaims: prev.pendingClaims.filter(c => c.id !== id),
      pendingRiskUpdates: prev.pendingRiskUpdates.filter(r => r.id !== id)
    }))
  }, [])

  // Force refresh function for after transactions
  const forceRefresh = useCallback(() => {
    // Clear cache for current user to force fresh data
    if (address) {
      dataCache.delete(`userPosition_${address}`)
      dataCache.delete(`userDashboard_${address}`)
      dataCache.delete(`userDeposit_${address}`)
    }
    refreshData(true, true)
  }, [refreshData, address])

  // Computed values with optimistic updates applied
  const hasOptimisticUpdates = optimisticState.pendingDeposits.length > 0 || 
                               optimisticState.pendingWithdrawals.length > 0 || 
                               optimisticState.pendingClaims.length > 0 || 
                               optimisticState.pendingRiskUpdates.length > 0

  // Helper to check if user has deposits (including optimistic)
  const hasUserDeposits = useCallback(() => {
    if (!userPosition) return false
    const currentDeposited = Number.parseFloat(userPosition.totalDeposited)
    const pendingDeposits = optimisticState.pendingDeposits.reduce((sum, deposit) => 
      sum + Number.parseFloat(deposit.amount), 0
    )
    return (currentDeposited + pendingDeposits) > 0
  }, [userPosition, optimisticState.pendingDeposits])

  return {
    // Data
    epochInfo,
    userDashboard,
    vaultMetrics,
    userPosition,
    userDeposit,
    
    // State
    initialLoading,
    backgroundRefreshing,
    error,
    hasOptimisticUpdates,
    lastSuccessfulFetch,
    
    // Helpers
    hasUserDeposits,
    
    // Actions
    forceRefresh,
    addOptimisticDeposit,
    addOptimisticWithdrawal,
    addOptimisticClaim,
    addOptimisticRiskUpdate,
    removeOptimisticUpdate,
    
    // Optimistic state
    optimisticState
  }
}