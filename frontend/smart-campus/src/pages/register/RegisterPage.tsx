import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, AtSign, Lock, User as UserIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { FieldError, Input, Label, Select } from "@/shared/ui/input";
import { Wordmark } from "@/shared/ui/wordmark";
import { authApi } from "@/shared/api/modules";
import { useAuth } from "@/features/auth/store";
import { extractError } from "@/shared/api/client";
import type { Role } from "@/shared/api/types";

const schema = z
  .object({
    fullName: z.string().min(2, "Минимум 2 символа").max(255),
    email: z.string().email("Введите корректный email"),
    password: z.string().min(8, "Минимум 8 символов"),
    role: z.enum(["student", "teacher", "applicant", "librarian"]),
    groupName: z.string().optional(),
    department: z.string().optional(),
  })
  .refine(
    (v) => (v.role === "student" ? !!v.groupName?.trim() : true),
    { message: "Укажите группу", path: ["groupName"] },
  );

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "student" },
  });
  const role = form.watch("role");

  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      toast.success("Аккаунт создан");
      navigate("/dashboard", { replace: true });
    },
    onError: (e) => toast.error(extractError(e)),
  });

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-surface">
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-burgundy via-burgundy-dark to-[#5C0F1F] text-white overflow-hidden">
        <div className="absolute inset-0 hero-lines opacity-50" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <Wordmark variant="dark" size="lg" />
        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-5xl leading-[1.05] mb-6">
            Присоединяйтесь к цифровому кампусу.
          </h1>
          <p className="text-white/80">
            Регистрация занимает меньше минуты. После создания аккаунта вам
            станут доступны расписание, навигация, бронирования, посещаемость
            и персональный AI-ассистент.
          </p>
        </div>
        <div className="text-xs text-white/50">
          © {new Date().getFullYear()} ГГНТУ
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 md:px-12 py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md mx-auto"
        >
          <div className="lg:hidden mb-8">
            <Wordmark size="md" />
          </div>

          <div className="mb-8">
            <div className="text-[11px] uppercase tracking-[0.18em] text-burgundy font-semibold mb-3">
              Регистрация
            </div>
            <h2 className="font-display text-4xl text-navy">Создать аккаунт</h2>
            <p className="text-muted text-sm mt-2">
              Начните работу в SmartCampus за пару шагов.
            </p>
          </div>

          <form
            onSubmit={form.handleSubmit((d) =>
              register.mutate({ ...d, role: d.role as Role }),
            )}
            className="space-y-4"
            noValidate
          >
            <div>
              <Label required>ФИО</Label>
              <Input
                placeholder="Иванов Иван Иванович"
                leftIcon={<UserIcon className="h-4 w-4" />}
                invalid={!!form.formState.errors.fullName}
                {...form.register("fullName")}
              />
              <FieldError message={form.formState.errors.fullName?.message} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required>Email</Label>
                <Input
                  type="email"
                  placeholder="email@gstou.ru"
                  leftIcon={<AtSign className="h-4 w-4" />}
                  invalid={!!form.formState.errors.email}
                  {...form.register("email")}
                />
                <FieldError message={form.formState.errors.email?.message} />
              </div>
              <div>
                <Label required>Пароль</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  leftIcon={<Lock className="h-4 w-4" />}
                  invalid={!!form.formState.errors.password}
                  {...form.register("password")}
                />
                <FieldError message={form.formState.errors.password?.message} />
              </div>
            </div>
            <div>
              <Label required>Роль</Label>
              <Select {...form.register("role")}>
                <option value="student">Студент</option>
                <option value="teacher">Преподаватель</option>
                <option value="applicant">Абитуриент</option>
                <option value="librarian">Библиотекарь</option>
              </Select>
            </div>
            {role === "student" && (
              <div>
                <Label required>Группа</Label>
                <Input
                  placeholder="ИСТ-25-2"
                  invalid={!!form.formState.errors.groupName}
                  {...form.register("groupName")}
                />
                <FieldError message={form.formState.errors.groupName?.message} />
              </div>
            )}
            {(role === "teacher" || role === "librarian") && (
              <div>
                <Label>Подразделение</Label>
                <Input
                  placeholder="Институт прикладных информационных технологий"
                  {...form.register("department")}
                />
              </div>
            )}

            <label className="flex items-start gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm text-muted">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border accent-burgundy"
              />
              <span>Я даю согласие на обработку персональных данных</span>
            </label>

            <Button
              type="submit"
              size="lg"
              className="w-full mt-2"
              loading={register.isPending}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Создать аккаунт
            </Button>
          </form>

          <p className="text-sm text-muted mt-6 text-center">
            Уже есть аккаунт?{" "}
            <Link to="/login" className="text-burgundy font-semibold hover:underline">
              Войти
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
