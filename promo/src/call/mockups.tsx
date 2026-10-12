// Product screens for the "Let me check" ad, rebuilt from the app's pages
// with their real classes, copy and colors. File references are relative to
// the repository root.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Badge, Button, CalendarIcon, Card, CheckCircle, MapPin, SuitePhoto} from '../mockups/ui.tsx';
import {APP, FONT} from '../theme.ts';
import {C} from './theme.ts';
import {prog} from './timeline.ts';

const EXTRA = {
  orange100: '#ffedd5',
  orange600: '#ea580c',
  orange800: '#9a3412',
  purple100: '#f3e8ff',
  purple600: '#9333ea',
  purple800: '#6b21a8',
  teal600: '#0d9488',
  yellow600: '#ca8a04',
  red50: '#fef2f2',
  red200: '#fecaca',
  red300: '#fca5a5',
  red700: '#b91c1c',
  blue500: '#3b82f6',
};

// ------------------------------------------------------------------ helpers

const Svg: React.FC<{size?: number; color?: string; children: React.ReactNode}> = ({size = 16, color = 'currentColor', children}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink: 0}}>
    {children}
  </svg>
);
type IP = {size?: number; color?: string};
export const ArrowRight: React.FC<IP> = (p) => <Svg {...p}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></Svg>;
export const ArrowLeft: React.FC<IP> = (p) => <Svg {...p}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></Svg>;
export const Percent: React.FC<IP> = (p) => <Svg {...p}><line x1="19" x2="5" y1="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></Svg>;
export const Wrench: React.FC<IP> = (p) => <Svg {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></Svg>;
export const BedDouble: React.FC<IP> = (p) => <Svg {...p}><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" /><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" /><path d="M12 4v6" /><path d="M2 18h20" /></Svg>;
export const Users: React.FC<IP> = (p) => <Svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>;
export const Menu: React.FC<IP> = (p) => <Svg {...p}><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></Svg>;
export const Clock: React.FC<IP> = (p) => <Svg {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Svg>;
export const XIcon: React.FC<IP> = (p) => <Svg {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Svg>;
export const AlertCircle: React.FC<IP> = (p) => <Svg {...p}><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></Svg>;

/** Amber ring the camera "points at" a part of a screen with. */
export const Spot: React.FC<{on: boolean; children: React.ReactNode; radius?: number; style?: React.CSSProperties}> = ({
  on,
  children,
  radius = 6,
  style,
}) => (
  <span
    style={{
      borderRadius: radius,
      boxShadow: on ? `0 0 0 3px ${C.amber}` : '0 0 0 3px transparent',
      background: on ? 'rgba(255,174,31,0.16)' : 'transparent',
      ...style,
    }}
  >
    {children}
  </span>
);

/** Finger tap: a ring that expands and fades where the screen is touched. */
export const Tap: React.FC<{at: number; size?: number}> = ({at, size = 44}) => {
  const frame = useCurrentFrame();
  if (frame < at || frame > at + 12) return null;
  const p = prog(frame, at, 12);
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: size,
        background: 'rgba(12,23,46,0.18)',
        border: `2px solid ${C.navy}`,
        opacity: 1 - p,
        transform: `scale(${0.5 + p * 1.3})`,
        pointerEvents: 'none',
      }}
    />
  );
};

const InputBox: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div
    style={{
      height: 36,
      borderRadius: 6,
      border: `1px solid ${APP.border}`,
      background: APP.white,
      padding: '0 12px',
      display: 'flex',
      alignItems: 'center',
      fontSize: 14,
      boxShadow: APP.shadowSm,
      ...style,
    }}
  >
    {children}
  </div>
);

// --------------------------------------------------------- guest-facing site

