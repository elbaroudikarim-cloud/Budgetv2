import React from 'react';
import {AbsoluteFill, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';

// Zones sûres (1080 × 1920) : marges latérales 145 px, rien sous y = 1350, rien dans la colonne de boutons à droite (x > 915, y 1050-1720), rien au-dessus de y = 180.
const ML = 145, MR = 915, SAFE_W = 760;
const IVORY = '#F6F1E6', GOLD = '#C9A96E', INK = '#0E0D0C';

const fontFaces = `
@font-face{font-family:Cardo;src:url(${staticFile('Cardo-Regular.ttf')});}
@font-face{font-family:CardoI;src:url(${staticFile('Cardo-Italic.ttf')});}
@font-face{font-family:Mont;src:url(${staticFile('Montserrat.ttf')});font-weight:100 900;}
`;
const serif = {fontFamily: 'Cardo'}, serifI = {fontFamily: 'CardoI'}, sans = {fontFamily: 'Mont', fontWeight: 500};
const shadow = '0 2px 16px rgba(0,0,0,.6), 0 1px 3px rgba(0,0,0,.7)';

const D = (f, a, b, c, d, e = Easing.inOut(Easing.cubic)) => interpolate(f, [a, b], [c, d], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e});

// photo en mouvement lent (zoom + glissement)
const Photo = ({src, dur, z0 = 1.08, z1 = 1.22, x0 = 0, x1 = -6, y0 = 0, y1 = 0}) => {
  const f = useCurrentFrame();
  const p = D(f, 0, dur, 0, 1, Easing.inOut(Easing.sin));
  const z = z0 + (z1 - z0) * p, x = x0 + (x1 - x0) * p, y = y0 + (y1 - y0) * p;
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: INK}}>
      <Img src={staticFile(src)} style={{position: 'absolute', height: '100%', left: '50%', top: 0,
        transform: `translateX(-50%) translate(${x}%, ${y}%) scale(${z})`, filter: 'brightness(1.07) contrast(1.04) saturate(1.0)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,.28) 0%, rgba(0,0,0,0) 15%, rgba(0,0,0,0) 50%, rgba(0,0,0,.38) 60%, rgba(0,0,0,.45) 70%, rgba(0,0,0,.25) 84%, rgba(0,0,0,.12) 100%)'}} />
    </AbsoluteFill>
  );
};

// volet d'entrée : la nouvelle scène glisse par-dessus l'ancienne
const Wipe = ({children, dir = 1, len = 14}) => {
  const f = useCurrentFrame();
  const p = D(f, 0, len, 100, 0, Easing.out(Easing.cubic));
  const clip = dir > 0 ? `inset(0 0 0 ${p}%)` : `inset(0 ${p}% 0 0)`;
  return <AbsoluteFill style={{clipPath: clip}}>{children}</AbsoluteFill>;
};

const Pop = ({delay = 0, children, style}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 14, stiffness: 120, mass: 0.8}});
  return <div style={{opacity: Math.min(1, s * 1.4), transform: `translateY(${(1 - s) * 40}px) scale(${0.92 + 0.08 * s})`, ...style}}>{children}</div>;
};

const DataBar = ({text}) => {
  const f = useCurrentFrame();
  return <div style={{position: 'absolute', top: 210, left: ML, width: SAFE_W, textAlign: 'center', ...sans, fontWeight: 600, fontSize: 31, letterSpacing: 7,
    color: IVORY, textShadow: shadow, opacity: D(f, 4, 18, 0, 1)}}>{text}</div>;
};

