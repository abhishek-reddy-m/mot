import React from 'react';
import {useCurrentFrame} from 'remotion';
import {CHANGE_AFTER, CHANGE_BEFORE, fmtMoney, PROPERTY, STAY_TOTAL} from '../facts.ts';
import {Card, CalendarIcon, DollarIcon, MapPin, Screen, UsersIcon} from '../mockups/ui.tsx';
import {APP, INK, LIME, MARGIN, MONO} from '../theme.ts';
import {CHANGES, linear, prog} from '../timeline.ts';
import {DiffLayout, VISUAL_TOP} from './DiffLayout.tsx';

const W = 1080 - 2 * MARGIN;
/** A wide phone: still the single-column layout, a little more compact once zoomed. */
const VIEWPORT = 480;
const ZOOM = W / VIEWPORT;
/** CSS-px height reserved for the success banner above the card. */
const BANNER_SPACE = 68;

const Detail: React.FC<{icon: React.ReactNode; label: string; value: string; big?: boolean}> = ({
  icon,
  label,
  value,
  big,
}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
    {icon}
    <div>
      <div style={{fontSize: 14, lineHeight: '20px', color: APP.gray600}}>{label}</div>
      <div style={{fontWeight: 500, fontSize: big ? 18 : 16, lineHeight: big ? '28px' : '24px'}}>{value}</div>
    </div>
  </div>
);

/** The guest booking page (src/app/bookings/[bookingId]/page.tsx), one state of it. */
const BookingCard: React.FC<{dates: {checkIn: string; checkOut: string}}> = ({dates}) => (
  <Card>
    <div style={{padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
      <div>
        <div style={{fontSize: 24, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.025em'}}>{PROPERTY.name}</div>
        <div style={{display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 14, color: APP.mutedFg}}>
          <MapPin size={16} />
          123 Coastal Highway, Malibu
        </div>
      </div>
      <span
        style={{
          padding: '4px 12px',
          borderRadius: 999,
          fontSize: 14,
          lineHeight: '20px',
          fontWeight: 500,
          background: APP.green100,
          color: APP.green700,
        }}
      >
        CONFIRMED
      </span>
    </div>
    <div style={{padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16}}>
      <Detail icon={<CalendarIcon size={20} color={APP.gray500} />} label="Check-in" value={dates.checkIn} />
      <Detail icon={<CalendarIcon size={20} color={APP.gray500} />} label="Check-out" value={dates.checkOut} />
      <Detail icon={<UsersIcon size={20} color={APP.gray500} />} label="Guests & Rooms" value="2 guests, 1 room(s)" />
      <Detail
        icon={<DollarIcon size={20} color={APP.gray500} />}
        label="Total Price"
        value={fmtMoney(STAY_TOTAL)}
        big
      />
    </div>
  </Card>
);

const Tag: React.FC<{children: string; side: 'left' | 'right'}> = ({children, side}) => (
  <div
    style={{
      position: 'absolute',
      top: -58,
      [side === 'left' ? 'right' : 'left']: 14,
      ...MONO,
      fontSize: 22,
      fontWeight: 700,
      padding: '9px 12px 8px',
      background: INK,
      color: LIME,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);

/** 03 — guests move or cancel their own booking: a before/after split. */
export const Changes: React.FC = () => {
  const frame = useCurrentFrame();
  const split = prog(frame, CHANGES.split, CHANGES.splitLen, linear);
  const x = split * W;
  const banner = prog(frame, CHANGES.banner, 12);
  const visible = frame >= CHANGES.card;

  return (
    <DiffLayout
      n={3}
      label="Self-serve changes"
      sans="Plans"
      serif="change."
      bg="lime"
      note="Move or cancel until 24 hours before check-in."
      noteAt={CHANGES.note}
    >
      <div style={{position: 'absolute', left: MARGIN, top: VISUAL_TOP - 10, width: W}}>
        {/* "Booking dates updated successfully!" — the page's success alert */}
        <div style={{height: BANNER_SPACE * ZOOM, overflow: 'hidden'}}>
          <Screen width={W} viewport={VIEWPORT}>
            <div
              style={{
                background: APP.green50,
                border: `1px solid ${APP.green200}`,
                color: APP.green700,
                padding: '12px 16px',
                borderRadius: 8,
                transform: `translateY(${(1 - banner) * 160}%)`,
              }}
            >
              Booking dates updated successfully!
            </div>
          </Screen>
        </div>

        <div
          style={{
            position: 'relative',
            opacity: visible ? 1 : 0,
            transform: `translateY(${(1 - prog(frame, CHANGES.card, 14)) * 80}px)`,
          }}
        >
          <Screen width={W} viewport={VIEWPORT}>
            <BookingCard dates={CHANGE_BEFORE} />
          </Screen>
          <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 ${W - x}px 0 0)`}}>
            <Screen width={W} viewport={VIEWPORT}>
              <BookingCard dates={CHANGE_AFTER} />
            </Screen>
          </div>

          {frame >= CHANGES.split && frame < CHANGES.banner ? (
            <div
              style={{
                position: 'absolute',
                top: -20,
                bottom: -20,
                left: x - 3,
                width: 6,
                background: INK,
              }}
            >
              {x > 170 ? <Tag side="left">After</Tag> : null}
              {x < W - 170 ? <Tag side="right">Before</Tag> : null}
            </div>
          ) : null}
        </div>
      </div>
    </DiffLayout>
  );
};
