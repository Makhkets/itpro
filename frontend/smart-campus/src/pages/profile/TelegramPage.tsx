import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Send } from "lucide-react";
import { telegramApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { useAuth } from "@/features/auth/store";
import { extractError } from "@/shared/api/client";

export default function TelegramPage() {
  const { user } = useAuth();
  const start = useMutation({
    mutationFn: telegramApi.start,
    onError: (e) => toast.error(extractError(e)),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        eyebrow="Telegram"
        title="Подключение бота"
        subtitle="Уведомления о бронированиях, посещаемости и расписании в одном чате."
      />

      <Card className="p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-56 w-56 rounded-full bg-info/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-info text-white flex items-center justify-center">
            <Send className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl text-navy">
              {user?.isTelegramVerified ? "Telegram подключён" : "Подключить Telegram"}
            </h2>
            <p className="text-sm text-muted mt-1">
              {user?.isTelegramVerified
                ? `Вы получаете уведомления @${user.telegramUsername ?? "пользователь"}`
                : "Сгенерируйте код привязки и отправьте его боту SmartCampus."}
            </p>
          </div>
          {user?.isTelegramVerified ? (
            <Badge variant="success">подключён</Badge>
          ) : (
            <Button
              onClick={() => start.mutate()}
              loading={start.isPending}
              leftIcon={<Send className="h-4 w-4" />}
            >
              Получить код
            </Button>
          )}
        </div>
      </Card>

      {start.data && (
        <Card className="p-6">
          <h3 className="font-semibold text-navy mb-2">Ваш код</h3>
          <p className="text-sm text-muted mb-4">
            Откройте Telegram-бота и отправьте ему команду:
          </p>
          <div className="flex items-center gap-2 bg-navy text-white rounded-2xl p-4 font-mono">
            <span className="flex-1">{start.data.command}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(start.data!.command);
                toast.success("Скопировано");
              }}
              className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted mt-3">
            Код действителен {start.data.expiresIn}.
          </p>
        </Card>
      )}

      <Card className="p-6 bg-burgundy-light/40 border-burgundy/20">
        <h3 className="font-semibold text-navy mb-2">Что вы получите</h3>
        <ul className="text-sm text-navy-75 space-y-1.5 list-disc pl-5">
          <li>Уведомления об одобрении и отклонении бронирований</li>
          <li>Напоминания о парах и сроках возврата книг</li>
          <li>Возможность задавать вопросы AI-ассистенту прямо в Telegram</li>
        </ul>
      </Card>
    </div>
  );
}
