import type { Field } from '@prisma/client';

import type { PageRenderData } from '@documenso/lib/client-only/providers/envelope-render-provider';
import { ZDateFieldMeta, ZNameFieldMeta } from '@documenso/lib/types/field-meta';

type DocumentSigningPIMetadataProps = {
  field: Field;
  pageData: PageRenderData;
};

// Dates and recorded names are printed automatically, without a clickable
// signing box. They remain blank until a real signature action has occurred.
export const DocumentSigningPIMetadata = ({ field, pageData }: DocumentSigningPIMetadataProps) => {
  if (!field.inserted) {
    return null;
  }

  const meta = (field.type === 'DATE' ? ZDateFieldMeta : ZNameFieldMeta).safeParse(field.fieldMeta);
  const fontSize = (meta.success ? meta.data.fontSize : undefined) ?? 10;

  // PDF font sizes are in page points. Scale them with the actual page viewport,
  // not the browser's root font or container-query units.
  return (
    <div
      data-pi-auto-field={field.type}
      data-pi-auto-field-id={field.id}
      className="pointer-events-none absolute z-10 flex items-center font-noto font-normal text-black"
      style={{
        left: `${Number(field.positionX)}%`,
        top: `${Number(field.positionY)}%`,
        width: `${Number(field.width)}%`,
        height: `${Number(field.height)}%`,
        fontSize: fontSize * pageData.scale,
        lineHeight: 1,
        textAlign: (meta.success ? meta.data.textAlign : undefined) ?? 'left',
      }}
    >
      <span className="w-full whitespace-nowrap">{field.customText}</span>
    </div>
  );
};
