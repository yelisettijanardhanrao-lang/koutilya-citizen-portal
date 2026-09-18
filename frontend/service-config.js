/* Koutilya Citizen Portal — standard service registry
   Handoff continuation. New services are registered here instead of being
   embedded in legacy portal navigation code.
*/
(function(){
  'use strict';
  const states = window.CSP_STATE_APPLICATIONS || {};
  const fee = 2;
  const registry = [];
  Object.entries(states).forEach(([stateId,state])=>{
    (state.services||[]).forEach(service=>{
      registry.push({
        id: service.id,
        state: stateId,
        stateName: state.state,
        code: service.code || '',
        name: service.name,
        source: service.source || '',
        fields: Array.isArray(service.fields) ? service.fields.slice() : [],
        category: stateId === 'ap' ? 'Andhra Pradesh Applications' : state.state + ' Applications',
        fee,
        active: true
      });
    });
  });
  window.CSP_SERVICE_CONFIG = {
    fee,
    getAll(){ return registry.slice(); },
    getState(stateId){ return registry.filter(x=>x.state===stateId); },
    get(stateId, serviceId){ return registry.find(x=>x.state===stateId && x.id===serviceId) || null; }
  };
})();