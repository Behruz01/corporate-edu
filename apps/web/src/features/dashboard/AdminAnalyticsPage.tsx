import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BookOpen,
  FileText,
  GraduationCap,
  MessageSquare,
  ShieldAlert,
  TrendingUp,
  UsersRound,
  Workflow,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchActivityTrends,
  fetchAdminAnalyticsOverview,
  fetchKnowledgeRisk,
  fetchMostAsked,
  fetchSkillGap,
  fetchTeamOverview,
} from './dashboard-api';
import { ScoreBar, QueryState } from './components/DashboardPrimitives';
import { categoryLabel, dimensionLabel } from './dashboard-format';

const STATUS_COLORS = { on_track: 'hsl(152 55% 38%)', behind: 'hsl(38 92% 50%)', at_risk: 'hsl(0 72% 52%)' };
const TEAL = 'hsl(174 66% 28%)';
const AMBER = 'hsl(38 92% 50%)';
const SLATE = 'hsl(185 18% 50%)';

export function AdminAnalyticsPage(): JSX.Element {
  const overview = useQuery({ queryKey: ['admin', 'analytics', 'overview'], queryFn: fetchAdminAnalyticsOverview });
  const team = useQuery({ queryKey: ['admin', 'analytics', 'team'], queryFn: fetchTeamOverview });
  const trends = useQuery({ queryKey: ['admin', 'analytics', 'trends'], queryFn: fetchActivityTrends });
  const skillGap = useQuery({ queryKey: ['admin', 'analytics', 'skill-gap'], queryFn: fetchSkillGap });
  const risk = useQuery({ queryKey: ['admin', 'analytics', 'risk'], queryFn: fetchKnowledgeRisk });
  const asked = useQuery({ queryKey: ['admin', 'analytics', 'most-asked'], queryFn: fetchMostAsked });

  const reports = team.data?.reports ?? [];
  const total = reports.length;
  const statusData = [
    { name: 'Joyida', key: 'on_track', value: reports.filter((r) => r.statusColor === 'on_track').length },
    { name: 'Ortga qolgan', key: 'behind', value: reports.filter((r) => r.statusColor === 'behind').length },
    { name: 'Riskda', key: 'at_risk', value: reports.filter((r) => r.statusColor === 'at_risk').length },
  ];
  const o = overview.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Platforma statistikasi</h1>
        <p className="text-sm text-muted-foreground">
          Butun tashkilot bo‘yicha o‘sish, ko‘nikma bo‘shliqlari va bilim risklari.
        </p>
      </div>

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
        {/* Donut: team status distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4 text-primary" /> Jamoa holati taqsimoti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QueryState loading={team.isLoading} error={team.isError} empty={total === 0}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2} strokeWidth={0}>
                      {statusData.map((entry) => (
                        <Cell key={entry.key} fill={STATUS_COLORS[entry.key as keyof typeof STATUS_COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </QueryState>
          </CardContent>
        </Card>

        {/* Line/Area: weekly activity trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" /> Faollik tendensiyasi (8 hafta)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QueryState loading={trends.isLoading} error={trends.isError} empty={(trends.data?.length ?? 0) === 0}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends.data ?? []} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gTeal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={TEAL} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gAmber" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={AMBER} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(40 18% 88%)" vertical={false} />
                    <XAxis dataKey="week" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="simulator" name="Simulyator" stroke={TEAL} strokeWidth={2} fill="url(#gTeal)" />
                    <Area type="monotone" dataKey="questions" name="Savollar" stroke={AMBER} strokeWidth={2} fill="url(#gAmber)" />
                    <Area type="monotone" dataKey="notes" name="Yozuvlar" stroke={SLATE} strokeWidth={2} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
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
                    <span>
                      {categoryLabel(cat.category)}
                      {cat.isGap ? <span className="ml-2 rounded-full bg-destructive/12 px-2 py-0.5 text-[10px] text-destructive">bo‘shliq</span> : null}
                    </span>
                    <span className="text-muted-foreground">{cat.avgScore}</span>
                  </div>
                  {cat.dimensions.map((d) => (
                    <div key={d.dimension} className="flex items-center gap-2 text-xs">
                      <span className="w-32 shrink-0 text-muted-foreground">{dimensionLabel(d.dimension)}</span>
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
                  (risk.data?.projectsWithNoNotes ?? []).map((p) => <div key={p.id} className="py-0.5">{p.name}</div>)
                )}
              </div>
            </QueryState>
          </CardContent>
        </Card>

        {/* Most asked */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-primary" /> Eng ko‘p so‘ralgan · {asked.data?.unansweredTotal ?? 0} javobsiz
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-8 gap-y-2 text-sm md:grid-cols-2">
            <QueryState loading={asked.isLoading} error={asked.isError} empty={(asked.data?.topQuestions.length ?? 0) === 0}>
              {(asked.data?.topQuestions ?? []).slice(0, 8).map((q) => (
                <div key={q.question} className="flex items-start justify-between gap-3 border-b border-border/60 pb-1.5">
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
