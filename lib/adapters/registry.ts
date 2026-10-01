import path from 'node:path';
import { CkanSeuEAdapter } from '@/lib/adapters/ckan-seu-e';
import { ManualAdapter } from '@/lib/adapters/manual';
import { PdfTransparenciaAdapter } from '@/lib/adapters/pdf-transparencia';
import { PortalSesionesAdapter } from '@/lib/adapters/portal-sesiones';
import type { SourceAdapter } from '@/lib/adapters/types';
import type { Municipio } from '@/lib/schemas';

export function crearAdaptador(
  municipio: Municipio,
  cacheDir = path.join(process.cwd(), '.cache'),
): SourceAdapter {
  switch (municipio.fuente_tipo) {
    case 'ckan-seu-e':
      return new CkanSeuEAdapter(municipio, cacheDir);
    case 'pdf-transparencia':
      return new PdfTransparenciaAdapter(municipio);
    case 'portal-sesiones':
      return new PortalSesionesAdapter(municipio);
    case 'manual':
      return new ManualAdapter((municipio.fuente_config.formato as string) ?? 'auto');
    default:
      throw new Error(`Tipo de fuente desconocido: ${municipio.fuente_tipo}`);
  }
}
