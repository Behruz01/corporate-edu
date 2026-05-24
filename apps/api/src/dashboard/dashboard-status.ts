export type DashboardStatusColor = 'on_track' | 'behind' | 'at_risk';

export type DashboardStatusInput = {
  onboardingPercent: number | null;
  avgSimulatorScore: number | null;
};

export function computeDashboardStatusColor(input: DashboardStatusInput): DashboardStatusColor {
  const onboarding = input.onboardingPercent;
  const simulator = input.avgSimulatorScore;

  if ((onboarding !== null && onboarding < 50) || (simulator !== null && simulator < 60)) {
    return 'at_risk';
  }

  if ((onboarding !== null && onboarding < 80) || (simulator !== null && simulator < 75)) {
    return 'behind';
  }

  return 'on_track';
}
