import { StyleSheet, View } from 'react-native';

import { colors } from '../tokens';

export function Divider() {
  return <View style={styles.line} />;
}

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
