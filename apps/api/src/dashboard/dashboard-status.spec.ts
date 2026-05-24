import { computeDashboardStatusColor } from './dashboard-status';

describe('computeDashboardStatusColor', () => {
  it('keeps empty dashboard metrics on track instead of crashing', () => {
    expect(computeDashboardStatusColor({ onboardingPercent: null, avgSimulatorScore: null })).toBe('on_track');
  });

  it('marks weak progress and weak simulator scores as at risk', () => {
    expect(computeDashboardStatusColor({ onboardingPercent: 35, avgSimulatorScore: 54 })).toBe('at_risk');
  });

  it('marks moderate progress or simulator scores as behind', () => {
    expect(computeDashboardStatusColor({ onboardingPercent: 65, avgSimulatorScore: 72 })).toBe('behind');
  });
});
