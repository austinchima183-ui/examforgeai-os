'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  CreditCard,
  ShoppingBag,
  Loader2,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

// ============================================================================
// ExamForge AI — Shopping Cart Page
// ============================================================================

interface CartItem {
  productId: string
  title: string
  price: number
  quantity: number
  thumbnail: string | null
  author: string
}

function formatPrice(price: number): string {
  if (price === 0) return 'Free'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(price)
}

export default function CartPage() {
  const router = useRouter()
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)

  useEffect(() => {
    loadCart()
  }, [])

  function loadCart() {
    setLoading(true)
    try {
      const cartStr = localStorage.getItem('examforge_cart')
      if (cartStr) {
        setItems(JSON.parse(cartStr))
      }
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  function saveCart(newItems: CartItem[]) {
    setItems(newItems)
    localStorage.setItem('examforge_cart', JSON.stringify(newItems))
  }

  function updateQuantity(productId: string, delta: number) {
    const newItems = items.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta)
        return { ...item, quantity: newQty }
      }
      return item
    })
    saveCart(newItems)
  }

  function removeItem(productId: string) {
    const newItems = items.filter(item => item.productId !== productId)
    saveCart(newItems)
    toast.success('Item removed from cart')
  }

  function clearCart() {
    saveCart([])
    toast.success('Cart cleared')
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const serviceFee = subtotal > 0 ? Math.round(subtotal * 0.015) : 0 // 1.5% service fee
  const total = subtotal + serviceFee

  async function handleCheckout() {
    if (items.length === 0) return

    setCheckingOut(true)
    try {
      const res = await fetch('/api/marketplace/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map(i => ({ productId: i.productId, quantity: i.quantity })) }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Purchase successful! All items are now available in your library.')
        localStorage.removeItem('examforge_cart')
        setItems([])
        router.push('/marketplace')
      } else {
        toast.error(data.error ?? 'Checkout failed')
      }
    } catch {
      toast.error('Failed to process checkout')
    } finally {
      setCheckingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shopping Cart</h1>
          <p className="text-sm text-muted-foreground">
            {items.length === 0 ? 'Your cart is empty' : `${items.length} item${items.length > 1 ? 's' : ''} in your cart`}
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.push('/marketplace')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Continue Shopping
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-lg font-medium">Your cart is empty</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Browse the marketplace to find educational content.
            </p>
            <Button className="mt-4" onClick={() => router.push('/marketplace')}>
              Browse Marketplace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => (
              <Card key={item.productId} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {item.thumbnail ? (
                        <Image src={item.thumbnail} alt={item.title} width={80} height={80} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-sm line-clamp-1">{item.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">by {item.author}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.productId, -1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Badge variant="secondary" className="min-w-[2rem] justify-center">
                            {item.quantity}
                          </Badge>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.productId, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="font-semibold text-sm">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-end">
              <Button variant="ghost" size="sm" className="text-destructive" onClick={clearCart}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear Cart
              </Button>
            </div>
          </div>

          {/* Order Summary */}
          <Card className="h-fit sticky top-4 forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {serviceFee > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service Fee</span>
                    <span>{formatPrice(serviceFee)}</span>
                  </div>
                </>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button className="w-full gap-2" onClick={handleCheckout} disabled={checkingOut}>
                {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {checkingOut ? 'Processing...' : 'Checkout'}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Secure checkout · Instant access after purchase
              </p>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}
