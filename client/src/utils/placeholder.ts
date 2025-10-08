/**
 * Generate placeholder avatar for doctors/users
 * Returns a data URL with initials or default avatar
 */

export function getPlaceholderAvatar(name?: string, size: number = 80): string {
  // Use tooth icon SVG as default placeholder
  const toothSvg = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" fill="%23F3F4F6"/>
      <path d="M12 4C9.5 4 7.73 6.4 7 8.5C6.55 9.8 6 11 6 13C6 17 7 20 9 20C10 20 10.33 19 11 19C11.67 19 12 20 13 20C15 20 16 17 16 13C16 11 15.45 9.8 15 8.5C14.27 6.4 12.5 4 12 4Z" fill="%239CA3AF"/>
    </svg>
  `;

  return `data:image/svg+xml,${encodeURIComponent(toothSvg)}`;
}

/**
 * Alternative: Generate placeholder with initials
 */
export function getInitialsAvatar(name: string, size: number = 80): string {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    { bg: "%233B82F6", text: "%23FFFFFF" }, // blue
    { bg: "%2310B981", text: "%23FFFFFF" }, // green
    { bg: "%23F59E0B", text: "%23FFFFFF" }, // amber
    { bg: "%23EF4444", text: "%23FFFFFF" }, // red
    { bg: "%238B5CF6", text: "%23FFFFFF" }, // violet
    { bg: "%2306B6D4", text: "%23FFFFFF" }, // cyan
  ];

  // Use name to consistently pick a color
  const colorIndex = name.length % colors.length;
  const { bg, text } = colors[colorIndex];

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${bg}"/>
      <text
        x="50%"
        y="50%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${size * 0.4}"
        font-weight="600"
        fill="${text}"
      >${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Get appropriate placeholder based on context
 */
export function getDoctorPlaceholder(doctor: { fullName?: string; profileImage?: string }, size: number = 80): string {
  if (doctor.profileImage) {
    return doctor.profileImage;
  }

  if (doctor.fullName) {
    return getInitialsAvatar(doctor.fullName, size);
  }

  return getPlaceholderAvatar(undefined, size);
}