// étiquette de pièce : trait doré qui se dessine, chiffre romain, nom, détail
const RoomTag = ({num, room, detail, delay = 10}) => {
  const f = useCurrentFrame();
  const w = D(f, delay, delay + 14, 0, 70, Easing.out(Easing.cubic));
  return (
    <div style={{position: 'absolute', left: ML, top: 1110, width: MR - ML - 40}}>
      <div style={{height: 3, width: w, background: GOLD, marginBottom: 26}} />
      <Pop delay={delay + 6}>
        <div style={{...serifI, fontSize: 92, color: IVORY, textShadow: shadow, lineHeight: 1}}>
          <span style={{...serif, fontSize: 50, color: GOLD, marginRight: 22, verticalAlign: 'middle'}}>{num}</span>{room}
        </div>
      </Pop>
      <Pop delay={delay + 14}>
        <div style={{...sans, fontWeight: 600, fontSize: 31, letterSpacing: 4.5, color: IVORY, marginTop: 22, textShadow: shadow + ', 0 0 24px rgba(0,0,0,.5)', lineHeight: 1.45}}>{detail}</div>
      </Pop>
    </div>
  );
};

// compteur animé
const Counter = ({to, suffix, label, delay}) => {
  const f = useCurrentFrame();
  const v = Math.round(D(f, delay, delay + 28, 0, to, Easing.out(Easing.cubic)));
  return (
    <Pop delay={delay}>
      <div style={{textAlign: 'center', minWidth: 300}}>
        <div style={{...serif, fontSize: 132, color: IVORY, textShadow: shadow, lineHeight: 1}}>{v}<span style={{fontSize: 70}}>{suffix}</span></div>
        <div style={{...sans, fontWeight: 600, fontSize: 28, letterSpacing: 7, color: IVORY, marginTop: 10, textShadow: shadow}}>{label}</div>
      </div>
    </Pop>
  );
};

