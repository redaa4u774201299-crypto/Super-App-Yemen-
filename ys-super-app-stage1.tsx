import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";

/* ============================================================================
   YS SUPER APP — يمن سوبر | المرحلة الأولى
   ملاحظة بيئية: بيئة الأرتيفاكت تدعم ملفًا واحدًا فعليًا فقط، لذا تم تنظيم
   هذا الملف كوحدات منفصلة بعناوين واضحة (##) قابلة لنقل كل قسم لاحقًا إلى
   ملفه الخاص (theme.ts / types.ts / storage.ts / SplashScreen.tsx ...) دون
   أي تعديل على منطقها الداخلي.
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
   ## 2. Types و Interfaces
   ============================================================================ */

type ScreenName =
  | "SPLASH"
  | "ONBOARDING"
  | "LOGIN"
  | "OTP"
  | "CREATE_PROFILE"
  | "SELECT_CITY"
  | "HOME";

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

/* ============================================================================
   ## 3. Constants
   ============================================================================ */

const STORAGE_KEYS = {
  ONBOARDING_COMPLETED: "ys_onboarding_completed",
  AUTH_SESSION: "ys_auth_session",
  USER_PROFILE: "ys_user_profile",
  SELECTED_CITY: "ys_selected_city",
  LAST_SCREEN: "ys_last_screen",
} as const;

const OTP_TEST_CODE = "123456";
const OTP_RESEND_SECONDS = 30;
const SPLASH_MIN_DURATION_MS = 1100;

const YEMEN_CITIES: CityName[] = [
  "صنعاء", "عدن", "تعز", "الحديدة", "إب", "ذمار", "حضرموت", "مأرب",
  "عمران", "صعدة", "شبوة", "الجوف", "البيضاء", "لحج", "أبين", "الضالع",
  "المهرة", "ريمة", "المحويت", "حجة", "سقطرى",
];

const ONBOARDING_SLIDES: { title: string; desc: string; illustration: "map" | "wallet" | "world" }[] = [
  {
    title: "مرحبًا بك في يمن سوبر 🇾🇪",
    desc: "كل خدماتك اليومية في تطبيق واحد",
    illustration: "map",
  },
  {
    title: "خدمات مالية سهلة",
    desc: "تحويل، شحن، دفع فواتير ومتابعة رصيدك بسهولة",
    illustration: "wallet",
  },
  {
    title: "عالم من الخدمات",
    desc: "تسوق، توصيل، وظائف، تعليم، ترفيه وتواصل",
    illustration: "world",
  },
];

/* ============================================================================
   ## 4. Storage Service
   طبقة تخزين محلي مستقلة (تُبنى فوق localStorage) — واجهتها الموحّدة
   (get/set/remove) تسمح باستبدال المصدر لاحقًا بأي نظام آخر دون تعديل
   بقية الكود.
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
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): void {
    if (!hasLocalStorage()) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* تجاهل أخطاء الحصة التخزينية */
    }
  },
  remove(key: string): void {
    if (!hasLocalStorage()) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* تجاهل */
    }
  },
};

/* ============================================================================
   ## 5. Navigation Logic
   محرك تنقل بحالة واحدة (Route State Machine) بديل عن Router تقليدي، متوافق
   مع بيئة الأرتيفاكت أحادية الملف. المنطق مطابق حرفيًا للمواصفة المطلوبة.
   ============================================================================ */

interface ResolvedRoute {
  screen: ScreenName;
}

function resolveInitialScreen(): ResolvedRoute {
  const onboardingCompleted = StorageService.get<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETED, false);
  const session = StorageService.get<AuthSession>(STORAGE_KEYS.AUTH_SESSION, null);
  const profile = StorageService.get<UserProfile>(STORAGE_KEYS.USER_PROFILE, null);
  const city = StorageService.get<CityName>(STORAGE_KEYS.SELECTED_CITY, null);

  if (!onboardingCompleted) {
    return { screen: "ONBOARDING" };
  }
  if (!session) {
    return { screen: "LOGIN" };
  }
  if (session && !profile) {
    return { screen: "CREATE_PROFILE" };
  }
  if (session && profile && !city) {
    return { screen: "SELECT_CITY" };
  }
  return { screen: "HOME" };
}

