"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, TrendingUp, Zap } from "lucide-react"
import { useOptimisticContractData } from "@/hooks/useOptimisticContractData"
import { useWallet } from "@/hooks/useWallet"

export default function CookingVisualization() {
  const { isConnected } = useWallet()
  const { userDashboard, epochInfo, userPosition, userDeposit, hasOptimisticUpdates, hasUserDeposits } = useOptimisticContractData()
  const [timeRemaining, setTimeRemaining] = useState(0)

  useEffect(() => {
    if (epochInfo?.timeRemaining) {
      setTimeRemaining(epochInfo.timeRemaining)
    }
  }, [epochInfo])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  if (!isConnected) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">
            Connect your wallet to view cooking status
          </div>
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
            <div className="w-6 h-6 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            Cooking Status
            {hasOptimisticUpdates && (
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse ml-2" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center space-y-4">
          <div className="text-muted-foreground mb-4">
            No deposits cooking yet. Make your first deposit to start earning rewards!
          </div>
          <div className="text-sm text-muted-foreground">
            Your deposits will start "cooking" and become eligible for epoch rewards after 2 epochs.
          </div>
        </CardContent>
      </Card>
    )
  }

  // Safely get values with defaults
  const totalDeposited = userPosition ? Number.parseFloat(userPosition.totalDeposited) : 0
  const currentEpoch = epochInfo?.epochNumber || 0
  const riskLevel = userPosition?.riskLevel || 0
  const eligibleEpochsCount = userDashboard?.claimInfo.eligibleEpochsCount || 0

  // Calculate cooking intensity based on eligible epochs and deposit amount
  const baseIntensity = Math.min(eligibleEpochsCount / 10, 1) // Max intensity at 10 epochs
  const amountMultiplier = Math.min(totalDeposited / 1000, 2) // Boost for larger deposits
  const cookingIntensity = Math.min(baseIntensity * amountMultiplier, 1)
  
  // Calculate epoch progress
  const epochDuration = 7 * 24 * 60 * 60 // 7 days in seconds
  const elapsed = epochDuration - timeRemaining
  const progressPercentage = timeRemaining > 0 ? (elapsed / epochDuration) * 100 : 0

  // Calculate cooking progress (how close to eligibility)
  let cookingProgress = 0
  let cookingStatus = "REMOVE THIS"
  
  if (userDeposit) {
    const epochsSinceFirstDeposit = currentEpoch - userDeposit.firstDepositEpoch
    if (epochsSinceFirstDeposit >= 2) {
      cookingProgress = 100
      cookingStatus = "REMOVE THIS"
    } else if (epochsSinceFirstDeposit >= 1) {
      cookingProgress = 75
      cookingStatus = "REMOVE THIS"
    } else if (epochsSinceFirstDeposit >= 0) {
      cookingProgress = 25
      cookingStatus = "REMOVE THIS"
    }
  }

  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 60 * 60))
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))
    const minutes = Math.floor((seconds % (60 * 60)) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  const getRiskColor = (risk: number) => {
    switch (risk) {
      case 0: return "bg-green-500"
      case 1: return "bg-yellow-500"
      case 2: return "bg-red-500"
      default: return "bg-gray-500"
    }
  }

  const getRiskLabel = (risk: number) => {
    switch (risk) {
      case 0: return "LOW"
      case 1: return "MEDIUM"
      case 2: return "AGGRESSIVE"
      default: return "UNKNOWN"
    }
  }

  const getCookingColor = () => {
    if (cookingProgress < 50) return "from-blue-400/20 to-blue-600/40"
    if (cookingProgress < 100) return "from-orange-400/30 to-orange-600/60"
    return "from-green-400/40 to-green-600/80"
  }

  const getCookingIntensityColor = () => {
    if (cookingIntensity < 0.3) return "from-primary/20 to-primary/40"
    if (cookingIntensity < 0.7) return "from-secondary/30 to-secondary/60"
    return "from-accent/40 to-accent/80"
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center cooking-pulse">
            <Zap className="w-3 h-3 text-white" />
          </div>
          Cooking Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Epoch Info */}
        <div className="text-center space-y-2">
          <div className="text-3xl font-bold text-foreground">Epoch {currentEpoch}</div>
          <div className="text-sm text-muted-foreground">Current epoch in progress</div>
          <div className="flex items-center justify-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-foreground font-medium">
              {timeRemaining > 0 ? formatTime(timeRemaining) : "Calculating..."} remaining
            </span>
          </div>
        </div>

        {/* Epoch Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Epoch Progress</span>
            <span className="text-foreground">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>



        {/* Cooking Intensity (for eligible deposits) */}
        {cookingProgress === 100 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reward Intensity</span>
              <span className="text-foreground font-medium">{Math.round(cookingIntensity * 100)}%</span>
            </div>
            <div className="w-full bg-muted/20 rounded-full h-3">
              <div
                className={`h-3 rounded-full bg-gradient-to-r ${getCookingIntensityColor()} transition-all duration-1000 relative overflow-hidden`}
                style={{ width: `${cookingIntensity * 100}%` }}
              >
                {/* Shimmer effect for active cooking */}
                <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </div>
            </div>
            <div className="text-xs text-muted-foreground text-center">
              Based on epochs eligible ({eligibleEpochsCount}) and deposit amount
            </div>
          </div>
        )}

        {/* Deposit Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-lg font-bold text-foreground">${totalDeposited.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Deposited</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <div className="text-lg font-bold text-primary">{eligibleEpochsCount}</div>
              <div className="text-xs text-muted-foreground">Eligible Epochs</div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Level & Active Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Risk Level</span>
            <Badge className={`${getRiskColor(riskLevel)} text-white`}>
              {getRiskLabel(riskLevel)}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Active Deposit</span>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium text-foreground">
                {userDashboard?.claimInfo.hasActiveDeposit ? "Yes" : "No"}
              </span>
            </div>
          </div>
          {userDeposit && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">First Deposit</span>
              <span className="text-sm font-medium text-foreground">
                Epoch {userDeposit.firstDepositEpoch}
              </span>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  )
}