/**
 * CategoryIcon — flat Lucide icon for content categories,
 * emoji flag for country categories (UAE, KSA, QAT, LEB).
 *
 * Props:
 *   category  — category name string
 *   size      — icon size in px (default 13)
 *   color     — stroke color (default 'currentColor')
 */
import React from 'react';
import {
  Globe,
  Cpu,
  Briefcase,
  Landmark,
  Trophy,
  Clapperboard,
  FlaskConical,
  HeartPulse,
  Zap,
  BrainCircuit,
  Bitcoin,
  Goal,
  CircleDot,
} from 'lucide-react';

const LUCIDE = {
  'World News':    Globe,
  'Technology':    Cpu,
  'Business':      Briefcase,
  'Politics':      Landmark,
  'Sports':        Trophy,
  'Entertainment': Clapperboard,
  'Science':       FlaskConical,
  'Health':        HeartPulse,
  'My Rundown':    Zap,
  'AI':            BrainCircuit,
  'Crypto':        Bitcoin,
  'Football':      Goal,
  'Basketball':    CircleDot,
};

const FLAGS = {
  'UAE': '🇦🇪',
  'KSA': '🇸🇦',
  'QAT': '🇶🇦',
  'LEB': '🇱🇧',
};

export default function CategoryIcon({ category, size = 13, color = 'currentColor' }) {
  const flag = FLAGS[category];
  if (flag) {
    return <span style={{ fontSize: size * 1.15, lineHeight: 1 }}>{flag}</span>;
  }
  const Icon = LUCIDE[category];
  if (Icon) {
    return <Icon size={size} color={color} strokeWidth={1.8} />;
  }
  return null;
}
