import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../hooks/use-auth";
import { useLocation, Link } from "wouter";
import { supabase } from "../lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useLoyaltyEngine } from "../hooks/use-loyalty-engine";
import jsQR from "jsqr";
import {
  QrCode, Camera, CameraOff, User, Phone, Coins,
  LogOut, Sparkles, CheckCircle, Loader2, RotateCcw,
  ArrowRight, ShieldAlert, X, ZapIcon
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScannedCustomer {
  id: string;
  customer_name: string;
  phone: string;
  email: string | null;
  points: number;
  qr_token: string;
}

type ScanState =
  | "idle"          // camera feed active, waiting for QR
  | "scanning"      // actively detecting
  | "found"         // QR decoded, fetching from DB
  | "loaded"        // customer profile ready
  | "submitting"    // processing points
  | "success";      // transaction done

// ─── Component ────────────────────────────────────────────────────────────────
export default function QRScanner() {
  const { vendor, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { calculatePoints, logLoyaltyTransaction } = useLoyaltyEngine();

  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastScanTimeRef = useRef<number>(0);

  // State
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scannedCustomer, setScannedCustomer] = useState<ScannedCustomer | null>(null);
  const [txAmount, setTxAmount] = useState("");
  const [lastDetectedToken, setLastDetectedToken] = useState<string | null>(null);

  // ─── Camera Lifecycle ────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" }, // rear camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        setScanState("scanning");
        requestAnimationFrame(scanFrame);
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera access was denied. Please allow camera permission and reload.");
      } else if (err.name === "NotFoundError") {
        setCameraError("No camera was found on this device.");
      } else {
        setCameraError(`Camera error: ${err.message}`);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // ─── QR Frame Scanner ─────────────────────────────────────────────────────
  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Throttle jsQR to ~15fps to save CPU
    const now = Date.now();
    if (now - lastScanTimeRef.current > 66) {
      lastScanTimeRef.current = now;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data.startsWith("VENDLY_CUSTOMER:")) {
        const token = code.data.replace("VENDLY_CUSTOMER:", "").trim();
        handleQRDetected(token);
        return; // stop looping — we found something
      }
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, []);

  // ─── QR Detection Handler ─────────────────────────────────────────────────
  async function handleQRDetected(token: string) {
    if (token === lastDetectedToken) return; // debounce same token
    setLastDetectedToken(token);
    setScanState("found");
    cancelAnimationFrame(animFrameRef.current);

    if (!vendor) return;

    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, customer_name, phone, email, points, qr_token")
        .eq("qr_token", token)
        .eq("vendor_id", vendor.id)
        .single();

      if (error || !data) {
        toast({
          variant: "destructive",
          title: "Customer Not Found",
          description: "This QR code doesn't match any customer in your store.",
        });
        resetScanner();
        return;
      }

      setScannedCustomer(data);
      setScanState("loaded");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Lookup Failed", description: err.message });
      resetScanner();
    }
  }

  // ─── Transaction Submit ────────────────────────────────────────────────────
  async function handleLogPoints(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor || !scannedCustomer) return;
    const amount = parseFloat(txAmount);
    if (isNaN(amount) || amount <= 0) return;

    setScanState("submitting");
    try {
      const pointsEarned = await logLoyaltyTransaction(
        vendor.id,
        scannedCustomer.id,
        amount,
        vendor.points_rule_amount,
        vendor.points_rule_points,
      );

      // Update local state to show new balance
      setScannedCustomer(prev => prev
        ? { ...prev, points: prev.points + pointsEarned }
        : null
      );

      toast({
        title: "Points Added! 🎉",
        description: `₹${amount} transaction logged. ${scannedCustomer.customer_name} earned +${pointsEarned} pts.`,
      });
      setScanState("success");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Transaction Failed", description: err.message });
      setScanState("loaded");
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function resetScanner() {
    cancelAnimationFrame(animFrameRef.current);
    setScannedCustomer(null);
    setTxAmount("");
    setLastDetectedToken(null);
    setScanState("scanning");
    // Resume scanning loop
    if (cameraActive) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
    }
  }

  async function handleSignOut() {
    await signOut();
    setLocation("/");
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const pointsPreview = vendor && txAmount && !isNaN(parseFloat(txAmount))
    ? calculatePoints(parseFloat(txAmount), vendor.points_rule_amount, vendor.points_rule_points)
    : null;

  // ─── Access Guard ─────────────────────────────────────────────────────────
  if (!vendor) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-white px-4">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Error</h2>
          <p className="text-muted mb-6">No vendor profile found.</p>
          <button onClick={() => setLocation("/register")}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-bold">
            Go to Register
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-40 glass-panel border-x-0 border-t-0 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="font-bold text-2xl flex items-center">
            <span className="text-white">Vend</span><span className="text-gold">ly</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium">
            <Link href="/dashboard" className="text-muted hover:text-white transition-colors">Overview</Link>
            <Link href="/customers" className="text-muted hover:text-white transition-colors">Customers</Link>
            <Link href="/rewards" className="text-muted hover:text-white transition-colors">Rewards</Link>
            <Link href="/qr-scanner" className="text-white border-b-2 border-gold pb-1 pt-1 font-bold">Scan QR</Link>
            <Link href="/offers" className="text-muted hover:text-white transition-colors">Offers</Link>
            <Link href="/prebookings" className="text-muted hover:text-white transition-colors">Prebookings</Link>
          </div>
        </div>
        <button onClick={handleSignOut}
          className="flex items-center gap-2 border border-white/10 hover:border-red-500/30 hover:text-red-400 px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-500/10 transition-all cursor-pointer">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </nav>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center pt-24 pb-8 px-4">

        {/* Page Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-white flex items-center justify-center gap-2">
            <QrCode className="w-7 h-7 text-gold" />
            QR Customer Scanner
          </h1>
          <p className="text-muted text-sm mt-1">
            Point camera at a customer's Vendly QR code to identify them instantly.
          </p>
        </div>

        <div className="w-full max-w-lg space-y-6">

          {/* ── CAMERA / SCANNER AREA ──────────────────────────────────────── */}
          {(scanState === "scanning" || scanState === "found" || scanState === "idle") && (
            <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden relative">

              {/* Camera feed */}
              <div className="relative bg-black aspect-video w-full">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />

                {/* Hidden canvas for jsQR */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning overlay — animated viewfinder */}
                {cameraActive && scanState === "scanning" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {/* Corner brackets */}
                    <div className="relative w-52 h-52">
                      {/* Top-left */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-gold rounded-tl-lg" />
                      {/* Top-right */}
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-gold rounded-tr-lg" />
                      {/* Bottom-left */}
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-gold rounded-bl-lg" />
                      {/* Bottom-right */}
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-gold rounded-br-lg" />
                      {/* Scanning line */}
                      <div className="absolute inset-x-2 h-0.5 bg-gold/70 rounded-full animate-bounce" style={{ top: "50%" }} />
                    </div>
                  </div>
                )}

                {/* "Found" state — processing spinner */}
                {scanState === "found" && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-10 h-10 text-gold animate-spin" />
                    <span className="text-white font-semibold text-sm">Looking up customer…</span>
                  </div>
                )}

                {/* Camera error */}
                {cameraError && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 p-6 text-center">
                    <CameraOff className="w-12 h-12 text-red-400" />
                    <p className="text-white text-sm font-semibold">{cameraError}</p>
                    <button onClick={startCamera}
                      className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer flex items-center gap-2">
                      <Camera className="w-4 h-4" /> Retry Camera
                    </button>
                  </div>
                )}

                {/* No camera yet */}
                {!cameraActive && !cameraError && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-10 h-10 text-gold animate-spin" />
                    <span className="text-white text-sm">Starting camera…</span>
                  </div>
                )}
              </div>

              {/* Status bar below camera */}
              <div className="px-5 py-3 flex items-center justify-between border-t border-white/10">
                <div className="flex items-center gap-2 text-sm">
                  {cameraActive ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
                      <span className="text-muted-foreground">Camera active — scanning…</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                      <span className="text-muted-foreground">Camera off</span>
                    </>
                  )}
                </div>
                {cameraActive && (
                  <button onClick={stopCamera}
                    className="text-xs text-muted-foreground hover:text-red-400 flex items-center gap-1 cursor-pointer">
                    <X className="w-3.5 h-3.5" /> Stop
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── CUSTOMER PROFILE PANEL ─────────────────────────────────────── */}
          {(scanState === "loaded" || scanState === "submitting" || scanState === "success") && scannedCustomer && (
            <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden">

              {/* Header */}
              <div className="bg-gradient-to-r from-gold/10 to-blue/10 px-6 py-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center font-bold text-gold text-xl">
                    {scannedCustomer.customer_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg leading-tight">
                      {scannedCustomer.customer_name}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      {scannedCustomer.phone}
                    </div>
                  </div>
                </div>
                {scanState !== "success" && (
                  <button onClick={resetScanner}
                    className="p-2 hover:bg-white/10 rounded-xl text-muted-foreground hover:text-white transition-colors cursor-pointer"
                    title="Scan different QR">
                    <RotateCcw className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Points balance */}
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Current Points Balance</div>
                <div className="flex items-center gap-1.5 font-bold text-gold text-xl">
                  <Coins className="w-5 h-5" />
                  {scannedCustomer.points}
                  <span className="text-sm font-semibold text-muted-foreground ml-0.5">pts</span>
                </div>
              </div>

              {/* Transaction form */}
              {scanState === "loaded" && (
                <div className="px-6 py-5">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <ZapIcon className="w-4 h-4 text-gold" />
                    Log Transaction & Add Points
                  </h3>
                  <form onSubmit={handleLogPoints} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase block">
                        Transaction Amount (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        required
                        autoFocus
                        placeholder="e.g. 250"
                        value={txAmount}
                        onChange={e => setTxAmount(e.target.value)}
                        className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-sm"
                      />
                      {pointsPreview !== null && pointsPreview > 0 && (
                        <div className="text-xs text-gold font-semibold flex items-center gap-1.5 pt-1 animate-pulse">
                          <Sparkles className="w-3.5 h-3.5" />
                          {scannedCustomer.customer_name} will earn +{pointsPreview} loyalty points
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground bg-white/5 border border-white/5 rounded-xl px-3 py-2 flex items-center justify-between">
                      <span>Active rule</span>
                      <span className="font-semibold text-white">
                        ₹{vendor.points_rule_amount} = {vendor.points_rule_points} pts
                      </span>
                    </div>

                    <button type="submit"
                      className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-gold/90 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm gold-glow">
                      <ArrowRight className="w-4 h-4" />
                      Add Points & Record Transaction
                    </button>
                  </form>
                </div>
              )}

              {/* Submitting spinner */}
              {scanState === "submitting" && (
                <div className="px-6 py-10 flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-gold animate-spin" />
                  <span className="text-white font-semibold text-sm">Processing transaction…</span>
                </div>
              )}

              {/* Success state */}
              {scanState === "success" && (
                <div className="px-6 py-8 flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-emerald/10 border border-emerald/30 flex items-center justify-center">
                    <CheckCircle className="w-9 h-9 text-emerald" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg mb-1">Transaction Complete!</h3>
                    <p className="text-muted text-sm">
                      Points added successfully. New balance:{" "}
                      <span className="font-bold text-gold">{scannedCustomer.points} pts</span>
                    </p>
                  </div>
                  <button
                    onClick={resetScanner}
                    className="mt-2 bg-white/5 border border-white/15 hover:border-gold hover:text-gold text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <QrCode className="w-4 h-4" />
                    Scan Next Customer
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── INSTRUCTIONS ───────────────────────────────────────────────── */}
          {scanState === "scanning" && cameraActive && (
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { step: "1", label: "Point camera at QR", icon: <Camera className="w-5 h-5 text-gold mx-auto mb-2" /> },
                { step: "2", label: "Customer loads automatically", icon: <User className="w-5 h-5 text-blue mx-auto mb-2" /> },
                { step: "3", label: "Enter amount to add points", icon: <Coins className="w-5 h-5 text-emerald mx-auto mb-2" /> },
              ].map(s => (
                <div key={s.step} className="glass-panel p-4 rounded-2xl border border-white/5">
                  {s.icon}
                  <div className="text-xs text-muted-foreground leading-tight">{s.label}</div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
