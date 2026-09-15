/* Registry format: one record per application. Keep source form/version metadata. */
window.CSP_APPLICATION_REGISTRY = window.CSP_APPLICATION_REGISTRY || [];

window.CSP_APPLICATION_REGISTRY.add = function(record){
  if (!record || !record.id) throw new Error('Application id is required');
  this.push(record);
};

/* Each converted template should register:
{
  id, state, department, name, template, sourceFile, version, status,
  fields: { canonicalField: 'data-field-used-by-template' }
}
*/