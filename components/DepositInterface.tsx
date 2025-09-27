"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowDown, Wallet, ExternalLink } from "lucide-react"
import { useWallet } from "@/hooks/useWallet"
import { useOptimisticContractData } from "@/hooks/useOptimisticContractData"
import { useOptimisticTransactions } from "@/hooks/useOptimisticTransactions"
import { ethers } from "ethers"

const SUPPORTED_ASSETS = [
  { symbol: "FLOW", name: "Flow", address: "NATIVE", isNative: true, decimals: 18 },
  { symbol: "WFLOW", name: "Wrapped Flow", address: "0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e", isNative: false, decimals: 18 },
  { symbol: "USDC", name: "USD Coin (stgUSDC)", address: "0xF1815bd50389c46847f0Bda824eC8da914045D14", isNative: false, decimals: 6 },
  { symbol: "USDT", name: "Tether USD (stgUSDT)", address: "0x674843C06FF83502ddb4D37c2E09C01cdA38cbc8", isNative: false, decimals: 6 },
  { symbol: "USDF", name: "Flow USD", address: "0x2aaBea2058b5aC2D339b163C6Ab6f2b6d53aabED", isNative: false, decimals: 6 },
  { symbol: "WETH", name: "Wrapped Ethereum", address: "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590", isNative: false, decimals: 18 },
  { symbol: "cbBTC", name: "Coinbase Bitcoin", address: "0xA0197b2044D28b08Be34d98b23c9312158Ea9A18", isNative: false, decimals: 8 },
]

const RISK_LEVELS = [
  {
    level: 0,
    name: "LOW",
    label: "Low Risk",
    description: "Higher win probability, smaller payouts",
    color: "bg-green-500",
  },
  {
    level: 1,
    name: "MEDIUM",
    label: "Medium Risk",
    description: "Balanced risk/reward",
    color: "bg-yellow-500",
  },
  {
    level: 2,
    name: "AGGRESSIVE",
    label: "Aggressive Risk",
    description: "Lower probability, bigger jackpots",
    color: "bg-red-500",
  },
]

