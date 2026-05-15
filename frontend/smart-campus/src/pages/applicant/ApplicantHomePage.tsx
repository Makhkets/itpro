import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  GraduationCap,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/features/auth/store";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";

export default function ApplicantHomePage() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Абитуриент"
        title={`Здравствуйте, ${user?.fullName.split(" ")[1] ?? user?.fullName}`}
        subtitle="Цифровой проводник в ГГНТУ — поможем разобраться с поступлением."
      />

      <div className="relative overflow-hidden rounded-3xl p-8 md:p-10 bg-gradient-to-br from-navy via-[#1f2a47] to-navy-950 text-white">
        <div className="absolute inset-0 hero-lines opacity-60" />
        <div className="absolute -top-32 -right-24 h-80 w-80 rounded-full bg-burgundy/30 blur-3xl" />
        <div className="relative max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-medium mb-4">
            <Sparkles className="h-3.5 w-3.5 text-burgundy" />
            Приёмная кампания 2026
          </div>
          <h2 className="font-display text-4xl md:text-5xl leading-[1.05]">
            Поступление в ГГНТУ — <span className="text-burgundy">проще</span>,
            чем кажется.
          </h2>
          <p className="text-white/70 mt-4">
            Изучите направления, проходные баллы, документы и общежитие.
            Сложный вопрос — спросите AI-консультант.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/applicant-faq">
              <Button leftIcon={<HelpCircle className="h-4 w-4" />}>FAQ</Button>
            </Link>
            <Link to="/ai">
              <Button variant="outline" leftIcon={<Bot className="h-4 w-4" />}>
                AI-консультант
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          {
            title: "Институты и направления",
            desc: "Девять институтов, более 60 направлений подготовки.",
            to: "/applicant-faq",
          },
          {
            title: "Документы и сроки",
            desc: "Что и когда подавать в приёмную комиссию.",
            to: "/applicant-faq",
          },
          {
            title: "Жизнь в кампусе",
            desc: "Общежитие, стипендии, активности и сообщества.",
            to: "/applicant-faq",
          },
        ].map((c) => (
          <Card key={c.title} className="p-6 hover:-translate-y-0.5 hover:shadow-card-hover transition-all">
            <div className="h-10 w-10 rounded-xl bg-burgundy-light text-burgundy flex items-center justify-center mb-4">
              <GraduationCap className="h-5 w-5" />
            </div>
            <h3 className="font-display text-xl text-navy">{c.title}</h3>
            <p className="text-sm text-muted mt-2">{c.desc}</p>
            <Link
              to={c.to}
              className="text-sm text-burgundy font-medium hover:underline inline-flex items-center gap-1 mt-4"
            >
              Узнать больше <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
