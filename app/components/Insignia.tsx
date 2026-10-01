export type TonoInsignia = 'neutro' | 'info' | 'aviso' | 'peligro' | 'ok';

const TONOS: Record<TonoInsignia, string> = {
  neutro: 'border-linea-fuerte bg-superficie-2 text-apagado',
  info: 'border-info-linea bg-info-fondo text-info-texto',
  aviso: 'border-aviso-linea bg-aviso-fondo text-aviso-texto',
  peligro: 'border-peligro-linea bg-peligro-fondo text-peligro-texto',
  ok: 'border-ok-linea bg-ok-fondo text-ok-texto',
};

export function Insignia({
  children,
  tono = 'neutro',
  title,
}: {
  children: React.ReactNode;
  tono?: TonoInsignia;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONOS[tono]}`}
    >
      {children}
    </span>
  );
}