export default function DepositInterface() {
  const { isConnected, address, provider } = useWallet()
  const { userPosition, hasUserDeposits } = useOptimisticContractData()
  const { depositNativeFlow, depositToken, loading: txLoading, error: txError } = useOptimisticTransactions()
  const [selectedAsset, setSelectedAsset] = useState("")
  const [amount, setAmount] = useState("")
  
  // Determine if this is first deposit and risk selection logic
  const isFirstDeposit = !hasUserDeposits()
  const showRiskSelection = isFirstDeposit
  const currentUserRiskLevel = userPosition?.riskLevel ?? 1
  const [riskLevel, setRiskLevel] = useState(currentUserRiskLevel)
  
  const [balances, setBalances] = useState<Record<string, string>>({})
  const [loadingBalances, setLoadingBalances] = useState(false)

  // Update risk level when user position changes
  useEffect(() => {
    if (userPosition?.riskLevel !== undefined) {
      setRiskLevel(userPosition.riskLevel)
    }
  }, [userPosition])

  useEffect(() => {
    const fetchBalances = async () => {
      if (!isConnected || !address || !provider) return

      setLoadingBalances(true)
      const newBalances: Record<string, string> = {}

      for (const asset of SUPPORTED_ASSETS) {
        try {
          if (asset.isNative) {
            // Get native FLOW balance
            const balance = await provider.getBalance(address)
            newBalances[asset.symbol] = ethers.formatEther(balance)
          } else {
            // Get ERC20 token balance
            const tokenContract = new ethers.Contract(
              asset.address,
              [
                "function balanceOf(address) view returns (uint256)",
                "function decimals() view returns (uint8)"
              ],
              provider,
            )
            const balance = await tokenContract.balanceOf(address)
            newBalances[asset.symbol] = ethers.formatUnits(balance, asset.decimals)
          }
        } catch (error) {
          console.error(`Failed to fetch balance for ${asset.symbol}:`, error)
          newBalances[asset.symbol] = "0"
        }
      }

      setBalances(newBalances)
      setLoadingBalances(false)
    }

    fetchBalances()
  }, [isConnected, address, provider])

  const handleDeposit = async () => {
    if (!isConnected || !selectedAsset || !amount) return

    try {
      const selectedAssetData = SUPPORTED_ASSETS.find((a) => a.symbol === selectedAsset)
      if (!selectedAssetData) throw new Error("Asset not found")

      let txHash
      if (selectedAssetData.isNative) {
        // Deposit native FLOW
        txHash = await depositNativeFlow(amount, riskLevel)
      } else {
        // Deposit ERC20 token
        txHash = await depositToken(selectedAssetData.address, amount, riskLevel, selectedAssetData.decimals)
      }

      console.log("[v0] Deposit transaction hash:", txHash)
      
      // Reset form (data will be updated optimistically)
      setAmount("")
      // Don't reset selectedAsset to allow quick consecutive deposits
    } catch (error) {
      console.error("Failed to deposit:", error)
    }
  }

  const selectedAssetData = SUPPORTED_ASSETS.find((asset) => asset.symbol === selectedAsset)
  const selectedRisk = RISK_LEVELS.find((risk) => risk.level === riskLevel)
  const balance = selectedAsset ? balances[selectedAsset] || "0" : "0"
  const balanceNumber = Number.parseFloat(balance)
  const amountNumber = Number.parseFloat(amount)
  
  const isValidAmount = amount && amountNumber > 0 && amountNumber <= balanceNumber

  if (!isConnected) {
    return (
      <div id="deposit-interface">
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground mb-4">Connect your wallet to deposit assets</div>
            <div className="text-sm text-muted-foreground">
              Start earning rewards from the epoch-based lottery system
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div id="deposit-interface">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <Wallet className="w-3 h-3 text-primary-foreground" />
            </div>
            Deposit Assets
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Deposits become eligible for epoch rewards starting from the 2nd epoch after deposit
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Asset Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Select Asset</label>
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger className="glass-card border-border">
                <SelectValue placeholder="Choose an asset to deposit" />
              </SelectTrigger>
              <SelectContent className="glass-card border-border">
                {SUPPORTED_ASSETS.map((asset) => (
                  <SelectItem key={asset.symbol} value={asset.symbol}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">{asset.symbol[0]}</span>
                        </div>
                        <div>
                          <div className="font-medium">{asset.symbol}</div>
                          <div className="text-xs text-muted-foreground">{asset.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {loadingBalances ? "..." : Number.parseFloat(balances[asset.symbol] || "0").toFixed(4)}
                        </div>
                        <div className="text-xs text-muted-foreground">Balance</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Amount</label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="glass-card border-border pr-16"
                step="any"
                min="0"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80"
                onClick={() => {
                  // For native FLOW, leave some for gas
                  const maxAmount = selectedAssetData?.isNative 
                    ? Math.max(0, balanceNumber - 0.01).toString()
                    : balance
                  setAmount(maxAmount)
                }}
                disabled={loadingBalances}
              >
                MAX
              </Button>
            </div>
            {selectedAssetData && (
              <div className="text-xs text-muted-foreground">
                Available: {loadingBalances ? "Loading..." : `${Number.parseFloat(balance).toFixed(4)} ${selectedAsset}`}
                {selectedAssetData.isNative && " (reserve ~0.01 for gas)"}
              </div>
            )}
            {amount && !isValidAmount && (
              <div className="text-xs text-red-500">
                {amountNumber > balanceNumber ? "Insufficient balance" : "Invalid amount"}
              </div>
            )}
          </div>

          {/* Risk Level Selection - Only for first deposit */}
          {showRiskSelection && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">Risk Level (First Deposit)</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {RISK_LEVELS.map((risk) => (
                  <Card
                    key={risk.level}
                    className={`cursor-pointer transition-all duration-200 ${
                      riskLevel === risk.level
                        ? "ring-2 ring-primary glass-card"
                        : "glass-card hover:ring-1 hover:ring-border"
                    }`}
                    onClick={() => setRiskLevel(risk.level)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${risk.color}`} />
                        <span className="font-medium text-sm">{risk.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{risk.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Current Risk Level Display - For subsequent deposits */}
          {!showRiskSelection && (
            <Card className="glass-card border-secondary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">Using Current Risk Level</div>
                    <div className="text-xs text-muted-foreground">
                      {RISK_LEVELS.find(r => r.level === riskLevel)?.description}
                    </div>
                  </div>
                  <Badge className={`${RISK_LEVELS.find(r => r.level === riskLevel)?.color} text-white`}>
                    {RISK_LEVELS.find(r => r.level === riskLevel)?.label}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-blue-600">
                  Want to change your risk level? Use the Risk Management section below.
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bridge Options */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Need to Bridge Assets?</label>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 glass-card border-border bg-transparent"
                onClick={() => window.open("https://bridge.flowfoundation.org", "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Bridge from Cadence
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 glass-card border-border bg-transparent"
                onClick={() => window.open("https://cbridge.celer.network/1/12340001/DAI", "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Bridge from Other Chains
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {txError && (
            <Card className="glass-card border-red-500/20 bg-red-500/5">
              <CardContent className="p-4">
                <div className="text-sm text-red-600">
                  <strong>Transaction Error:</strong> {txError}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deposit Summary */}
          {selectedAsset && amount && isValidAmount && (
            <Card className="glass-card border-primary/20">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Depositing</span>
                    <span className="font-medium">
                      {amount} {selectedAsset}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Risk Level</span>
                    <Badge className={selectedRisk?.color}>{selectedRisk?.label}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Eligible from Epoch</span>
                    <span className="font-medium text-primary">Current + 2</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Principal Protection</span>
                    <span className="font-medium text-green-500">100% Protected</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deposit Button */}
          <Button
            onClick={handleDeposit}
            disabled={!selectedAsset || !amount || !isValidAmount || txLoading || loadingBalances}
            className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-medium py-6"
          >
            {txLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Depositing...
              </div>
            ) : (
              <>
                <ArrowDown className="w-4 h-4 mr-2" />
                Deposit & Start Cooking
              </>
            )}
          </Button>


        </CardContent>
      </Card>
    </div>
  )
}