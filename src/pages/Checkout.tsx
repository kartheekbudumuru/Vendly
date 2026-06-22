import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { useCart } from "../hooks/use-cart";
import { supabase } from "../lib/supabase";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, ShieldCheck, CreditCard, ArrowLeft, Loader2, Star, Tag } from "lucide-react";

export default function Checkout() {
  const { user } = useAuth();
  const { cartItems, cartTotal, clearCart } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Form State
  const [shippingAddress, setShippingAddress] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (cartItems.length === 0) {
      setLocation("/cart");
    }
  }, [cartItems, setLocation]);

  // Pricing calculations
  const discountAmount = (cartTotal * discountPercent) / 100;
  const taxableAmount = cartTotal - discountAmount;
  const shippingCost = taxableAmount > 500 ? 0 : 40;
  const finalTotal = taxableAmount + shippingCost;

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponLoading(true);

    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.trim().toUpperCase())
        .eq("active", true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({ variant: "destructive", title: "Invalid Coupon", description: "The coupon code entered does not exist or is inactive." });
        setDiscountPercent(0);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        toast({ variant: "destructive", title: "Expired Coupon", description: "This coupon code has expired." });
        setDiscountPercent(0);
        return;
      }

      // Check if coupon belongs to a vendor of any product in the cart
      const cartVendors = cartItems.map(item => item.product?.vendor_id);
      if (!cartVendors.includes(data.vendor_id)) {
        toast({
          variant: "destructive",
          title: "Ineligible Items",
          description: "This coupon is not applicable to any products in your cart.",
        });
        setDiscountPercent(0);
        return;
      }

      setDiscountPercent(data.discount_percent);
      toast({
        title: "Coupon Applied! 🎉",
        description: `Successfully applied ${data.discount_percent}% discount.`,
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Coupon Failed", description: err.message });
    } finally {
      setCouponLoading(false);
    }
  }

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!user || cartItems.length === 0) return;
    if (!shippingAddress.trim()) {
      toast({ variant: "destructive", title: "Address Required", description: "Please enter your shipping address." });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create order record
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            customer_id: user.id,
            total_amount: finalTotal,
            shipping_address: shippingAddress.trim(),
            coupon_code: discountPercent > 0 ? couponCode.trim().toUpperCase() : null,
            status: "pending",
          }
        ])
        .select("id")
        .single();

      if (orderError) throw orderError;

      // 2. Create order items and decrement stock levels
      for (const item of cartItems) {
        if (!item.product) continue;
        
        // Insert order item details
        const { error: itemError } = await supabase
          .from("order_items")
          .insert([
            {
              order_id: order.id,
              product_id: item.productId,
              vendor_id: item.product.vendor_id,
              price: item.product.price,
              quantity: item.quantity,
            }
          ]);

        if (itemError) throw itemError;

        // Decrement product stock levels
        const newStock = Math.max(item.product.stock_quantity - item.quantity, 0);
        const { error: stockError } = await supabase
          .from("products")
          .update({ stock_quantity: newStock })
          .eq("id", item.productId);

        if (stockError) throw stockError;
      }

      // 3. Clear Shopping Cart
      await clearCart();

      toast({
        title: "Order Placed Successfully! 📦",
        description: "Your order is registered and will be shipped soon.",
      });

      setLocation("/customer/portal");
    } catch (err: any) {
      console.error("Checkout failed:", err);
      toast({ variant: "destructive", title: "Order Placement Failed", description: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-x-0 border-t-0 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-2xl flex items-center cursor-pointer">
            <span className="text-white">Vend</span><span className="text-gold">ly</span>
            <Star className="text-gold fill-gold h-5 w-5 ml-1" />
          </Link>
        </div>
      </nav>

      {/* CHECKOUT BODY */}
      <main className="flex-1 max-w-5xl w-full mx-auto pt-24 pb-16 px-6">
        
        {/* Back Link */}
        <Link href="/cart" className="inline-flex items-center gap-2 text-muted hover:text-white mb-6 text-sm font-medium transition-colors cursor-pointer group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Cart</span>
        </Link>

        <h1 className="text-3xl font-extrabold text-white mb-8 flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-gold" />
          Checkout
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Form Column */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handlePlaceOrder} className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
              
              <h2 className="text-lg font-bold text-white pb-3 border-b border-white/5">Shipping Details</h2>

              {/* Shipping Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Delivery Address
                </label>
                <textarea
                  required
                  placeholder="Enter full shipping address, house number, area, city, pincode, and state..."
                  value={shippingAddress}
                  onChange={e => setShippingAddress(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold text-xs resize-none"
                />
              </div>

              {/* Secure Payment Note */}
              <div className="bg-emerald/5 border border-emerald/20 text-emerald rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">Payment Method: Cash on Delivery / Pay on Delivery</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Pay with cash or digital scanner at the time of order drop off.</div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold hover:bg-gold/90 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm gold-glow"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Place Order (₹{finalTotal.toFixed(2)})
                  </>
                )}
              </button>

            </form>
          </div>

          {/* Right Summary Column */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Promo Code Coupon */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-gold" />
                Apply Coupon Code
              </h3>
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input 
                  type="text"
                  placeholder="e.g. WELCOME10"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold text-xs uppercase"
                />
                <button 
                  type="submit" 
                  disabled={couponLoading}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold px-4 rounded-xl text-xs flex items-center justify-center cursor-pointer"
                >
                  {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                </button>
              </form>
            </div>

            {/* Checkout Pricing Card */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
              
              <h3 className="text-sm font-bold text-white pb-3 border-b border-white/5">Summary ({cartItems.length} Products)</h3>

              <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between items-start text-xs border-b border-white/5 pb-2.5 last:border-0 last:pb-0">
                    <div className="min-w-0 flex-1 pr-4">
                      <div className="font-semibold text-white truncate">{item.product?.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Quantity: {item.quantity} · Store: {item.product?.vendors?.business_name}</div>
                    </div>
                    <span className="font-bold text-white flex-shrink-0">₹{(item.product?.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Price Details */}
              <div className="space-y-3 text-xs pt-4 border-t border-white/5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Cart Subtotal</span>
                  <span className="font-semibold text-white">₹{cartTotal.toFixed(2)}</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-emerald">
                    <span>Discount Applied ({discountPercent}%)</span>
                    <span className="font-bold">-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery Charges</span>
                  <span className="font-semibold text-white">
                    {shippingCost === 0 ? <span className="text-emerald font-bold">FREE</span> : `₹${shippingCost.toFixed(2)}`}
                  </span>
                </div>
              </div>

              {/* Total Price */}
              <div className="flex justify-between items-baseline pt-4 border-t border-white/5">
                <span className="text-sm font-bold text-white">Total Amount</span>
                <span className="text-2xl font-black text-emerald">₹{finalTotal.toFixed(2)}</span>
              </div>

            </div>

          </div>

        </div>

      </main>

    </div>
  );
}
