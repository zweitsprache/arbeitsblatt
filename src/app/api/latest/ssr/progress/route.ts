import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRenderState } from '../lib/render-state';

// Define the request schema based on the VideoRenderer interface
const ProgressRequest = z.object({
  id: z.string(),
  bucketName: z.string().optional(), // Not used for SSR but part of the interface
});

/**
 * POST /api/latest/ssr/progress
 * Checks the progress of a video render
 */
export async function POST(request: NextRequest) {
  try {
    const requestTime = new Date().toISOString();
    const rawBody = await request.text();
    const body = rawBody.trim().length > 0 ? JSON.parse(rawBody) : {};
    console.log(`📊 [${requestTime}] SSR progress request received:`, body);
    
    // Validate the request
    const parsed = ProgressRequest.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        type: 'error',
        message: 'Invalid progress request payload',
      });
    }
    const validatedData = parsed.data;
    
    // Get the render state (should be immediately available in memory)
    const firstAttemptTime = Date.now();
    let renderState = getRenderState(validatedData.id);
    const firstAttemptDuration = Date.now() - firstAttemptTime;
    
    // If render state not found on first attempt, try one more time after a brief wait
    if (!renderState) {
      console.log(`🔄 [${new Date().toISOString()}] Render state not found for ${validatedData.id}, trying once more... (first attempt took ${firstAttemptDuration.toFixed(2)}ms)`);
      await new Promise(resolve => setTimeout(resolve, 50));
      const secondAttemptTime = Date.now();
      renderState = getRenderState(validatedData.id);
      const secondAttemptDuration = Date.now() - secondAttemptTime;
      console.log(`🔄 [${new Date().toISOString()}] Second attempt result: ${renderState ? 'FOUND' : 'NOT FOUND'} (took ${secondAttemptDuration.toFixed(2)}ms)`);
    } else {
      console.log(`✅ [${new Date().toISOString()}] Render state found on first attempt for ${validatedData.id} (took ${firstAttemptDuration.toFixed(2)}ms)`);
    }
    
    if (!renderState) {
      console.log(`🚨 Final failure: No render state found for ${validatedData.id}`);
      return NextResponse.json({
        type: 'error',
        message: `No render found with ID: ${validatedData.id}. This may be due to server restart in development mode. Please try rendering again.`,
      });
    }
    
    // Return the appropriate response based on render status
    switch (renderState.status) {
      case 'error':
        return NextResponse.json({
          type: 'error',
          message: renderState.error || 'Unknown error occurred',
        });
        
      case 'done':
        return NextResponse.json({
          type: 'done',
          url: renderState.url!,
          size: renderState.size!,
        });
        
      case 'rendering':
      default:
        return NextResponse.json({
          type: 'progress',
          progress: renderState.progress || 0,
        });
    }
    
  } catch (error) {
    console.error('SSR progress endpoint error:', error);

    // Return a structured progress error instead of HTTP 500 so polling can continue gracefully.
    return NextResponse.json({
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to get render progress',
    });
  }
} 