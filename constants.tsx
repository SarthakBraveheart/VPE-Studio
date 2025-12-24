
import React from 'react';
import { VoiceOption } from './types';

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'Kore', name: 'Stoic Male (Deep)', icon: '🗿', gender: 'male' },
  { id: 'Puck', name: 'Enthusiastic Youth', icon: '⚡', gender: 'male' },
  { id: 'Fenrir', name: 'The Storyteller', icon: '📖', gender: 'male' },
  { id: 'Aoede', name: 'Soothing Female', icon: '🍃', gender: 'female' },
  { id: 'Leda', name: 'Professional News', icon: '🎙️', gender: 'female' },
  { id: 'Zephyr', name: 'Friendly Agent', icon: '🌬️', gender: 'male' }
];

export const NEGATIVE_CONSTRAINTS = `
  CRITICAL NEGATIVE CONSTRAINTS (STRICT ADHERENCE REQUIRED):
  - Do NOT generate Hindu religious symbols.
  - EXCLUDE: Om symbols, Saffron/Orange Flags (Bhagwa), Hindu Temple Arches, Idols of Hindu Deities, Trishuls, Tikka/Bindi.
  - Keep the aesthetic strictly aligned with the script's specific context or completely Neutral/Cinematic.
`;

export const ASPECT_RATIOS = ['9:16', '16:9', '1:1'] as const;
