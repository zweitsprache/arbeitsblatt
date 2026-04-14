import { NextRequest, NextResponse } from 'next/server';
import { getRenderState } from '../lib/render-state';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/latest/ssr/download?id={renderId}
 * Downloads a completed render as MP4
 */
export async function GET(request: NextRequest) {
  const renderId = request.nextUrl.searchParams.get('id');
  
  if (!renderId) {
    return NextResponse.json(
      { error: 'Missing render ID' },
      { status: 400 }
    );
  }

  const videoPath = path.join(
    process.cwd(),
    'public',
    'rendered-videos',
    `${renderId}.mp4`
  );

  const state = getRenderState(renderId);

  if (!state || state.status !== 'done') {
    return NextResponse.json(
      { error: 'Render not complete or not found' },
      { status: 404 }
    );
  }

  if (!fs.existsSync(videoPath)) {
    return NextResponse.json(
      { error: 'Video file not found on disk' },
      { status: 404 }
    );
  }

  try {
    const buffer = fs.readFileSync(videoPath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="video-${renderId.slice(0, 8)}.mp4"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error(`[Download] Failed to read video file: ${videoPath}`, error);
    return NextResponse.json(
      { error: 'Failed to download video' },
      { status: 500 }
    );
  }
}
