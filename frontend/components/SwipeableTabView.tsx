import React, { useRef, useMemo } from 'react';
import {
  View,
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SNAP_THRESHOLD = SCREEN_WIDTH * 0.25;
const SNAP_VELOCITY = 0.5;

interface SwipeableTabViewProps {
  tabs: React.ReactNode[];
  activeIndex: number;
  onChangeIndex: (index: number) => void;
}

export function SwipeableTabView({
  tabs,
  activeIndex,
  onChangeIndex,
}: SwipeableTabViewProps) {
  const tabCount = tabs.length;
  const translateX = useRef(new Animated.Value(-activeIndex * SCREEN_WIDTH)).current;
  const isAnimating = useRef(false);
  const activeRef = useRef(activeIndex);

  const propsRef = useRef({ activeIndex, onChangeIndex, tabCount });
  propsRef.current = { activeIndex, onChangeIndex, tabCount };

  // When activeIndex changes externally (tab press), animate to the new position
  if (activeRef.current !== activeIndex) {
    activeRef.current = activeIndex;
    if (!isAnimating.current) {
      Animated.timing(translateX, {
        toValue: -activeIndex * SCREEN_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gs) => {
          if (isAnimating.current) return false;
          return Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 12;
        },
        onPanResponderMove: (_, gs) => {
          const { activeIndex: idx, tabCount: count } = propsRef.current;
          let dx = gs.dx;
          if (idx === 0 && dx > 0) dx = 0;
          if (idx === count - 1 && dx < 0) dx = 0;
          translateX.setValue(-idx * SCREEN_WIDTH + dx);
        },
        onPanResponderRelease: (_, gs) => {
          const { activeIndex: idx, onChangeIndex: change, tabCount: count } = propsRef.current;
          const { dx, vx } = gs;

          let targetIndex = idx;
          if ((dx > SNAP_THRESHOLD || (dx > 0 && vx > SNAP_VELOCITY)) && idx > 0) {
            targetIndex = idx - 1;
          } else if ((dx < -SNAP_THRESHOLD || (dx < 0 && vx < -SNAP_VELOCITY)) && idx < count - 1) {
            targetIndex = idx + 1;
          }

          isAnimating.current = true;
          Animated.timing(translateX, {
            toValue: -targetIndex * SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(({ finished }) => {
            isAnimating.current = false;
            if (finished && targetIndex !== idx) {
              activeRef.current = targetIndex;
              change(targetIndex);
            }
          });
        },
      }),
    [],
  );

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Animated.View
        style={[
          styles.strip,
          {
            width: SCREEN_WIDTH * tabCount,
            transform: [{ translateX }],
          },
        ]}
      >
        {tabs.map((tab, i) => (
          <View key={i} style={[styles.page, { width: SCREEN_WIDTH }]}>
            {tab}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  strip: {
    flex: 1,
    flexDirection: 'row',
  },
  page: {
    height: '100%',
    overflow: 'hidden',
  },
});
