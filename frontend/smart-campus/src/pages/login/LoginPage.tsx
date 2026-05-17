import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, AtSign, Eye, EyeOff, GraduationCap, Lock, Sparkles, User as UserIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { FieldError, Input, Label } from "@/shared/ui/input";
import { Wordmark } from "@/shared/ui/wordmark";
import { authApi } from "@/shared/api/modules";
import { useAuth } from "@/features/auth/store";
import { extractError } from "@/shared/api/client";
import type { User } from "@/shared/api/types";

const emailSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Пароль обязателен"),
});

const isuSchema = z.object({
  username: z.string().min(1, "Введите логин ИСУ"),
  password: z.string().min(1, "Пароль обязателен"),
});

type EmailFormData = z.infer<typeof emailSchema>;
type ISUFormData = z.infer<typeof isuSchema>;

type LoginTab = "email" | "isu";

const ISU_REMEMBER_KEY = "sc.isu_remember";
const ISU_USERNAME_KEY = "sc.isu_username";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [tab, setTab] = useState<LoginTab>("email");
  const [rememberIsu, setRememberIsu] = useState(() => localStorage.getItem(ISU_REMEMBER_KEY) === "1");

  const emailForm = useForm<EmailFormData>({ resolver: zodResolver(emailSchema) });
  const isuForm = useForm<ISUFormData>({
    resolver: zodResolver(isuSchema),
    defaultValues: {
      username: rememberIsu ? (localStorage.getItem(ISU_USERNAME_KEY) ?? "") : "",
      password: "",
    },
  });

  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? "/dashboard";

  const handleSuccess = (data: { user: User; token: string }) => {
    setAuth(data.user, data.token);
    toast.success(`Добро пожаловать, ${data.user.fullName.split(" ")[1] ?? data.user.fullName}`);
    navigate(redirectTo, { replace: true });
  };

  const handleIsuSubmit = (d: ISUFormData) => {
    if (rememberIsu) {
      localStorage.setItem(ISU_REMEMBER_KEY, "1");
      localStorage.setItem(ISU_USERNAME_KEY, d.username);
    } else {
      localStorage.removeItem(ISU_REMEMBER_KEY);
      localStorage.removeItem(ISU_USERNAME_KEY);
    }
    isuLogin.mutate(d);
  };

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: handleSuccess,
    onError: (e: unknown) => toast.error(extractError(e)),
  });

  const isuLogin = useMutation({
    mutationFn: authApi.isuLogin,
    onSuccess: handleSuccess,
    onError: (e: unknown) => toast.error(extractError(e)),
  });

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-surface">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-navy via-[#1c2540] to-navy-950 text-white overflow-hidden">
        <div className="absolute inset-0 hero-lines opacity-50" />
        <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-burgundy/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-[480px] w-[480px] rounded-full bg-accent-red/20 blur-3xl" />

        <div className="relative z-10">
          <Wordmark variant="dark" size="lg" />
        </div>

        <div className="relative z-10 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5 text-burgundy" />
            Единая цифровая среда университета
          </div>
          <h1 className="font-display text-5xl leading-[1.05] mb-6">
            Цифровой кампус{" "}
            <span className="text-burgundy">для всех</span>, кто учит и учится.
          </h1>
          <p className="text-white/70 text-base leading-relaxed">
            Расписание, аудитории, навигация, библиотека и AI-консультант —
            всё, что нужно студенту, преподавателю и абитуриенту ГГНТУ,
            собрано в одном месте.
          </p>

          <div className="grid grid-cols-3 gap-3 mt-10">
            {[
              { v: "8", l: "корпусов" },
              { v: "240+", l: "аудиторий" },
              { v: "AI", l: "ассистент 24/7" },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="font-display text-2xl">{s.v}</div>
                <div className="text-[11px] uppercase tracking-wider text-white/50 mt-1">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} Грозненский государственный нефтяной технический университет имени академика М.Д. Миллионщикова
        </div>
      </div>

      {/* Right form */}
      <div className="flex flex-col justify-center px-6 md:px-12 py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md mx-auto"
        >
          <div className="lg:hidden mb-8">
            <Wordmark variant="light" size="md" />
          </div>

          <div className="mb-8">
            <div className="text-[11px] uppercase tracking-[0.18em] text-burgundy font-semibold mb-3">
              Вход в систему
            </div>
            <h2 className="font-display text-4xl text-navy">С возвращением</h2>
            <p className="text-muted text-sm mt-2">
              Войдите, чтобы продолжить работу в SmartCampus.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-xl bg-surface-alt p-1 mb-6 border border-border">
            <button
              type="button"
              onClick={() => setTab("email")}
              className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-all ${
                tab === "email"
                  ? "bg-white text-navy shadow-sm"
                  : "text-muted hover:text-navy"
              }`}
            >
              <AtSign className="h-4 w-4" />
              Email
            </button>
            <button
              type="button"
              onClick={() => setTab("isu")}
              className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-all ${
                tab === "isu"
                  ? "bg-white text-navy shadow-sm"
                  : "text-muted hover:text-navy"
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              ИСУ ГГНТУ
            </button>
          </div>

          {tab === "email" && (
            <form
              onSubmit={emailForm.handleSubmit((d) => login.mutate(d))}
              className="space-y-4"
              noValidate
            >
              <div>
                <Label required>Email</Label>
                <Input
                  type="email"
                  placeholder="anna@gstou.ru"
                  leftIcon={<AtSign className="h-4 w-4" />}
                  invalid={!!emailForm.formState.errors.email}
                  {...emailForm.register("email")}
                />
                <FieldError message={emailForm.formState.errors.email?.message} />
              </div>
              <div>
                <Label required>Пароль</Label>
                <Input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  leftIcon={<Lock className="h-4 w-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="hover:text-navy"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                  invalid={!!emailForm.formState.errors.password}
                  {...emailForm.register("password")}
                />
                <FieldError message={emailForm.formState.errors.password?.message} />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full mt-2"
                loading={login.isPending}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Войти
              </Button>
            </form>
          )}

          {tab === "isu" && (
            <form
              onSubmit={isuForm.handleSubmit(handleIsuSubmit)}
              className="space-y-4"
              noValidate
            >
              <div className="rounded-xl bg-burgundy/5 border border-burgundy/15 p-3 mb-2">
                <p className="text-xs text-burgundy/80">
                  Войдите с помощью учётных данных ИСУ ГГНТУ (isu.gstou.ru).
                  После входа вам будет доступна БРС и другие сервисы.
                </p>
              </div>
              <div>
                <Label required>Логин ИСУ</Label>
                <Input
                  type="text"
                  placeholder="Логин ИСУ"
                  leftIcon={<UserIcon className="h-4 w-4" />}
                  invalid={!!isuForm.formState.errors.username}
                  {...isuForm.register("username")}
                />
                <FieldError message={isuForm.formState.errors.username?.message} />
              </div>
              <div>
                <Label required>Пароль ИСУ</Label>
                <Input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  leftIcon={<Lock className="h-4 w-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="hover:text-navy"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                  invalid={!!isuForm.formState.errors.password}
                  {...isuForm.register("password")}
                />
                <FieldError message={isuForm.formState.errors.password?.message} />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberIsu}
                  onChange={(e) => setRememberIsu(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-burgundy focus:ring-burgundy/30 accent-burgundy"
                />
                <span className="text-sm text-muted">Запомнить меня</span>
              </label>

              <Button
                type="submit"
                size="lg"
                className="w-full mt-2"
                loading={isuLogin.isPending}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Войти через ИСУ
              </Button>
            </form>
          )}

          <p className="text-sm text-muted mt-6 text-center">
            Ещё нет аккаунта?{" "}
            <Link to="/register" className="text-burgundy font-semibold hover:underline">
              Зарегистрироваться
            </Link>
          </p>

          <div className="mt-10 pt-6 border-t border-border">
            <p className="text-xs text-muted text-center">
              Абитуриент?{" "}
              <Link to="/applicant-faq" className="text-navy font-medium hover:underline">
                Открыть FAQ без регистрации
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
