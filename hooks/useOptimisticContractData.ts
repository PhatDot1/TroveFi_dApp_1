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

export function useOptimisticContractData() {
  const { isConnected, address } = useWallet()
  
  // Core data state
  const [epochInfo, setEpochInfo] = useState<EpochInfo | null>(null)
  const [userDashboard, setUserDashboard] = useState<UserDashboard | null>(null)
  const [vaultMetrics, setVaultMetrics] = useState<VaultMetrics | null>(null)
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null)
  const [userDeposit, setUserDeposit] = useState<UserDeposit | null>(null)
  
  // UX state
  const [initialLoading, setInitialLoading] = useState(true)
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSuccessfulFetch, setLastSuccessfulFetch] = useState<number>(0)
  
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

  // Fetch functions
  const fetchEpochInfo = async (): Promise<EpochInfo | null> => {
    try {
      const vaultExtension = getVaultExtensionContractReadOnly()
      const result = await vaultExtension.getCurrentEpochStatus()
      
      return {
        epochNumber: Number(result[0]),
        timeRemaining: Number(result[1]),
        yieldPool: ethers.formatUnits(result[2], 18),
        participantCount: Number(result[3]),
      }
    } catch (err: any) {
      console.error("[OptimisticData] Failed to fetch epoch info:", err)
      return null
    }
  }

  const fetchVaultMetrics = async (): Promise<VaultMetrics | null> => {
    try {
      const coreVault = getCoreVaultContractReadOnly()
      const result = await coreVault.getVaultMetrics()
      
      return {
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
    } catch (err: any) {
      console.error("[OptimisticData] Failed to fetch vault metrics:", err)
      return null
    }
  }

  const fetchUserPosition = async (userAddress: string): Promise<UserPosition | null> => {
    try {
      const coreVault = getCoreVaultContractReadOnly()
      const result = await coreVault.getUserPosition(userAddress)
      
      return {
        totalShares: ethers.formatUnits(result[0], 18),
        lastDeposit: Number(result[1]),
        withdrawalRequested: result[2],
        withdrawalAvailableAt: Number(result[3]),
        riskLevel: Number(result[4]),
        totalDeposited: ethers.formatUnits(result[5], 18),
      }
    } catch (err: any) {
      console.error("[OptimisticData] Failed to fetch user position:", err)
      return null
    }
  }

  const fetchUserDeposit = async (userAddress: string): Promise<UserDeposit | null> => {
    try {
      const vaultExtension = getVaultExtensionContractReadOnly()
      const result = await vaultExtension.getUserDeposit(userAddress)
      
      return {
        totalDeposited: ethers.formatUnits(result[0], 18),
        currentBalance: ethers.formatUnits(result[1], 18),
        firstDepositEpoch: Number(result[2]),
        lastDepositEpoch: Number(result[3]),
        riskLevel: Number(result[4]),
        timeWeightedBalance: ethers.formatUnits(result[5], 18),
      }
    } catch (err: any) {
      console.error("[OptimisticData] Failed to fetch user deposit:", err)
      return null
    }
  }

  const fetchUserDashboard = async (userAddress: string, epochData: EpochInfo | null, positionData: UserPosition | null): Promise<UserDashboard | null> => {
    try {
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

      return {
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
    } catch (err: any) {
      console.error("[OptimisticData] Failed to fetch user dashboard:", err)
      return null
    }
  }

  // Main refresh function
  const refreshData = useCallback(async (showLoading = false) => {
    if (isRefreshingRef.current) return
    
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

      setLastSuccessfulFetch(Date.now())
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
  }, [isConnected, address, initialLoading, lastSuccessfulFetch, clearExpiredOptimisticUpdates])

  // Handle wallet connection changes
  useEffect(() => {
    const addressChanged = lastAddressRef.current !== address
    lastAddressRef.current = address

    if (addressChanged) {
      // Immediate refresh on wallet change
      refreshData(false)
    }
  }, [address, refreshData])

  // Initial load
  useEffect(() => {
    if (initialLoading) {
      refreshData(false)
    }
  }, [initialLoading, refreshData])

  // Background refresh interval
  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
    }

    refreshIntervalRef.current = setInterval(() => {
      refreshData(false) // Silent background refresh
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
      
      setUserPosition(prev => prev ? {
        ...prev,
        totalDeposited: (currentDeposited + newAmount).toString(),
        riskLevel: riskLevel // Update risk level if this is first deposit
      } : null)
    }

    return id
  }, [userPosition])

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
      setUserPosition(prev => prev ? {
        ...prev,
        withdrawalRequested: true
      } : null)
    }

    return id
  }, [userPosition])

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
      setUserDashboard(prev => prev ? {
        ...prev,
        recentEpochsInfo: prev.recentEpochsInfo.map(epoch => 
          epoch.epochNumber === epochNumber 
            ? { ...epoch, hasClaimed: true, canClaim: false }
            : epoch
        ),
        claimInfo: {
          ...prev.claimInfo,
          claimableEpochs: prev.claimInfo.claimableEpochs.filter(e => e !== epochNumber)
        }
      } : null)
    }

    return id
  }, [userDashboard])

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
      setUserPosition(prev => prev ? {
        ...prev,
        riskLevel: newRiskLevel
      } : null)
    }

    return id
  }, [userPosition])

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
    refreshData(true)
  }, [refreshData])

  // Computed values with optimistic updates applied
  const hasOptimisticUpdates = optimisticState.pendingDeposits.length > 0 || 
                               optimisticState.pendingWithdrawals.length > 0 || 
                               optimisticState.pendingClaims.length > 0 || 
                               optimisticState.pendingRiskUpdates.length > 0

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