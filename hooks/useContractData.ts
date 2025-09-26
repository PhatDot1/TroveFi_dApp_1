"use client"

import { useState, useEffect } from "react"
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
  won?: boolean // Optional property for tracking wins
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

export function useContractData() {
  const { isConnected, address } = useWallet()
  const [epochInfo, setEpochInfo] = useState<EpochInfo | null>(null)
  const [userDashboard, setUserDashboard] = useState<UserDashboard | null>(null)
  const [vaultMetrics, setVaultMetrics] = useState<VaultMetrics | null>(null)
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null)
  const [userDeposit, setUserDeposit] = useState<UserDeposit | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEpochInfo = async () => {
    try {
      console.log("[v0] Fetching epoch info from VaultExtension...")
      const vaultExtension = getVaultExtensionContractReadOnly()
      const result = await vaultExtension.getCurrentEpochStatus()
      console.log("[v0] Epoch info result:", result)

      setEpochInfo({
        epochNumber: Number(result[0]),
        timeRemaining: Number(result[1]),
        yieldPool: ethers.formatUnits(result[2], 18), // Use 18 decimals for yield pool
        participantCount: Number(result[3]),
      })
    } catch (err: any) {
      console.error("[v0] Failed to fetch epoch info:", err)
      setError(`Failed to fetch epoch info: ${err.message}`)
      setEpochInfo(null)
    }
  }

  const fetchVaultMetrics = async () => {
    try {
      console.log("[v0] Fetching vault metrics...")
      const coreVault = getCoreVaultContractReadOnly()
      const result = await coreVault.getVaultMetrics()
      console.log("[v0] Vault metrics result:", result)

      setVaultMetrics({
        totalValueLocked: ethers.formatUnits(result[0], 18), // Assuming 18 decimals
        totalUsers: Number(result[1]),
        totalSupply: ethers.formatUnits(result[2], 18),
        managementFee: Number(result[3]),
        performanceFee: Number(result[4]),
        assetsCount: Number(result[5]),
        totalPrincipal: ethers.formatUnits(result[6], 18),
        totalYieldGenerated: ethers.formatUnits(result[7], 18),
        totalYieldDistributed: ethers.formatUnits(result[8], 18),
      })
    } catch (err: any) {
      console.error("[v0] Failed to fetch vault metrics:", err)
      setError(`Failed to fetch vault metrics: ${err.message}`)
      setVaultMetrics(null)
    }
  }

  const fetchUserPosition = async () => {
    if (!address) return

    try {
      console.log("[v0] Fetching user position for address:", address)
      const coreVault = getCoreVaultContractReadOnly()
      const result = await coreVault.getUserPosition(address)
      console.log("[v0] User position result:", result)

      setUserPosition({
        totalShares: ethers.formatUnits(result[0], 18),
        lastDeposit: Number(result[1]),
        withdrawalRequested: result[2],
        withdrawalAvailableAt: Number(result[3]),
        riskLevel: Number(result[4]),
        totalDeposited: ethers.formatUnits(result[5], 18),
      })
    } catch (err: any) {
      console.error("[v0] Failed to fetch user position:", err)
      setError(`Failed to fetch user position: ${err.message}`)
      setUserPosition(null)
    }
  }

  const fetchUserDeposit = async () => {
    if (!address) return

    try {
      console.log("[v0] Fetching user deposit from VaultExtension...")
      const vaultExtension = getVaultExtensionContractReadOnly()
      const result = await vaultExtension.getUserDeposit(address)
      console.log("[v0] User deposit result:", result)

      setUserDeposit({
        totalDeposited: ethers.formatUnits(result[0], 18),
        currentBalance: ethers.formatUnits(result[1], 18),
        firstDepositEpoch: Number(result[2]),
        lastDepositEpoch: Number(result[3]),
        riskLevel: Number(result[4]),
        timeWeightedBalance: ethers.formatUnits(result[5], 18),
      })
    } catch (err: any) {
      console.error("[v0] Failed to fetch user deposit:", err)
      setError(`Failed to fetch user deposit: ${err.message}`)
      setUserDeposit(null)
    }
  }

  const fetchUserDashboard = async () => {
    if (!address) return

    try {
      console.log("[v0] Fetching user dashboard data...")
      const vaultExtension = getVaultExtensionContractReadOnly()
      
      // Get claimable epochs
      const claimableEpochs = await vaultExtension.getClaimableEpochs(address)
      console.log("[v0] Claimable epochs:", claimableEpochs)

      let totalClaimableRewards = "0"
      const recentEpochsInfo: EpochRewardInfo[] = []

      // Process claimable epochs (limit to first 10 for performance)
      const epochsToProcess = claimableEpochs.slice(0, 10)
      
      for (const epochNumber of epochsToProcess) {
        try {
          const epochNum = Number(epochNumber)
          
          // Get reward parameters
          const rewardParams = await vaultExtension.calculateRewardParameters(address, epochNum)
          const isEligible = await vaultExtension.isEligibleForEpoch(address, epochNum)
          const hasClaimed = await vaultExtension.hasClaimedEpoch(address, epochNum)

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
          
          // Add to total claimable rewards if can claim
          if (epochInfo.canClaim) {
            totalClaimableRewards = (
              Number.parseFloat(totalClaimableRewards) + Number.parseFloat(epochInfo.potentialPayout)
            ).toString()
          }
        } catch (err) {
          console.error(`[v0] Failed to get reward params for epoch ${epochNumber}:`, err)
        }
      }

      // Calculate estimated next epoch reward
      let estimatedNextEpochReward = "0"
      if (epochInfo && userDeposit && Number.parseFloat(userDeposit.currentBalance) > 0) {
        try {
          const isEligibleNext = await vaultExtension.isEligibleForEpoch(address, epochInfo.epochNumber)
          if (isEligibleNext) {
            const nextEpochRewardParams = await vaultExtension.calculateRewardParameters(address, epochInfo.epochNumber)
            estimatedNextEpochReward = ethers.formatUnits(nextEpochRewardParams[5], 18)
          }
        } catch (err) {
          console.error("[v0] Failed to calculate next epoch reward:", err)
        }
      }

      setUserDashboard({
        claimInfo: {
          status: claimableEpochs.length > 0 ? 1 : 0,
          claimableEpochs: claimableEpochs.map((n: any) => Number(n)),
          currentEpoch: epochInfo?.epochNumber || 0,
          timeUntilNextEpoch: epochInfo?.timeRemaining || 0,
          hasActiveDeposit: userPosition ? Number.parseFloat(userPosition.totalShares) > 0 : false,
          riskLevel: userDeposit?.riskLevel || 0,
          totalDeposited: userPosition?.totalDeposited || "0",
          eligibleEpochsCount: recentEpochsInfo.filter(e => e.isEligible).length,
        },
        recentEpochsInfo,
        totalClaimableRewards,
        estimatedNextEpochReward,
      })
    } catch (err: any) {
      console.error("[v0] Failed to fetch user dashboard:", err)
      setError(`Failed to fetch user dashboard: ${err.message}`)
      setUserDashboard(null)
    }
  }

  const refreshData = async () => {
    if (loading) return // Prevent multiple simultaneous calls
    
    setLoading(true)
    setError(null)

    try {
      // Always fetch epoch info and vault metrics first
      await Promise.all([fetchEpochInfo(), fetchVaultMetrics()])

      // Fetch user-specific data if connected - with delay to ensure wallet sync
      if (isConnected && address) {
        // Small delay to ensure wallet state is properly synced
        await new Promise(resolve => setTimeout(resolve, 100))
        
        await Promise.all([fetchUserPosition(), fetchUserDeposit()])
        
        // Additional delay before dashboard data to ensure all data is loaded
        await new Promise(resolve => setTimeout(resolve, 100))
        await fetchUserDashboard()
      } else {
        // Clear user data if not connected
        setUserPosition(null)
        setUserDeposit(null)
        setUserDashboard(null)
      }
    } catch (err: any) {
      console.error("[v0] Error refreshing data:", err)
      setError(`Failed to refresh data: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // More aggressive refresh when wallet connection changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refreshData()
    }, 500) // 500ms delay to ensure wallet state is stable

    return () => clearTimeout(timeoutId)
  }, [isConnected, address])

  // Separate effect for periodic updates (only when connected)
  useEffect(() => {
    if (!isConnected) return

    const interval = setInterval(() => {
      if (isConnected && address) {
        refreshData()
      }
    }, 30000) // 30 second polling

    return () => clearInterval(interval)
  }, [isConnected, address])

  return {
    epochInfo,
    userDashboard,
    vaultMetrics,
    userPosition,
    userDeposit,
    loading,
    error,
    refreshData,
  }
}