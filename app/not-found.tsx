import Link from 'next/link';

export default function NoEncontrado() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-3 text-3xl font-semibold text-marca-fuerte">Página no encontrada</h1>
      <p className="mt-4 leading-relaxed text-apagado">
        Puede que el municipio no esté entre los configurados, o que la sesión que buscas se haya
        sustituido en el portal de origen. Prueba con el buscador de la portada.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          className="inline-flex items-center rounded-full border border-transparent bg-marca px-4 py-1.5 text-sm font-medium text-superficie-2 transition-colors hover:bg-marca-fuerte"
          href="/"
        >
          Ir a la portada
        </Link>
        <Link
          className="inline-flex items-center rounded-full border border-linea-fuerte bg-superficie px-4 py-1.5 text-sm font-medium text-marca transition-colors hover:border-marca hover:bg-marca-tenue"
          href="/fuentes"
        >
          Ver el estado de las fuentes
        </Link>
      </div>
    </div>
  );
}
