const COLORS = [
  '#F87171', // red
  '#FB923C', // orange
  '#FBBF24', // amber
  '#34D399', // emerald
  '#60A5FA', // blue
  '#818CF8', // indigo
  '#A78BFA', // violet
  '#F472B6', // pink
];

export function generateInitialsAvatar(name: string): string {
  const initial = (name || 'A').charAt(0).toUpperCase();
  const colorIndex = name.length % COLORS.length;
  const color = COLORS[colorIndex];
  const backgroundColor = encodeURIComponent(color);
  
  // Create an SVG with the initial and background color
  const svg = `
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="${color}"/>
      <text 
        x="50" 
        y="50" 
        dy="0.35em"
        fill="white"
        font-family="system-ui"
        font-size="40"
        text-anchor="middle"
        font-weight="bold"
      >
        ${initial}
      </text>
    </svg>
  `;

  // Convert SVG to base64 data URL
  return `data:image/svg+xml;base64,${btoa(svg)}`;
} 