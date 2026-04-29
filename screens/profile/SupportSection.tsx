import { ProfileRow } from './ProfileRows';
import { ProfileSection } from './ProfileSection';
import type { ThemeColors } from './profileSectionTypes';

type SupportSectionProps = {
  colors: ThemeColors;
  onLogout: () => void;
};

export function SupportSection({ colors, onLogout }: SupportSectionProps) {
  return (
    <ProfileSection colors={colors} title="Support" description="Session and device controls.">
      <ProfileRow
        colors={colors}
        icon="logout"
        title="Logout"
        description="Clear the local session from this device"
        onPress={onLogout}
        danger
      />
    </ProfileSection>
  );
}
