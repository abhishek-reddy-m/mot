import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Ledger, Sticky, TextThread} from '../components/NightDesk.tsx';
import {Phone} from '../components/Phone.tsx';
import {FeatureLayout} from '../components/Type.tsx';
import {
  ArrivalRow,
  AvailabilityCard,
  BedDouble,
  ChangeDatesScreen,
  FRONT_DESK_STATS,
  HousekeepingScreen,
  RateCalendar,
  RoleCard,
  ROLES,
  StatCard,
} from '../mockups.tsx';
import {Screen} from '../../mockups/ui.tsx';
import {APP} from '../../theme.ts';
import {C, M} from '../theme.ts';
import {prog, rel, wordAt} from '../timeline.ts';

const W = 1080 - 2 * M;
const UI_TOP = 520;

/** A product screen sitting on the paper, as a floating app card. */
const Panel: React.FC<{viewport: number; top?: number; children: React.ReactNode; bg?: string}> = ({
  viewport,
  top = UI_TOP,
  children,
  bg = APP.gray50,
}) => (
  <div
    style={{
      position: 'absolute',
      left: M,
      top,
      width: W,
      borderRadius: 26,
      overflow: 'hidden',
      background: bg,
      boxShadow: '0 30px 70px rgba(12,23,46,0.18), 0 0 0 1px rgba(12,23,46,0.06)',
    }}
  >
    <Screen width={W} viewport={viewport}>
      {children}
    </Screen>
  </div>
);

/** Fixed #1: every night is counted, so a room can't be sold twice. */
export const AvailScene: React.FC = () => {
  const frame = useCurrentFrame();
  const counted = rel(wordAt('n_avail', 'counted'), 'avail');
  const twice = rel(wordAt('n_avail', 'twice'), 'avail');
  return (
    <FeatureLayout
      eyebrow="Fixed"
      title={['Sold out means', 'sold out.']}
      problem={<Ledger width={760} circleP={1} />}
      strikeAt={3}
      exitAt={13}
    >
      <Panel viewport={440} top={560}>
        <div style={{padding: 18}}>
          <AvailabilityCard friLeft={frame >= counted ? 0 : 1} rejected={frame >= twice - 2} spot={frame >= counted && frame < counted + 20} />
        </div>
      </Panel>
    </FeatureLayout>
  );
};

/** Fixed #2: price every night on its own; set all weekends at once. */
export const RatesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const set = rel(wordAt('n_rates', 'Set'), 'rates');
  const once = rel(wordAt('n_rates', 'once'), 'rates');
  return (
    <FeatureLayout
      eyebrow="Fixed"
      title={['Fridays priced', 'like Fridays.']}
      problem={<Sticky width={460} rotate={-5} lines={['RATES', '$299 a night', '(every night)']} />}
      strikeAt={3}
      exitAt={12}
    >
      <Panel viewport={760} top={560}>
        <RateCalendar flippedAt={frame >= set + 3 ? set + 3 : null} tapAt={set} saveTapAt={once} saved={frame >= once + 4} />
      </Panel>
    </FeatureLayout>
  );
};

/** Fixed #3: housekeeping marks rooms clean; the front desk sees it. */
export const HouseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const clean = rel(wordAt('n_house', 'clean'), 'house');
  const front = rel(wordAt('n_house', 'front'), 'house');
  const ready = rel(wordAt('n_house', 'ready'), 'house');
  const isClean = frame >= clean + 3;
  const cardIn = prog(frame, front, 12);
  return (
    <FeatureLayout
      eyebrow="Fixed"
      title={['Clean rooms,', 'confirmed.']}
      problem={<TextThread width={640} shown={3} />}
      strikeAt={3}
      exitAt={12}
    >
      <div style={{position: 'absolute', left: 70, top: 480}}>
        <Phone width={520} time="11:52">
          <div style={{position: 'absolute', inset: 0}}>
            <Screen width={491} viewport={340}>
              <HousekeepingScreen status104={isClean ? 'CLEAN' : 'DIRTY'} tapAt={clean} />
            </Screen>
          </div>
        </Phone>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 620,
          top: 1060,
          width: 400,
          opacity: cardIn,
          transform: `translateX(${(1 - cardIn) * 120}px)`,
        }}
      >
        <Screen width={400} viewport={200}>
          <div style={{fontSize: 11, fontWeight: 600, color: APP.gray500, letterSpacing: '0.05em', marginBottom: 6}}>FRONT DESK</div>
          <StatCard
            label="Clean/Dirty"
            value={frame >= ready ? '6/0' : '5/1'}
            color="#0d9488"
            icon={<BedDouble size={20} color="#0d9488" />}
            spot={frame >= ready && frame < ready + 24}
          />
        </Screen>
      </div>
    </FeatureLayout>
  );
};

