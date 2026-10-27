import React from 'react';

function HeadphonesShape() {
  return <>
    <path d="M52 290v-40C52 131 142 44 256 44s204 87 204 206v40h-36v-40c0-99-72-170-168-170S88 151 88 250v40Z" />
    <rect x="28" y="294" width="48" height="120" rx="23" />
    <rect x="54" y="264" width="88" height="184" rx="39" />
    <rect x="436" y="294" width="48" height="120" rx="23" />
    <rect x="370" y="264" width="88" height="184" rx="39" />
  </>;
}

function NewspaperShape({ compact = false }) {
  return <>
    <path fillRule="evenodd" d="M176 216h144a12 12 0 0 1 12 12v166a20 20 0 0 1-20 20H176a12 12 0 0 1-12-12V228a12 12 0 0 1 12-12Zm2 14v170h134a6 6 0 0 0 6-6V230Z" />
    <path d="M332 248h18v146a20 20 0 0 1-20 20h-22v-14h22a6 6 0 0 0 6-6V262h-4Z" />
    <rect x="188" y="248" width="118" height="14" rx="3" />
    <rect x="188" y="282" width="44" height="48" rx="3" />
    <rect x="246" y="282" width="60" height="10" rx="2" />
    <rect x="246" y="302" width="60" height="10" rx="2" />
    {!compact && <rect x="246" y="322" width="44" height="10" rx="2" />}
    <rect x="188" y="350" width="118" height="10" rx="2" />
    {!compact && <rect x="188" y="372" width="100" height="10" rx="2" />}
  </>;
}

/** The approved flat mark, with the larger newspaper in its original v2 position. */
export default function Logo({ size = 24, color = 'currentColor', decorative = false }) {
  return <svg width={size} height={size} viewBox="0 0 512 512" fill={color}
    role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : 'RadioNews'}
    aria-hidden={decorative ? true : undefined} focusable="false" style={{ flexShrink: 0 }}>
    <HeadphonesShape />
    <g transform="translate(257 295) scale(1.12) translate(-257 -315)"><NewspaperShape /></g>
  </svg>;
}

export function ListenIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="24 12 464 464" fill="currentColor"
    aria-hidden="true" focusable="false" style={{ flexShrink: 0 }}><HeadphonesShape /></svg>;
}

export function ReadIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="148 206 218 218" fill="currentColor"
    aria-hidden="true" focusable="false" style={{ flexShrink: 0 }}><NewspaperShape compact /></svg>;
}
