import React from 'react';
import { Variants } from 'framer-motion';

/**
 * RDS_MEDIA_CARD_PROTOCOL
 * Discriminated union for interaction states to ensure type safety.
 */
export type InteractionStatus = 'idle' | 'hover' | 'active' | 'loading' | 'success' | 'error' | 'disabled';

export interface MediaCardProps {
  title: string;
  subtitle?: string;
  imageUrl: string;
  status?: InteractionStatus;
  score?: number;
  popularity?: number;
  studio?: string;
  synopsis?: string;
  genres?: string[];
  onClick?: () => void;
  className?: string;
}

export interface MediaCardState {
  status: InteractionStatus;
}

/**
 * Framer Motion Variant Contracts
 */
export interface MediaCardVariants extends Variants {
  idle: any;
  hover: any;
  active: any;
  loading: any;
  success: any;
  error: any;
}
