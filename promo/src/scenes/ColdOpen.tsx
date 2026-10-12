import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {fmtMoney, PROPERTY, ROOM, STAY_TOTAL} from '../facts.ts';
import {Badge, Button, Card, CheckCircle, MapPin, Screen, SuitePhoto} from '../mockups/ui.tsx';
import {APP, INK, MARGIN} from '../theme.ts';
import {COLD, prog} from '../timeline.ts';

const SCREEN_W = 1080 - 2 * MARGIN;
/** CSS px the page scrolls to bring "Book Your Stay" into view. */
const SCROLL = 352;

/** Expanding ring where a finger taps. */
const Tap: React.FC<{at: number}> = ({at}) => {
  const frame = useCurrentFrame();
  if (frame < at || frame > at + 12) return null;
  const p = prog(frame, at, 12);
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 44,
        height: 44,
        marginLeft: -22,
        marginTop: -22,
        borderRadius: 22,
        border: `2px solid ${INK}`,
        opacity: 1 - p,
        transform: `scale(${0.5 + p * 1.2})`,
      }}
    />
  );
};

const Row: React.FC<{label: string; children: React.ReactNode}> = ({label, children}) => (
  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
    <span style={{fontWeight: 600}}>{label}</span>
    {children}
  </div>
);

/** The property page doing its main job: pick the suite, book the stay. */
export const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const tilt = prog(frame, COLD.tilt, COLD.tiltLen);
  const scroll = prog(frame, COLD.scroll, COLD.scrollLen) * SCROLL;
  const selected = frame >= COLD.tapSelect;
  const booked = frame >= COLD.success;

  return (
    <AbsoluteFill style={{background: INK, perspective: 2400}}>
      <div
        style={{
          position: 'absolute',
          left: MARGIN,
          top: 168,
          width: SCREEN_W,
          // Ends above the bottom HUD row so the scene counter stays readable.
          height: 1612,
          borderRadius: 44,
          overflow: 'hidden',
          background: APP.gray50,
          transformOrigin: '50% 100%',
          transform: `translateY(${(1 - tilt) * 560}px) rotateX(${(1 - tilt) * 62}deg) scale(${0.84 + 0.16 * tilt})`,
        }}
      >
        <Screen width={SCREEN_W}>
          <div style={{padding: '28px 16px 0', transform: `translateY(${-scroll}px)`}}>
            <h1 style={{fontSize: 30, lineHeight: '36px', fontWeight: 700, margin: '0 0 8px'}}>{PROPERTY.name}</h1>
            <div style={{display: 'flex', alignItems: 'center', gap: 8, color: APP.gray600}}>
              <MapPin color={APP.gray500} />
              <span>{PROPERTY.address}</span>
            </div>
            <h2 style={{fontSize: 24, lineHeight: '32px', fontWeight: 700, margin: '28px 0 16px'}}>
              Available Rooms
            </h2>

            <Card
              style={{
                boxShadow: selected ? `0 0 0 2px #3b82f6` : APP.shadowSm,
              }}
            >
              <SuitePhoto height={192} />
              <div style={{padding: 24, display: 'flex', flexDirection: 'column', gap: 6}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                  <div style={{fontSize: 24, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.025em'}}>
                    {ROOM.name}
                  </div>
                  <div style={{fontSize: 20, lineHeight: '28px', fontWeight: 700, color: APP.blue600}}>
                    {fmtMoney(ROOM.basePrice)}
                    <span style={{fontSize: 14, fontWeight: 400, color: APP.gray500}}>/night</span>
                  </div>
                </div>
                <div style={{fontSize: 14, color: APP.mutedFg}}>
                  Up to {ROOM.capacity} guests
                  <span style={{marginLeft: 8, fontSize: 12, color: APP.green600}}>*Custom rates available</span>
                </div>
                <div style={{fontSize: 14, display: 'flex', flexDirection: 'column', gap: 4}}>
                  <div>
                    <span style={{fontWeight: 500, color: APP.green600}}>7 rooms available</span>
                    <span style={{marginLeft: 8, fontSize: 12, color: APP.gray500}}>
                      for Oct 15, 2026 - Oct 18, 2026
                    </span>
                  </div>
                  <div style={{fontSize: 12, color: APP.green700, display: 'flex', alignItems: 'center', gap: 4}}>
                    <CheckCircle size={12} color={APP.green700} />
                    Available for your selected dates
                  </div>
                  <div style={{fontSize: 12, color: APP.gray500}}>7/{ROOM.totalRooms} total rooms</div>
                </div>
              </div>
              <div style={{padding: '0 24px 24px'}}>
                <p style={{fontSize: 14, lineHeight: '20px', color: APP.gray600, margin: '0 0 16px'}}>
                  {ROOM.description}
                </p>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16}}>
                  {ROOM.amenities.map((a) => (
                    <Badge key={a} bg={APP.blue50} color={APP.gray900} border={APP.border}>
                      {a}
                    </Badge>
                  ))}
                </div>
                <div style={{position: 'relative'}}>
                  <Button pressed={frame >= COLD.tapSelect && frame < COLD.tapSelect + 4}>Select Room</Button>
                  <Tap at={COLD.tapSelect} />
                </div>
              </div>
            </Card>

            <div
              style={{
                marginTop: 32,
                background: APP.white,
                padding: 24,
                borderRadius: 8,
                boxShadow: APP.shadowMd,
              }}
            >
              <h2 style={{fontSize: 24, lineHeight: '32px', fontWeight: 700, margin: '0 0 16px'}}>Book Your Stay</h2>
              {booked ? (
                <div
                  style={{
                    padding: 16,
                    background: APP.green50,
                    border: `1px solid ${APP.green200}`,
                    borderRadius: 6,
                    textAlign: 'center',
                    transform: `scale(${0.94 + 0.06 * prog(frame, COLD.success, 8)})`,
                  }}
                >
                  <div style={{display: 'flex', justifyContent: 'center', marginBottom: 8}}>
                    <CheckCircle size={48} color="#22c55e" />
                  </div>
                  <div style={{fontSize: 18, lineHeight: '28px', fontWeight: 500, color: APP.green800, marginBottom: 8}}>
                    Booking Successful!
                  </div>
                  <div style={{color: APP.green700, marginBottom: 16}}>
                    Your booking has been confirmed. Redirecting to your dashboard...
                  </div>
                </div>
              ) : (
                <>
                  <Row label="Selected Room:">
                    <span>{ROOM.name}</span>
                  </Row>
                  <Row label="Price per night:">
                    <span>{fmtMoney(ROOM.basePrice)}</span>
                  </Row>
                  <Row label="Available for selected dates:">
                    <span style={{fontWeight: 600, color: APP.green600}}>7 rooms</span>
                  </Row>
                  <Row label="Total Price:">
                    <div style={{textAlign: 'right'}}>
                      <div style={{fontSize: 20, lineHeight: '28px', fontWeight: 700, color: APP.blue600}}>
                        {fmtMoney(STAY_TOTAL)}
                      </div>
                      <div style={{fontSize: 12, color: APP.green600}}>*Custom rates applied</div>
                    </div>
                  </Row>
                  <div style={{position: 'relative', marginTop: 16}}>
                    <Button pressed={frame >= COLD.tapBook && frame < COLD.tapBook + 4}>Book Now</Button>
                    <Tap at={COLD.tapBook} />
                  </div>
                </>
              )}
            </div>
            <div style={{height: 400}} />
          </div>
        </Screen>
      </div>
    </AbsoluteFill>
  );
};
