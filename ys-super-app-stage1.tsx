import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";

/* ============================================================================
   YS SUPER APP — يمن سوبر | المرحلة الثانية (تكامل الخدمات المالية، التوصيل، والسوق)
   ============================================================================ */

/* ============================================================================
   ## 1. Theme و Design Tokens
   ============================================================================ */

interface ColorTokens {
  primary: string;
  secondary: string;
  accent: string;
  liver: string;
  background: string;
  card: string;
  textPrimary: string;
  textSecondary: string;
  success: string;
  warning: string;
  error: string;
  border: string;
}

const COLORS: ColorTokens = {
  primary: "#102A43", // كحلي
  secondary: "#1E5A88", // أزرق صنعاني
  accent: "#D4A64A", // ذهبي
  liver: "#6D1F2A", // كبدي
  background: "#FAFAF8",
  card: "#FFFFFF",
  textPrimary: "#1E293B",
  textSecondary: "#64748B",
  success: "#16A34A",
  warning: "#F59E0B",
  error: "#DC2626",
  border: "#E7E5DE",
};

const FONT_FAMILY = "'Tajawal', 'Cairo', 'Segoe UI', Arial, sans-serif";
const RADIUS = { sm: 12, md: 16, lg: 22 } as const;
const SPACING = { xs: 6, sm: 10, md: 16, lg: 22, xl: 28 } as const;

/* ============================================================================
   ## 2. Types و Interfaces الشاملة
   ============================================================================ */

type ScreenName =
  | "SPLASH"
  | "ONBOARDING"
  | "LOGIN"
  | "OTP"
  | "CREATE_PROFILE"
  | "SELECT_CITY"
  | "HOME"
  | "WALLET"
  | "DELIVERY"
  | "YS_MARKET"
  | "PAYMENTS"
  | "TRACKING";

interface AuthSession {
  phone: string;
  createdAt: number;
}

interface UserProfile {
  fullName: string;
  username: string;
  email?: string;
  avatarUrl?: string;
}

type CityName = string;

interface ToastMessage {
  text: string;
  kind: "success" | "error" | "info";
}

type LoadState = "idle" | "loading" | "success" | "error";

interface ProductModel {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
}

interface TransactionModel {
  id: string;
  type: "deposit" | "withdraw" | "transfer" | "payment";
  amount: number;
  date: string;
  status: "success" | "pending" | "failed";
}

/* ============================================================================
   ## 3. Constants
   ============================================================================ */

const STORAGE_KEYS = {
  ONBOARDING_COMPLETED: "ys_onboarding_completed",
  AUTH_SESSION: "ys_auth_session",
  USER_PROFILE: "ys_user_profile",
  SELECTED_CITY: "ys_selected_city",
  LAST_SCREEN: "ys_last_screen",
  WALLET_BALANCE: "ys_wallet_balance",
  TRANSACTIONS: "ys_transactions",
} as const;

const OTP_TEST_CODE = "123456";
const OTP_RESEND_SECONDS = 30;
const SPLASH_MIN_DURATION_MS = 1100;

const YEMEN_CITIES: CityName[] = [
  "صنعاء", "عدن", "تعز", "الحديدة", "إب", "ذمار", "حضرموت", "مأرب",
  "عمران", "صعدة", "شبوة", "الجوف", "البيضاء", "لحج", "أبين", "الضالع",
  "المهرة", "ريمة", "المحويت", "حجة", "سقطرى",
];

const ONBOARDING_SLIDES = [
  { title: "مرحبًا بك في يمن سوبر 🇾🇪", desc: "كل خدماتك اليومية في تطبيق واحد", illustration: "map" },
  { title: "خدمات مالية سهلة", desc: "تحويل، شحن، دفع فواتير ومتابعة رصيدك بسهولة", illustration: "wallet" },
  { title: "عالم من الخدمات", desc: "تسوق، توصيل، وظائف، تعليم، ترفيه وتواصل", illustration: "world" },
];

