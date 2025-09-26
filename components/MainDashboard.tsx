"use client"

import { useEffect } from "react"
import { useWallet } from "@/hooks/useWallet"
import { useContractData } from "@/hooks/useContractData"
import PortfolioDashboard from "@/components/PortfolioDashboard"
import DepositInterface from "@/components/DepositInterface"
import CookingVisualization from "@/components/CookingVisualization"
import EpochRewardsGrid from "@/components/EpochRewardsGrid"
import RiskManagement from "@/components/RiskManagement"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertCircle } from "lucide-react"

export default function MainDashboard() {
  const { isConnected, connect, isConnecting } = useWallet()
  const { loading, error, refreshData } = useContractData()

  // Force refresh on mount to ensure data sync
  useEffect(() => {
    if (isConnected) {
      const timer = setTimeout(() => {
        refreshData()
      }, 1000) // 1 second delay to ensure wallet is fully synced
      
      return () => clearTimeout(timer)
    }
  }, [isConnected, refreshData])

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[var(--bg)] pt-20">
        <div className="container mx-auto px-4 py-8">
          <Card className="glass-card max-w-md mx-auto">
            <CardContent className="p-8 text-center space-y-4">
              <div className="text-2xl font-bold text-foreground">Welcome to TroveFi</div>
              <div className="text-muted-foreground">
                Connect your wallet to access the no-loss yield lottery system
              </div>
              <Button
                onClick={connect}
                disabled={isConnecting}
                className="w-full bg-primary hover:bg-primary/80 text-primary-foreground py-6"
              >
                {isConnecting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Connecting...
                  </div>
                ) : (
                  "Connect Wallet"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Error Banner */}
        {error && (
          <Card className="glass-card border-red-500/20 bg-red-500/5 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <div className="font-medium text-red-600">Connection Error</div>
                  <div className="text-sm text-red-600/80">{error}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshData}
                  disabled={loading}
                  className="ml-auto"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <Card className="glass-card mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                Loading vault data...
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Portfolio Overview */}
            <PortfolioDashboard />
            
            {/* Cooking Status */}
            <CookingVisualization />
            
            {/* Epoch Rewards */}
            <EpochRewardsGrid />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Deposit Interface */}
            <DepositInterface />
            
            {/* Risk Management */}
            <RiskManagement />
          </div>
        </div>

        {/* Manual Refresh Button */}
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={loading}
            className="glass-card border-border bg-transparent"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>
      </div>
    </div>
  )
}