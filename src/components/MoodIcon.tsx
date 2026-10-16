import React from 'react';
import { MOOD_PRESETS, getMoodEmojiImage } from '../types.ts';

export interface MoodIconProps {
  moodType?: string;
  customDrawing?: string;
  className?: string;
  imgClassName?: string;
  fallbackEmoji?: string;
  alt?: string;
}

/**
 * Renders an emoji icon for a mood:
 * - If user drew a custom mood (customDrawing), renders the hand-drawn image
 * - If mood is a predefined mood, renders the corresponding emoji image from src/assets/emojis
 * - Fallbacks to unicode character if image is unavailable
 */
export const MoodIcon: React.FC<MoodIconProps> = ({
  moodType,
  customDrawing,
  className = 'w-7 h-7',
  imgClassName = '',
  fallbackEmoji = '😊',
  alt,
}) => {
  // 1. Hand-drawn custom mood
  if (customDrawing) {
    return (
      <img
        src={customDrawing}
        alt={alt || 'วาดหน้าตาเอง'}
        className={`rounded-full border border-amber-300 bg-white object-cover shadow-2xs ${className} ${imgClassName}`}
        loading="lazy"
      />
    );
  }

  // 2. Predefined mood with image
  const imgUrl = getMoodEmojiImage(moodType);
  const preset = MOOD_PRESETS.find((p) => p.type === moodType);

  if (imgUrl) {
    return (
      <img
        src={imgUrl}
        alt={alt || preset?.label || moodType || 'อารมณ์'}
        className={`object-contain select-none shrink-0 ${className} ${imgClassName}`}
        loading="lazy"
        draggable={false}
      />
    );
  }

  // 3. Fallback to unicode emoji (e.g. palette icon 🎨 for custom type before drawing)
  return (
    <span
      className={`select-none inline-flex items-center justify-center shrink-0 ${className}`}
      aria-label={alt || preset?.label || moodType}
    >
      {preset?.emoji || fallbackEmoji}
    </span>
  );
};
