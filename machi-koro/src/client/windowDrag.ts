import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';

interface Offset {
  x: number;
  y: number;
}

/** Breathing room kept between the window and the edge of the screen. */
const EDGE = 8;
/** How much of the window has to stay on screen, so it can always be dragged back. */
const KEEP = 120;
/** Roughly the height of the title bar — enough of it must stay above the fold. */
const BAR = 44;

/**
 * Where the player last parked a window. The choice windows are separate
 * components that mount and unmount as cards fire, but to the player they are
 * one window that keeps being handed new decisions, so a spot chosen once holds
 * for the rest of the session instead of snapping back to centre every time.
 */
let parked: Offset = { x: 0, y: 0 };

/** Keep the window reachable however the viewport is resized under it. */
function clamp(rect: DOMRect, want: Offset, from: Offset): Offset {
  // Where the window would sit with no offset applied at all.
  const left = rect.left - from.x;
  const top = rect.top - from.y;
  const minX = EDGE + KEEP - rect.width - left;
  const maxX = window.innerWidth - EDGE - KEEP - left;
  const minY = EDGE - top;
  const maxY = window.innerHeight - EDGE - BAR - top;
  return {
    // A window as big as the screen has nowhere useful to go; leave it centred.
    x: minX > maxX ? 0 : Math.min(Math.max(want.x, minX), maxX),
    y: minY > maxY ? 0 : Math.min(Math.max(want.y, minY), maxY),
  };
}

export interface WindowDrag {
  /** Goes on the window itself, together with `style`. */
  ref: RefObject<HTMLDivElement | null>;
  style: { transform: string };
  /** Goes on the title bar. */
  handle: {
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLElement>) => void;
    onLostPointerCapture: (event: PointerEvent<HTMLElement>) => void;
    onDoubleClick: () => void;
  };
  /** Arrow-key movement, for players who never reach for the mouse. */
  nudge: (dx: number, dy: number) => void;
  dragging: boolean;
}

/**
 * Lets a centred window be pushed aside by its title bar, so the board it sits
 * on top of can be read while the decision is still open.
 */
export default function useWindowDrag(): WindowDrag {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState<Offset>(parked);
  const at = useRef<Offset>(parked);
  const grab = useRef<{ id: number; x: number; y: number; from: Offset } | null>(null);
  const [dragging, setDragging] = useState(false);

  const settle = useCallback((want: Offset) => {
    const rect = ref.current?.getBoundingClientRect();
    const next = rect ? clamp(rect, want, at.current) : want;
    at.current = next;
    parked = next;
    setOffset(next);
  }, []);

  // A window parked near an edge would be left hanging off a shrunken viewport.
  useEffect(() => {
    const onResize = () => settle(at.current);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [settle]);

  const release = (event: PointerEvent<HTMLElement>) => {
    if (grab.current?.id !== event.pointerId) return;
    grab.current = null;
    setDragging(false);
  };

  return {
    ref,
    style: { transform: `translate(${offset.x}px, ${offset.y}px)` },
    handle: {
      onPointerDown: (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        grab.current = { id: event.pointerId, x: event.clientX, y: event.clientY, from: { ...at.current } };
        setDragging(true);
      },
      onPointerMove: (event) => {
        const held = grab.current;
        if (!held || held.id !== event.pointerId) return;
        settle({ x: held.from.x + event.clientX - held.x, y: held.from.y + event.clientY - held.y });
      },
      onPointerUp: release,
      onLostPointerCapture: release,
      // Lost the window off the side of a small screen? Put it back in the middle.
      onDoubleClick: () => settle({ x: 0, y: 0 }),
    },
    nudge: (dx, dy) => settle({ x: at.current.x + dx, y: at.current.y + dy }),
    dragging,
  };
}
