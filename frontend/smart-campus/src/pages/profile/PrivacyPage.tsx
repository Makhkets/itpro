import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, ShieldCheck, Trash2 } from "lucide-react";
import { privacyApi, usersApi } from "@/shared/api/modules";
import { useAuth } from "@/features/auth/store";
import { tokenStorage } from "@/shared/api/client";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { LoadingState } from "@/shared/ui/states";
import { extractError } from "@/shared/api/client";

export default function PrivacyPage() {
  const qc = useQueryClient();
  const { setUser } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["privacy", "me"],
    queryFn: () => privacyApi.me(),
  });

  const setConsent = useMutation({
    mutationFn: (v: boolean) => usersApi.setConsent(v),
    onSuccess: (res) => {
      if (res.token) tokenStorage.set(res.token);
      setUser(res);
      qc.invalidateQueries({ queryKey: ["privacy", "me"] });
      toast.success("Согласие обновлено");
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const exp = useMutation({
    mutationFn: privacyApi.export,
    onSuccess: () => toast.success("Запрос на экспорт отправлен"),
    onError: (e) => toast.error(extractError(e)),
  });
  const del = useMutation({
    mutationFn: privacyApi.deleteRequest,
    onSuccess: () => toast.success("Запрос на удаление принят"),
    onError: (e) => toast.error(extractError(e)),
  });

  if (isLoading) return <LoadingState rows={5} />;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        eyebrow="Приватность"
        title="Управление данными"
        subtitle="Прозрачно. Управляемо. В любой момент можно отозвать согласие."
      />

      <Card className="p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 h-60 w-60 rounded-full bg-burgundy-light blur-3xl" />
        <div className="relative grid md:grid-cols-[auto_1fr] gap-6 items-center">
          <div className="h-16 w-16 rounded-2xl bg-burgundy text-white flex items-center justify-center">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <h2 className="font-display text-2xl text-navy">
              Согласие на обработку персональных данных
            </h2>
            <p className="text-sm text-muted mt-2 max-w-2xl">
              Без согласия не работают AI-ассистент и привязка Telegram — оба
              сервиса передают данные внешним поставщикам.
            </p>
            <div className="mt-4">
              {data?.user.personalDataConsent ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="success">Подтверждено</Badge>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setConsent.mutate(false)}
                    loading={setConsent.isPending}
                  >
                    Отозвать
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setConsent.mutate(true)}
                  loading={setConsent.isPending}
                >
                  Дать согласие
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-navy mb-3">
          Какие данные мы храним
        </h3>
        <div className="flex flex-wrap gap-2">
          {data?.storedPersonalData.map((d) => (
            <Badge variant="default" key={d}>
              {d}
            </Badge>
          ))}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Download className="h-5 w-5 text-burgundy" />
            <h3 className="font-semibold text-navy">Экспорт данных</h3>
          </div>
          <p className="text-sm text-muted mb-4">
            Запросите архив со всеми персональными данными в формате JSON.
          </p>
          <Button
            variant="secondary"
            onClick={() => exp.mutate()}
            loading={exp.isPending}
          >
            Экспортировать
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Trash2 className="h-5 w-5 text-accent-red" />
            <h3 className="font-semibold text-navy">Удаление аккаунта</h3>
          </div>
          <p className="text-sm text-muted mb-4">
            Заявка будет рассмотрена администратором в течение 30 дней.
          </p>
          <Button
            variant="destructive"
            onClick={() => del.mutate()}
            loading={del.isPending}
          >
            Запросить удаление
          </Button>
        </Card>
      </div>
    </div>
  );
}
