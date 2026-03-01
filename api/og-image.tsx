import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);

  const title = searchParams.get('title') || 'Dummy.io';
  const description = searchParams.get('description') || 'Edit custom Dummies';
  const bgImage = searchParams.get('bg') || '';
  const mode = searchParams.get('mode') || 'hero'; // 'hero' | 'template'

  if (mode === 'template') {
    const hasBg = bgImage && bgImage.startsWith('http');

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#000',
            position: 'relative',
          }}
        >
          {hasBg ? (
            /* Background image */
            <img
              src={bgImage}
              width={1200}
              height={630}
              style={{
                objectFit: 'cover',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
            />
          ) : (
            /* Radial glow fallback when no bg image */
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '800px',
                height: '500px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0,113,227,0.2) 0%, transparent 70%)',
              }}
            />
          )}
          {/* Gradient overlay at bottom for text */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: hasBg ? '220px' : '100%',
              background: hasBg
                ? 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)'
                : 'transparent',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: hasBg ? 'flex-end' : 'center',
              alignItems: hasBg ? 'flex-start' : 'center',
              padding: hasBg ? '0 48px 40px' : '0 48px',
            }}
          >
            <div
              style={{
                fontSize: hasBg ? 40 : 56,
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1.15,
                letterSpacing: '-1px',
                marginBottom: '12px',
                textAlign: hasBg ? 'left' : 'center',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: hasBg ? 18 : 22,
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.4,
                textAlign: hasBg ? 'left' : 'center',
              }}
            >
              {description}
            </div>
          </div>
          {/* Logo badge */}
          <div
            style={{
              position: 'absolute',
              top: '28px',
              left: '36px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(0,0,0,0.5)',
              padding: '8px 16px',
              borderRadius: '99px',
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Dummy</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0071e3' }}>.</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  // Hero / Homepage mode: branded card
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
          position: 'relative',
        }}
      >
        {/* Radial glow */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '900px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,113,227,0.25) 0%, transparent 70%)',
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(0,113,227,0.15)',
            padding: '8px 20px',
            borderRadius: '99px',
            marginBottom: '32px',
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: '#0071e3' }}>
            Edit your dummies in Minutes
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: '#f5f5f7',
            lineHeight: 1.1,
            letterSpacing: '-2px',
            textAlign: 'center',
            marginBottom: '8px',
          }}
        >
          Momentum,
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: '#86868b',
            lineHeight: 1.1,
            letterSpacing: '-2px',
            textAlign: 'center',
            marginBottom: '28px',
          }}
        >
          made effortless
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 22,
            color: '#86868b',
            textAlign: 'center',
            lineHeight: 1.5,
            maxWidth: '600px',
            marginBottom: '40px',
          }}
        >
          Transform your template into a viral movement. One frame, infinite personalized updates.
        </div>

        {/* CTA Button */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#f5f5f7',
            borderRadius: '99px',
            padding: '16px 36px',
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 500, color: '#000' }}>
            Launch your campaign
          </span>
        </div>

        {/* Footer logo */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: '#555' }}>Dummy</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0071e3' }}>.</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#555' }}>io</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
