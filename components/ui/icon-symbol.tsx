// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Partial<
  Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>
>;
type IconSymbolName = SymbolViewProps['name'];

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING: IconMapping = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  gauge: 'speed',
  calendar: 'calendar-today',
  'chart.bar.fill': 'insert-chart',
  'wrench.and.screwdriver': 'handyman',
  'person.crop.circle': 'account-circle',
  'person.fill': 'person',
  magnifyingglass: 'search',
  'barcode.viewfinder': 'qr-code-scanner',
  'camera.fill': 'photo-camera',
  'camera.viewfinder': 'center-focus-weak',
  'rectangle.portrait.and.arrow.right': 'logout',
  'trash.fill': 'delete',
  'photo.fill': 'collections',
  'mic.fill': 'mic',
  'heart.fill': 'favorite',
  scalemass: 'monitor-weight',
  'scalemass.fill': 'monitor-weight',
  'tray.and.arrow.down': 'file-download',
  'drop.fill': 'opacity',
  'flame.fill': 'local-fire-department',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const materialName = MAPPING[name];

  if (__DEV__ && !materialName) {
    console.warn(`IconSymbol: missing Material icon mapping for "${name}"`);
  }

  return <MaterialIcons color={color} size={size} name={materialName ?? 'help-outline'} style={style} />;
}
