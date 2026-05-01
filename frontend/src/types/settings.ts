export type PresetName = 'NEURAL_DARK' | 'CRYOGENIC' | 'SPECTRAL' | 'EUPHORIC' | 'OVERRIDE' | 'HAZARD';
export type Visibility = 'PUBLIC' | 'PRIVATE';
export type DeliveryMode = 'IN_APP' | 'PUSH' | 'IN_APP + PUSH' | 'NONE';

export interface NotificationPrefs {
  airingAlerts: boolean;
  seasonalIntel: boolean;
  communityFeed: boolean;
  scoreUpdates: boolean;
  systemAlerts: boolean;
  backlogReminders: boolean;
  deliveryMode: DeliveryMode;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface AtmosphereConfig {
  file: string | null; // URL or null
  parallax: boolean;
  blurIntensity: number;
  opacity: number;
}

export interface SettingsState {
  activePreset: PresetName;
  glassmorphism: boolean;
  scanAnimations: boolean;
  profileVisibility: Visibility;
  listVisibility: Visibility;
  activityFeed: boolean;
  atmosphere: AtmosphereConfig;
  notifications: NotificationPrefs;
  customColor: string; // Hex code
  profile: any | null; // UserProfile
  isDirty: boolean;
  dirtyCount: number;
}
