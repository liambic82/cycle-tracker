import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform, Text, type TextProps } from 'react-native';

// Use once at a screen/form entry, not for every section heading. Conditional
// forms unmount their opener; move focus to the new context instead of the body.
export function ScreenHeading({
  children,
  autoFocus = true,
  focusKey,
  ...props
}: TextProps & { autoFocus?: boolean; focusKey?: string | number | boolean }) {
  const element = useRef<Text>(null);
  const title = React.Children.toArray(children)
    .filter((child) => typeof child === 'string' || typeof child === 'number')
    .join('');
  useEffect(() => {
    if (!autoFocus) return;
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      const target = element.current;
      if (!target) return;
      if (Platform.OS === 'web') {
        const node = target as unknown as HTMLElement;
        if (!node.isConnected || node.closest('[inert], [aria-hidden="true"]')) return;
        node.tabIndex = -1;
        // A context announcement, not a control. Interactive controls retain
        // their normal keyboard focus indicators.
        node.style.outline = 'none';
        node.focus({ preventScroll: true });
      } else {
        void AccessibilityInfo.isScreenReaderEnabled().then(
          (enabled) => {
            if (enabled && !cancelled && element.current === target)
              AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
          },
          () => {
            /* Heading navigation remains available if the service is unavailable. */
          },
        );
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [title, autoFocus, focusKey]);
  return (
    <Text {...props} ref={element} accessibilityRole="header">
      {children}
    </Text>
  );
}
