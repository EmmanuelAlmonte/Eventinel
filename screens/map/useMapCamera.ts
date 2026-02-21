import { useCallback, useEffect, useRef, useState } from 'react';

import { MAPBOX_CONFIG } from '@lib/map/constants';

import {
  AUTO_RESUME_DELAY_MS,
  FLY_TO_DURATION,
  type CameraAnimationMode,
  type CameraRef,
  type MapState,
  type ShapeSourceRef,
} from './config';
import { extractZoomFromProperties } from './helpers';

type UseMapCameraOptions = {
  userLocation: [number, number] | null;
};

export function useMapCamera({ userLocation }: UseMapCameraOptions) {
  const [mapReady, setMapReady] = useState(false);
  const [cameraCenter, setCameraCenter] = useState<[number, number] | null>(null);
  const [animationMode, setAnimationMode] = useState<CameraAnimationMode>('none');
  const [animationDuration, setAnimationDuration] = useState(0);
  const [followUser, setFollowUser] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAnimatingRef = useRef(false);
  const cameraRef = useRef<CameraRef | null>(null);
  const shapeSourceRef = useRef<ShapeSourceRef | null>(null);
  const lastCameraZoomRef = useRef<number>(MAPBOX_CONFIG.DEFAULT_ZOOM);

  useEffect(() => {
    if (userLocation && followUser) {
      setCameraCenter(userLocation);
    }
  }, [userLocation, followUser]);

  useEffect(() => {
    return () => {
      if (animationResetTimerRef.current) {
        clearTimeout(animationResetTimerRef.current);
        animationResetTimerRef.current = null;
      }
      if (autoResumeTimerRef.current) {
        clearTimeout(autoResumeTimerRef.current);
        autoResumeTimerRef.current = null;
      }
    };
  }, []);

  const clearAutoResumeTimer = useCallback(() => {
    if (autoResumeTimerRef.current) {
      clearTimeout(autoResumeTimerRef.current);
      autoResumeTimerRef.current = null;
    }
  }, []);

  const startFlyTo = useCallback((target: [number, number]) => {
    if (isAnimatingRef.current) return false;

    isAnimatingRef.current = true;
    setIsAnimating(true);

    if (animationResetTimerRef.current) {
      clearTimeout(animationResetTimerRef.current);
    }

    setAnimationMode('flyTo');
    setAnimationDuration(FLY_TO_DURATION);
    setCameraCenter(target);

    animationResetTimerRef.current = setTimeout(() => {
      setAnimationMode('none');
      setAnimationDuration(0);
      isAnimatingRef.current = false;
      setIsAnimating(false);
      animationResetTimerRef.current = null;
    }, FLY_TO_DURATION + 100);

    return true;
  }, []);

  const scheduleAutoResume = useCallback(() => {
    clearAutoResumeTimer();
    autoResumeTimerRef.current = setTimeout(() => {
      autoResumeTimerRef.current = null;
      if (!userLocation || isAnimatingRef.current) return;
      setFollowUser(true);
      startFlyTo(userLocation);
    }, AUTO_RESUME_DELAY_MS);
  }, [clearAutoResumeTimer, startFlyTo, userLocation]);

  const handleFlyToUser = useCallback(() => {
    if (!userLocation || isAnimatingRef.current) return;
    clearAutoResumeTimer();
    setFollowUser(true);
    startFlyTo(userLocation);
  }, [clearAutoResumeTimer, startFlyTo, userLocation]);

  const handleCameraChanged = useCallback(
    (state: MapState) => {
      const cameraZoom = extractZoomFromProperties(state.properties);
      if (cameraZoom !== null) {
        lastCameraZoomRef.current = cameraZoom;
      }

      if (!state?.gestures?.isGestureActive) {
        return;
      }

      if (animationResetTimerRef.current) {
        clearTimeout(animationResetTimerRef.current);
        animationResetTimerRef.current = null;
      }

      if (isAnimatingRef.current) {
        isAnimatingRef.current = false;
        setIsAnimating(false);
        setAnimationMode('none');
        setAnimationDuration(0);
      }

      if (followUser) {
        setFollowUser(false);
      }

      scheduleAutoResume();
    },
    [followUser, scheduleAutoResume]
  );

  return {
    mapReady,
    setMapReady,
    cameraCenter,
    animationMode,
    animationDuration,
    followUser,
    setFollowUser,
    isAnimating,
    cameraRef,
    shapeSourceRef,
    lastCameraZoomRef,
    clearAutoResumeTimer,
    scheduleAutoResume,
    handleFlyToUser,
    handleCameraChanged,
  };
}