// ouverture : plan stylisé de la médina qui se dessine, point qui pulse, puis ouverture circulaire sur le riad
const Intro = () => {
  const f = useCurrentFrame();
  const lines = ['M80 1180 L420 980 L560 1010 L1000 760', 'M210 400 L470 900 L520 1300 L460 1700', 'M60 760 L360 820 L540 960 L1040 1080',
    'M700 260 L640 620 L560 960', 'M560 960 L760 1180 L900 1560', 'M300 1500 L520 1300 L820 1380'];
  const reveal = D(f, 92, 128, 0, 1500, Easing.in(Easing.cubic));
  const pulse = 1 + 0.25 * Math.sin(f / 5);
  return (
    <AbsoluteFill style={{background: INK}}>
      <svg width="1080" height="1920" style={{position: 'absolute'}}>
        {lines.map((d, i) => <path key={i} d={d} stroke={GOLD} strokeOpacity={0.55} strokeWidth={2.5} fill="none"
          strokeDasharray="1600" strokeDashoffset={D(f, 4 + i * 5, 50 + i * 5, 1600, 0)} />)}
        <circle cx="560" cy="960" r={18 * pulse} fill="none" stroke={GOLD} strokeWidth="3" opacity={D(f, 40, 52, 0, 1)} />
        <circle cx="560" cy="960" r="8" fill={GOLD} opacity={D(f, 40, 52, 0, 1)} />
      </svg>
      <div style={{position: 'absolute', top: 470, left: ML, width: SAFE_W, textAlign: 'center'}}>
        <Pop delay={10}><div style={{...sans, fontSize: 34, letterSpacing: 14, color: IVORY}}>MARRAKECH</div></Pop>
        <Pop delay={20}><div style={{...serifI, fontSize: 54, color: GOLD, marginTop: 18}}>Médina · Riad Zitoun</div></Pop>
      </div>
      <div style={{position: 'absolute', top: 1040, left: ML, width: SAFE_W, textAlign: 'center'}}>
        <Pop delay={50}><div style={{...sans, fontSize: 27, letterSpacing: 4, color: IVORY, lineHeight: 1.5}}>À QUELQUES MÈTRES<br />DU PALAIS DE LA BAHIA</div></Pop>
      </div>
      <AbsoluteFill style={{clipPath: `circle(${reveal}px at 560px 960px)`}}>
        <Photo src="p9.jpg" dur={160} z0={1.25} z1={1.12} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Title = () => (
  <AbsoluteFill>
    <Photo src="p9.jpg" dur={150} z0={1.12} z1={1.0} />
    <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 28%, rgba(0,0,0,.32) 37%, rgba(0,0,0,.32) 60%, rgba(0,0,0,0) 70%)'}} />
    <div style={{position: 'absolute', top: 640, left: ML, width: SAFE_W, textAlign: 'center'}}>
      <Pop delay={4}><div style={{...sans, fontWeight: 600, fontSize: 30, letterSpacing: 11, color: IVORY, textShadow: shadow + ', 0 0 24px rgba(0,0,0,.5)'}}>IMMO MAROC</div></Pop>
      <Pop delay={10}><div style={{...serif, fontSize: 138, color: IVORY, textShadow: shadow, marginTop: 22, lineHeight: 1}}>Riad Zitoun</div></Pop>
      <Pop delay={18}><div style={{...serifI, fontSize: 62, color: IVORY, textShadow: shadow, marginTop: 14}}>Médina de Marrakech</div></Pop>
      <Pop delay={26}><div style={{...sans, fontWeight: 600, fontSize: 30, letterSpacing: 12, color: IVORY, textShadow: shadow + ', 0 0 24px rgba(0,0,0,.5)', marginTop: 30}}>À VENDRE</div></Pop>
    </div>
  </AbsoluteFill>
);

const Figures = () => (
  <AbsoluteFill>
    <Photo src="p1.jpg" dur={170} z0={1.05} z1={1.2} x0={4} x1={-4} />
    <DataBar text="RIAD ZITOUN  ·  194 M²  ·  4 SUITES" />
    <div style={{position: 'absolute', top: 520, left: ML, width: SAFE_W, display: 'flex', justifyContent: 'space-around', padding: '34px 0', background: 'rgba(14,13,12,.42)', backdropFilter: 'blur(14px)', borderTop: `1.5px solid ${GOLD}`, borderBottom: `1.5px solid ${GOLD}`}}>
      <Counter to={194} suffix=" m²" label="AU SOL" delay={10} />
      <Counter to={4} suffix="" label="SUITES" delay={22} />
    </div>
    <RoomTag num="I" room="Le patio" detail={'PATIO PLANTÉ\nBASSIN CHAUFFÉ'.split('\n').map((l, i) => <div key={i}>{l}</div>)} delay={40} />
  </AbsoluteFill>
);

const Room = ({src, num, room, detail, dur, z0, z1, x0, x1}) => (
  <AbsoluteFill>
    <Photo src={src} dur={dur} z0={z0} z1={z1} x0={x0} x1={x1} />
    <DataBar text="RIAD ZITOUN  ·  194 M²  ·  4 SUITES" />
    <RoomTag num={num} room={room} detail={detail} delay={8} />
  </AbsoluteFill>
);

const Fiche = () => {
  const facts = [['SITUATION', 'Près du palais de la Bahia'], ['PARKING', 'À proximité'], ['ÉTAT', 'Entièrement rénové'], ['MOBILIER', 'Vendu meublé'],
    ['SURFACE', '194 m² au sol'], ['SUITES', '4, salle de bain et dressing'], ['PATIO', 'Planté, bassin chauffé'], ['SALON', 'Avec cheminée'], ['TOIT', "Cuisine d'été, pergola, barbecue"]];
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: INK}}>
      <AbsoluteFill style={{opacity: 0.22, filter: 'blur(28px)'}}><Photo src="p5.jpg" dur={150} /></AbsoluteFill>
      <div style={{position: 'absolute', top: 250, left: ML, width: SAFE_W}}>
        <Pop><div style={{...sans, fontSize: 25, letterSpacing: 6, color: GOLD, textAlign: 'center'}}>RIAD ZITOUN  ·  RÉF. 87560253</div></Pop>
        <Pop delay={6}><div style={{...serifI, fontSize: 84, color: IVORY, textAlign: 'center', marginTop: 12, marginBottom: 26}}>Fiche technique</div></Pop>
        {facts.map(([k, v], i) => (
          <div key={k} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1.5px solid rgba(201,169,110,.45)',
            height: 84, opacity: D(f, 12 + i * 5, 22 + i * 5, 0, 1), transform: `translateX(${D(f, 12 + i * 5, 24 + i * 5, 40, 0)}px)`}}>
            <span style={{...sans, fontSize: 22, letterSpacing: 3, color: '#D7D0C2'}}>{k}</span>
            <span style={{...serif, fontSize: 40, color: IVORY}}>{v}</span>
          </div>
        ))}
        <div style={{borderTop: '1.5px solid rgba(201,169,110,.45)'}} />
      </div>
    </AbsoluteFill>
  );
};

