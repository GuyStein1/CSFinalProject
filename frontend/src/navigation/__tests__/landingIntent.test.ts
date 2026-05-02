import { routeLandingIntent, type LandingIntentNavigation } from '../landingIntent';

function createNavigation() {
  const calls: { screen: string; params?: Record<string, unknown> }[] = [];
  const navigation: LandingIntentNavigation = {
    navigate: (screen, params) => calls.push({ screen, params }),
  };
  return { navigation, calls };
}

describe('routeLandingIntent', () => {
  it('routes task creation with an optional category', () => {
    const { navigation, calls } = createNavigation();

    routeLandingIntent(navigation, { kind: 'postTask', category: 'PLUMBING' });

    expect(calls).toEqual([{ screen: 'CreateTask', params: { category: 'PLUMBING' } }]);
  });

  it('routes requester workspace intents to requester tabs', () => {
    const { navigation, calls } = createNavigation();

    routeLandingIntent(navigation, { kind: 'requesterTasks' });

    expect(calls).toEqual([
      {
        screen: 'Main',
        params: { screen: 'RequesterMode', params: { screen: 'MyTasks' } },
      },
    ]);
  });

  it('routes fixer intents to fixer tabs', () => {
    const { navigation, calls } = createNavigation();

    routeLandingIntent(navigation, { kind: 'fixerBids' });

    expect(calls).toEqual([
      {
        screen: 'Main',
        params: { screen: 'FixerMode', params: { screen: 'MyBids' } },
      },
    ]);
  });
});
