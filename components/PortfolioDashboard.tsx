"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, DollarSign, Clock, ArrowUpRight, ArrowDownRight, Settings } from "lucide-react"
import { useContractData } from "@/hooks/useContractData"
import { useTransactions } from "@/hooks/useTransactions"
import { useWallet } from "@/hooks/useWallet"

interface PortfolioDashboardProps {
  setActiveTab?: (tab: string) => void
}

export default function PortfolioDashboard({ setActiveTab }: PortfolioDashboardProps) {
  const { isConnected } = useWallet()
  const { userDashboard, userPosition, userDeposit, vaultMetrics, loading: dataLoading } = useContractData()
  const { requestWithdrawal, updateRiskLevel, loading: txLoading } = useTransactions()
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState("")

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">
              Connect your wallet to view portfolio
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
              Loading portfolio data...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handle case where user has no deposits yet
  if (!userDashboard || !userPosition || Number.parseFloat(userPosition.totalDeposited) === 0) {
    return (
      <div className="space-y-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <DollarSign className="w-3 h-3 text-primary-foreground" />
              </div>
              Portfolio Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-muted-foreground mb-4">
              No deposits found. Start by depositing assets to begin earning rewards!
            </div>
            <Button
              className="bg-primary hover:bg-primary/80 text-primary-foreground"
              onClick={() => {
                setActiveTab?.("deposit")
              }}
            >
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Make Your First Deposit
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalDeposited = Number.parseFloat(userPosition.totalDeposited)
  const totalRewards = userDashboard ? Number.parseFloat(userDashboard.totalClaimableRewards) : 0
  const estimatedNextReward = userDashboard ? Number.parseFloat(userDashboard.estimatedNextEpochReward) : 0

  // Calculate win rate from recent epochs
  const recentWins = userDashboard?.recentEpochsInfo?.filter((epoch) => epoch.hasClaimed).length || 0
  const totalEligible = userDashboard?.recentEpochsInfo?.filter((epoch) => epoch.isEligible).length || 0
  const winRate = totalEligible > 0 ? Math.round((recentWins / totalEligible) * 100) : 0

  const getRiskLevelText = (level: number) => {
    switch (level) {
      case 0: return "LOW"
      case 1: return "MEDIUM"
      case 2: return "AGGRESSIVE"
      default: return "UNKNOWN"
    }
  }

  const getRiskLevelColor = (level: number) => {
    switch (level) {
      case 0: return "bg-green-500"
      case 1: return "bg-yellow-500"
      case 2: return "bg-red-500"
      default: return "bg-gray-500"
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || Number.parseFloat(withdrawAmount) <= 0) {
      return
    }

    const withdrawAmountNum = Number.parseFloat(withdrawAmount)
    if (withdrawAmountNum > totalDeposited) {
      return
    }

    try {
      // For partial withdrawal, we need to use the withdraw function with specific amount
      // For now, just request withdrawal - you'll need to update the contract interface
      await requestWithdrawal()
      setShowWithdrawModal(false)
      setWithdrawAmount("")
    } catch (err) {
      console.error("Withdrawal failed:", err)
    }
  }

  const handleRiskLevelChange = async () => {
    const currentLevel = userPosition?.riskLevel || 0
    const newLevel = (currentLevel + 1) % 3
    try {
      await updateRiskLevel(newLevel)
    } catch (err) {
      console.error("Risk level update failed:", err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <DollarSign className="w-3 h-3 text-primary-foreground" />
            </div>
            Portfolio Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-foreground">${totalDeposited.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Deposited</div>
              <div className="flex items-center justify-center gap-1 text-xs text-primary">
                <TrendingUp className="w-3 h-3" />
                Principal Protected
              </div>
            </div>

            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-primary">${totalRewards.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Rewards Available</div>
              <div className="flex items-center justify-center gap-1 text-xs text-secondary">
                <TrendingUp className="w-3 h-3" />
                {winRate}% Win Rate
              </div>
            </div>

            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-accent">${estimatedNextReward.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Est. Next Reward</div>
              <div className="flex items-center justify-center gap-1 text-xs">
                <Clock className="w-3 h-3 text-muted-foreground" />
                Epoch {userDashboard?.claimInfo.currentEpoch || 0}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              className="flex-1 bg-primary hover:bg-primary/80 text-primary-foreground"
              onClick={() => {
                setActiveTab?.("deposit")
              }}
            >
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Deposit More
            </Button>
            <Button
              variant="outline"
              className="flex-1 glass-card border-border bg-transparent"
              onClick={() => setShowWithdrawModal(true)}
              disabled={txLoading}
            >
              <ArrowDownRight className="w-4 h-4 mr-2" />
              Withdraw
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="glass-card border-border bg-transparent"
              onClick={handleRiskLevelChange} // CHANGE THIS TO CONTROL BETWEEN ALL OPTIONS AND MAKE RISK INTO SOME GRANULAR SLIDER.
              disabled={txLoading}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Position Breakdown & Risk Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Status */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">Current Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Current Epoch</span>
                <span className="font-medium text-foreground">{userDashboard?.claimInfo.currentEpoch || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Claimable Epochs</span>
                <span className="font-medium text-primary">{userDashboard?.claimInfo.claimableEpochs.length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Active Deposit</span>
                <Badge className={userDashboard?.claimInfo.hasActiveDeposit ? "bg-primary" : "bg-muted"}>
                  {userDashboard?.claimInfo.hasActiveDeposit ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Shares</span>
                <span className="font-medium text-foreground">{Number.parseFloat(userPosition.totalShares).toFixed(4)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk & Eligibility Status */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">Risk & Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Risk Level */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Risk Level</span>
                <Badge className={`${getRiskLevelColor(userPosition.riskLevel)} text-white`}>
                  {getRiskLevelText(userPosition.riskLevel)}
                </Badge>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Win Rate</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-primary">{winRate}%</span>
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
              </div>
              <Progress value={winRate} className="h-2" />
            </div>

            {/* Withdrawal Status */}
            {userPosition.withdrawalRequested && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Withdrawal Status</span>
                  <Badge className="bg-yellow-500 text-white">Requested</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Available at: {new Date(userPosition.withdrawalAvailableAt * 1000).toLocaleString()}
                </div>
              </div>
            )}

            {/* Withdrawal Impact Warning */}
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-3">
                <div className="text-xs text-destructive-foreground">
                  <strong>Withdrawal Impact:</strong> Withdrawing funds will forfeit future epoch rewards but your
                  principal is always protected.
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="glass-card w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Request Withdrawal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Request withdrawal of a specific amount or leave blank for full withdrawal.
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Amount to Withdraw</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full mt-1 p-2 bg-background border border-border rounded"
                  placeholder="0.0"
                  step="any"
                  min="0"
                  max={totalDeposited}
                />
                <div className="text-xs text-muted-foreground">
                  Available: ${totalDeposited.toLocaleString()} • Enter amount or leave blank for full withdrawal
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setWithdrawAmount((totalDeposited * 0.25).toString())}
                    className="px-2 py-1 text-xs border border-border rounded hover:bg-background/50"
                  >
                    25%
                  </button>
                  <button
                    onClick={() => setWithdrawAmount((totalDeposited * 0.5).toString())}
                    className="px-2 py-1 text-xs border border-border rounded hover:bg-background/50"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => setWithdrawAmount((totalDeposited * 0.75).toString())}
                    className="px-2 py-1 text-xs border border-border rounded hover:bg-background/50"
                  >
                    75%
                  </button>
                  <button
                    onClick={() => setWithdrawAmount(totalDeposited.toString())}
                    className="px-2 py-1 text-xs border border-border rounded hover:bg-background/50"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <Card className="border-yellow-500/20 bg-yellow-500/5">
                <CardContent className="p-3">
                  <div className="text-xs text-yellow-600">
                    <strong>Warning:</strong> This action cannot be undone. You will lose access to all pending epoch rewards.
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button 
                  onClick={handleWithdraw} 
                  disabled={txLoading} 
                  className="flex-1"
                  variant="destructive"
                >
                  {txLoading ? "Processing..." : "Request Withdrawal"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowWithdrawModal(false)} 
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vault Performance */}
        {vaultMetrics && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Vault Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Value Locked</span>
                <span className="font-medium">${Number.parseFloat(vaultMetrics.totalValueLocked).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Users</span>
                <span className="font-medium">{vaultMetrics.totalUsers.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Yield Generated</span>
                <span className="font-medium">${Number.parseFloat(vaultMetrics.totalYieldGenerated).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Yield Distributed</span>
                <span className="font-medium">${Number.parseFloat(vaultMetrics.totalYieldDistributed).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Deposit History */}
        {userDeposit && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Deposit History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">First Deposit Epoch</span>
                <span className="font-medium">{userDeposit.firstDepositEpoch}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last Deposit Epoch</span>
                <span className="font-medium">{userDeposit.lastDepositEpoch}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Balance</span>
                <span className="font-medium">${Number.parseFloat(userDeposit.currentBalance).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Time Weighted Balance</span>
                <span className="font-medium">{Number.parseFloat(userDeposit.timeWeightedBalance).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}