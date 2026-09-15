# All-India Digital Application Templates

This branch contains the standardized HTML application-template architecture.

## Design rule
- Preserve the supplied official application layout.
- Do not redesign or simplify prescribed government formats.
- Aadhaar OCR/autofill is an optional helper; the citizen must review extracted values.
- Each template uses stable `data-field` identifiers so one common autofill engine can populate many applications.

## Adding a new application
1. Add the source/approved form artwork or recreate the exact form in HTML/CSS.
2. Add only the fields required by the source form.
3. Give each fillable element a stable `data-field` ID.
4. Add field mapping metadata to the application registry.
5. Test A4 rendering against the source form before publishing.

## Current batch
The supplied AP application PDFs are being converted into templates without changing their field structure. Background artwork is kept separate from the field layer so the same engine can populate the fields quickly.