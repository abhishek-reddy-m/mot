import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Handset, Phone} from '../components/Phone.tsx';
import {Slap} from '../components/Type.tsx';
import {BookPanel, RoomCard, SiteNav} from '../mockups.tsx';
import {Screen} from '../../mockups/ui.tsx';
import {APP} from '../../theme.ts';
import {C, F} from '../theme.ts';
import {prog, rel, wordAt} from '../timeline.ts';

/** The guest checks availability, picks dates and books, at 11:48 PM. */
export const BookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const free = rel(wordAt('n_book', 'free'), 'book');
  const pick = rel(wordAt('n_book', 'pick'), 'book');
  const book = rel(wordAt('n_book', 'book'), 'book');
  const no = rel(wordAt('n_book', 'No'), 'book');
  const scroll = prog(frame, pick + 4, 12) * 330;
  const booked = frame >= book + 5;

  return (
    <AbsoluteFill style={{background: C.night}}>
      <div
        style={{
          position: 'absolute',
          left: -200,
          top: 300,
          width: 1480,
          height: 1300,
          background: 'radial-gradient(closest-side, rgba(96,140,255,0.22), rgba(96,140,255,0))',
        }}
      />
      <div style={{position: 'absolute', left: 270, top: 250}}>
        <Phone width={540} time="11:48">
          <div style={{position: 'absolute', inset: 0, background: APP.gray50, paddingTop: 54, overflow: 'hidden'}}>
            <Screen width={510}>
              <div style={{position: 'relative', zIndex: 1}}>
                <SiteNav />
              </div>
              <div style={{height: 760, overflow: 'hidden'}}>
                <div style={{padding: '16px 16px', transform: `translateY(${-scroll}px)`}}>
                  <div style={{fontSize: 26, lineHeight: '32px', fontWeight: 700, marginBottom: 12}}>Available Rooms</div>
                  <RoomCard spotAvail={frame >= free && frame < pick} spotDates={frame >= pick - 4 && frame < pick + 6} tapAt={pick} selected={frame >= pick} />
                  <div style={{height: 22}} />
                  <BookPanel booked={booked} tapAt={book} />
                </div>
              </div>
            </Screen>
          </div>
        </Phone>
      </div>

      {frame >= no ? (
        <div style={{position: 'absolute', left: 690, top: 1180}}>
          <Slap at={no} rotate={8}>
            <div
              style={{
                width: 250,
                height: 250,
                borderRadius: 250,
                background: C.amber,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
                position: 'relative',
              }}
            >
              <Handset size={92} color={C.navy} />
              <div style={{position: 'absolute', width: 150, height: 12, borderRadius: 6, background: C.navy, transform: 'rotate(-45deg)', top: 104}} />
              <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 30, color: C.navy, marginTop: 10}}>No call</div>
            </div>
          </Slap>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