/* ============================================================================
   ## 6. Reusable Components
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

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "solid" | "outline";
  loading?: boolean;
}

function PrimaryButton({ children, onClick, disabled, variant = "solid", loading }: PrimaryButtonProps) {
  const [pressed, setPressed] = useState(false);
  const isSolid = variant === "solid";
  const isDisabled = !!disabled || !!loading;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
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
        transform: pressed && !isDisabled ? "scale(0.98)" : "scale(1)",
        transition: "transform .12s ease, opacity .2s ease",
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
          <path
            d="M36 6 L58 20 L58 52 L36 66 L14 52 L14 20 Z"
            fill="none"
            stroke={COLORS.accent}
            strokeWidth={1.4}
          />
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

function InlineErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <p style={{ color: COLORS.error, fontSize: 13.5, margin: "0 0 10px" }}>{message}</p>
      {onRetry && <TextButton onClick={onRetry}>إعادة المحاولة</TextButton>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: "center", color: COLORS.textSecondary, marginTop: 40, fontSize: 13.5, padding: "0 20px" }}>
      {message}
    </div>
  );
}

/* ============================================================================
   ## 7. Splash Screen
   ============================================================================ */

function SplashScreen() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

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
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "absolute", inset: 0, opacity: 0.08 }}>
        <YemeniPattern />
      </div>

      <div
        style={{
          transform: visible ? "scale(1) translateY(0)" : "scale(0.82) translateY(10px)",
          opacity: visible ? 1 : 0,
          transition: "all .5s cubic-bezier(.2,.8,.2,1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
        }}
      >
        <YSLogo size={90} />
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#fff", fontSize: 23, fontWeight: 800 }}>يمن سوبر</div>
          <div style={{ color: COLORS.accent, fontSize: 13.5, marginTop: 6, fontWeight: 600 }}>
            كل خدماتك في مكان واحد
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 52,
          width: 30,
          height: 30,
          borderRadius: "50%",
          border: `3px solid ${COLORS.accent}33`,
          borderTopColor: COLORS.accent,
          animation: "ys-spin 0.9s linear infinite",
        }}
      />
      <style>{`@keyframes ys-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ============================================================================
   ## 8. Onboarding Screen
   ============================================================================ */

function OnboardingIllustration({ type }: { type: "map" | "wallet" | "world" }) {
  const wrap: React.CSSProperties = {
    width: 190,
    height: 190,
    borderRadius: 28,
    background: `linear-gradient(150deg, ${COLORS.secondary}14, ${COLORS.accent}1c)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1.5px solid ${COLORS.border}`,
  };

  if (type === "map") {
    return (
      <div style={wrap}>
        <svg width={104} height={104} viewBox="0 0 100 100">
          <path
            d="M20 30 L45 20 L70 28 L82 48 L68 72 L42 80 L22 62 Z"
            fill={COLORS.secondary + "22"}
            stroke={COLORS.secondary}
            strokeWidth={2}
          />
          {[[35, 40], [55, 35], [45, 55], [62, 58]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={4} fill={COLORS.accent} />
          ))}
        </svg>
      </div>
    );
  }
  if (type === "wallet") {
    return (
      <div style={wrap}>
        <svg width={104} height={104} viewBox="0 0 100 100">
          <rect x={15} y={28} width={70} height={46} rx={10} fill={COLORS.primary + "14"} stroke={COLORS.primary} strokeWidth={2} />
          <circle cx={68} cy={51} r={7} fill={COLORS.accent} />
          <rect x={15} y={40} width={70} height={2} fill={COLORS.secondary} opacity={0.5} />
        </svg>
      </div>
    );
  }
  return (
    <div style={wrap}>
      <svg width={104} height={104} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={34} fill={COLORS.accent + "12"} stroke={COLORS.secondary} strokeWidth={2} />
        {[0, 60, 120, 180, 240, 300].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x = 50 + 34 * Math.cos(rad);
          const y = 50 + 34 * Math.sin(rad);
          return <circle key={deg} cx={x} cy={y} r={4.5} fill={COLORS.primary} />;
        })}
      </svg>
    </div>
  );
}

function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0);
  const isFirst = index === 0;
  const isLast = index === ONBOARDING_SLIDES.length - 1;
  const slide = ONBOARDING_SLIDES[index];

  const goNext = () => (isLast ? onComplete() : setIndex((i) => i + 1));
  const goPrev = () => !isFirst && setIndex((i) => i - 1);

  return (
    <ScreenShell withPattern>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 0" }}>
        <div style={{ width: 46 }}>
          {!isFirst && <TextButton onClick={goPrev}>السابق</TextButton>}
        </div>
        {!isLast && <TextButton onClick={onComplete}>تخطي</TextButton>}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 28px",
          gap: 26,
          minHeight: 0,
        }}
      >
        <div key={index} style={{ animation: "ys-fade .4s ease" }}>
          <OnboardingIllustration type={slide.illustration} />
        </div>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: COLORS.primary, margin: "0 0 10px" }}>{slide.title}</h1>
          <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: 0, lineHeight: 1.7 }}>{slide.desc}</p>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 7, paddingBottom: 20 }}>
        {ONBOARDING_SLIDES.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === index ? 22 : 7,
              height: 7,
              borderRadius: 4,
              background: i === index ? COLORS.accent : COLORS.border,
              transition: "all .25s ease",
            }}
          />
        ))}
      </div>

      <div style={{ padding: `0 ${SPACING.lg}px ${SPACING.xl}px` }}>
        <PrimaryButton onClick={goNext}>{isLast ? "ابدأ الآن" : "التالي"}</PrimaryButton>
      </div>

      <style>{`@keyframes ys-fade { from { opacity:0; transform: translateY(8px);} to {opacity:1; transform: translateY(0);} }`}</style>
    </ScreenShell>
  );
}

/* ============================================================================
   ## 9. Login Screen
   ============================================================================ */

function PhoneInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        border: `1.5px solid ${COLORS.border}`,
        borderRadius: RADIUS.md,
        overflow: "hidden",
        background: COLORS.card,
      }}
    >
      <span
        style={{
          padding: "14px 16px",
          background: COLORS.background,
          color: COLORS.textPrimary,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 700,
          fontSize: 15,
          borderLeft: `1.5px solid ${COLORS.border}`,
          flexShrink: 0,
        }}
      >
        +967
      </span>
      <input
        type="tel"
        inputMode="numeric"
        placeholder="7XX XXX XXX"
        value={value}
        maxLength={9}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value.replace(/[^\d]/g, ""))}
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          padding: "14px 16px",
          fontFamily: "'Inter', sans-serif",
          fontSize: 16,
          color: COLORS.textPrimary,
          background: "transparent",
          textAlign: "left",
          direction: "ltr",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function LoginScreen({ onSubmitPhone }: { onSubmitPhone: (fullPhone: string) => void }) {
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const toast = useToast();

  const isDigitsOnly = /^\d+$/.test(phone);
  const isValidPhone = /^7\d{8}$/.test(phone);

  const handleContinue = () => {
    if (!phone) {
      toast.show("يرجى إدخال رقم الهاتف", "error");
      return;
    }
    if (!isDigitsOnly) {
      toast.show("رقم الهاتف يجب أن يحتوي على أرقام فقط", "error");
      return;
    }
    if (!isValidPhone) {
      toast.show("أدخل رقمًا صحيحًا مكوّنًا من 9 أرقام يبدأ بـ 7", "error");
      return;
    }
    if (!agree) {
      toast.show("يجب الموافقة على الشروط وسياسة الخصوصية للمتابعة", "error");
      return;
    }
    onSubmitPhone(`+967${phone}`);
  };

  return (
    <ScreenShell>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "48px 24px 24px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <YSLogo size={64} />
        </div>

        <h1 style={{ fontSize: 21, fontWeight: 800, color: COLORS.primary, margin: "0 0 6px", textAlign: "center" }}>
          أهلاً بك 👋
        </h1>
        <p style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: "center", margin: "0 0 30px" }}>
          أدخل رقم هاتفك للمتابعة
        </p>

        <PhoneInput value={phone} onChange={setPhone} />

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginTop: 18,
            fontSize: 12.5,
            color: COLORS.textSecondary,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={agree}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAgree(!!e.target.checked)}
            style={{ marginTop: 2, accentColor: COLORS.secondary }}
          />
          <span>
            أوافق على <span style={{ color: COLORS.secondary, fontWeight: 600 }}>الشروط والأحكام</span> و
            <span style={{ color: COLORS.secondary, fontWeight: 600 }}> سياسة الخصوصية</span>
          </span>
        </label>

        <div style={{ marginTop: 24 }}>
          <PrimaryButton onClick={handleContinue}>متابعة</PrimaryButton>
        </div>
      </div>
    </ScreenShell>
  );
}

/* ============================================================================
   ## 10. OTP Screen
   ============================================================================ */

function OTPInputRow({
  length,
  value,
  onChange,
  error,
}: {
  length: number;
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.split("");
  while (digits.length < length) digits.push("");

  const handleChange = (i: number, v: string) => {
    const d = v.replace(/[^\d]/g, "").slice(-1);
    const next = [...digits];
    next[i] = d;
    onChange(next.join(""));
    if (d && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", direction: "ltr" }}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el: HTMLInputElement | null) => {
            refs.current[i] = el;
          }}
          value={digits[i]}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(i, e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(i, e)}
          inputMode="numeric"
          maxLength={1}
          style={{
            width: 42,
            height: 50,
            textAlign: "center",
            fontSize: 19,
            fontWeight: 700,
            borderRadius: RADIUS.sm,
            border: `1.5px solid ${error ? COLORS.error : COLORS.border}`,
            outline: "none",
            color: COLORS.textPrimary,
            fontFamily: "'Inter', sans-serif",
            background: COLORS.card,
            boxSizing: "border-box",
          }}
        />
      ))}
    </div>
  );
}

function OTPScreen({
  phone,
  onVerified,
  onBack,
}: {
  phone: string;
  onVerified: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [seconds, setSeconds] = useState(OTP_RESEND_SECONDS);
  const [status, setStatus] = useState<LoadState>("idle");
  const toast = useToast();

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const handleVerify = useCallback(
    (value: string) => {
      setStatus("loading");
      setTimeout(() => {
        if (value === OTP_TEST_CODE) {
          setStatus("success");
          toast.show("تم التحقق بنجاح");
          onVerified();
        } else {
          setStatus("error");
          setError(true);
          toast.show("رمز التحقق غير صحيح", "error");
        }
      }, 450);
    },
    [onVerified, toast]
  );

  useEffect(() => {
    if (code.length === 6) handleVerify(code);
  }, [code, handleVerify]);

  const handleResend = () => {
    setSeconds(OTP_RESEND_SECONDS);
    setCode("");
    setError(false);
    setStatus("idle");
    toast.show("تم إرسال رمز جديد (تجريبي: 123456)", "info");
  };

  return (
    <ScreenShell>
      <TopMiniHeader onBack={onBack} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px", boxSizing: "border-box" }}>
        <h1 style={{ fontSize: 19, fontWeight: 800, color: COLORS.primary, margin: "18px 0 6px", textAlign: "center" }}>
          رمز التحقق
        </h1>
        <p style={{ fontSize: 13.5, color: COLORS.textSecondary, textAlign: "center", margin: "0 0 28px" }}>
          أرسلنا رمز التحقق إلى{" "}
          <span style={{ color: COLORS.textPrimary, fontWeight: 700, direction: "ltr", display: "inline-block" }}>
            {phone}
          </span>
        </p>

        <OTPInputRow
          length={6}
          value={code}
          onChange={(v) => {
            setCode(v);
            setError(false);
          }}
          error={error}
        />

        {error && <InlineErrorState message="الرمز غير صحيح، حاول مرة أخرى (تجريبي: 123456)" />}

        <div style={{ textAlign: "center", marginTop: 22 }}>
          {seconds > 0 ? (
            <span style={{ fontSize: 13, color: COLORS.textSecondary }}>إعادة الإرسال بعد {seconds} ثانية</span>
          ) : (
            <TextButton onClick={handleResend}>إعادة إرسال الرمز</TextButton>
          )}
        </div>

        <div style={{ marginTop: "auto", paddingTop: 24 }}>
          <PrimaryButton
            onClick={() => handleVerify(code)}
            disabled={code.length !== 6}
            loading={status === "loading"}
          >
            تأكيد
          </PrimaryButton>
        </div>
      </div>
    </ScreenShell>
  );
}

/* ============================================================================
   ## 11. Create Profile Screen
   ============================================================================ */

function CreateProfileScreen({ onSaved }: { onSaved: (profile: UserProfile) => void }) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ fullName?: string; username?: string; email?: string }>({});
  const toast = useToast();

  const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (fullName.trim().length < 3) {
      e.fullName = "الاسم الكامل يجب ألا يقل عن 3 أحرف";
    }
    const cleanUsername = username.trim();
    if (cleanUsername.length < 3) {
      e.username = "اسم المستخدم يجب ألا يقل عن 3 أحرف";
    } else if (!USERNAME_PATTERN.test(cleanUsername)) {
      e.username = "اسم المستخدم يجب أن يحتوي على أحرف وأرقام و . _ فقط";
    }
    if (email.trim() && !EMAIL_PATTERN.test(email.trim())) {
      e.email = "صيغة البريد الإلكتروني غير صحيحة";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      toast.show("يرجى تصحيح الحقول المميزة", "error");
      return;
    }
    onSaved({
      fullName: fullName.trim(),
      username: username.trim(),
      email: email.trim() || undefined,
    });
    toast.show("تم حفظ الملف الشخصي بنجاح");
  };

  return (
    <ScreenShell>
      <TopMiniHeader title="إنشاء الملف الشخصي" />
      <div style={{ flex: 1, padding: "10px 24px 24px", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "center", margin: "12px 0 22px" }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: "50%",
              background: COLORS.background,
              border: `2px dashed ${COLORS.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              color: COLORS.textSecondary,
            }}
            title="صورة شخصية اختيارية"
          >
            👤
          </div>
        </div>

        <ProfileField
          label="الاسم الكامل *"
          value={fullName}
          onChange={setFullName}
          placeholder="مثال: أحمد محمد"
          error={errors.fullName}
        />
        <ProfileField
          label="اسم المستخدم *"
          value={username}
          onChange={setUsername}
          placeholder="username"
          error={errors.username}
          dir="ltr"
        />
        <ProfileField
          label="البريد الإلكتروني (اختياري)"
          value={email}
          onChange={setEmail}
          placeholder="example@mail.com"
          error={errors.email}
          dir="ltr"
        />

        <div style={{ marginTop: "auto", paddingTop: 12 }}>
          <PrimaryButton onClick={handleSave}>حفظ ومتابعة</PrimaryButton>
        </div>
      </div>
    </ScreenShell>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  placeholder,
  error,
  dir,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: COLORS.textPrimary, display: "block", marginBottom: 7 }}>
        {label}
      </label>
      <input
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "13px 14px",
          borderRadius: RADIUS.md,
          border: `1.5px solid ${error ? COLORS.error : COLORS.border}`,
          fontFamily: FONT_FAMILY,
          fontSize: 14.5,
          color: COLORS.textPrimary,
          background: COLORS.card,
          outline: "none",
          textAlign: dir === "ltr" ? "left" : "right",
        }}
      />
      {error && <span style={{ color: COLORS.error, fontSize: 12, marginTop: 4, display: "block" }}>{error}</span>}
    </div>
  );
}

