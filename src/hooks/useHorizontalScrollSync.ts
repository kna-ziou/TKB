import { useRef, useState, useEffect, useCallback } from 'react';

export interface UseHorizontalScrollSyncOptions {
  minContentWidth?: number;
  dependencies?: React.DependencyList;
}

export function useHorizontalScrollSync(options: UseHorizontalScrollSyncOptions = {}) {
  const { minContentWidth = 620, dependencies = [] } = options;

  const headerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const [headerHeight, setHeaderHeight] = useState<number>(48);
  const [contentScrollWidth, setContentScrollWidth] = useState<number>(minContentWidth);
  const [hasOverflow, setHasOverflow] = useState<boolean>(false);

  const activeScrollSourceRef = useRef<'top' | 'body' | null>(null);
  const syncRafRef = useRef<number | null>(null);

  // Sync horizontal scrolling from timetable body to header and top scrollbar
  const handleBodyScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const newScrollLeft = e.currentTarget.scrollLeft;

    // Header tracks cell body unconditionally for zero-lag alignment
    if (headerRef.current && headerRef.current.scrollLeft !== newScrollLeft) {
      headerRef.current.scrollLeft = newScrollLeft;
    }

    // Prevent recursive loop if top scrollbar originated the scroll
    if (activeScrollSourceRef.current === 'top') return;
    activeScrollSourceRef.current = 'body';

    if (topScrollRef.current && topScrollRef.current.scrollLeft !== newScrollLeft) {
      topScrollRef.current.scrollLeft = newScrollLeft;
    }

    if (syncRafRef.current) cancelAnimationFrame(syncRafRef.current);
    syncRafRef.current = requestAnimationFrame(() => {
      activeScrollSourceRef.current = null;
    });
  }, []);

  // Sync horizontal scrolling from top scrollbar to timetable body and header
  const handleTopScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const newScrollLeft = e.currentTarget.scrollLeft;

    // Prevent recursive loop if body originated the scroll
    if (activeScrollSourceRef.current === 'body') return;
    activeScrollSourceRef.current = 'top';

    if (bodyRef.current && bodyRef.current.scrollLeft !== newScrollLeft) {
      bodyRef.current.scrollLeft = newScrollLeft;
    }
    if (headerRef.current && headerRef.current.scrollLeft !== newScrollLeft) {
      headerRef.current.scrollLeft = newScrollLeft;
    }

    if (syncRafRef.current) cancelAnimationFrame(syncRafRef.current);
    syncRafRef.current = requestAnimationFrame(() => {
      activeScrollSourceRef.current = null;
    });
  }, []);

  // Touch drag support for sticky Day Header
  const headerTouchStartXRef = useRef<number | null>(null);
  const headerTouchStartScrollLeftRef = useRef<number>(0);

  const handleHeaderTouchStart = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length === 1 && bodyRef.current) {
      headerTouchStartXRef.current = e.touches[0].clientX;
      headerTouchStartScrollLeftRef.current = bodyRef.current.scrollLeft;
    }
  }, []);

  const handleHeaderTouchMove = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (headerTouchStartXRef.current !== null && bodyRef.current && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - headerTouchStartXRef.current;
      const targetLeft = Math.max(0, headerTouchStartScrollLeftRef.current - deltaX);
      bodyRef.current.scrollLeft = targetLeft;
      if (headerRef.current) {
        headerRef.current.scrollLeft = targetLeft;
      }
      if (topScrollRef.current) {
        topScrollRef.current.scrollLeft = targetLeft;
      }
    }
  }, []);

  const handleHeaderTouchEnd = useCallback(() => {
    headerTouchStartXRef.current = null;
  }, []);

  // Touch drag support for Top Horizontal Scrollbar proxy
  const topTouchStartXRef = useRef<number | null>(null);
  const topTouchStartScrollLeftRef = useRef<number>(0);

  const handleTopTouchStart = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length === 1 && bodyRef.current) {
      topTouchStartXRef.current = e.touches[0].clientX;
      topTouchStartScrollLeftRef.current = bodyRef.current.scrollLeft;
    }
  }, []);

  const handleTopTouchMove = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (topTouchStartXRef.current !== null && bodyRef.current && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - topTouchStartXRef.current;
      const targetLeft = Math.max(0, topTouchStartScrollLeftRef.current - deltaX);
      bodyRef.current.scrollLeft = targetLeft;
      if (headerRef.current) {
        headerRef.current.scrollLeft = targetLeft;
      }
      if (topScrollRef.current) {
        topScrollRef.current.scrollLeft = targetLeft;
      }
    }
  }, []);

  const handleTopTouchEnd = useCallback(() => {
    topTouchStartXRef.current = null;
  }, []);

  // Monitor DOM resize and horizontal overflow reactively
  useEffect(() => {
    const bodyEl = bodyRef.current;
    const headerEl = headerRef.current;
    if (!bodyEl) return;

    const updateMeasurements = () => {
      if (headerEl) {
        const hh = headerEl.offsetHeight;
        if (hh > 0) {
          setHeaderHeight(hh);
        }
      }

      const scrollW = bodyEl.scrollWidth;
      const clientW = bodyEl.clientWidth;
      setContentScrollWidth(Math.max(scrollW, minContentWidth));
      const isOverflowing = scrollW > clientW + 2;
      setHasOverflow(isOverflowing);

      const currentScrollLeft = bodyEl.scrollLeft;
      if (headerRef.current && headerRef.current.scrollLeft !== currentScrollLeft) {
        headerRef.current.scrollLeft = currentScrollLeft;
      }
      if (topScrollRef.current && topScrollRef.current.scrollLeft !== currentScrollLeft) {
        topScrollRef.current.scrollLeft = currentScrollLeft;
      }
    };

    updateMeasurements();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updateMeasurements();
      });
      ro.observe(bodyEl);
      if (headerEl) {
        ro.observe(headerEl);
      }
    }

    window.addEventListener('resize', updateMeasurements);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateMeasurements);
      if (syncRafRef.current) {
        cancelAnimationFrame(syncRafRef.current);
      }
    };
  }, [minContentWidth, ...dependencies]);

  return {
    headerRef,
    topScrollRef,
    bodyRef,
    headerHeight,
    contentScrollWidth,
    hasOverflow,
    handleBodyScroll,
    handleTopScroll,
    handleHeaderTouchStart,
    handleHeaderTouchMove,
    handleHeaderTouchEnd,
    handleTopTouchStart,
    handleTopTouchMove,
    handleTopTouchEnd,
  };
}
