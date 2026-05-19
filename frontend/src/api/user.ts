/**
 * RDS_USER_API_PROTOCOL
 * Centralized service for user-related data operations to eliminate API duplication.
 */

import api from './client';

export interface UserProfile {
  username: string;
  avatar_url?: string;
  pfp_url?: string;
  banner_url?: string;
  theme_color?: string;
  atmosphere_url?: string;
  total_titles: number;
  completed: number;
  avg_score: number;
  top_genres: { name: string; count: number }[];
  completed_shows: any[];
}

/**
 * Fetches the complete profile for a specific user.
 * Centralizes logic previously duplicated in layout, settings, and profile pages.
 */
export async function getUserProfile(username: string): Promise<UserProfile> {
  const response = await api.get(`/profile/${username}`);
  return response.data;
}

/**
 * Updates user profile metadata.
 */
export async function updateProfile(data: Partial<UserProfile>) {
  const response = await api.post('/profile/update', data);
  return response.data;
}

/**
 * Fetches user theme selection.
 */
export async function getUserThemeSelection(username: string) {
  const response = await api.get('/user/theme/selection', { params: { username } });
  return response.data;
}

/**
 * Uploads an image file (pfp or banner) to the server.
 */
export async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/upload', formData);
  return response.data;
}
