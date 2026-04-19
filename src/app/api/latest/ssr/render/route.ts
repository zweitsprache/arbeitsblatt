import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseMedia } from '@remotion/media-parser';
import { startRendering } from '../lib/remotion-renderer';
import { collectFontInfoFromOverlays } from '../../../../reactvideoeditor/pro/utils/text/collect-font-info-from-items';

// Define the request schema based on the VideoRenderer interface
const RenderRequest = z.object({
  id: z.string(),
  inputProps: z.object({
    overlays: z.array(z.any()),
    durationInFrames: z.number(),
    fps: z.number(),
    width: z.number(),
    height: z.number(),
    src: z.string().optional(),
    selectedOverlayId: z.number().nullable().optional(),
    setSelectedOverlayId: z.any().optional(),
    changeOverlay: z.any().optional(),
    baseUrl: z.string().optional(),
  }),
});

const isFinitePositive = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
};

const toAbsoluteMediaUrl = (src: string, baseUrl?: string): string => {
  if (/^https?:\/\//i.test(src) || src.startsWith('blob:')) {
    return src;
  }

  if (src.startsWith('/') && baseUrl) {
    return `${baseUrl}${src}`;
  }

  return src;
};

const retimeInputProps = (
  inputProps: z.infer<typeof RenderRequest>['inputProps'],
  targetFps: number
) => {
  const sourceFps = inputProps.fps;
  const factor = targetFps / sourceFps;
  const scaleFrames = (frames: number) => Math.max(0, Math.round(frames * factor));

  return {
    ...inputProps,
    fps: targetFps,
    durationInFrames: Math.max(1, scaleFrames(inputProps.durationInFrames)),
    overlays: inputProps.overlays.map((overlay: any) => {
      const nextOverlay: any = {
        ...overlay,
        from: isFinitePositive(overlay?.from) || overlay?.from === 0 ? scaleFrames(overlay.from) : overlay.from,
        durationInFrames: isFinitePositive(overlay?.durationInFrames)
          ? Math.max(1, scaleFrames(overlay.durationInFrames))
          : overlay.durationInFrames,
      };

      if (typeof overlay?.startFromSound === 'number') {
        nextOverlay.startFromSound = Math.max(0, scaleFrames(overlay.startFromSound));
      }

      return nextOverlay;
    }),
  };
};

const detectFirstVideoFps = async (
  inputProps: z.infer<typeof RenderRequest>['inputProps']
): Promise<number | null> => {
  const firstVideo = inputProps.overlays.find((overlay: any) => overlay?.type === 'VIDEO' && typeof overlay?.src === 'string');
  if (!firstVideo?.src) return null;

  const src = toAbsoluteMediaUrl(firstVideo.src, inputProps.baseUrl);

  try {
    const parsed = await parseMedia({
      src,
      fields: {
        fps: true,
      },
    });

    const detectedFps = parsed.fps;
    if (isFinitePositive(detectedFps)) {
      return detectedFps;
    }
  } catch (error) {
    console.warn('Could not detect source video FPS, keeping requested FPS:', error);
  }

  return null;
};

/**
 * POST /api/latest/ssr/render
 * Starts a new video render using Remotion SSR
 */
export async function POST(request: NextRequest) {
  try {
    const startTime = performance.now();
    const body = await request.json();
    console.log(`🎬 [${new Date().toISOString()}] SSR render request received:`, body);
    
    // Validate the request
    const validatedData = RenderRequest.parse(body);
    
    let inputProps = validatedData.inputProps;

    const detectedFps = await detectFirstVideoFps(inputProps);
    if (
      isFinitePositive(detectedFps) &&
      Math.abs(detectedFps - inputProps.fps) >= 0.5 &&
      detectedFps >= 10 &&
      detectedFps <= 120
    ) {
      const roundedTargetFps = Number(detectedFps.toFixed(3));
      console.log(
        `🎬 [${new Date().toISOString()}] Retiming render from ${inputProps.fps}fps to detected source ${roundedTargetFps}fps`
      );
      inputProps = retimeInputProps(inputProps, roundedTargetFps);
    }

    // Collect font infos before rendering
    const fontInfos = collectFontInfoFromOverlays(inputProps.overlays || []);
    
    // Add fontInfos to inputProps
    const inputPropsWithFonts = {
      ...inputProps,
      fontInfos: fontInfos,
    };
    
    // Start the rendering process
    const renderId = await startRendering(
      validatedData.id,
      inputPropsWithFonts
    );
    
    const endTime = performance.now();
    // Return the response in the format expected by VideoRenderer
    console.log(`🎬 [${new Date().toISOString()}] SSR render started with ID: ${renderId} (took ${(endTime - startTime).toFixed(2)}ms)`);
    return NextResponse.json({
      renderId,
      bucketName: undefined, // Not used for SSR rendering
    });
    
  } catch (error) {
    console.error('SSR render endpoint error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.message 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to start render' },
      { status: 500 }
    );
  }
} 