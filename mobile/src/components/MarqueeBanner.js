import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// A brief, self-contained overlay for transient notices (e.g. "Welcome,
// obeng!") — plain scrolling text, no background pill, no dismiss button.
// Rendered as a sibling of SafeAreaView (see App.js) and positioned
// absolutely off its own measured safe-area inset, so it floats on top of
// whatever screen is showing without reserving layout space or shifting
// anything else — mounting/unmounting it never moves the Header, body, or
// BottomNav. The caller owns how long it stays mounted (App.js's smsAlert
// timeout); this component only owns the scroll animation while it's up.
export default function MarqueeBanner({ text }) {
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const loopRef = useRef(null);

  useEffect(() => {
    if (!containerWidth || !textWidth) return undefined;

    // Starts just off the left edge, animates to just off the right edge,
    // then jumps back to the start — a classic marquee loop. Runs
    // continuously for as long as this component stays mounted.
    translateX.setValue(-textWidth);
    loopRef.current = Animated.loop(
      Animated.timing(translateX, {
        toValue: containerWidth,
        duration: 3500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loopRef.current.start();

    return () => loopRef.current?.stop();
  }, [containerWidth, textWidth, translateX]);

  const ready = containerWidth > 0 && textWidth > 0;

  return (
    <View style={[styles.overlay, { top: insets.top + 8 }]} pointerEvents="none">
      <View style={styles.track} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
        <Animated.Text
          style={[styles.text, { opacity: ready ? 1 : 0, transform: [{ translateX }] }]}
          numberOfLines={1}
          onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
        >
          {text}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 50,
  },
  track: {
    overflow: 'hidden',
    height: 20,
  },
  text: {
    position: 'absolute',
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
