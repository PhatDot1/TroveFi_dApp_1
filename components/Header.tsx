"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import WalletConnectButton from "@/components/WalletConnectButton"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 header-glass border-b border-border/50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 relative">
              <Image src="/images/trovefi-logo.png" alt="TroveFi Logo" width={32} height={32} className="rounded-lg" />
            </div>
            <span className="text-xl font-bold text-foreground">TroveFi</span>
          </div>



          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            <WalletConnectButton className="font-medium" />

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-foreground hover:text-foreground/80"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-4 pt-4 border-t border-border/50">
            <div className="flex flex-col space-y-4">
              <a href="#dashboard" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
                Dashboard
              </a>
              <a href="#rewards" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
                Rewards
              </a>
              <a href="#analytics" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
                Analytics
              </a>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}