/* ============================================================================
   ## 12. City Selection Screen
   ============================================================================ */

function SelectCityScreen({ onSelect }: { onSelect: (city: CityName) => void }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CityName | null>(null);

  const filtered = YEMEN_CITIES.filter((c) => c.includes(query.trim()));

  return (
    <ScreenShell>
      <TopMiniHeader title="اختر مدينتك" />
      <div style={{ padding: "6px 20px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: `1.5px solid ${COLORS.border}`,
            borderRadius: RADIUS.md,
            padding: "11px 14px",
            background: COLORS.card,
          }}
        >
          <span style={{ color: COLORS.textSecondary }}>🔍</span>
          <input
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder="ابحث عن مدينتك أو محافظتك"
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              fontFamily: FONT_FAMILY,
              fontSize: 14,
              background: "transparent",
              color: COLORS.textPrimary,
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 0", minHeight: 0 }}>
        {filtered.length === 0 ? (
          <EmptyState message="لا توجد نتائج مطابقة لبحثك" />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {filtered.map((city) => {
              const active = selected === city;
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => setSelected(city)}
                  style={{
                    padding: "13px 10px",
                    borderRadius: RADIUS.sm,
                    border: `1.5px solid ${active ? COLORS.accent : COLORS.border}`,
                    background: active ? COLORS.accent + "17" : COLORS.card,
                    color: active ? COLORS.primary : COLORS.textPrimary,
                    fontFamily: FONT_FAMILY,
                    fontWeight: active ? 700 : 500,
                    fontSize: 14,
                    cursor: "pointer",
                    transition: "all .15s ease",
                  }}
                >
                  {city}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ padding: "16px 20px 26px" }}>
        <PrimaryButton disabled={!selected} onClick={() => selected && onSelect(selected)}>
          {selected ? `متابعة إلى ${selected}` : "اختر مدينة للمتابعة"}
        </PrimaryButton>
      </div>
    </ScreenShell>
  );
}

/* ============================================================================
   ## 13. Home Screen (مؤقتة للمرحلة الأولى)
   ============================================================================ */

function HomeScreenStage1({
  profile,
  city,
  onLogout,
}: {
  profile: UserProfile;
  city: CityName;
  onLogout: () => void;
}) {
  return (
    <ScreenShell withPattern>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          gap: 16,
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        <YSLogo size={72} />
        <h1 style={{ fontSize: 19, fontWeight: 800, color: COLORS.primary, margin: 0 }}>
          أهلاً بك، {profile.fullName} 👋
        </h1>
        <p style={{ color: COLORS.textSecondary, fontSize: 13.5, margin: 0 }}>
          المدينة المختارة: <b style={{ color: COLORS.accent }}>{city}</b>
        </p>
        <p style={{ color: COLORS.textSecondary, fontSize: 13, margin: "8px 0 0", lineHeight: 1.8, maxWidth: 300 }}>
          تم تجهيز المرحلة الأولى بنجاح، وسيتم بناء الصفحة الرئيسية الكاملة في المرحلة الثانية.
        </p>
        <div style={{ width: "100%", maxWidth: 260, marginTop: 10 }}>
          <PrimaryButton variant="outline" onClick={onLogout}>
            تسجيل الخروج
          </PrimaryButton>
        </div>
      </div>
    </ScreenShell>
  );
}

/* ============================================================================
   ## 14. Main App
   ============================================================================ */

export default function App() {
  const [screen, setScreen] = useState<ScreenName>("SPLASH");
  const [splashReady, setSplashReady] = useState(false);
  const [pendingPhone, setPendingPhone] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(() => StorageService.get<UserProfile>(STORAGE_KEYS.USER_PROFILE, null));
  const [city, setCity] = useState<CityName | null>(() => StorageService.get<CityName>(STORAGE_KEYS.SELECTED_CITY, null));

  // منطق شاشة البداية: مدة قصيرة ثابتة، ثم توجيه بحسب حالة التخزين المحلي
  useEffect(() => {
    const t = setTimeout(() => setSplashReady(true), SPLASH_MIN_DURATION_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!splashReady) return;
    const { screen: nextScreen } = resolveInitialScreen();
    setScreen(nextScreen);
    StorageService.set(STORAGE_KEYS.LAST_SCREEN, nextScreen);
  }, [splashReady]);

  const navigateTo = (next: ScreenName) => {
    setScreen(next);
    StorageService.set(STORAGE_KEYS.LAST_SCREEN, next);
  };

  const handleOnboardingComplete = () => {
    StorageService.set(STORAGE_KEYS.ONBOARDING_COMPLETED, true);
    navigateTo("LOGIN");
  };

  const handlePhoneSubmit = (fullPhone: string) => {
    setPendingPhone(fullPhone);
    navigateTo("OTP");
  };

  const handleOTPVerified = () => {
    const session: AuthSession = { phone: pendingPhone, createdAt: Date.now() };
    StorageService.set(STORAGE_KEYS.AUTH_SESSION, session);

    const savedProfile = StorageService.get<UserProfile>(STORAGE_KEYS.USER_PROFILE, null);
    const savedCity = StorageService.get<CityName>(STORAGE_KEYS.SELECTED_CITY, null);

    if (!savedProfile) {
      navigateTo("CREATE_PROFILE");
    } else if (!savedCity) {
      setProfile(savedProfile);
      navigateTo("SELECT_CITY");
    } else {
      setProfile(savedProfile);
      setCity(savedCity);
      navigateTo("HOME");
    }
  };

  const handleProfileSaved = (newProfile: UserProfile) => {
    StorageService.set(STORAGE_KEYS.USER_PROFILE, newProfile);
    setProfile(newProfile);
    const savedCity = StorageService.get<CityName>(STORAGE_KEYS.SELECTED_CITY, null);
    if (savedCity) {
      setCity(savedCity);
      navigateTo("HOME");
    } else {
      navigateTo("SELECT_CITY");
    }
  };

  const handleCitySelected = (selectedCity: CityName) => {
    StorageService.set(STORAGE_KEYS.SELECTED_CITY, selectedCity);
    setCity(selectedCity);
    navigateTo("HOME");
  };

  const handleLogout = () => {
    // حذف جلسة الدخول فقط — الملف الشخصي والمدينة يبقيان محفوظين
    StorageService.remove(STORAGE_KEYS.AUTH_SESSION);
    setPendingPhone("");
    navigateTo("LOGIN");
  };

  let content: React.ReactNode = null;

  switch (screen) {
    case "SPLASH":
      content = <SplashScreen />;
      break;
    case "ONBOARDING":
      content = <OnboardingScreen onComplete={handleOnboardingComplete} />;
      break;
    case "LOGIN":
      content = <LoginScreen onSubmitPhone={handlePhoneSubmit} />;
      break;
    case "OTP":
      content = <OTPScreen phone={pendingPhone} onVerified={handleOTPVerified} onBack={() => navigateTo("LOGIN")} />;
      break;
    case "CREATE_PROFILE":
      content = <CreateProfileScreen onSaved={handleProfileSaved} />;
      break;
    case "SELECT_CITY":
      content = <SelectCityScreen onSelect={handleCitySelected} />;
      break;
    case "HOME":
      content =
        profile && city ? (
          <HomeScreenStage1 profile={profile} city={city} onLogout={handleLogout} />
        ) : (
          <InlineErrorState message="تعذر تحميل بيانات الحساب" onRetry={() => navigateTo("LOGIN")} />
        );
      break;
    default:
      content = null;
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
