import { FaceBounds } from '../types';

export interface DetectionResult {
  detected: boolean;
  bounds: FaceBounds;
  message?: string;
  confidence: number;
}

/**
 * Intelligent face detection using browser ShapeDetection API if available,
 * with a robust client-side skin-tone & contrast heuristic scanner.
 */
export async function detectFaceInImage(imgElement: HTMLImageElement): Promise<DetectionResult> {
  // 1. Try native browser Shape Detection API if supported
  if ('FaceDetector' in window) {
    try {
      // @ts-expect-error - experimental API
      const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(imgElement);
      if (faces && faces.length > 0) {
        const box = faces[0].boundingBox;
        const imgW = imgElement.naturalWidth || imgElement.width;
        const imgH = imgElement.naturalHeight || imgElement.height;
        if (imgW > 0 && imgH > 0) {
          // Add padding for forehead and hair + chin/neck
          const padW = box.width * 0.25;
          const padH = box.height * 0.35;
          const left = Math.max(0, box.x - padW);
          const top = Math.max(0, box.y - padH * 0.8);
          const width = Math.min(imgW - left, box.width + padW * 2);
          const height = Math.min(imgH - top, box.height + padH * 1.8);

          return {
            detected: true,
            confidence: 0.95,
            bounds: {
              x: (left + width / 2) / imgW,
              y: (top + height / 2) / imgH,
              width: width / imgW,
              height: height / imgH,
              neckPivotY: 0.88,
            },
          };
        }
      }
    } catch {
      // Fall through to heuristic scanner
    }
  }

  // 2. High-performance skin-color and face contrast heuristic scanner
  try {
    const canvas = document.createElement('canvas');
    const scanWidth = 160;
    const scanHeight = 160;
    canvas.width = scanWidth;
    canvas.height = scanHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      return getFallbackResult('Yuz avtomatik qidirilmoqda...');
    }

    ctx.drawImage(imgElement, 0, 0, scanWidth, scanHeight);
    const imgData = ctx.getImageData(0, 0, scanWidth, scanHeight);
    const data = imgData.data;

    let totalSkinPixels = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = scanWidth;
    let maxX = 0;
    let minY = scanHeight;
    let maxY = 0;

    // Scan top 75% of image for face (portraits almost always have head in upper 75%)
    for (let y = Math.floor(scanHeight * 0.08); y < scanHeight * 0.75; y++) {
      for (let x = Math.floor(scanWidth * 0.1); x < scanWidth * 0.9; x++) {
        const idx = (y * scanWidth + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Skin tone heuristic in RGB & YCbCr
        const isSkin =
          r > 60 &&
          g > 40 &&
          b > 20 &&
          r > g &&
          r > b &&
          Math.abs(r - g) > 12 &&
          r - b > 15;

        if (isSkin) {
          totalSkinPixels++;
          sumX += x;
          sumY += y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const skinRatio = totalSkinPixels / (scanWidth * scanHeight);

    // If reasonable skin patch is detected
    if (skinRatio >= 0.03 && totalSkinPixels > 80 && maxX > minX && maxY > minY) {
      const avgX = sumX / totalSkinPixels / scanWidth;
      const avgY = sumY / totalSkinPixels / scanHeight;

      const rawW = (maxX - minX) / scanWidth;
      const rawH = (maxY - minY) / scanHeight;

      // Ensure reasonable head aspect ratio and padding for neck/hair
      const width = Math.min(0.65, Math.max(0.32, rawW * 1.35));
      const height = Math.min(0.7, Math.max(0.38, rawH * 1.45));
      // Adjust center slightly up for hair/forehead
      const centerY = Math.max(height / 2 + 0.05, Math.min(0.65, avgY));
      const centerX = Math.max(width / 2 + 0.05, Math.min(0.95 - width / 2, avgX));

      return {
        detected: true,
        confidence: 0.85,
        bounds: {
          x: centerX,
          y: centerY,
          width,
          height,
          neckPivotY: 0.88,
        },
      };
    }
  } catch (err) {
    console.warn('Face detection error:', err);
  }

  // 3. Fallback when face not clearly isolated
  return {
    detected: false,
    confidence: 0.3,
    message: 'Yuz to‘liq avtomatik aniqlanmadi. Iltimos, doirani bosh va bo‘yin sohasiga to‘g‘rilang.',
    bounds: {
      x: 0.5,
      y: 0.38,
      width: 0.44,
      height: 0.48,
      neckPivotY: 0.88,
    },
  };
}

function getFallbackResult(message: string): DetectionResult {
  return {
    detected: false,
    confidence: 0.3,
    message,
    bounds: {
      x: 0.5,
      y: 0.38,
      width: 0.44,
      height: 0.48,
      neckPivotY: 0.88,
    },
  };
}
