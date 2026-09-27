import { Image } from 'react-native';

/** Local brand asset shared by web, iOS and Android. */
export function BrandLogo({ prominent = false }: { prominent?: boolean }) {
  return (
    <Image
      source={require('../../../assets/brand/aliapp-logo.png')}
      accessibilityLabel="AliApp"
      accessibilityRole="image"
      resizeMode="contain"
      style={{ width: prominent ? 240 : 150, height: prominent ? 80 : 50 }}
    />
  );
}
