import {AbsoluteFill, Composition} from 'remotion';

const Smoke = () => <AbsoluteFill style={{background: '#111', color: 'white', fontSize: 120, justifyContent: 'center', alignItems: 'center'}}>smoke</AbsoluteFill>;

export const Root = () => <Composition id="Reel" component={Smoke} durationInFrames={30} fps={30} width={1080} height={1920} />;
