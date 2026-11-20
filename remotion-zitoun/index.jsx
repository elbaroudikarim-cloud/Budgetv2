import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Reel, TOTAL} from './Reel';

const Root = () => (
  <Composition id="Zitoun" component={Reel} durationInFrames={TOTAL} fps={30} width={1080} height={1920} />
);
registerRoot(Root);
