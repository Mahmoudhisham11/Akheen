import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { resolveCloudinaryCloudName } from '@/lib/cloudinary/config';

function buildCloudinarySignature(publicId, timestamp, apiSecret) {
  const toSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  return crypto.createHash('sha1').update(toSign).digest('hex');
}

export async function POST(request) {
  try {
    const { publicId } = await request.json();

    if (!publicId) {
      return NextResponse.json({ error: 'PUBLIC_ID_REQUIRED' }, { status: 400 });
    }

    const cloudName = resolveCloudinaryCloudName();
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'CLOUDINARY_ENV_MISSING' }, { status: 500 });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = buildCloudinarySignature(publicId, timestamp, apiSecret);

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('timestamp', String(timestamp));
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      body: formData,
    });

    const payload = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: payload?.error?.message || 'CLOUDINARY_DELETE_FAILED' }, { status: 500 });
    }

    const destroyResult = payload?.result;
    if (destroyResult === 'ok') {
      return NextResponse.json({ result: 'ok' });
    }

    if (destroyResult === 'not found') {
      return NextResponse.json({ result: 'not found', warning: 'IMAGE_NOT_FOUND_IN_CLOUDINARY' });
    }

    return NextResponse.json(
      {
        error: payload?.error?.message || `UNEXPECTED_CLOUDINARY_RESULT:${String(destroyResult || 'unknown')}`,
      },
      { status: 500 }
    );
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'UNEXPECTED_DELETE_ERROR' }, { status: 500 });
  }
}

