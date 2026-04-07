import { distanceBetweenCoordinatesMeters, formatDistanceMiles, type CoordinatePoint } from './locationDistance';

const METERS_PER_MILE = 1609.344;

export const REPORT_RADIUS_MILES = 0.5;
export const REPORT_RADIUS_METERS = REPORT_RADIUS_MILES * METERS_PER_MILE;
const REPORT_RADIUS_LABEL = REPORT_RADIUS_MILES === 0.5 ? 'half a mile' : `${REPORT_RADIUS_MILES} ${REPORT_RADIUS_MILES === 1 ? 'mile' : 'miles'}`;

export type ReportRadiusStatus =
  | 'within_radius'
  | 'missing_device_location'
  | 'missing_report_location'
  | 'out_of_range';

export type ReportRadiusState = {
  distanceMeters: number | null;
  isWithinRadius: boolean;
  status: ReportRadiusStatus;
  message: string;
};

export function getReportRadiusState(
  deviceLocation: CoordinatePoint | null | undefined,
  reportLocation: CoordinatePoint | null | undefined
): ReportRadiusState {
  if (!reportLocation) {
    return {
      distanceMeters: null,
      isWithinRadius: false,
      status: 'missing_report_location',
      message: 'A report location is required before you can continue.',
    };
  }

  if (!deviceLocation) {
    return {
      distanceMeters: null,
      isWithinRadius: false,
      status: 'missing_device_location',
      message: 'Current location is required to verify this report.',
    };
  }

  const distanceMeters = distanceBetweenCoordinatesMeters(deviceLocation, reportLocation);
  if (distanceMeters === null) {
    return {
      distanceMeters: null,
      isWithinRadius: false,
      status: 'missing_device_location',
      message: 'Current location is required to verify this report.',
    };
  }

  if (distanceMeters > REPORT_RADIUS_METERS) {
    return {
      distanceMeters,
      isWithinRadius: false,
      status: 'out_of_range',
      message: `This report is about ${formatDistanceMiles(distanceMeters)} away. Reports must be created within ${REPORT_RADIUS_LABEL} of your current location.`,
    };
  }

  return {
    distanceMeters,
    isWithinRadius: true,
    status: 'within_radius',
    message: `Within ${REPORT_RADIUS_LABEL} of your current location.`,
  };
}
