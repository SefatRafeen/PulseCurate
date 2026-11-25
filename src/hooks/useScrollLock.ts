import { useEffect } from 'react';

let activeLockCount = 0;
let savedScrollY = 0;
let prevHtmlOverflow = '';
let prevHtmlOverscroll = '';
let prevBodyOverflow = '';
let prevBodyPosition = '';
let prevBodyTop = '';
let prevBodyLeft = '';
let prevBodyRight = '';
let prevBodyWidth = '';
let prevBodyPaddingRight = '';
let prevBodyOverscroll = '';

function lockDocumentScroll(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (activeLockCount === 0) {
    const html = document.documentElement;
    const body = document.body;
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth);

    prevHtmlOverflow = html.style.overflow;
    prevHtmlOverscroll = html.style.overscrollBehavior;
    prevBodyOverflow = body.style.overflow;
    prevBodyPosition = body.style.position;
    prevBodyTop = body.style.top;
    prevBodyLeft = body.style.left;
    prevBodyRight = body.style.right;
    prevBodyWidth = body.style.width;
    prevBodyPaddingRight = body.style.paddingRight;
    prevBodyOverscroll = body.style.overscrollBehavior;

    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${savedScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overscrollBehavior = 'none';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  activeLockCount += 1;
}

function unlockDocumentScroll(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (activeLockCount <= 0) return;

  activeLockCount -= 1;
  if (activeLockCount === 0) {
    const html = document.documentElement;
    const body = document.body;

    html.style.overflow = prevHtmlOverflow;
    html.style.overscrollBehavior = prevHtmlOverscroll;

    body.style.overflow = prevBodyOverflow;
    body.style.position = prevBodyPosition;
    body.style.top = prevBodyTop;
    body.style.left = prevBodyLeft;
    body.style.right = prevBodyRight;
    body.style.width = prevBodyWidth;
    body.style.paddingRight = prevBodyPaddingRight;
    body.style.overscrollBehavior = prevBodyOverscroll;

    window.scrollTo({ top: savedScrollY, behavior: 'instant' as ScrollBehavior });
  }
}

/**
 * Ref-counted strict background scroll lock.
 * Keeps underlying feed frozen in place across mobile touch & desktop scroll while modals/readers are open.
 */
export function useScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;
    lockDocumentScroll();
    return () => {
      unlockDocumentScroll();
    };
  }, [isLocked]);
}
