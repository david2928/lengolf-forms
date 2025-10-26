/**
 * GolfNotificationIcon Component
 *
 * A golf-themed notification icon with a tee and ball.
 * - Tee is always visible
 * - Ball appears on top when there are unread notifications
 * - Ball disappears when no notifications
 */

interface GolfNotificationIconProps {
  /** Whether there are unread notifications (shows ball) */
  hasNotifications: boolean;
  /** Size of the icon in pixels */
  size?: number;
  /** Color of the tee */
  teeColor?: string;
  /** Color of the ball */
  ballColor?: string;
}

export function GolfNotificationIcon({
  hasNotifications,
  size = 24,
  teeColor = 'currentColor',
  ballColor = '#FFFFFF',
}: GolfNotificationIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Golf Ball - Only visible when hasNotifications is true */}
      {hasNotifications && (
        <g id="ball">
          {/* Ball outline - hollow circle with stroke */}
          <circle
            cx="12"
            cy="7.5"
            r="5.5"
            fill="white"
            stroke={teeColor}
            strokeWidth="1.5"
          />
          {/* Solid dimples on left side */}
          <g fill={teeColor}>
            <circle cx="9" cy="5" r="0.6" />
            <circle cx="8.5" cy="6.5" r="0.6" />
            <circle cx="10" cy="6.5" r="0.6" />
            <circle cx="8" cy="8" r="0.6" />
            <circle cx="9.5" cy="8" r="0.6" />
            <circle cx="8.5" cy="9.5" r="0.6" />
            <circle cx="10" cy="9.5" r="0.6" />
            <circle cx="9" cy="11" r="0.6" />
          </g>
        </g>
      )}

      {/* Golf Tee - Realistic golf tee shape */}
      <g id="tee">
        {/* Wide top platform */}
        <rect
          x="9"
          y="14"
          width="6"
          height="1"
          fill={teeColor}
        />
        {/* Tapered neck */}
        <path
          d="M 9 15 L 15 15 L 13 18 L 11 18 Z"
          fill={teeColor}
        />
        {/* Nearly parallel shaft to bottom */}
        <rect
          x="11"
          y="18"
          width="2"
          height="5"
          fill={teeColor}
        />
      </g>
    </svg>
  );
}
