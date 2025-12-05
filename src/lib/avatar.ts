/**
 * Check if a URL is a valid avatar (uploaded or external)
 */
export function isValidAvatarUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    return url.startsWith('http') || url.startsWith('/uploads');
}

/**
 * Get avatar URL with fallback to default
 */
export function getAvatarUrl(
    avatar: string | null | undefined,
    seed: string,
    type: 'user' | 'persona' = 'user'
): string {
    // If avatar exists and is valid, use it
    if (avatar && (avatar.startsWith('http') || avatar.startsWith('/uploads') || avatar.startsWith('/'))) {
        return avatar;
    }
    // Use different default avatars based on type
    return type === 'persona' ? '/avatars/default-persona.jpg' : '/avatars/default-user.jpg';
}
