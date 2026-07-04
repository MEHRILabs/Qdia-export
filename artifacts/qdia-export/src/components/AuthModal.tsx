import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";
import { getStoredUser } from "@/lib/api-auth";
import { isAdmin } from "@/lib/roles";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import type { GoogleCredential } from "@/lib/google-auth";
import {
  Mail, Phone, Loader2, ArrowLeft, ShieldCheck,
} from "lucide-react";

type AuthMethod = "email" | "google" | "phone";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className ?? "h-4 w-4"} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export function AuthModal({ open, onOpenChange, onSuccess }: Props) {
  const { loginEmail, registerEmail, loginGoogleCredential, loginPhone, sendPhoneCode } = useAuth();
  const { tr } = useI18n();
  const { toast } = useToast();

  const METHODS: { id: AuthMethod; label: string; icon: React.ReactNode }[] = [
    { id: "email", label: tr("auth.tab_email"), icon: <Mail className="h-3.5 w-3.5" /> },
    { id: "google", label: tr("auth.tab_gmail"), icon: <GoogleIcon /> },
    { id: "phone", label: tr("auth.phone"), icon: <Phone className="h-3.5 w-3.5" /> },
  ];
  const [method, setMethod] = useState<AuthMethod>("email");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [phoneStep, setPhoneStep] = useState<"number" | "code">("number");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  const reset = () => {
    setPhoneStep("number");
    setCode("");
    setLoading(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const finishAuth = () => {
    handleClose(false);
    onSuccess?.();
  };

  const onEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        await registerEmail(email, password);
        toast({ title: tr("auth_page.account_created"), description: tr("auth_page.exporter_space_ready") });
      } else {
        await loginEmail(email, password);
        const logged = getStoredUser();
        const desc = isAdmin(logged)
          ? tr("auth_page.welcome_admin")
          : tr("auth_page.welcome_exporter");
        toast({ title: tr("auth_page.login_success"), description: desc });
      }
      finishAuth();
    } catch (err) {
      toast({ title: tr("common.error"), description: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onGoogleCredential = async (cred: GoogleCredential) => {
    setLoading(true);
    try {
      await loginGoogleCredential(cred);
      toast({ title: tr("auth_page.google_connected"), description: tr("auth_page.google_linked") });
      finishAuth();
    } catch (err) {
      const msg = String(err instanceof Error ? err.message : err);
      toast({ title: tr("auth_page.google_error"), description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onSendCode = async () => {
    if (phone.length < 9) {
      toast({ title: tr("auth_page.invalid_phone"), description: tr("auth_page.invalid_phone_desc"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await sendPhoneCode(phone);
      setPhoneStep("code");
      toast({ title: tr("auth_page.code_sent_title"), description: tr("auth_page.code_sent_desc") });
    } finally {
      setLoading(false);
    }
  };

  const onPhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginPhone(phone, code);
      toast({ title: tr("auth_page.login_success"), description: `${tr("auth_page.welcome")} ${phone}` });
      finishAuth();
    } catch (err) {
      toast({ title: tr("common.error"), description: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden border-[#0461A5]/20">
        <div className="bg-gradient-to-br from-[#073B74] to-[#0461A5] px-6 py-5 text-white">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#F5C518]" />
              {tr("auth_page.modal_title")}
            </DialogTitle>
            <DialogDescription className="text-white/70 text-xs">
              {tr("auth_page.modal_desc")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-4 pt-4 pb-2">
          <div className="flex gap-1 bg-[#F0F4FF] rounded-xl p-1">
            {METHODS.map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => { setMethod(id); reset(); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  method === id
                    ? "bg-white text-[#0461A5] shadow-sm"
                    : "text-[#656566] hover:text-[#0461A5]"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6 min-h-[220px]">
          <AnimatePresence mode="wait">
            {method === "email" && (
              <motion.form
                key="email"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                onSubmit={onEmailSubmit}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="auth-email" className="text-xs font-semibold text-[#334257]">{tr("auth.email")}</Label>
                  <Input
                    id="auth-email"
                    type="email"
                    placeholder="vous@entreprise.dz"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="h-10"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="auth-password" className="text-xs font-semibold text-[#334257]">{tr("auth.password")}</Label>
                  <Input
                    id="auth-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-10"
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-10 font-bold bg-[#0461A5] hover:bg-[#073B74]" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "register" ? tr("auth_page.register_btn") : tr("auth.login")}
                </Button>
                <p className="text-[11px] text-center text-[#9CA3AF]">
                  {mode === "login" ? (
                    <>{tr("auth_page.no_account")} <button type="button" className="text-[#0461A5] font-semibold hover:underline" onClick={() => setMode("register")}>{tr("auth_page.register_exporter")}</button></>
                  ) : (
                    <>{tr("auth_page.has_account")} <button type="button" className="text-[#0461A5] font-semibold hover:underline" onClick={() => setMode("login")}>{tr("auth.login")}</button></>
                  )}
                </p>
                <p className="text-[10px] text-center text-[#9CA3AF] leading-relaxed">
                  {mode === "register" ? tr("auth_page.exporter_only_hint") : tr("auth_page.login_role_hint")}
                </p>
              </motion.form>
            )}

            {method === "google" && (
              <motion.div
                key="google"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-5 py-2"
              >
                <div className="text-center space-y-2">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center shadow-sm">
                    <svg className="h-8 w-8" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  </div>
                  <p className="text-sm font-semibold text-[#1A1A2E]">{tr("auth.google")}</p>
                  <p className="text-xs text-[#9CA3AF] leading-relaxed px-4">
                    {tr("auth_page.google_desc")}
                  </p>
                </div>
                {loading ? (
                  <div className="flex justify-center py-2"><Loader2 className="h-5 w-5 animate-spin text-[#0461A5]" /></div>
                ) : (
                  <GoogleSignInButton
                    onCredential={onGoogleCredential}
                    onError={msg => {
                      toast({ title: tr("auth_page.google_error"), description: msg, variant: "destructive" });
                    }}
                  />
                )}
              </motion.div>
            )}

            {method === "phone" && (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
              >
                {phoneStep === "number" ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[#334257]">{tr("auth_page.phone_number")}</Label>
                      <div className="flex gap-2">
                        <div className="h-10 px-3 flex items-center bg-[#F0F4FF] border border-[#E5E7EB] rounded-md text-sm font-semibold text-[#0461A5] shrink-0">
                          🇩🇿 +213
                        </div>
                        <Input
                          type="tel"
                          placeholder="5 55 12 34 56"
                          value={phone}
                          onChange={e => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                          className="h-10"
                        />
                      </div>
                    </div>
                    <Button type="button" className="w-full h-10 font-bold bg-[#0461A5]" onClick={onSendCode} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : tr("auth_page.receive_sms")}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={onPhoneSubmit} className="space-y-4">
                    <button type="button" onClick={() => setPhoneStep("number")}
                      className="flex items-center gap-1 text-xs text-[#0461A5] font-semibold hover:underline">
                      <ArrowLeft className="h-3 w-3" /> {tr("auth_page.edit_number")}
                    </button>
                    <p className="text-xs text-[#656566]">{tr("auth_page.code_sent")} <strong>+213 {phone}</strong></p>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[#334257]">{tr("auth_page.verification_code")}</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="1234"
                        maxLength={6}
                        value={code}
                        onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                        className="h-10 text-center text-lg tracking-[0.3em] font-bold"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full h-10 font-bold bg-[#0461A5]" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : tr("auth_page.verify_login")}
                    </Button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
