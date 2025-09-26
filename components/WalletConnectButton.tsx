"use client"

import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"
import { useWallet } from "@/hooks/useWallet"

interface WalletConnectButtonProps {
  className?: string
  showAddress?: boolean
  size?: "sm" | "default" | "lg"
  variant?: "default" | "outline" | "secondary"
}

export default function WalletConnectButton({ 
  className = "", 
  showAddress = true,
  size = "default",
  variant = "default"
}: WalletConnectButtonProps) {
  const { isConnected, address, isConnecting, connect, disconnect } = useWallet()

  const handleClick = () => {
    if (isConnected) {
      disconnect()
    } else {
      connect()
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isConnecting}
      size={size}
      variant={variant}
      className={`${className} ${
        isConnected
          ? "bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          : "bg-primary hover:bg-primary/90 text-primary-foreground"
      }`}
    >
      <Wallet className="w-4 h-4 mr-2" />
      {isConnecting ? (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          Connecting...
        </div>
      ) : isConnected && address && showAddress ? (
        formatAddress(address)
      ) : isConnected ? (
        "Connected"
      ) : (
        "Connect Wallet"
      )}
    </Button>
  )
}