const End = () => (
  <AbsoluteFill style={{background: INK}}>
    <div style={{position: 'absolute', top: 330, left: ML, width: SAFE_W, textAlign: 'center'}}>
      <Pop><div style={{...serifI, fontSize: 104, color: IVORY}}>Prix sur demande</div></Pop>
      <Pop delay={6}><div style={{...serif, fontSize: 44, color: '#CDC6B8', marginTop: 24}}>Riad rénové et meublé · Riad Zitoun</div></Pop>
      <Pop delay={10}><div style={{...serif, fontSize: 40, color: '#AAA396', marginTop: 10}}>194 m² au sol · 4 suites · bassin chauffé</div></Pop>
      <div style={{width: 90, height: 2, background: GOLD, margin: '60px auto'}} />
      <Pop delay={16}><div style={{...sans, fontWeight: 400, fontSize: 64, letterSpacing: 26, color: IVORY, marginLeft: 26}}>IMMO MAROC</div></Pop>
      <Pop delay={20}><div style={{...sans, fontSize: 29, letterSpacing: 9, color: '#D7D0C2', marginTop: 20}}>MARRAKECH  ·  DEPUIS 2001</div></Pop>
      <Pop delay={28}><div style={{...serif, fontSize: 58, color: IVORY, marginTop: 120}}>WhatsApp  +212 6 69 29 02 90</div></Pop>
      <Pop delay={32}><div style={{...serifI, fontSize: 48, color: '#CDC6B8', marginTop: 18}}>contact@immo-maroc.com</div></Pop>
      <Pop delay={36}><div style={{...sans, fontSize: 28, letterSpacing: 8, color: '#B4AEA2', marginTop: 50}}>RÉF. 87560253</div></Pop>
    </div>
  </AbsoluteFill>
);

// enchaînement : chaque scène chevauche la précédente de 14 images (volet)
const scenes = [
  [Intro, 132, 0],
  [Title, 150, 0],
  [Figures, 170, 1],
  [() => <Room src="p2.jpg" num="II" room="Le salon" detail="VENDU MEUBLÉ" dur={120} z0={1.1} z1={1.22} x0={-5} x1={5} />, 120, -1],
  [() => <Room src="p4.jpg" num="III" room="Les suites" detail="SALLE DE BAIN ET DRESSING" dur={120} z0={1.16} z1={1.06} x0={14} x1={9} />, 120, 1],
  [() => <Room src="p3.jpg" num="IV" room="La salle de bain" detail="DANS CHAQUE SUITE" dur={110} z0={1.08} z1={1.2} x0={0} x1={-5} />, 110, -1],
  [() => <Room src="p8.jpg" num="V" room="Sur le toit" detail={"CUISINE D'ÉTÉ ET PERGOLA"} dur={120} z0={1.1} z1={1.22} x0={6} x1={-6} />, 120, 1],
  [() => <Room src="p10.jpg" num="VI" room="Le toit-terrasse" detail="POUR Y VIVRE OU LE LOUER" dur={120} z0={1.2} z1={1.06} x0={-5} x1={4} />, 120, -1],
  [Fiche, 165, 1],
  [End, 165, -1],
];
const OV = 14;
export const TOTAL = scenes.reduce((a, [, d]) => a + d, 0) - OV * (scenes.length - 1);

export const Reel = () => {
  let t = 0;
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: INK}}>
      <style>{fontFaces}</style>
      {scenes.map(([C, d, dir], i) => {
        const from = t; t += d - OV;
        return (
          <Sequence key={i} from={from} durationInFrames={d}>
            {i === 0 ? <C /> : <Wipe dir={dir}><C /></Wipe>}
          </Sequence>
        );
      })}
      <AbsoluteFill style={{background: '#000', opacity: D(f, 0, 12, 1, 0), pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
