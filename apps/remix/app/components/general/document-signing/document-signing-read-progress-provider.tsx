import { createContext, useCallback, useContext, useRef, useState } from 'react';

export type DocumentSigningReadProgressContextValue = {
  /** 0-100, 閱讀進度百分比 */
  readProgress: number;
  /** 是否已滾動到底部（文檔無需滾動時視為 true） */
  hasReadToBottom: boolean;
  /** 文檔是否需要滾動，若為 false 則不檢測閱讀進度 */
  requiresScroll: boolean;
  /** 綁定到可滾動容器的 ref callback，掛載時會檢測是否需要滾動 */
  setScrollContainerRef: (el: HTMLDivElement | null) => void;
  /** 用於綁定 onScroll 的處理函數 */
  handleScroll: () => void;
};

const DocumentSigningReadProgressContext =
  createContext<DocumentSigningReadProgressContextValue | null>(null);

export const useDocumentSigningReadProgress = () => {
  return useContext(DocumentSigningReadProgressContext);
};

export const useOptionalDocumentSigningReadProgress = () => {
  return useContext(DocumentSigningReadProgressContext);
};

const BOTTOM_THRESHOLD_PX = 80;

export const DocumentSigningReadProgressProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const recheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [readProgress, setReadProgress] = useState(0);
  const [hasReadToBottom, setHasReadToBottom] = useState(false);
  const [requiresScroll, setRequiresScroll] = useState(true);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;

    if (!el) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = el;
    const scrollableHeight = scrollHeight - clientHeight;

    if (scrollableHeight <= 0) {
      setReadProgress(100);
      setHasReadToBottom(true);
      setRequiresScroll(false);
      return;
    }

    const progress = Math.min(100, Math.round((scrollTop / scrollableHeight) * 100));
    setReadProgress(progress);

    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const reachedBottom = distanceFromBottom <= BOTTOM_THRESHOLD_PX;
    setHasReadToBottom(reachedBottom);
  }, []);

  const setScrollContainerRef = useCallback(
    (el: HTMLDivElement | null) => {
      recheckIntervalRef.current && clearInterval(recheckIntervalRef.current);
      recheckTimeoutRef.current && clearTimeout(recheckTimeoutRef.current);
      recheckIntervalRef.current = null;
      recheckTimeoutRef.current = null;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;

      if (el) {
        const checkDimensions = () => {
          const { scrollHeight, clientHeight } = el;
          const scrollableHeight = scrollHeight - clientHeight;

          if (scrollableHeight <= 0) {
            setReadProgress(100);
            setHasReadToBottom(true);
            setRequiresScroll(false);
          } else {
            setRequiresScroll(true);
            handleScroll();
          }
        };

        checkDimensions();

        const resizeObserver = new ResizeObserver(checkDimensions);
        resizeObserver.observe(el);
        resizeObserverRef.current = resizeObserver;

        // On mobile, content may load async (slower network). ResizeObserver doesn't fire when
        // scrollHeight changes (only element size). Re-check periodically for first few seconds.
        recheckIntervalRef.current = setInterval(checkDimensions, 400);
        recheckTimeoutRef.current = setTimeout(() => {
          recheckIntervalRef.current && clearInterval(recheckIntervalRef.current);
          recheckIntervalRef.current = null;
          recheckTimeoutRef.current = null;
        }, 5000);
      }
    },
    [handleScroll],
  );

  const value: DocumentSigningReadProgressContextValue = {
    readProgress,
    hasReadToBottom,
    requiresScroll,
    setScrollContainerRef,
    handleScroll,
  };

  return (
    <DocumentSigningReadProgressContext.Provider value={value}>
      {children}
    </DocumentSigningReadProgressContext.Provider>
  );
};