const INITIAL_PRODUCTS: ProductModel[] = [
  { id: 1, name: "عسل سدر ملكي فاخر", price: 25000, image: "🍯", category: "منتجات" },
  { id: 2, name: "بن حراز أصلي مختص", price: 12000, image: "☕", category: "منتجات" },
  { id: 3, name: "جنبية يمني تقليدي فضي", price: 85000, image: "🗡️", category: "متاجر" },
  { id: 4, name: "قماش عسبي تراثي", price: 18000, image: "🧵", category: "متاجر" },
];

/* ============================================================================
   ## 4. Storage Service
   ============================================================================ */

function hasLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

const StorageService = {
  get<T>(key: string, fallback: T | null = null): T | null {
    if (!hasLocalStorage()) return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): void {
    if (!hasLocalStorage()) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  remove(key: string): void {
    if (!hasLocalStorage()) return;
    try {
      window.localStorage.removeItem(key);
    } catch {}
  },
};

/* ============================================================================
   ## 5. Reusable Components & Providers
   ============================================================================ */

const ToastContext = createContext<{ show: (text: string, kind?: ToastMessage["kind"]) => void } | null>(null);

function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast يجب أن يُستخدم داخل ToastProvider");
  return ctx;
}

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((text: string, kind: ToastMessage["kind"] = "success") => {
    setToast({ text, kind });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const bg = toast?.kind === "error" ? COLORS.error : toast?.kind === "info" ? COLORS.secondary : COLORS.primary;

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: "absolute",
          bottom: toast ? 90 : 60,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 999,
          opacity: toast ? 1 : 0,
          transition: "all .3s ease",
          pointerEvents: "none",
          width: "min(320px, 88%)",
        }}
      >
        {toast && (
          <div
            style={{
              background: bg,
              color: "#fff",
              padding: "12px 18px",
              borderRadius: RADIUS.md,
              fontFamily: FONT_FAMILY,
              fontSize: 13.5,
              textAlign: "center",
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            }}
          >
            {toast.text}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

function YSLogo({ size = 64 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: `linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.primary})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 8px 24px ${COLORS.primary}55`,
        border: `1.5px solid ${COLORS.accent}55`,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          color: COLORS.accent,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 800,
          fontSize: size * 0.36,
          letterSpacing: 1,
        }}
      >
        YS
      </span>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  variant = "solid",
  loading,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "solid" | "outline";
  loading?: boolean;
}) {
  const isSolid = variant === "solid";
  const isDisabled = !!disabled || !!loading;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      style={{
        width: "100%",
        padding: "15px 18px",
        borderRadius: RADIUS.md,
        border: isSolid ? "none" : `1.5px solid ${COLORS.border}`,
        background: isDisabled
          ? COLORS.border
          : isSolid
          ? `linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.primary})`
          : "transparent",
        color: isDisabled ? COLORS.textSecondary : isSolid ? "#fff" : COLORS.primary,
        fontFamily: FONT_FAMILY,
        fontWeight: 700,
        fontSize: 15.5,
        cursor: isDisabled ? "not-allowed" : "pointer",
        transition: "opacity .2s ease",
        opacity: isDisabled ? 0.75 : 1,
        boxSizing: "border-box",
      }}
    >
      {loading ? "جارِ التحميل..." : children}
    </button>
  );
}

function TextButton({ children, onClick, color }: { children: React.ReactNode; onClick: () => void; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        color: color || COLORS.secondary,
        fontFamily: FONT_FAMILY,
        fontWeight: 600,
        fontSize: 14,
        cursor: "pointer",
        padding: 6,
      }}
    >
      {children}
    </button>
  );
}

function YemeniPattern() {
  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: "absolute", inset: 0, opacity: 0.05, zIndex: 0, pointerEvents: "none" }}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern id="ys-qamariya" width="72" height="72" patternUnits="userSpaceOnUse">
          <path d="M36 6 L58 20 L58 52 L36 66 L14 52 L14 20 Z" fill="none" stroke={COLORS.accent} strokeWidth={1.4} />
          <circle cx={36} cy={36} r={10} fill="none" stroke={COLORS.accent} strokeWidth={1.2} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ys-qamariya)" />
    </svg>
  );
}

