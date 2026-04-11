import { useEffect, useRef } from 'react';

import { SIGNATURE_CANVAS_DPI, isBase64Image } from '@documenso/lib/constants/signatures';

import { cn } from '../../lib/utils';

export type SignatureRenderProps = {
  className?: string;
  value: string;
};

/**
 * Renders a typed, uploaded or drawn signature.
 */
export const SignatureRender = ({ className, value }: SignatureRenderProps) => {
  const $el = useRef<HTMLCanvasElement>(null);
  const $imageData = useRef<ImageData | null>(null);

  const renderTypedSignature = () => {
    if (!$el.current) {
      return;
    }

    const ctx = $el.current.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      return;
    }

    // Ensure canvas has valid dimensions
    if ($el.current.width === 0 || $el.current.height === 0) {
      $el.current.width = $el.current.clientWidth * SIGNATURE_CANVAS_DPI;
      $el.current.height = $el.current.clientHeight * SIGNATURE_CANVAS_DPI;
    }

    const canvasWidth = $el.current.width;
    const canvasHeight = $el.current.height;

    // Skip if canvas dimensions are invalid
    if (canvasWidth === 0 || canvasHeight === 0) {
      return;
    }

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    const fontFamily = 'Caveat';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // ctx.fillStyle = selectedColor; // Todo: Color not implemented...

    // Calculate the desired width (25ch)
    const desiredWidth = canvasWidth * 0.85; // 85% of canvas width

    // Start with a base font size
    let fontSize = 18;
    ctx.font = `${fontSize}px ${fontFamily}`;

    // Measure 10 characters and calculate scale factor
    const characterWidth = ctx.measureText('m'.repeat(10)).width;
    const scaleFactor = desiredWidth / characterWidth;

    // Apply scale factor to font size
    fontSize = fontSize * scaleFactor;

    // Adjust font size if it exceeds canvas width
    ctx.font = `${fontSize}px ${fontFamily}`;

    const textWidth = ctx.measureText(value).width;

    if (textWidth > desiredWidth) {
      fontSize = fontSize * (desiredWidth / textWidth);
    }

    // Set final font and render text
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillText(value, canvasWidth / 2, canvasHeight / 2);
  };

  const renderImageSignature = () => {
    if (!$el.current || typeof value !== 'string') {
      return;
    }

    const ctx = $el.current.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      return;
    }

    // Ensure canvas has valid dimensions
    if ($el.current.width === 0 || $el.current.height === 0) {
      $el.current.width = $el.current.clientWidth * SIGNATURE_CANVAS_DPI;
      $el.current.height = $el.current.clientHeight * SIGNATURE_CANVAS_DPI;
    }

    const { width, height } = $el.current;

    // Skip if canvas dimensions are still invalid
    if (width === 0 || height === 0) {
      return;
    }

    ctx.clearRect(0, 0, width, height);

    const img = new Image();

    img.onload = () => {
      if (!$el.current || !ctx) {
        return;
      }

      // Re-check dimensions in case canvas was resized
      const currentWidth = $el.current.width;
      const currentHeight = $el.current.height;

      if (currentWidth === 0 || currentHeight === 0) {
        return;
      }

      // Calculate the scaled dimensions while maintaining aspect ratio
      const scale = Math.min(currentWidth / img.width, currentHeight / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      // Calculate center position
      const x = (currentWidth - scaledWidth) / 2;
      const y = (currentHeight - scaledHeight) / 2;

      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

      // Only get image data if dimensions are valid
      if (currentWidth > 0 && currentHeight > 0) {
        const defaultImageData = ctx.getImageData(0, 0, currentWidth, currentHeight);
        $imageData.current = defaultImageData;
      }
    };

    img.src = value;
  };

  useEffect(() => {
    if ($el.current) {
      const setCanvasSize = () => {
        if ($el.current) {
          const clientWidth = $el.current.clientWidth;
          const clientHeight = $el.current.clientHeight;

          if (clientWidth > 0 && clientHeight > 0) {
            $el.current.width = clientWidth * SIGNATURE_CANVAS_DPI;
            $el.current.height = clientHeight * SIGNATURE_CANVAS_DPI;
          }
        }
      };

      setCanvasSize();

      // Use ResizeObserver to handle dynamic sizing
      const resizeObserver = new ResizeObserver(() => {
        setCanvasSize();
      });

      resizeObserver.observe($el.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

  useEffect(() => {
    // Ensure canvas has valid dimensions before rendering
    if ($el.current && $el.current.width > 0 && $el.current.height > 0) {
      if (isBase64Image(value)) {
        renderImageSignature();
      } else {
        renderTypedSignature();
      }
    }
  }, [value]);

  return (
    <canvas
      ref={$el}
      className={cn('h-full w-full dark:hue-rotate-180 dark:invert', className)}
      style={{ touchAction: 'none' }}
    />
  );
};
