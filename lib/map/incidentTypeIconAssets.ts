import type { IncidentType } from '@lib/nostr/config';

export const incidentTypeIconAssetByType: Record<IncidentType, number> = {
  fire: require('../../assets/Icons/64/fire.png'),
  medical: require('../../assets/Icons/64/Medical.png'),
  traffic: require('../../assets/Icons/64/traffic.png'),
  violent_crime: require('../../assets/Icons/64/violent_crime.png'),
  property_crime: require('../../assets/Icons/64/property_crime.png'),
  disturbance: require('../../assets/Icons/64/disturbance.png'),
  suspicious: require('../../assets/Icons/64/suspicious.png'),
  other: require('../../assets/Icons/64/other.png'),
};
