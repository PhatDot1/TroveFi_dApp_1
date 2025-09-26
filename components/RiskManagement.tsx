"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, TrendingUp, AlertTriangle } from "lucide-react"
import { useOptimisticContractData } from "@/hooks/useOptimisticContractData"
import { useOptimisticTransactions } from "@/hooks/useOptimisticTransactions"
import { useWallet } from "@/hooks/useWallet"

const RISK_LEVELS = [
  {
    level: 0,
    name: "LOW",
    label: "Conservative",
    description: "30% base win probability, smaller rewards",
    color: "bg-green-500",
    multiplier: "Low",
  },
  {
    level: 1,
    name: "MEDIUM", 
    label: "Balanced",
    description: "20% base win probability, balanced rewards",
    color: "bg-yellow-500",
    multiplier: "Mid",
  },
  {
    level: 2,
    name: "AGGRESSIVE",
    label: "Aggressive", 
    description: "10% base win probability, maximum rewards",
    color: "bg-red-500",
    multiplier: "High",
  },
]

export default function RiskManagement() {
  const { isConnected } = useWallet()
  const { userPosition } = useOptimisticContractData()
  const { updateRiskLevel, loading: txLoading } = useOptimisticTransactions()
  const [selectedRisk, setSelectedRisk] = useState<number | null>(null)

  if (!isConnected || !userPosition || Number.parseFloat(userPosition.totalDeposited) === 0) {
    return null // Don't show if no deposits
  }

  const currentRiskLevel = userPosition.riskLevel
  const currentRisk = RISK_LEVELS.find(r => r.level === currentRiskLevel)

  const handleRiskUpdate = async () => {
    if (selectedRisk === null || selectedRisk === currentRiskLevel) return

    try {
      await updateRiskLevel(selectedRisk)
      // UI will be updated optimistically
      setSelectedRisk(null)
    } catch (err) {
      console.error("Risk level update failed:", err)
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          <div className="w-5 h-5 bg-secondary rounded-full flex items-center justify-center">
            <Settings className="w-3 h-3 text-secondary-foreground" />
          </div>
          Risk Management
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Adjust your risk level to change win probability and reward potential
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Risk Display */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/50">
          <div>
            <div className="font-medium text-foreground">Current Risk Level</div>
            <div className="text-sm text-muted-foreground">{currentRisk?.description}</div>
          </div>
          <Badge className={`${currentRisk?.color} text-white`}>
            {currentRisk?.label} ({currentRisk?.multiplier})
          </Badge>
        </div>

        {/* Risk Level Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">Select New Risk Level</label>
          <div className="grid grid-cols-1 gap-3">
            {RISK_LEVELS.map((risk) => (
              <Card
                key={risk.level}
                className={`cursor-pointer transition-all duration-200 ${
                  selectedRisk === risk.level
                    ? "ring-2 ring-primary glass-card"
                    : risk.level === currentRiskLevel
                    ? "ring-1 ring-secondary glass-card opacity-50"
                    : "glass-card hover:ring-1 hover:ring-border"
                }`}
                onClick={() => setSelectedRisk(risk.level)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${risk.color}`} />
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {risk.label}
                          {risk.level === currentRiskLevel && (
                            <Badge variant="outline" className="text-xs">Current</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{risk.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-primary">{risk.multiplier}</div>
                      <div className="text-xs text-muted-foreground">Multiplier</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>


        {/* Update Button */}
        {selectedRisk !== null && selectedRisk !== currentRiskLevel && (
                  <Button
                  onClick={handleRiskUpdate}
                  disabled={txLoading}
                  className="w-full bg-primary hover:bg-primary/80 text-primary-foreground"
                >
                  {txLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Updating Risk Level...
                    </div>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Update to {RISK_LEVELS.find(r => r.level === selectedRisk)?.label}
                    </>
                  )}
                </Button>
        )}


      </CardContent>
    </Card>
  )
}