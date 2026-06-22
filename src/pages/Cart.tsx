import React from "react";
import { useCart } from "../hooks/use-cart";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Trash2, ArrowLeft, ArrowRight, ShieldCheck, Star } from "lucide-react";

export default function Cart() {
  const { cartItems, loading, updateQuantity, removeFromCart, cartTotal } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const shippingCost = cartTotal > 500 || cartTotal === 0 ? 0 : 40;
  const estimatedTotal = cartTotal + shippingCost;

  const handleUpdateQty = async (cartItemId: string, newQty: number, maxStock: number) => {
    if (newQty <= 0) return;
    if (newQty > maxStock) {
      toast({
        variant: "destructive",
        title: "Stock limit reached",
        description: `Only ${maxStock} items available in stock.`,
      });
      return;
    }
    await updateQuantity(cartItemId, newQty);
  };

  const handleRemove = async (cartItemId: string, productName: string) => {
    await removeFromCart(cartItemId);
    toast({
      title: "Item Removed",
      description: `${productName} was removed from your cart.`,
    });
  };

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

      {/* CART CONTENT */}
      <main className="flex-1 max-w-5xl w-full mx-auto pt-24 pb-16 px-6">
        
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-muted hover:text-white mb-6 text-sm font-medium transition-colors cursor-pointer group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Catalog</span>
        </Link>

        <h1 className="text-3xl font-extrabold text-white mb-8 flex items-center gap-3">
          <ShoppingCart className="w-8 h-8 text-gold" />
          Shopping Cart
        </h1>

        {cartItems.length === 0 ? (
          /* EMPTY CART STATE */
          <div className="glass-panel p-16 rounded-3xl border border-white/10 text-center max-w-md mx-auto">
            <ShoppingCart className="w-16 h-16 text-muted mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-white mb-2">Your Cart is Empty</h3>
            <p className="text-muted text-sm mb-6">
              Looks like you haven't added any products to your shopping cart yet.
            </p>
            <Link href="/">
              <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold text-sm cursor-pointer gold-glow">
                Go Shopping
              </button>
            </Link>
          </div>
        ) : (
          /* CART CONTENT GRID */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Items Column */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div 
                  key={item.id}
                  className="glass-panel rounded-3xl border border-white/10 p-5 flex flex-col sm:flex-row items-center gap-4 hover:border-gold/20 transition-all"
                >
                  {/* Image */}
                  <div className="w-20 h-20 bg-black/10 border border-white/5 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {item.product?.image_url ? (
                      <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-semibold">No Image</span>
                    )}
                  </div>

                  {/* Info details */}
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <Link href={`/product/${item.productId}`} className="font-bold text-white text-sm hover:text-gold hover:underline truncate block cursor-pointer">
                      {item.product?.name}
                    </Link>
                    <span className="block text-[10px] text-muted-foreground uppercase font-semibold mt-0.5">
                      Store: {item.product?.vendors?.business_name || "Merchant"}
                    </span>
                    <span className="block text-emerald font-black text-sm mt-1">₹{item.product?.price}</span>
                  </div>

                  {/* Quantity & Delete Controls */}
                  <div className="flex items-center gap-4 flex-shrink-0 mt-3 sm:mt-0">
                    
                    {/* Quantity adjuster */}
                    <div className="flex items-center border border-white/10 rounded-xl bg-white/5 overflow-hidden">
                      <button 
                        onClick={() => handleUpdateQty(item.id, item.quantity - 1, item.product?.stock_quantity)}
                        className="px-2.5 py-1 text-white hover:bg-white/10 transition-colors font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="px-2.5 py-1 font-bold text-white text-xs">{item.quantity}</span>
                      <button 
                        onClick={() => handleUpdateQty(item.id, item.quantity + 1, item.product?.stock_quantity)}
                        className="px-2.5 py-1 text-white hover:bg-white/10 transition-colors font-bold text-xs"
                      >
                        +
                      </button>
                    </div>

                    {/* Delete button */}
                    <button 
                      onClick={() => handleRemove(item.id, item.product?.name)}
                      className="p-2 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 rounded-xl transition-colors cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                  </div>

                </div>
              ))}
            </div>

            {/* Right Summary Column */}
            <div className="lg:col-span-1">
              <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
                
                <h3 className="text-base font-bold text-white pb-3 border-b border-white/5">Order Summary</h3>

                {/* Subtotals */}
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-semibold text-white">₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery Charges</span>
                    <span className="font-semibold text-white">
                      {shippingCost === 0 ? <span className="text-emerald font-bold">FREE</span> : `₹${shippingCost.toFixed(2)}`}
                    </span>
                  </div>
                  {shippingCost > 0 && (
                    <p className="text-[10px] text-gold font-medium bg-gold/5 border border-gold/15 p-2 rounded-lg">
                      Add ₹{(500 - cartTotal).toFixed(2)} more for Free Delivery!
                    </p>
                  )}
                </div>

                {/* Final Total */}
                <div className="flex justify-between items-baseline pt-4 border-t border-white/5">
                  <span className="text-sm font-bold text-white">Estimated Total</span>
                  <span className="text-2xl font-black text-emerald">₹{estimatedTotal.toFixed(2)}</span>
                </div>

                {/* Secure Checkout Badge */}
                <div className="text-[10px] text-muted-foreground bg-white/5 border border-white/5 rounded-xl p-3 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                  <span>Secure transactions enabled. Place order securely to initiate shipping.</span>
                </div>

                {/* Checkout CTA */}
                <button 
                  onClick={() => setLocation("/checkout")}
                  className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold hover:bg-gold/90 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm gold-glow"
                >
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4" />
                </button>

              </div>
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
