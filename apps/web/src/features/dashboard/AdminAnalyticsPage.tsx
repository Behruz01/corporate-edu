import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BookOpen,
  FileText,
  GraduationCap,
  MessageSquare,
  ShieldAlert,
  UsersRound,
  Workflow,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchAdminAnalyticsOverview,
  fetchKnowledgeRisk,
  fetchMostAsked,
  fetchSkillGap,
  fetchTeamOverview,
} from './dashboard-api';
import { PercentBar, ScoreBar, QueryState } from './components/DashboardPrimitives';

export function AdminAnalyticsPage(): JSX.Element {
  const overview = useQuery({ queryKey: ['admin', 'analytics', 'overview'], queryFn: fetchAdminAnalyticsOverview });
  const team = useQuery({ queryKey: ['admin', 'analytics', 'team'], queryFn: fetchTeamOverview });
  const skillGap = useQuery({ queryKey: ['admin', 'analytics', 'skill-gap'], queryFn: fetchSkillGap });
  const risk = useQuery({ queryKey: ['admin', 'analytics', 'risk'], queryFn: fetchKnowledgeRisk });
  const asked = useQuery({ queryKey: ['admin', 'analytics', 'most-asked'], queryFn: fetchMostAsked });

  const reports = team.data?.reports ?? [];
  const total = reports.length;
  const byStatus = {
    on_track: reports.filter((r) => r.statusColor === 'on_track').length,
    behind: reports.filter((r) => r.statusColor === 'behind').length,
    at_risk: reports.filter((r) => r.statusColor === 'at_risk').length,
  };
  const onboardingValues = reports.map((r) => r.onboardingPercent ?? 0);
  const avgOnboarding = total > 0 ? Math.round(onboardingValues.reduce((s, v) => s + v, 0) / total) : 0;
  const simValues = reports.map((r) => r.avgSimulatorScore ?? 0).filter((v) => v > 0);
  const avgSim = simValues.length > 0 ? Math.round(simValues.reduce((s, v) => s + v, 0) / simValues.length) : 0;

  const o = overview.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Platforma statistikasi</h1>
        <p className="text-sm text-muted-foreground">
          Butun tashkilot bo‘yicha o‘sish, ko‘nikma bo‘shliqlari va bilim risklari.
        </p>
      </div>

      {/* KPI overview */}
      <QueryState loading={overview.isLoading} error={overview.isError} empty={!o}>
        {o ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Kpi icon={<UsersRound className="h-5 w-5" />} label="Xodimlar" value={o.users} />
            <Kpi icon={<GraduationCap className="h-5 w-5" />} label="Onboarding yakunlandi" value={o.onboardingCompletionRate === null ? '—' : `${o.onboardingCompletionRate}%`} />
            <Kpi icon={<Workflow className="h-5 w-5" />} label="Simulyator sessiyalari" value={o.simulatorSessions} />
            <Kpi icon={<FileText className="h-5 w-5" />} label="Hujjatlar" value={o.documents} />
            <Kpi icon={<MessageSquare className="h-5 w-5" />} label="Savol-javoblar" value={o.messages} />
            <Kpi icon={<BookOpen className="h-5 w-5" />} label="Bilim yozuvlari" value={o.knowledgeNotes} />
          </div>
        ) : null}
      </QueryState>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Onboarding progress / team analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4 text-primary" /> Jamoa holati va o‘sish
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <QueryState loading={team.isLoading} error={team.isError} empty={total === 0}>
              <div className="grid grid-cols-3 gap-3">
                <StatTile label="Joyida" value={byStatus.on_track} tone="bg-[hsl(152_55%_36%/0.12)] text-[hsl(152_55%_28%)]" />
                <StatTile label="Ortga qolgan" value={byStatus.behind} tone="bg-[hsl(38_92%_50%/0.16)] text-[hsl(32_80%_34%)]" />
                <StatTile label="Riskda" value={byStatus.at_risk} tone="bg-destructive/12 text-destructive" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>O‘rtacha onboarding</span><span>{avgOnboarding}%</span>
                </div>
                <PercentBar value={avgOnboarding} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>O‘rtacha simulyator bali</span><span>{avgSim}</span>
                </div>
                <ScoreBar value={avgSim} />
              </div>
            </QueryState>
          </CardContent>
        </Card>

        {/* Skill gap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-warning" /> Ko‘nikma bo‘shlig‘i (tashkilot bo‘yicha)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <QueryState loading={skillGap.isLoading} error={skillGap.isError} empty={(skillGap.data?.categories.length ?? 0) === 0}>
              {(skillGap.data?.categories ?? []).map((cat) => (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{cat.category}{cat.isGap ? <span className="ml-2 rounded-full bg-destructive/12 px-2 py-0.5 text-[10px] text-destructive">bo‘shliq</span> : null}</span>
                    <span className="text-muted-foreground">{cat.avgScore}</span>
                  </div>
                  {cat.dimensions.map((d) => (
                    <div key={d.dimension} className="flex items-center gap-2 text-xs">
                      <span className="w-32 shrink-0 text-muted-foreground">{d.dimension}</span>
                      <div className="flex-1"><ScoreBar value={d.avgScore} /></div>
                      <span className="w-8 text-right text-muted-foreground">{d.avgScore}</span>
                    </div>
                  ))}
                </div>
              ))}
            </QueryState>
          </CardContent>
        </Card>

        {/* Knowledge risk */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-destructive" /> Bilim riski
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <QueryState loading={risk.isLoading} error={risk.isError} empty={!risk.data}>
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Ketayotgan, offboarding chala</div>
                {(risk.data?.departingWithIncompleteOffboarding ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Xavf yo‘q.</p>
                ) : (
                  (risk.data?.departingWithIncompleteOffboarding ?? []).map((u) => (
                    <div key={u.id} className="flex justify-between py-0.5">
                      <span>{u.fullName}</span>
                      <span className="text-xs text-destructive">{u.unansweredQuestions} javobsiz</span>
                    </div>
                  ))
                )}
              </div>
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Yuqori hissa qo‘shuvchilar</div>
                {(risk.data?.highContributionUsers ?? []).slice(0, 5).map((u) => (
                  <div key={u.id} className="flex justify-between py-0.5">
                    <span>{u.fullName}</span>
                    <span className="text-xs text-muted-foreground">{u.contributionCount} hissa</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Qaydsiz loyihalar</div>
                {(risk.data?.projectsWithNoNotes ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Barcha loyihalarda yozuv bor.</p>
                ) : (
                  (risk.data?.projectsWithNoNotes ?? []).map((p) => (
                    <div key={p.id} className="py-0.5">{p.name}</div>
                  ))
                )}
              </div>
            </QueryState>
          </CardContent>
        </Card>

        {/* Most asked */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-primary" /> Eng ko‘p so‘ralgan · {asked.data?.unansweredTotal ?? 0} javobsiz
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <QueryState loading={asked.isLoading} error={asked.isError} empty={(asked.data?.topQuestions.length ?? 0) === 0}>
              {(asked.data?.topQuestions ?? []).slice(0, 8).map((q) => (
                <div key={q.question} className="flex items-start justify-between gap-3 border-b border-border/60 pb-1.5 last:border-0">
                  <span className="leading-5">{q.question}</span>
                  <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                    {q.count}× {q.unansweredCount > 0 ? <span className="text-destructive">· {q.unansweredCount} javobsiz</span> : null}
                  </span>
                </div>
              ))}
            </QueryState>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }): JSX.Element {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <div>
          <div className="font-display text-2xl font-bold leading-none">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: string }): JSX.Element {
  return (
    <div className={`rounded-lg px-3 py-2.5 text-center ${tone}`}>
      <div className="font-display text-xl font-bold leading-none">{value}</div>
      <div className="mt-1 text-[11px] font-medium">{label}</div>
    </div>
  );
}
