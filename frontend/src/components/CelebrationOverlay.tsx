import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

interface Props {
  /** Set to true to trigger the celebration. Resets automatically. */
  fire: boolean;
  onComplete?: () => void;
}

export default function CelebrationOverlay({ fire, onComplete }: Props) {
  const confettiRef = useRef<ConfettiCannon>(null);

  useEffect(() => {
    if (fire && confettiRef.current) {
      confettiRef.current.start();
    }
  }, [fire]);

  if (!fire) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <ConfettiCannon
        ref={confettiRef}
        count={120}
        origin={{ x: -10, y: 0 }}
        autoStart
        fadeOut
        fallSpeed={3000}
        explosionSpeed={350}
        colors={['#F1B545', '#1C3C56', '#2A5478', '#F7CF7A', '#517A58', '#D49A2A']}
        onAnimationEnd={onComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
  },
});
