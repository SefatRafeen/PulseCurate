import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface DepthFocusCarouselProps<T> {
  items: T[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  getKey: (item: T, index: number) => string;
  renderCard: (
    item: T,
    state: {
      index: number;
      isActive: boolean;
      distanceFromCenter: number;
    }
  ) => React.ReactNode;
  onActiveItemClick?: (item: T, index: number) => void;
  ariaLabel: string;
  itemLabel?: (item: T, index: number, total: number) => string;
  maxCardWidth?: number;
  cardWidthRatio?: number;
  gap?: number;
  showPaginationDots?: boolean;
  showDesktopArrows?: boolean;
  className?: string;
}

export function DepthFocusCarousel<T>({
  items,
  activeIndex,
  onIndexChange,
  getKey,
  renderCard,
  onActiveItemClick,
  ariaLabel,
  itemLabel,
  maxCardWidth = 376,
  cardWidthRatio = 0.74,
  gap = 14,
  showPaginationDots = true,
  showDesktopArrows = true,
  className = '',
}: DepthFocusCarouselProps<T>) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(360);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>('');
  const hasInteractedRef = useRef<boolean>(false);
  const wheelLockUntilRef = useRef<number>(0);
  const suppressClickRef = useRef<boolean>(false);

  const gestureRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    startTime: number;
    axis: 'none' | 'horizontal' | 'vertical';
    lastDx: number;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    startTime: 0,
    axis: 'none',
    lastDx: 0,
  });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const measure = () => {
      const width = el.clientWidth;
      if (width > 0) setContainerWidth(width);
    };
    measure();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const count = items.length;
  const safeIndex = Math.max(0, Math.min(activeIndex, Math.max(0, count - 1)));
  const cardWidth = Math.max(210, Math.min(Math.round(containerWidth * cardWidthRatio), maxCardWidth));
  const stepWidth = cardWidth + gap;
  const baseCenterLeft = (containerWidth - cardWidth) / 2;
  const trackTranslateX = baseCenterLeft - safeIndex * stepWidth + dragOffset;

  const commitStep = useCallback(
    (nextIdx: number) => {
      const clamped = Math.max(0, Math.min(count - 1, nextIdx));
      hasInteractedRef.current = true;
      onIndexChange(clamped);
    },
    [count, onIndexChange]
  );

  useEffect(() => {
    if (!hasInteractedRef.current || count === 0) return;
    setStatusAnnouncement(`Slide ${safeIndex + 1} of ${count}`);
  }, [safeIndex, count]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (count <= 1) return;

    suppressClickRef.current = false;
    gestureRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTime: performance.now(),
      axis: 'none',
      lastDx: 0,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (g.pointerId !== e.pointerId) return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    if (g.axis === 'none') {
      if (Math.hypot(dx, dy) < 7) return;
      if (Math.abs(dy) >= Math.abs(dx)) {
        g.axis = 'vertical';
        return;
      }
      g.axis = 'horizontal';
      setIsDragging(true);
      try {
        stageRef.current?.setPointerCapture(e.pointerId);
      } catch {
        // Capture optional if unsupported
      }
    }

    if (g.axis !== 'horizontal') return;

    // Limit drag strictly within 1 card distance so a single gesture cannot skip multiple cards
    let boundedDx = Math.max(-stepWidth * 0.92, Math.min(stepWidth * 0.92, dx));
    if ((safeIndex === 0 && boundedDx > 0) || (safeIndex === count - 1 && boundedDx < 0)) {
      boundedDx *= 0.28;
    }

    g.lastDx = boundedDx;
    if (Math.abs(dx) > 8) {
      suppressClickRef.current = true;
    }
    setDragOffset(boundedDx);
  };

  const finishGesture = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (g.pointerId !== e.pointerId) return;

    if (g.axis === 'horizontal') {
      const dx = g.lastDx;
      const dt = Math.max(16, performance.now() - g.startTime);
      const velocity = dx / dt;
      const distanceThreshold = Math.min(46, stepWidth * 0.18);

      let nextIndex = safeIndex;
      if ((dx < -distanceThreshold || velocity < -0.26) && safeIndex < count - 1) {
        nextIndex = safeIndex + 1;
      } else if ((dx > distanceThreshold || velocity > 0.26) && safeIndex > 0) {
        nextIndex = safeIndex - 1;
      }

      setDragOffset(0);
      setIsDragging(false);

      if (nextIndex !== safeIndex) {
        commitStep(nextIndex);
      }

      try {
        if (stageRef.current?.hasPointerCapture(e.pointerId)) {
          stageRef.current.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }

      if (suppressClickRef.current) {
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 60);
      }
    }

    gestureRef.current.pointerId = null;
    gestureRef.current.axis = 'none';
    gestureRef.current.lastDx = 0;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (count <= 1) return;
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 12) return;

    e.preventDefault();
    const now = performance.now();
    if (now < wheelLockUntilRef.current) return;

    wheelLockUntilRef.current = now + 420;
    if (e.deltaX > 0 && safeIndex < count - 1) {
      commitStep(safeIndex + 1);
    } else if (e.deltaX < 0 && safeIndex > 0) {
      commitStep(safeIndex - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if ((e.key === 'Enter' || e.key === ' ') && count > 0) {
      if (e.target === stageRef.current && onActiveItemClick) {
        e.preventDefault();
        onActiveItemClick(items[safeIndex], safeIndex);
      }
      return;
    }

    if (count <= 1) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (safeIndex < count - 1) commitStep(safeIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (safeIndex > 0) commitStep(safeIndex - 1);
    }
  };

  if (count === 0) return null;

  const currentFloatIndex = safeIndex - dragOffset / Math.max(1, stepWidth);

  return (
    <section
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      className={`relative space-y-4 ${className}`}
    >
      {/* Carousel Stage */}
      <div
        ref={stageRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishGesture}
        onPointerCancel={finishGesture}
        onWheel={handleWheel}
        onDragStart={(e) => e.preventDefault()}
        className="relative overflow-hidden py-3 select-none focus-visible:outline-2 focus-visible:outline-[var(--pc-accent)] focus-visible:outline-offset-2 rounded-3xl"
        style={{
          touchAction: 'pan-y',
          overscrollBehaviorX: 'contain',
        }}
      >
        {/* Optional Desktop Step Buttons */}
        {showDesktopArrows && count > 1 && (
          <div className="hidden sm:flex items-center justify-between pointer-events-none absolute inset-y-0 left-2 right-2 z-30">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (safeIndex > 0) commitStep(safeIndex - 1);
              }}
              disabled={safeIndex === 0}
              aria-label="Previous item"
              className="pointer-events-auto w-9 h-9 rounded-full liquid-glass flex items-center justify-center text-[var(--pc-text)] shadow-xl disabled:opacity-25 disabled:pointer-events-none hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (safeIndex < count - 1) commitStep(safeIndex + 1);
              }}
              disabled={safeIndex === count - 1}
              aria-label="Next item"
              className="pointer-events-auto w-9 h-9 rounded-full liquid-glass flex items-center justify-center text-[var(--pc-text)] shadow-xl disabled:opacity-25 disabled:pointer-events-none hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Sliding Flex Track */}
        <div
          className="flex items-stretch will-change-transform"
          style={{
            gap: `${gap}px`,
            transform: `translate3d(${trackTranslateX}px, 0, 0)`,
            transition: isDragging
              ? 'none'
              : 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {items.map((item, idx) => {
            const floatDist = Math.abs(idx - currentFloatIndex);
            const t = Math.min(1, floatDist);
            const scale = 1 - t * 0.16;
            const blurPx = t * 3.5;
            const opacity = 1 - t * 0.44;
            const dimOpacity = t * 0.36;
            const isActive = idx === safeIndex && Math.abs(dragOffset) < stepWidth * 0.35;
            const zIndex = 20 - Math.round(Math.min(floatDist, 2) * 8);

            return (
              <div
                key={getKey(item, idx)}
                role="group"
                aria-roledescription="slide"
                aria-label={
                  itemLabel ? itemLabel(item, idx, count) : `${idx + 1} of ${count}`
                }
                onClick={() => {
                  if (suppressClickRef.current) return;
                  if (idx !== safeIndex) {
                    commitStep(idx);
                    return;
                  }
                  onActiveItemClick?.(item, idx);
                }}
                className="shrink-0 relative cursor-pointer"
                style={{
                  width: `${cardWidth}px`,
                  zIndex,
                  transform: `scale(${scale.toFixed(4)})`,
                  filter: blurPx > 0.08 ? `blur(${blurPx.toFixed(2)}px)` : 'none',
                  opacity: Number(opacity.toFixed(3)),
                  transition: isDragging
                    ? 'none'
                    : 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1), filter 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 380ms ease',
                  transformOrigin: 'center center',
                }}
              >
                {renderCard(item, {
                  index: idx,
                  isActive,
                  distanceFromCenter: t,
                })}

                {/* Subtle shadow / dim veil on non-active side cards */}
                {dimOpacity > 0.02 && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-[26px] bg-black transition-opacity duration-200"
                    style={{ opacity: dimOpacity }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Screen-reader live announcement */}
      <p className="sr-only" role="status" aria-live="polite">
        {statusAnnouncement}
      </p>

      {/* Dynamic Pagination Dots */}
      {showPaginationDots && count > 1 && (
        <nav
          aria-label={`${ariaLabel} pagination`}
          className="flex items-center justify-center gap-1.5 flex-wrap px-4"
        >
          {items.map((_, idx) => {
            const active = idx === safeIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => commitStep(idx)}
                aria-label={`Go to item ${idx + 1} of ${count}`}
                aria-current={active ? 'true' : undefined}
                className="min-w-[24px] min-h-[24px] flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--pc-accent)] rounded-full"
              >
                <span
                  className={`block rounded-full transition-all duration-300 ${
                    active
                      ? 'w-6 h-2 bg-[var(--pc-accent)] shadow-[0_0_12px_var(--pc-accent-soft)]'
                      : 'w-2 h-2 bg-[var(--pc-text-muted)]/35 hover:bg-[var(--pc-text-muted)]/65'
                  }`}
                />
              </button>
            );
          })}
        </nav>
      )}
    </section>
  );
}
