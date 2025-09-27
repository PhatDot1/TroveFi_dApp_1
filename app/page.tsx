"use client"

import { useState, useEffect } from "react"
import Header from "@/components/Header"
import DepositInterface from "@/components/DepositInterface"
import CookingVisualization from "@/components/CookingVisualization"
import EpochRewardsGrid from "@/components/EpochRewardsGrid"
import PortfolioDashboard from "@/components/PortfolioDashboard"
import RiskManagement from "@/components/RiskManagement"
import WalletConnectButton from "@/components/WalletConnectButton"
import Particles from "@/components/Particles"
import { PortfolioSkeleton, CookingSkeleton, EpochRewardsSkeleton, DepositSkeleton } from "@/components/SkeletonLoaders"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useWallet } from "@/hooks/useWallet"
import { useOptimisticContractData } from "@/hooks/useOptimisticContractData"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CircleAlert as AlertCircle, Lock, ExternalLink, Wifi, WifiOff } from "lucide-react"
import { isAddressAllowed } from "@/lib/allowedAddresses"

export default function TroveFiApp() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const { isConnected, address, connect } = useWallet()
  const { 
    initialLoading, 
    backgroundRefreshing, 
    error, 
    hasOptimisticUpdates,
    lastSuccessfulFetch,
    epochInfo,
    userPosition,
    hasUserDeposits
  } = useOptimisticContractData()
  const [isAllowed, setIsAllowed] = useState(false)

  // Check if address is allowed
  useEffect(() => {
    setIsAllowed(isAddressAllowed(address))
  }, [address])

  // Determine if we should show initial loading or welcome screen
  const showWelcomeScreen = !isConnected
  const showInitialLoading = isConnected && isAllowed && initialLoading && !hasUserDeposits()

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0">
        <Particles />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <Header />

        {/* Main Content */}
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
              Win Big Without the Risk
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Deposit funds, select your risk, and let your yield chase big wins each epoch—without touching your deposit. Add more to increase your potential payouts or withdraw anytime, and stay in control.
            </p>
          </div>

          {/* Welcome Screen - Only show when not connected */}
          {showWelcomeScreen ? (
            <Card className="glass-card max-w-md mx-auto">
              <CardContent className="p-8 text-center space-y-4">
                <div className="text-2xl font-bold text-foreground">Welcome to TroveFi</div>
                <div className="text-muted-foreground">
                  Connect your wallet to access the no-loss yield lottery system
                </div>
                <Button
                  onClick={connect}
                  className="w-full py-6 bg-primary hover:bg-primary/80 text-primary-foreground"
                  size="lg"
                >
                  Connect Wallet
                </Button>
              </CardContent>
            </Card>
          ) : !isAllowed ? (
            // Closed Beta Gate
            <Card className="glass-card max-w-lg mx-auto border-yellow-500/20">
              <CardContent className="p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Lock className="w-8 h-8 text-yellow-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground mb-2">Closed Beta Access</div>
                  <div className="text-muted-foreground mb-4">
                    TroveFi is currently in closed beta. Your wallet address is not on the allowlist.
                  </div>
                  <div className="text-sm text-muted-foreground bg-muted/20 rounded-lg p-3 font-mono break-all">
                    Connected: {address}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Want to join the beta? Apply for early access or get an invite from an existing member.
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => window.open("https://trovefi.xyz", "_blank")}
                      className="glass-card border-border bg-transparent"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Apply for Beta
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open("https://discord.gg/trovefi", "_blank")}
                      className="glass-card border-border bg-transparent"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Join Discord
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : showInitialLoading ? (
            // Initial Loading - Only show when truly loading for first time
            <div className="space-y-6">
              <PortfolioSkeleton />
            </div>
          ) : (
            <>
              {/* Beta Badge */}
              <div className="mb-6 flex justify-center items-center gap-4">
                <Card className="glass-card border-primary/20 inline-block">
                  <CardContent className="px-4 py-2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-primary">Closed Beta Access</span>
                  </CardContent>
                </Card>
                
                {/* Connection Status Indicator */}
                <Card className="glass-card border-border/20 inline-block">
                  <CardContent className="px-3 py-2 flex items-center gap-2">
                    {backgroundRefreshing ? (
                      <>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-xs text-muted-foreground">Syncing...</span>
                      </>
                    ) : hasOptimisticUpdates ? (
                      <>
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                        <span className="text-xs text-muted-foreground">Pending...</span>
                      </>
                    ) : lastSuccessfulFetch > 0 ? (
                      <>
                        <Wifi className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-muted-foreground">Live</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3 text-red-500" />
                        <span className="text-xs text-muted-foreground">Offline</span>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Error Banner */}
              {error && (
                <Card className="glass-card border-red-500/20 bg-red-500/5 mb-6">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-red-600">
                          {lastSuccessfulFetch > 0 ? "Sync Warning" : "Connection Error"}
                        </div>
                        <div className="text-sm text-red-600/80">{error}</div>
                        {lastSuccessfulFetch > 0 && (
                          <div className="text-xs text-red-600/60 mt-1">
                            Last updated: {new Date(lastSuccessfulFetch).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="custom-tabs-list grid w-full grid-cols-4">
                  <TabsTrigger value="dashboard" className="custom-tab-trigger">
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="deposit" className="custom-tab-trigger">
                    Deposit
                  </TabsTrigger>
                  <TabsTrigger value="rewards" className="custom-tab-trigger">
                    Rewards
                  </TabsTrigger>
                  <TabsTrigger value="cooking" className="custom-tab-trigger">
                    Cooking
                  </TabsTrigger>
                </TabsList>

                <div className="mt-8">
                  <TabsContent value="dashboard" className="space-y-6">
                    <PortfolioDashboard setActiveTab={setActiveTab} />
                  </TabsContent>

                  <TabsContent value="deposit" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <DepositInterface />
                      <div className="space-y-6">
                        <CookingVisualization />
                        <RiskManagement />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="rewards" className="space-y-6">
                    <EpochRewardsGrid />
                  </TabsContent>

                  <TabsContent value="cooking" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <CookingVisualization />
                      <div className="space-y-6">
                        <EpochRewardsGrid />
                        <RiskManagement />
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </main>
  )
}