/** src/components/Navigation.tsx, mobile width. */
export const SiteNav: React.FC = () => (
  <div
    style={{
      height: 64,
      background: 'rgba(255,255,255,0.95)',
      borderBottom: `1px solid ${APP.gray100}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      boxShadow: APP.shadowSm,
    }}
  >
    <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'linear-gradient(to bottom right, #3b82f6, #9333ea)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontFamily: FONT.script,
          fontWeight: 700,
          fontSize: 24,
        }}
      >
        C
      </div>
      <div style={{display: 'flex', flexDirection: 'column'}}>
        <span
          style={{
            fontFamily: FONT.script,
            fontWeight: 700,
            fontSize: 24,
            lineHeight: '32px',
            background: 'linear-gradient(to right, #2563eb, #9333ea)',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Casa Blanca
        </span>
        <span
          style={{
            fontFamily: FONT.montserrat,
            fontWeight: 500,
            fontSize: 10,
            letterSpacing: '0.1em',
            color: APP.gray600,
            textAlign: 'center',
            marginTop: -4,
          }}
        >
          HOTELS
        </span>
      </div>
    </div>
    <Menu size={24} color={APP.gray600} />
  </div>
);

/** Room card from src/app/properties/[propertyId]/page.tsx for a Fri–Sun stay. */
export const RoomCard: React.FC<{spotAvail?: boolean; spotDates?: boolean; tapAt?: number; selected?: boolean}> = ({
  spotAvail,
  spotDates,
  tapAt,
  selected,
}) => (
  <Card style={{boxShadow: selected ? `0 0 0 2px ${EXTRA.blue500}` : APP.shadowSm}}>
    <SuitePhoto height={150} />
    <div style={{padding: 20, display: 'flex', flexDirection: 'column', gap: 6}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
        <div style={{fontSize: 24, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.025em'}}>Ocean Suite</div>
        <div style={{fontSize: 20, lineHeight: '28px', fontWeight: 700, color: APP.blue600}}>
          $374.99<span style={{fontSize: 14, fontWeight: 400, color: APP.gray500}}>/night</span>
        </div>
      </div>
      <div style={{fontSize: 14, color: APP.mutedFg}}>
        Up to 2 guests
        <span style={{marginLeft: 8, fontSize: 12, color: APP.green600}}>*Custom rates available</span>
      </div>
      <div style={{fontSize: 14}}>
        <Spot on={!!spotAvail}>
          <span style={{fontWeight: 500, color: APP.green600}}>4 rooms available</span>
        </Spot>
        <Spot on={!!spotDates} style={{marginLeft: 8}}>
          <span style={{fontSize: 12, color: APP.gray500}}>for Oct 16, 2026 - Oct 18, 2026</span>
        </Spot>
      </div>
      <div style={{fontSize: 12, color: APP.green700, display: 'flex', alignItems: 'center', gap: 4}}>
        <CheckCircle size={12} color={APP.green700} />
        Available for your selected dates
      </div>
    </div>
    <div style={{padding: '0 20px 20px', position: 'relative'}}>
      <Button>Select Room</Button>
      {tapAt !== undefined ? <Tap at={tapAt} /> : null}
    </div>
  </Card>
);

/** "Book Your Stay" panel, with the success state the page shows after booking. */
export const BookPanel: React.FC<{booked: boolean; tapAt?: number}> = ({booked, tapAt}) => (
  <div style={{background: APP.white, padding: 20, borderRadius: 8, boxShadow: APP.shadowMd}}>
    <div style={{fontSize: 24, lineHeight: '32px', fontWeight: 700, marginBottom: 14}}>Book Your Stay</div>
    {booked ? (
      <div style={{padding: 16, background: APP.green50, border: `1px solid ${APP.green200}`, borderRadius: 6, textAlign: 'center'}}>
        <div style={{display: 'flex', justifyContent: 'center', marginBottom: 8}}>
          <CheckCircle size={48} color="#22c55e" />
        </div>
        <div style={{fontSize: 18, lineHeight: '28px', fontWeight: 500, color: APP.green800, marginBottom: 6}}>Booking Successful!</div>
        <div style={{color: APP.green700, fontSize: 15}}>Your booking has been confirmed. Redirecting to your dashboard...</div>
      </div>
    ) : (
      <>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14}}>
          {[
            ['Check-in Date', '10/16/2026'],
            ['Check-out Date', '10/18/2026'],
          ].map(([l, v]) => (
            <div key={l}>
              <div style={{fontSize: 14, fontWeight: 500, marginBottom: 6}}>{l}</div>
              <InputBox>{v}</InputBox>
            </div>
          ))}
        </div>
        {[
          ['Selected Room:', 'Ocean Suite'],
          ['Price per night:', '$374.99'],
        ].map(([l, v]) => (
          <div key={l} style={{display: 'flex', justifyContent: 'space-between', marginBottom: 10}}>
            <span style={{fontWeight: 600}}>{l}</span>
            <span>{v}</span>
          </div>
        ))}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
          <span style={{fontWeight: 600}}>Total Price:</span>
          <div style={{textAlign: 'right'}}>
            <div style={{fontSize: 20, lineHeight: '28px', fontWeight: 700, color: APP.blue600}}>$749.98</div>
            <div style={{fontSize: 12, color: APP.green600}}>*Custom rates applied</div>
          </div>
        </div>
        <div style={{position: 'relative'}}>
          <Button>Book Now</Button>
          {tapAt !== undefined ? <Tap at={tapAt} /> : null}
        </div>
      </>
    )}
  </div>
);

/** Room card's per-night availability list, and the API's rejection message. */
export const AvailabilityCard: React.FC<{friLeft: number; rejected: boolean; spot: boolean}> = ({friLeft, rejected, spot}) => (
  <div>
    <Card>
      <div style={{padding: 22}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em'}}>Ocean Suite</div>
          {friLeft === 0 ? (
            <Badge bg={APP.destructive} color={APP.destructiveFg} style={{fontSize: 14, padding: '4px 12px'}}>
              Not Available
            </Badge>
          ) : (
            <span style={{fontWeight: 500, color: APP.green600, fontSize: 15}}>{friLeft} room left</span>
          )}
        </div>
        <div style={{fontSize: 14, color: APP.gray500, marginTop: 14}}>View availability by date</div>
        <div style={{marginTop: 8, paddingLeft: 10, borderLeft: `2px solid ${APP.gray200}`, fontSize: 16, display: 'flex', flexDirection: 'column', gap: 6}}>
          {[
            ['Oct 16, 2026', friLeft],
            ['Oct 17, 2026', 2],
          ].map(([d, n]) => (
            <div key={d as string} style={{display: 'flex', justifyContent: 'space-between'}}>
              <span style={{color: APP.gray600}}>{d}</span>
              <Spot on={spot && d === 'Oct 16, 2026'}>
                <span style={{color: Number(n) > 0 ? APP.green600 : APP.red600, fontWeight: 600}}>{n}/10 available</span>
              </Spot>
            </div>
          ))}
        </div>
      </div>
    </Card>
    <div
      style={{
        marginTop: 16,
        padding: '12px 14px',
        background: EXTRA.red50,
        border: `1px solid ${EXTRA.red200}`,
        color: EXTRA.red700,
        borderRadius: 6,
        fontSize: 15,
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        opacity: rejected ? 1 : 0,
        transform: rejected ? 'none' : 'translateY(10px)',
      }}
    >
      <AlertCircle size={18} color={EXTRA.red700} />
      Not enough rooms available. Only 0 rooms available.
    </div>
  </div>
);

// ------------------------------------------------------------- staff screens

/** src/app/admin/rate-calendar/page.tsx: bulk update + two weeks of October. */
export const RateCalendar: React.FC<{flippedAt: number | null; tapAt: number; saved: boolean; saveTapAt: number}> = ({
  flippedAt,
  tapAt,
  saved,
  saveTapAt,
}) => {
  const frame = useCurrentFrame();
  const days = Array.from({length: 14}, (_, i) => 11 + i); // Sun Oct 11 .. Sat Oct 24
  return (
    <div style={{padding: 20}}>
      <div style={{fontSize: 30, lineHeight: '36px', fontWeight: 700, color: APP.gray900}}>Rate Calendar</div>
      <div style={{color: APP.gray600, marginBottom: 18}}>Set and manage daily rates for your room types</div>
      <Card style={{padding: 18, marginBottom: 18}}>
        <div style={{fontSize: 14, fontWeight: 500, marginBottom: 10}}>Bulk Update</div>
        <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
          <InputBox style={{width: 96}}>374.99</InputBox>
          <div style={{position: 'relative', width: 'auto'}}>
            <Button size="sm" variant="outline" style={{width: 'auto'}}>
              Set Weekends (Fri-Sat)
            </Button>
            <Tap at={tapAt} />
          </div>
          <InputBox style={{width: 96, color: APP.mutedFg}}>Price</InputBox>
          <Button size="sm" variant="outline" style={{width: 'auto'}}>
            Set Weekdays
          </Button>
        </div>
      </Card>
      <Card style={{padding: 18}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
          <div style={{fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em'}}>October 2026</div>
          <div style={{fontSize: 13, color: APP.gray500}}>Ocean Suite (Base: $299.99)</div>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8}}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} style={{textAlign: 'center', fontWeight: 500, fontSize: 15, padding: '4px 0'}}>
              {d}
            </div>
          ))}
          {days.map((d, i) => {
            const dow = i % 7;
            const weekend = dow === 5 || dow === 6;
            const k = weekend ? (i < 7 ? dow - 5 : dow - 3) : 0;
            const flipFrame = flippedAt === null ? Infinity : flippedAt + k * 3;
            const flipped = weekend && frame >= flipFrame;
            const flash = flipped ? 1 - prog(frame, flipFrame, 14) : 0;
            return (
              <div
                key={d}
                style={{
                  border: `1px solid ${APP.border}`,
                  borderRadius: 6,
                  padding: 6,
                  background: weekend ? APP.blue50 : APP.white,
                  boxShadow: flash > 0 ? `0 0 0 ${2 + 2 * flash}px rgba(255,174,31,${flash})` : undefined,
                }}
              >
                <div style={{textAlign: 'right', fontSize: 13, fontWeight: 500}}>{d}</div>
                <div
                  style={{
                    marginTop: 8,
                    height: 34,
                    borderRadius: 6,
                    border: `1px solid ${APP.border}`,
                    background: APP.white,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 6px',
                    fontSize: 15,
                    fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums',
                    color: flipped ? APP.gray900 : APP.gray900,
                  }}
                >
                  <span style={{color: APP.gray500, marginRight: 2}}>$</span>
                  {flipped ? '374.99' : '299.99'}
                </div>
              </div>
            );
          })}
        </div>
        {saved ? (
          <div style={{marginTop: 14, background: APP.green50, color: APP.green700, padding: 12, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8}}>
            <CheckCircle size={20} color="#22c55e" />
            <div>
              <div style={{fontWeight: 500}}>Rates saved successfully!</div>
              <div style={{fontSize: 14}}>Your changes have been saved to the database.</div>
            </div>
          </div>
        ) : null}
        <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 14}}>
          <div style={{position: 'relative'}}>
            <Button style={{width: 'auto'}}>Save Rates</Button>
            <Tap at={saveTapAt} />
          </div>
        </div>
      </Card>
    </div>
  );
};

type HKStatus = 'DIRTY' | 'CLEAN' | 'INSPECTED';
const HK_BADGE: Record<HKStatus, [string, string]> = {
  DIRTY: [APP.yellow100, APP.yellow800],
  CLEAN: [APP.green100, APP.green800],
  INSPECTED: [APP.blue100, APP.blue800],
};

/** src/app/housekeeping/page.tsx on a housekeeper's phone. */
export const HousekeepingScreen: React.FC<{status104: HKStatus; tapAt: number}> = ({status104, tapAt}) => {
  const dirty = status104 === 'DIRTY' ? 1 : 0;
  const rooms: Array<[string, string, string, HKStatus]> = [
    ['104', 'Garden Room', '1', status104],
    ['105', 'Garden Room', '1', 'CLEAN'],
  ];
  return (
    <div style={{padding: '70px 16px 16px', background: APP.gray50, height: '100%'}}>
      <div style={{fontSize: 24, lineHeight: '32px', fontWeight: 700}}>Housekeeping</div>
      <div style={{color: APP.gray500, marginBottom: 16}}>Manage room cleanliness status</div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16}}>
        {[
          ['Dirty Rooms', String(dirty), EXTRA.yellow600],
          ['Clean Rooms', String(6 - dirty), APP.green600],
        ].map(([l, v, c]) => (
          <Card key={l} style={{padding: '14px 14px 10px'}}>
            <div style={{fontSize: 12, color: APP.gray500}}>{l}</div>
            <div style={{fontSize: 24, fontWeight: 700, color: c}}>{v}</div>
          </Card>
        ))}
      </div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: 12}}>
        {rooms.map(([n, type, floor, st]) => (
          <Card key={n} style={{padding: 14, height: 168, boxSizing: 'border-box'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10}}>
              <div>
                <div style={{fontSize: 18, lineHeight: '28px', fontWeight: 700}}>Room {n}</div>
                <div style={{fontSize: 14, color: APP.gray500}}>{type}</div>
                <div style={{fontSize: 12, color: APP.gray400}}>Floor {floor}</div>
              </div>
              <Badge bg={HK_BADGE[st][0]} color={HK_BADGE[st][1]}>
                {st}
              </Badge>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
              {st === 'DIRTY' ? (
                <div style={{position: 'relative'}}>
                  <Button size="sm" bg={APP.green600}>
                    Mark Clean
                  </Button>
                  {n === '104' ? <Tap at={tapAt} /> : null}
                </div>
              ) : null}
              {st === 'CLEAN' ? (
                <>
                  <Button size="sm" bg={APP.blue600}>
                    Mark Inspected
                  </Button>
                  <Button size="sm" variant="outline" color={EXTRA.yellow600}>
                    Mark Dirty
                  </Button>
                </>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

/** One of the front desk's "Quick Stats" cards (src/app/admin/front-desk/page.tsx). */
export const StatCard: React.FC<{label: string; value: string; color: string; icon: React.ReactNode; spot?: boolean}> = ({
  label,
  value,
  color,
  icon,
  spot,
}) => (
  <Card style={{padding: '16px 18px 12px', boxShadow: spot ? `0 0 0 3px ${C.amber}` : APP.shadowSm}}>
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
      <div>
        <div style={{fontSize: 12, color: APP.gray500}}>{label}</div>
        <div style={{fontSize: 24, lineHeight: '32px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums'}}>{value}</div>
      </div>
      {icon}
    </div>
  </Card>
);

export const FRONT_DESK_STATS = [
  {key: 'arrivals', label: 'Arrivals', value: 3, suffix: '', color: APP.blue600, icon: <ArrowRight size={20} color={APP.blue600} />},
  {key: 'departures', label: 'Departures', value: 2, suffix: '', color: EXTRA.orange600, icon: <ArrowLeft size={20} color={EXTRA.orange600} />},
  {key: 'inhouse', label: 'In-House', value: 9, suffix: '', color: APP.green600, icon: <Users size={20} color={APP.green600} />},
  {key: 'occupancy', label: 'Occupancy', value: 72, suffix: '%', color: EXTRA.purple600, icon: <Percent size={20} color={EXTRA.purple600} />},
  {key: 'ooo', label: 'Out of Order', value: 1, suffix: '', color: APP.red600, icon: <Wrench size={20} color={APP.red600} />},
  {key: 'cleandirty', label: 'Clean/Dirty', value: 7, suffix: '/1', color: EXTRA.teal600, icon: <BedDouble size={20} color={EXTRA.teal600} />},
];

/** The front desk's arrivals list row. */
export const ArrivalRow: React.FC = () => (
  <Card style={{padding: 16}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
      <div>
        <div style={{fontWeight: 600}}>Sam Rivera</div>
        <div style={{fontSize: 14, color: APP.gray500}}>Ocean Suite · 2 guests</div>
        <div style={{fontSize: 14, color: APP.gray500}}>Oct 16 → Oct 18 · 2 nights</div>
      </div>
      <Badge bg={APP.blue100} color={APP.blue800}>
        CONFIRMED
      </Badge>
    </div>
    <div style={{display: 'flex', gap: 8, marginTop: 12}}>
      <Button size="sm" bg={APP.green600}>
        Check In
      </Button>
      <Button size="sm" variant="outline">
        No Show
      </Button>
    </div>
  </Card>
);

/** Guest booking page (src/app/bookings/[bookingId]/page.tsx): change dates or cancel. */
export const ChangeDatesScreen: React.FC<{
  newDates: boolean;
  updated: boolean;
  updateTapAt: number;
  spotCancel: boolean;
  spotPolicy: boolean;
}> = ({newDates, updated, updateTapAt, spotCancel, spotPolicy}) => (
  <div style={{padding: '70px 14px 14px', background: APP.gray50, height: '100%', display: 'flex', flexDirection: 'column', gap: 14}}>
    <div
      style={{
        background: APP.green50,
        border: `1px solid ${APP.green200}`,
        color: APP.green700,
        padding: '12px 14px',
        borderRadius: 8,
        opacity: updated ? 1 : 0,
      }}
    >
      Booking dates updated successfully!
    </div>
    <Card style={{padding: 18}}>
      <div style={{fontSize: 22, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.02em'}}>
        <CalendarIcon size={20} /> Modify Booking Dates
      </div>
      <div style={{fontSize: 14, color: APP.mutedFg, margin: '6px 0 14px'}}>Change your check-in and/or check-out dates</div>
      {[
        ['Check-in Date', newDates ? '10/23/2026' : '10/16/2026', 'Current: 10/16/2026'],
        ['Check-out Date', newDates ? '10/25/2026' : '10/18/2026', 'Current: 10/18/2026'],
      ].map(([l, v, cur]) => (
        <div key={l} style={{marginBottom: 12}}>
          <div style={{fontSize: 14, fontWeight: 500, color: APP.gray700, marginBottom: 6}}>{l}</div>
          <InputBox style={{fontSize: 16, boxShadow: newDates ? `0 0 0 2px ${C.amber}` : APP.shadowSm}}>{v}</InputBox>
          <div style={{fontSize: 12, color: APP.gray500, marginTop: 4}}>{cur}</div>
        </div>
      ))}
      <div style={{position: 'relative'}}>
        <Button>
          <CalendarIcon size={16} color={APP.primaryFg} /> Update Booking Dates
        </Button>
        <Tap at={updateTapAt} />
      </div>
    </Card>
    <Card style={{padding: 18, border: `1px solid ${APP.blue200}`, background: APP.blue50, boxShadow: spotPolicy ? `0 0 0 3px ${C.amber}` : APP.shadowSm}}>
      <div style={{display: 'flex', gap: 10}}>
        <Clock size={20} color={APP.blue600} />
        <div>
          <div style={{fontWeight: 600, color: APP.blue900, marginBottom: 4}}>24-Hour Cancellation Policy</div>
          <div style={{fontSize: 14, color: APP.blue800}}>
            You can cancel or modify your booking up to 24 hours before 3 PM on your check-in date.
          </div>
        </div>
      </div>
    </Card>
    <Card style={{padding: 18, border: `1px solid ${EXTRA.red200}`}}>
      <div style={{fontSize: 22, fontWeight: 600, color: EXTRA.red700, display: 'flex', alignItems: 'center', gap: 8}}>
        <XIcon size={20} color={EXTRA.red700} /> Cancel Booking
      </div>
      <div style={{fontSize: 14, color: APP.mutedFg, margin: '4px 0 12px'}}>Cancel your booking before the deadline</div>
      <Spot on={spotCancel} radius={8}>
        <span
          style={{
            display: 'inline-flex',
            height: 36,
            alignItems: 'center',
            padding: '0 16px',
            borderRadius: 6,
            border: `1px solid ${EXTRA.red300}`,
            color: EXTRA.red700,
            fontSize: 14,
            fontWeight: 500,
            background: APP.white,
          }}
        >
          Cancel This Booking
        </span>
      </Spot>
    </Card>
  </div>
);

/** Staff roles, labels and descriptions as defined in src/app/admin/users/page.tsx. */
export const ROLES = [
  {label: 'Owner', desc: 'Property owner with full property access', opens: 'Admin panel', bg: APP.blue100, color: APP.blue800},
  {label: 'Manager', desc: 'Manages assigned properties', opens: 'Front desk, housekeeping, bookings, users', bg: APP.green100, color: APP.green800},
  {label: 'Front Desk', desc: 'Check-in/out and front desk operations', opens: 'Front desk portal', bg: APP.yellow100, color: APP.yellow800},
  {label: 'Housekeeper', desc: 'Room cleaning status updates', opens: 'Housekeeping portal', bg: EXTRA.orange100, color: EXTRA.orange800},
];

export const RoleCard: React.FC<{role: (typeof ROLES)[number]}> = ({role}) => (
  <Card style={{padding: '14px 16px'}}>
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10}}>
      <Badge bg={role.bg} color={role.color} style={{fontSize: 14, padding: '4px 12px'}}>
        {role.label}
      </Badge>
      <span style={{fontSize: 13, color: APP.gray500}}>{role.opens}</span>
    </div>
    <div style={{fontSize: 16, color: APP.gray700, marginTop: 8}}>{role.desc}</div>
  </Card>
);

/** One row of the admin Bookings table (src/app/admin/bookings/page.tsx), stacked to fit. */
export const NewBookingRow: React.FC<{highlight: boolean}> = ({highlight}) => (
  <div style={{padding: 18}}>
    <div style={{fontSize: 28, lineHeight: '36px', fontWeight: 700}}>Bookings</div>
    <div style={{color: APP.gray600, marginTop: 4, marginBottom: 16}}>Manage guest reservations and bookings</div>
    <div style={{background: APP.white, borderRadius: 8, boxShadow: APP.shadow, overflow: 'hidden'}}>
      <div style={{background: APP.gray50, padding: '10px 18px', fontSize: 12, fontWeight: 500, color: APP.gray500, letterSpacing: '0.05em', display: 'grid', gridTemplateColumns: '1.3fr 1fr 0.8fr', gap: 10}}>
        <span>PROPERTY & ROOM</span>
        <span>DATES</span>
        <span>STATUS</span>
      </div>
      {[
        {room: 'Ocean Suite', dates: ['10/16/2026', 'to 10/18/2026'], amt: '$749.98', status: 'PENDING', fresh: true},
        {room: 'Garden Room', dates: ['10/15/2026', 'to 10/17/2026'], amt: '$399.98', status: 'CONFIRMED', fresh: false},
      ].map((b) => (
        <div
          key={b.room}
          style={{
            padding: '14px 18px',
            borderTop: `1px solid ${APP.gray200}`,
            display: 'grid',
            gridTemplateColumns: '1.3fr 1fr 0.8fr',
            gap: 10,
            alignItems: 'center',
            background: b.fresh && highlight ? '#FFF7E6' : APP.white,
            boxShadow: b.fresh && highlight ? `inset 4px 0 0 ${C.amber}` : undefined,
          }}
        >
          <div>
            <div style={{fontSize: 14, fontWeight: 500}}>Oceanview Resort</div>
            <div style={{fontSize: 14, color: APP.gray500}}>
              {b.room} · {b.amt}
            </div>
          </div>
          <div>
            <div style={{fontSize: 14, fontWeight: 500}}>{b.dates[0]}</div>
            <div style={{fontSize: 14, color: APP.gray500}}>{b.dates[1]}</div>
          </div>
          <div>
            <Badge bg={b.status === 'PENDING' ? APP.yellow100 : APP.blue100} color={b.status === 'PENDING' ? APP.yellow800 : APP.blue800}>
              {b.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export {MapPin};
