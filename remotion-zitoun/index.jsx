import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Reel, TOTAL} from './Reel';
import {Reel as ReelA, TOTAL as TOTAL_A} from './ReelAmelkis';

const Root = () => (
  <>
    <Composition id="Zitoun" component={Reel} durationInFrames={TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="Amelkis" component={ReelA} durationInFrames={TOTAL_A} fps={30} width={1080} height={1920} />
  </>
);
registerRoot(Root);