/** Also built in: the front desk dashboard. */
export const DeskScene: React.FC = () => {
  const frame = useCurrentFrame();
  const cue: Record<string, number> = {
    arrivals: rel(wordAt('n_desk', 'Arrivals'), 'desk'),
    departures: rel(wordAt('n_desk', 'departures'), 'desk'),
    occupancy: rel(wordAt('n_desk', 'occupancy'), 'desk'),
  };
  const first = cue.arrivals;
  return (
    <FeatureLayout eyebrow="Also built in" title={['Today, on', 'one screen.']}>
      <Panel viewport={560} top={540}>
        <div style={{padding: 20}}>
          <div style={{fontSize: 24, lineHeight: '32px', fontWeight: 700}}>Front Desk</div>
          <div style={{color: APP.gray500, marginBottom: 16}}>Friday, October 16, 2026</div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16}}>
            {FRONT_DESK_STATS.map((s) => {
              const start = cue[s.key] ?? first + 6;
              const n = Math.round(s.value * prog(frame, start, 14));
              return (
                <StatCard
                  key={s.key}
                  label={s.label}
                  value={`${n}${s.suffix}`}
                  color={s.color}
                  icon={s.icon}
                  spot={s.key in cue && frame >= start && frame < start + 18}
                />
              );
            })}
          </div>
          <div style={{fontSize: 18, fontWeight: 600, marginBottom: 10}}>Today&apos;s Arrivals</div>
          <ArrivalRow />
        </div>
      </Panel>
    </FeatureLayout>
  );
};

/** Also built in: guests move or cancel their own booking. */
export const ChangesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const move = rel(wordAt('n_changes', 'move'), 'changes');
  const cancel = rel(wordAt('n_changes', 'cancel'), 'changes');
  const day = rel(wordAt('n_changes', 'day'), 'changes');
  return (
    <FeatureLayout eyebrow="Also built in" title={['Guests change', 'their own dates.']}>
      <div style={{position: 'absolute', left: 280, top: 470}}>
        <Phone width={520} time="9:14">
          <div style={{position: 'absolute', inset: 0}}>
            <Screen width={491} viewport={340}>
              <ChangeDatesScreen
                newDates={frame >= move}
                updated={frame >= move + 10}
                updateTapAt={move + 6}
                spotCancel={frame >= cancel && frame < day}
                spotPolicy={frame >= day}
              />
            </Screen>
          </div>
        </Phone>
      </div>
    </FeatureLayout>
  );
};

/** Also built in: a login per role, each seeing only their part. */
export const RolesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const words = ['whole', 'team', 'login', 'need'];
  const cues = words.map((w) => rel(wordAt('n_roles', w), 'roles'));
  return (
    <FeatureLayout eyebrow="Also built in" title={['A login for', 'every role.']}>
      <div style={{position: 'absolute', left: M, top: 560, width: W, display: 'flex', flexDirection: 'column', gap: 22}}>
        {ROLES.map((role, i) => {
          const p = prog(frame, cues[i], 10);
          return (
            <div key={role.label} style={{opacity: p, transform: `translateX(${(1 - p) * 140}px)`}}>
              <Screen width={W} viewport={420}>
                <RoleCard role={role} />
              </Screen>
            </div>
          );
        })}
      </div>
    </FeatureLayout>
  );
};
