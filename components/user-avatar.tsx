import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { generateAvatarFromEmail } from '@/lib/avatar';

type UserAvatarProps = {
  email?: string | null;
  size?: number;
  testID?: string;
};

function UserAvatarComponent({ email, size = 52, testID }: UserAvatarProps) {
  const avatar = useMemo(() => generateAvatarFromEmail(email), [email]);
  const fontSize = Math.max(16, size * 0.42);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: avatar.backgroundColor,
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={email ? `Avatar for ${email}` : 'Avatar placeholder'}
      testID={testID}
    >
      <Text style={[styles.initials, { color: avatar.foregroundColor, fontSize }]}>{avatar.initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

export const UserAvatar = memo(UserAvatarComponent);
