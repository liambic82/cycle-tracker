import React, { useLayoutEffect, useRef } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

// A visual cover alone leaves its controls exposed to screen readers/keyboards.
// Keep the mounted content and drafts, but remove interaction while it is covered.
export function InteractionBoundary({
  hidden,
  style,
  children,
}: {
  hidden: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const element = useRef<View>(null);
  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || !element.current) return;
    // React Native Web forwards this ref to its DOM element. Native views use
    // the accessibility props below; inert also blocks web keyboard interaction.
    const node = element.current as unknown as HTMLElement;
    node.inert = hidden;
    return () => {
      node.inert = false;
    };
  }, [hidden]);
  return (
    <View
      ref={element}
      style={style}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      aria-hidden={hidden}
    >
      {children}
    </View>
  );
}
