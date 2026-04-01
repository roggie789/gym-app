import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';

type Style = ViewStyle | TextStyle | ImageStyle;
type StyleArray = (Style | false | undefined | null)[];

/**
 * Combines multiple style objects into one, similar to Tailwind's cn() function
 * Filters out falsy values and merges styles
 */
export function cn(...styles: StyleArray): Style {
  return StyleSheet.flatten(styles.filter(Boolean) as Style[]);
}
