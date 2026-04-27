import { Variants, Variant } from 'framer-motion';

/**
 * RDS_MEDIA_CARD_PROTOCOL
 * Discriminated union for interaction states to ensure type safety.
 */
export type InteractionStatus = 'idle' | 'hover' | 'active' | 'loading' | 'success' | 'error' | 'disabled';

export interface MediaCardProps {
  title: string;
  subtitle?: string;
  imageUrl: string;
  layout?: 'horizontal' | 'vertical';
  status?: InteractionStatus;
  score?: number;
  popularity?: number;
  studio?: string;
  synopsis?: string;
  genres?: string[];
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export interface MediaCardState {
  status: InteractionStatus;
}

/**
 * Framer Motion Variant Contracts
 */
export interface MediaCardVariants extends Variants {
  idle: Variant;
  hover: Variant;
  active: Variant;
  loading: Variant;
  success: Variant;
  error: Variant;
}
