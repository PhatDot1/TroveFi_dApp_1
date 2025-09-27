"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Gift, Trophy, Star, Zap, Clock, CircleCheck as CheckCircle } from "lucide-react"
import { useOptimisticContractData } from "@/hooks/useOptimisticContractData"
import { useOptimisticTransactions } from "@/hooks/useOptimisticTransactions"
import { useWallet } from "@/hooks/useWallet"

export default function EpochRewardsGrid() {
  const { isConnected } = useWallet()
  const { userDashboard, epochInfo, userPosition, hasOptimisticUpdates, hasUserDeposits } = useOptimisticContractData()
  const { claimEpochReward, loading: txLoading } = useOptimisticTransactions()
  const [claimingEpoch, setClaimingEpoch] = useState<number | null>(null)
  const [recentClaim, setRecentClaim] = useState<{ epoch: number; won: boolean; amount: string } | null>(null)

  const handleClaim = async (epochNumber: number) => {
    if (!isConnected) return

    try {
      setClaimingEpoch(epochNumber)

      const txHash = await claimEpochReward(epochNumber)
      console.log("[v0] Claim transaction hash:", txHash)

      // Simulate lottery result for UI feedback
      const won = Math.random() < 0.2 // 20% win rate simulation
      const amount = won ? "100" : "0"

      setRecentClaim({ epoch: epochNumber, won, amount })

      // UI will be updated optimistically
    } catch (error) {
      console.error("Failed to claim epoch reward:", error)
    } finally {
      setClaimingEpoch(null)
    }
  }

  if (!isConnected) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">Connect your wallet to view epoch rewards</div>
        </CardContent>
      </Card>
    )
  }

  // Handle case where user has no deposits - use helper function
  if (!hasUserDeposits()) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center">
              <Trophy className="w-3 h-3 text-accent-foreground" />
            </div>
            Epoch Rewards
            {hasOptimisticUpdates && (
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse ml-2" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center space-y-4">
          <div className="text-muted-foreground mb-4">
            No deposits found. Make a deposit to start earning epoch rewards!
          </div>
          <div className="text-sm text-muted-foreground">
            Deposits become eligible for rewards starting from the 2nd epoch after deposit.
          </div>
        </CardContent>
      </Card>
    )
  }

  const claimableEpochs = userDashboard?.claimInfo.claimableEpochs || []
  const recentEpochs = userDashboard?.recentEpochsInfo || []
  const currentEpoch = userDashboard?.claimInfo.currentEpoch || 0
  
  // Get yield pool data
  const totalYieldPool = epochInfo?.yieldPool ? Number.parseFloat(epochInfo.yieldPool) : 0
  const totalClaimableRewards = userDashboard ? Number.parseFloat(userDashboard.totalClaimableRewards) : 0
  
  // Calculate user's potential share of the total yield pool
  const userDeposited = userPosition ? Number.parseFloat(userPosition.totalDeposited) : 0
  const userRiskLevel = userPosition?.riskLevel || 0
  const riskMultipliers = [0.5, 1.0, 2.0] // LOW, MEDIUM, HIGH
  const userRiskMultiplier = riskMultipliers[userRiskLevel] || 1.0
  
  // Estimate user's tier/potential based on deposit amount and risk
  const getUserTier = () => {
    const weightedDeposit = userDeposited * userRiskMultiplier
    if (weightedDeposit >= 10000) return { tier: "WHALE", color: "text-purple-500", share: "Major" }
    if (weightedDeposit >= 5000) return { tier: "SHARK", color: "text-blue-500", share: "Aggressive" }
    if (weightedDeposit >= 1000) return { tier: "DOLPHIN", color: "text-green-500", share: "Medium" }
    if (weightedDeposit >= 100) return { tier: "FISH", color: "text-yellow-500", share: "Small" }
    return { tier: "PLANKTON", color: "text-gray-500", share: "Low Risk" }
  }

  const userTier = getUserTier()

  // If no recent epochs data, create a grid based on claimable epochs
  const epochsToShow =
    recentEpochs.length > 0
      ? recentEpochs
      : claimableEpochs.map((epochNum) => ({
          epochNumber: epochNum,
          isEligible: true,
          hasClaimed: false,
          canClaim: true,
          winProbability: 20, // Default 20%
          potentialPayout: "100",
          baseWeight: "100",
          timeWeight: "100",
          riskMultiplier: 100,
        }))

  const getEpochIcon = (epoch: any) => {
    if (epoch.hasClaimed) {
      return epoch.won ? <Trophy className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />
    }
    if (!epoch.canClaim) return <Clock className="w-4 h-4" />
    if (epoch.epochNumber % 10 === 0) return <Star className="w-4 h-4" />
    return <Gift className="w-4 h-4" />
  }

  const getEpochColor = (epoch: any) => {
    if (epoch.hasClaimed) {
      return epoch.won ? "bg-primary" : "bg-muted"
    }
    if (!epoch.canClaim) return "bg-muted/50"
    if (epoch.epochNumber % 10 === 0) return "bg-accent"
    return "bg-secondary"
  }

  const getButtonVariant = (epoch: any) => {
    if (epoch.hasClaimed) return "secondary"
    if (!epoch.canClaim) return "outline"
    return "default"
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
          <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center">
            <Trophy className="w-3 h-3 text-accent-foreground" />
          </div>
          Epoch Rewards
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Claim your rewards from completed epochs. Special rewards every 10 epochs for deposits &gt;$1000!
        </div>
      </CardHeader>
      <CardContent>
        {/* Recent Claim Result */}
        {recentClaim && (
          <Card className={`mb-6 ${recentClaim.won ? "border-primary" : "border-muted"}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    recentClaim.won ? "bg-primary" : "bg-muted"
                  }`}
                >
                  {recentClaim.won ? (
                    <Trophy className="w-5 h-5 text-primary-foreground" />
                  ) : (
                    <Zap className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-foreground">
                    Epoch {recentClaim.epoch} - {recentClaim.won ? "You Won!" : "Better luck next time!"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {recentClaim.won ? `Reward: ${recentClaim.amount} FLOW` : "No reward this time"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="epoch-grid">
          {epochsToShow.map((epoch) => (
            <Card
              key={epoch.epochNumber}
              className={`glass-card transition-all duration-200 ${
                epoch.canClaim && !epoch.hasClaimed ? "hover:ring-2 hover:ring-primary/50" : ""
              }`}
            >
              <CardContent className="p-4 text-center space-y-3">
                {/* Epoch Number */}
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getEpochColor(epoch)}`}>
                    {getEpochIcon(epoch)}
                  </div>
                  <div className="text-sm font-medium text-foreground">Epoch {epoch.epochNumber}</div>
                </div>

                {/* Special Badge */}
                {epoch.epochNumber % 10 === 0 && (
                  <Badge className="bg-accent text-accent-foreground text-xs">Special Reward</Badge>
                )}

                {/* Reward Info */}
                <div className="space-y-1">
                  <div className="text-lg font-bold text-foreground">
                    {epoch.potentialPayout} FLOW
                  </div>
                  <div className="text-xs text-muted-foreground">{epoch.winProbability}% chance</div>
                </div>

                {/* Claim Status */}
                {epoch.hasClaimed && (
                  <div className="text-xs">
                    <span className="text-primary font-medium">
                      Claimed {epoch.potentialPayout} FLOW
                    </span>
                  </div>
                )}

                {/* Claim Button */}
                <Button
                  size="sm"
                  variant={getButtonVariant(epoch)}
                  disabled={!epoch.canClaim || epoch.hasClaimed || claimingEpoch !== null || txLoading}
                  onClick={() => handleClaim(epoch.epochNumber)}
                  className={`w-full ${epoch.canClaim && !epoch.hasClaimed ? "claim-shimmer" : ""}`}
                >
                  {claimingEpoch === epoch.epochNumber ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      Drawing...
                    </div>
                  ) : epoch.hasClaimed ? (
                    "Claimed"
                  ) : !epoch.canClaim ? (
                    "Locked"
                  ) : (
                    "Claim"
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Updated Stats Grid */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-lg font-bold text-primary">{claimableEpochs.length}</div>
              <div className="text-xs text-muted-foreground">Available</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-lg font-bold text-secondary">
                {totalYieldPool.toFixed(1)} FLOW
              </div>
              <div className="text-xs text-muted-foreground">Total Yield Pool</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className={`text-lg font-bold ${userTier.color}`}>
                {userTier.tier}
              </div>
              <div className="text-xs text-muted-foreground">{userTier.share} Player</div>
            </CardContent>
          </Card>
        </div>


      </CardContent>
    </Card>
  )
}