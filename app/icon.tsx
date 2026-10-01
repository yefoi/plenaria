import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icono() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1f3f6d',
          color: '#fffdf9',
          fontSize: 22,
          fontWeight: 700,
          fontFamily: 'serif',
        }}
      >
        P
      </div>
    ),
    size,
  );
}