function ScreenShell({ children, withPattern }: { children: React.ReactNode; withPattern?: boolean }) {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100%",
        width: "100%",
        background: COLORS.background,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT_FAMILY,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {withPattern && <YemeniPattern />}
      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}

function TopMiniHeader({ title, onBack }: { title?: string; onBack?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "18px 20px 6px", gap: 10 }}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="رجوع"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: `1.5px solid ${COLORS.border}`,
            background: COLORS.card,
            color: COLORS.textPrimary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          ‹
        </button>
      )}
      {title && <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: COLORS.textPrimary }}>{title}</h2>}
    </div>
  );
}

/* ============================================================================
   ## 6. Splash & Onboarding & Auth Screens
   ============================================================================ */

function SplashScreen() {
  return (
    <div
      dir="rtl"
      style={{
        height: "100%",
        width: "100%",
        background: `linear-gradient(160deg, ${COLORS.primary} 0%, ${COLORS.secondary} 65%, ${COLORS.primary} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        fontFamily: FONT_FAMILY,
      }}
    >
      <YSLogo size={90} />
      <div style={{ textAlign: "center", marginTop: 18 }}>
        <div style={{ color: "#fff", fontSize: 23, fontWeight: 800 }}>يمن سوبر</div>
        <div style={{ color: COLORS.accent, fontSize: 13.5, marginTop: 6, fontWeight: 600 }}>كل خدماتك في مكان واحد</div>
      </div>
    </div>
  );
}

function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0);
  const slide = ONBOARDING_SLIDES[index];
  const isLast = index === ONBOARDING_SLIDES.length - 1;

  return (
    <ScreenShell withPattern>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 28px", gap: 26 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: COLORS.primary, margin: 0 }}>{slide.title}</h1>
        <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: 0, textAlign: "center" }}>{slide.desc}</p>
      </div>
      <div style={{ padding: `0 ${SPACING.lg}px ${SPACING.xl}px` }}>
        <PrimaryButton onClick={() => (isLast ? onComplete() : setIndex(index + 1))}>
          {isLast ? "ابدأ الآن" : "التالي"}
        </PrimaryButton>
      </div>
    </ScreenShell>
  );
}

function LoginScreen({ onSubmitPhone }: { onSubmitPhone: (phone: string) => void }) {
  const [phone, setPhone] = useState("");
  const toast = useToast();

  return (
    <ScreenShell>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "48px 24px 24px", justifyContent: "center" }}>
        <YSLogo size={64} />
        <h1 style={{ fontSize: 21, fontWeight: 800, color: COLORS.primary, margin: "20px 0 6px" }}>أهلاً بك 👋</h1>
        <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: "0 0 20px" }}>أدخل رقم هاتفك للمتابعة (+967)</p>
        <input
          type="tel"
          placeholder="7XX XXX XXX"
          value={phone}
          maxLength={9}
          onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
          style={{ width: "100%", padding: 14, borderRadius: RADIUS.md, border: `1.5px solid ${COLORS.border}`, fontSize: 16, boxSizing: "border-box" }}
        />
        <div style={{ marginTop: 24 }}>
          <PrimaryButton onClick={() => (phone.length === 9 ? onSubmitPhone(`+967${phone}`) : toast.show("أدخل رقمًا صحيحًا", "error"))}>
            متابعة
          </PrimaryButton>
        </div>
      </div>
    </ScreenShell>
  );
}

function OTPScreen({ phone, onVerified, onBack }: { phone: string; onVerified: () => void; onBack: () => void }) {
  const [code, setCode] = useState("");
  const toast = useToast();

  return (
    <ScreenShell>
      <TopMiniHeader onBack={onBack} />
      <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <h2 style={{ color: COLORS.primary }}>رمز التحقق</h2>
        <p style={{ fontSize: 13, color: COLORS.textSecondary }}>أدخل الرمز التجريبي: {OTP_TEST_CODE}</p>
        <input
          type="text"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
          style={{ width: "100%", padding: 14, textAlign: "center", fontSize: 20, borderRadius: RADIUS.md, border: `1.5px solid ${COLORS.border}`, margin: "20px 0" }}
        />
        <PrimaryButton onClick={() => (code === OTP_TEST_CODE ? onVerified() : toast.show("الرمز خطأ", "error"))}>
          تأكيد
        </PrimaryButton>
      </div>
    </ScreenShell>
  );
}

function CreateProfileScreen({ onSaved }: { onSaved: (p: UserProfile) => void }) {
  const [name, setName] = useState("");
  const toast = useToast();

  return (
    <ScreenShell>
      <TopMiniHeader title="الملف الشخصي" />
      <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <input
          type="text"
          placeholder="الاسم الكامل"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: "100%", padding: 14, borderRadius: RADIUS.md, border: `1.5px solid ${COLORS.border}`, marginBottom: 20 }}
        />
        <PrimaryButton onClick={() => (name.trim() ? onSaved({ fullName: name, username: "user_" + Date.now() }) : toast.show("أدخل الاسم", "error"))}>
          حفظ ومتابعة
        </PrimaryButton>
      </div>
    </ScreenShell>
  );
}

function SelectCityScreen({ onSelect }: { onSelect: (city: CityName) => void }) {
  return (
    <ScreenShell>
      <TopMiniHeader title="اختر مدينتك" />
      <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignContent: "start" }}>
        {YEMEN_CITIES.map((city) => (
          <button
            key={city}
            onClick={() => onSelect(city)}
            style={{ padding: 14, borderRadius: RADIUS.sm, border: `1.5px solid ${COLORS.border}`, background: COLORS.card, cursor: "pointer", fontWeight: 600 }}
          >
            {city}
          </button>
        ))}
      </div>
    </ScreenShell>
  );
}

/* ============================================================================
   ## 7. New Feature Screens (Wallet, Delivery, Market, Tracking)
   ============================================================================ */

function WalletScreen({ onBack }: { onBack: () => void }) {
  const [balance, setBalance] = useState<number>(() => StorageService.get<number>(STORAGE_KEYS.WALLET_BALANCE, 50000));
  const [pin, setPin] = useState("");
  const toast = useToast();

  const handleTransaction = (type: "deposit" | "withdraw", amount: number) => {
    if (pin.length < 4) {
      toast.show("يرجى إدخال رمز المحفظة (PIN)", "error");
      return;
    }
    if (type === "withdraw" && balance < amount) {
      toast.show("رصيدك غير كافٍ", "error");
      return;
    }
    const newBal = type === "deposit" ? balance + amount : balance - amount;
    setBalance(newBal);
    StorageService.set(STORAGE_KEYS.WALLET_BALANCE, newBal);
    toast.show(`تمت العملية بنجاح (${amount} ريال)`, "success");
    setPin("");
  };

  return (
    <ScreenShell>
      <TopMiniHeader title="المحفظة الذكية" onBack={onBack} />
      <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: COLORS.primary, color: "#fff", padding: 24, borderRadius: RADIUS.lg, textAlign: "center" }}>
          <div style={{ fontSize: 13, opacity: 0.8 }}>الرصيد المتاح</div>
          <div style={{ fontSize: 28, fontWeight: 800, margin: "8px 0", color: COLORS.accent }}>{balance} ريال يمني</div>
        </div>
        <input
          type="password"
          maxLength={4}
          placeholder="رمز الحماية PIN (4 أرقام)"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={{ width: "100%", padding: 14, textAlign: "center", borderRadius: RADIUS.md, border: `1.5px solid ${COLORS.border}` }}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <PrimaryButton onClick={() => handleTransaction("deposit", 10000)}>إيداع 10,000</PrimaryButton>
          <PrimaryButton variant="outline" onClick={() => handleTransaction("withdraw", 5000)}>سحب 5,000</PrimaryButton>
        </div>
      </div>
    </ScreenShell>
  );
}

function DeliveryScreen({ onBack, onTrack }: { onBack: () => void; onTrack: () => void }) {
  return (
    <ScreenShell>
      <TopMiniHeader title="خدمات التوصيل" onBack={onBack} />
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        {["مطاعم صنعاء", "متاجر وقصاد", "صيدليات 24/7", "طررود فورية"].map((item, idx) => (
          <div key={idx} style={{ padding: 18, background: COLORS.card, borderRadius: RADIUS.md, border: `1.5px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700 }}>{item}</span>
            <TextButton onClick={onTrack}>تتبع الطلب</TextButton>
          </div>
        ))}
      </div>
    </ScreenShell>
  );
}

function TrackingScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScreenShell>
      <TopMiniHeader title="تتبع المندوب اللحظي" onBack={onBack} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🛵</div>
        <h3 style={{ color: COLORS.primary }}>المندوب في طريقه إليك</h3>
        <p style={{ color: COLORS.textSecondary, fontSize: 13 }}>الوقت المتوقع للوصول: 10 دقائق</p>
      </div>
    </ScreenShell>
  );
}

function MarketScreen({ onBack }: { onBack: () => void }) {
  const [products] = useState<ProductModel[]>(INITIAL_PRODUCTS);

  return (
    <ScreenShell>
      <TopMiniHeader title="YS Market - السوق" onBack={onBack} />
      <div style={{ padding: 20, flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignContent: "start" }}>
        {products.map((p) => (
          <div key={p.id} style={{ background: COLORS.card, padding: 14, borderRadius: RADIUS.md, border: `1.5px solid ${COLORS.border}`, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{p.image}</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{p.name}</div>
            <div style={{ color: COLORS.secondary, fontSize: 13, fontWeight: 600 }}>{p.price} ر.ي</div>
          </div>
        ))}
      </div>
    </ScreenShell>
  );
}

/* ============================================================================
   ## 8. Main Home Screen (لوحة التحكم الرئيسية المحدثة)
   ============================================================================ */

function HomeScreen({
  profile,
  city,
  onNavigate,
  onLogout,
}: {
  profile: UserProfile;
  city: CityName;
  onNavigate: (screen: ScreenName) => void;
  onLogout: () => void;
}) {
  const balance = StorageService.get<number>(STORAGE_KEYS.WALLET_BALANCE, 50000);

  return (
    <ScreenShell withPattern>
      <div style={{ padding: "20px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: COLORS.textSecondary }}>مرحباً بك،</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.primary }}>{profile.fullName} 🇾🇪</div>
        </div>
        <div style={{ background: COLORS.card, padding: "6px 12px", borderRadius: RADIUS.sm, border: `1.5px solid ${COLORS.border}`, fontSize: 12, fontWeight: 700 }}>
          📍 {city}
        </div>
      </div>

      <div style={{ padding: "0 20px", margin: "10px 0" }}>
        <div style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`, color: "#fff", padding: 20, borderRadius: RADIUS.md }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>رصيد المحفظة</div>
          <div style={{ fontSize: 22, fontWeight: 800, margin: "6px 0", color: COLORS.accent }}>{balance} ريال</div>
          <TextButton color="#fff" onClick={() => onNavigate("WALLET")}>إدارة المحفظة والعمليات ›</TextButton>
        </div>
      </div>

      <div style={{ padding: "10px 20px", flex: 1, overflowY: "auto" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, marginBottom: 12 }}>الخدمات الرئيسية</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button onClick={() => onNavigate("WALLET")} style={{ padding: 18, background: COLORS.card, borderRadius: RADIUS.md, border: `1.5px solid ${COLORS.border}`, cursor: "pointer", textAlign: "right" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>💳</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>المحفظة</div>
          </button>
          <button onClick={() => onNavigate("DELIVERY")} style={{ padding: 18, background: COLORS.card, borderRadius: RADIUS.md, border: `1.5px solid ${COLORS.border}`, cursor: "pointer", textAlign: "right" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>🚚</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>التوصيل</div>
          </button>
          <button onClick={() => onNavigate("YS_MARKET")} style={{ padding: 18, background: COLORS.card, borderRadius: RADIUS.md, border: `1.5px solid ${COLORS.border}`, cursor: "pointer", textAlign: "right" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>🛒</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>YS Market</div>
          </button>
          <button onClick={() => onNavigate("TRACKING")} style={{ padding: 18, background: COLORS.card, borderRadius: RADIUS.md, border: `1.5px solid ${COLORS.border}`, cursor: "pointer", textAlign: "right" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>📍</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>التتبع الحقيقي</div>
          </button>
        </div>
      </div>

      <div style={{ padding: "10px 20px 20px" }}>
        <PrimaryButton variant="outline" onClick={onLogout}>تسجيل الخروج</PrimaryButton>
      </div>
    </ScreenShell>
  );
}

/* ============================================================================
   ## 9. Main Root App Component
   ============================================================================ */

export default function App() {
  const [screen, setScreen] = useState<ScreenName>("SPLASH");
  const [splashReady, setSplashReady] = useState(false);
  const [pendingPhone, setPendingPhone] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(() => StorageService.get<UserProfile>(STORAGE_KEYS.USER_PROFILE, null));
  const [city, setCity] = useState<CityName | null>(() => StorageService.get<CityName>(STORAGE_KEYS.SELECTED_CITY, null));

  useEffect(() => {
    const t = setTimeout(() => setSplashReady(true), SPLASH_MIN_DURATION_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!splashReady) return;
    const onboardingCompleted = StorageService.get<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETED, false);
    const session = StorageService.get<AuthSession>(STORAGE_KEYS.AUTH_SESSION, null);

    if (!onboardingCompleted) setScreen("ONBOARDING");
    else if (!session) setScreen("LOGIN");
    else if (!profile) setScreen("CREATE_PROFILE");
    else if (!city) setScreen("SELECT_CITY");
    else setScreen("HOME");
  }, [splashReady, profile, city]);

  const navigateTo = (next: ScreenName) => setScreen(next);

  let content: React.ReactNode = null;
  switch (screen) {
    case "SPLASH":
      content = <SplashScreen />;
      break;
    case "ONBOARDING":
      content = <OnboardingScreen onComplete={() => { StorageService.set(STORAGE_KEYS.ONBOARDING_COMPLETED, true); navigateTo("LOGIN"); }} />;
      break;
    case "LOGIN":
      content = <LoginScreen onSubmitPhone={(p) => { setPendingPhone(p); navigateTo("OTP"); }} />;
      break;
    case "OTP":
      content = <OTPScreen phone={pendingPhone} onVerified={() => { StorageService.set(STORAGE_KEYS.AUTH_SESSION, { phone: pendingPhone, createdAt: Date.now() }); navigateTo(profile ? "HOME" : "CREATE_PROFILE"); }} onBack={() => navigateTo("LOGIN")} />;
      break;
    case "CREATE_PROFILE":
      content = <CreateProfileScreen onSaved={(p) => { StorageService.set(STORAGE_KEYS.USER_PROFILE, p); setProfile(p); navigateTo(city ? "HOME" : "SELECT_CITY"); }} />;
      break;
    case "SELECT_CITY":
      content = <SelectCityScreen onSelect={(c) => { StorageService.set(STORAGE_KEYS.SELECTED_CITY, c); setCity(c); navigateTo("HOME"); }} />;
      break;
    case "WALLET":
      content = <WalletScreen onBack={() => navigateTo("HOME")} />;
      break;
    case "DELIVERY":
      content = <DeliveryScreen onBack={() => navigateTo("HOME")} onTrack={() => navigateTo("TRACKING")} />;
      break;
    case "YS_MARKET":
      content = <MarketScreen onBack={() => navigateTo("HOME")} />;
      break;
    case "TRACKING":
      content = <TrackingScreen onBack={() => navigateTo("DELIVERY")} />;
      break;
    case "HOME":
    default:
      content = profile && city ? <HomeScreen profile={profile} city={city} onNavigate={navigateTo} onLogout={() => { StorageService.remove(STORAGE_KEYS.AUTH_SESSION); navigateTo("LOGIN"); }} /> : <SplashScreen />;
      break;
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        maxWidth: 480,
        margin: "0 auto",
        background: COLORS.background,
        boxShadow: "0 0 40px rgba(0,0,0,0.08)",
        overflow: "hidden",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      <ToastProvider>{content}</ToastProvider>
    </div>
  );
}
