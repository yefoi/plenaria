export type PreferenciaTema = 'auto' | 'claro' | 'oscuro';

export const CLAVE_TEMA = 'plenaria-tema';

export const ORDEN_TEMA: PreferenciaTema[] = ['auto', 'claro', 'oscuro'];

export const CLASES_TEMA: Record<PreferenciaTema, string> = {
  auto: '',
  claro: 'claro',
  oscuro: 'dark',
};

export const ETIQUETA_TEMA: Record<PreferenciaTema, string> = {
  auto: 'automático (siguiendo el sistema)',
  claro: 'claro',
  oscuro: 'oscuro',
};

export function esPreferenciaTema(valor: string | undefined): PreferenciaTema {
  return valor === 'claro' || valor === 'oscuro' || valor === 'auto' ? valor : 'auto';
}

export function aplicarTema(preferencia: PreferenciaTema) {
  const raiz = document.documentElement;
  const oscuro =
    preferencia === 'oscuro' ||
    (preferencia === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  raiz.classList.toggle('dark', oscuro && preferencia !== 'auto');
  raiz.classList.toggle('claro', preferencia === 'claro');
  raiz.style.colorScheme =
    preferencia === 'auto' ? 'light dark' : oscuro ? 'dark' : 'light';
}
