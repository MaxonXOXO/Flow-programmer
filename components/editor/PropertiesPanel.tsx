'use client'

import { useFlowStore } from '@/store/userFlowStore'
import { useState } from 'react'

import { SlidersHorizontal, Info, Hammer, Settings, Move, Link } from 'lucide-react'
import { operationsRegistry } from '@/lib/registry/operations'
import { componentsRegistry } from '@/lib/registry/components'
import { ArduinoUno } from '@/lib/registry/boards'


export default function PropertiesPanel() {
  const { selectedNodeId, schemaNodes, updateSchemaNodeData, activeCanvas, getActiveFlowNodes, updateAnyFlowNodeData, subFlowStack, flowNodes: allFlowNodes, subFlows } = useFlowStore()
  
  // Track open states for property accordions
  const [openSections, setOpenSections] = useState({
    identity: true,
    params: true,
    pins: true,
    transform: true,
  })

  const flowNodes = getActiveFlowNodes()
  const nodes = activeCanvas === 'schema' ? schemaNodes : flowNodes
  const originalNode = nodes.find(n => n.id === selectedNodeId)

  const isSubFlowStart = originalNode && originalNode.data?.nodeType === 'start' && subFlowStack.length > 0
  const parentFnNode = isSubFlowStart ? (() => {
    const parentId = subFlowStack[subFlowStack.length - 1]
    let parentNode = allFlowNodes.find(n => n.id === parentId)
    if (!parentNode) {
      for (const sfId of Object.keys(subFlows)) {
        const found = subFlows[sfId].nodes.find(n => n.id === parentId)
        if (found) { parentNode = found; break; }
      }
    }
    return parentNode
  })() : null

  const node = parentFnNode || originalNode
  const updateFlowNodeData = updateAnyFlowNodeData

  const toggleSection = (sec: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }))
  }

  if (!node) {
    return (
      <div style={{
        width: 240,
        height: '100%',
        background: 'var(--color-bg-panel)',
        borderLeft: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed #3e3e3e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#555',
        }}>
          <SlidersHorizontal className="w-5 h-5" />
        </div>
        <div style={{ 
          fontSize: 11, 
          color: 'var(--color-text-dim)', 
          textAlign: 'center', 
          lineHeight: 1.5,
          maxWidth: 160,
        }}>
          Select a canvas node to inspect properties.
        </div>
      </div>
    )
  }

  const data = node.data as Record<string, any>
  const pins = data.pins as { id: string, label: string }[] || []
  const nodeType = data.nodeType || data.componentType || 'node'

  const isEndNodeInSubflow = data.nodeType === 'end' && activeCanvas === 'flow' && subFlowStack.length > 0
  let parentFnReturnType = 'void'
  if (isEndNodeInSubflow) {
    const parentId = subFlowStack[subFlowStack.length - 1]
    let parentFnNode = allFlowNodes.find(n => n.id === parentId)
    if (!parentFnNode) {
      for (const sfId of Object.keys(subFlows)) {
        const found = subFlows[sfId].nodes.find(n => n.id === parentId)
        if (found) {
          parentFnNode = found
          break
        }
      }
    }
    parentFnReturnType = (parentFnNode?.data as any)?.params?.returnType || 'void'
  }

  let params = data.params as Record<string, string> || {}
  if (isEndNodeInSubflow && parentFnReturnType !== 'void') {
    if (params.value === undefined) {
      params = { ...params, value: '' }
    }
  }

  return (
    <div style={{
      width: 240,
      height: '100%',
      background: 'var(--color-bg-panel)',
      borderLeft: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
      overflowY: 'auto',
    }}>
      {/* Panel Main Header */}
      <div style={{
        padding: '10px 12px',
        background: '#1b1b1b',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{
          width: 24,
          height: 24,
          borderRadius: 4,
          background: 'rgba(230, 126, 34, 0.08)',
          border: '1px solid rgba(230, 126, 34, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-accent)',
          fontSize: 11,
          fontWeight: 600,
        }}>
          {originalNode?.type === 'unoNode' ? 'U' : 'N'}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-bright)' }}>
            {data.label}
          </div>
          <div style={{ fontSize: 9, color: 'var(--color-text-dim)', textTransform: 'uppercase', marginTop: 1, fontFamily: 'monospace' }}>
            {nodeType}
          </div>
        </div>
      </div>

      {/* Accordion 1: Identity */}
      <div style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div 
          onClick={() => toggleSection('identity')}
          style={{
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--color-text-normal)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Info className="w-3.5 h-3.5 text-[#e67e22]" /> IDENTITY
          </span>
          <span style={{ color: '#555', fontSize: 10 }}>{openSections.identity ? '▼' : '▶'}</span>
        </div>
        {openSections.identity && (
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={{ fontSize: 9, color: 'var(--color-text-dim)', marginBottom: 4 }}>NODE ID</div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: 'var(--color-accent-blue)',
                background: '#1a1a1a',
                padding: '4px 8px',
                borderRadius: 4,
                border: '1px solid var(--color-border)',
              }}>
                {originalNode?.id}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 2: Parameters */}
      {(Object.keys(params).length > 0 || (nodeType && (operationsRegistry[nodeType]?.parameters.length ?? 0) > 0)) && (
        <div style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div 
            onClick={() => toggleSection('params')}
            style={{
              padding: '8px 12px',
              background: 'rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--color-text-normal)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Settings className="w-3.5 h-3.5 text-[#3d8bff]" /> PARAMETERS
            </span>
            <span style={{ color: '#555', fontSize: 10 }}>{openSections.params ? '▼' : '▶'}</span>
          </div>
          {openSections.params && (
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {nodeType === 'function' ? (
                <>
                  {/* Function Name */}
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginBottom: 4 }}>
                      Function Name
                    </div>
                    <input
                      value={params.name || ''}
                      onChange={e => {
                        const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData
                        updater(node.id, {
                          ...data,
                          params: { ...params, name: e.target.value }
                        })
                      }}
                      style={{
                        width: '100%',
                        background: 'var(--color-bg-input)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 4,
                        padding: '4px 8px',
                        color: 'var(--color-text-bright)',
                        fontSize: 11,
                        fontFamily: 'monospace',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Return Type */}
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginBottom: 4 }}>
                      Return Type
                    </div>
                    <select
                      value={params.returnType || 'void'}
                      onChange={e => {
                        const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData
                        updater(node.id, {
                          ...data,
                          params: { ...params, returnType: e.target.value }
                        })
                      }}
                      style={{
                        width: '100%',
                        background: 'var(--color-bg-input)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 4,
                        padding: '4px 8px',
                        color: 'var(--color-text-bright)',
                        fontSize: 11,
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="void">void</option>
                      <option value="int">int</option>
                      <option value="float">float</option>
                      <option value="bool">bool</option>
                      <option value="char">char</option>
                      <option value="String">String</option>
                    </select>
                  </div>

                  {/* Parameters Editor */}
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Parameters</span>
                      <button
                        onClick={() => {
                          const pVal = params.parameters;
                          let currentParams: any[] = [];
                          if (Array.isArray(pVal)) currentParams = pVal;
                          else if (typeof pVal === 'string' && pVal.trim() !== '') {
                            try { currentParams = JSON.parse(pVal); } catch(e) {}
                          }
                          const newParams = [...currentParams, { name: `arg${currentParams.length}`, type: 'int' }];
                          const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData;
                          updater(node.id, {
                            ...data,
                            params: { ...params, parameters: newParams }
                          });
                        }}
                        style={{
                          background: 'rgba(95, 163, 255, 0.15)',
                          border: '1px solid rgba(95, 163, 255, 0.3)',
                          borderRadius: 3,
                          padding: '2px 6px',
                          fontSize: 9,
                          color: '#5fa3ff',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        + Add
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(() => {
                        const pVal = params.parameters;
                        let currentParams: { name: string, type: string }[] = [];
                        if (Array.isArray(pVal)) currentParams = pVal;
                        else if (typeof pVal === 'string' && pVal.trim() !== '') {
                          try { currentParams = JSON.parse(pVal); } catch(e) {}
                        }

                        if (currentParams.length === 0) {
                          return <div style={{ fontSize: 9.5, color: '#546484', fontStyle: 'italic', padding: '4px 0' }}>No parameters defined</div>;
                        }

                        return currentParams.map((param, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            {/* Param Name */}
                            <input
                              value={param.name}
                              placeholder="name"
                              onChange={e => {
                                const newParams = [...currentParams];
                                newParams[idx] = { ...newParams[idx], name: e.target.value };
                                const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData;
                                updater(node.id, {
                                  ...data,
                                  params: { ...params, parameters: newParams }
                                });
                              }}
                              style={{
                                flex: 1.2,
                                background: 'var(--color-bg-input)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 4,
                                padding: '4px 6px',
                                color: 'var(--color-text-bright)',
                                fontSize: 10,
                                fontFamily: 'monospace',
                                outline: 'none',
                              }}
                            />

                            {/* Param Type Select */}
                            <select
                              value={param.type}
                              onChange={e => {
                                const newParams = [...currentParams];
                                newParams[idx] = { ...newParams[idx], type: e.target.value };
                                const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData;
                                updater(node.id, {
                                  ...data,
                                  params: { ...params, parameters: newParams }
                                });
                              }}
                              style={{
                                flex: 1,
                                background: 'var(--color-bg-input)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 4,
                                padding: '3px 4px',
                                color: 'var(--color-text-bright)',
                                fontSize: 9.5,
                                outline: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="int">int</option>
                              <option value="float">float</option>
                              <option value="bool">bool</option>
                              <option value="char">char</option>
                              <option value="String">String</option>
                            </select>

                            {/* Trash Button */}
                            <button
                              onClick={() => {
                                const newParams = currentParams.filter((_, i) => i !== idx);
                                const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData;
                                updater(node.id, {
                                  ...data,
                                  params: { ...params, parameters: newParams }
                                });
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ff5f9e',
                                fontSize: 11,
                                cursor: 'pointer',
                                padding: '2px 4px',
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </>
              ) : nodeType === 'function_call' ? (
                (() => {
                  const definedFunctions: { id: string, name: string, returnType: string, parameters: { name: string, type: string }[] }[] = [];
                  
                  // 1. Check main flow nodes
                  allFlowNodes.forEach((n: any) => {
                    if (n.data?.nodeType === 'function') {
                      const fnName = n.data?.params?.name || 'myFn';
                      const returnType = n.data?.params?.returnType || 'void';
                      const pVal = n.data?.params?.parameters;
                      let paramsList: any[] = [];
                      if (Array.isArray(pVal)) paramsList = pVal;
                      else if (typeof pVal === 'string' && pVal.trim() !== '') {
                        try { paramsList = JSON.parse(pVal); } catch(e) {}
                      }
                      definedFunctions.push({ id: n.id, name: fnName, returnType, parameters: paramsList });
                    }
                  });

                  // 2. Check subFlows nodes (in case they are defined elsewhere)
                  Object.values(subFlows).forEach((subFlow: any) => {
                    subFlow.nodes.forEach((n: any) => {
                      if (n.data?.nodeType === 'function') {
                        const fnName = n.data?.params?.name || 'myFn';
                        if (!definedFunctions.some(f => f.name === fnName)) {
                          const returnType = n.data?.params?.returnType || 'void';
                          const pVal = n.data?.params?.parameters;
                          let paramsList: any[] = [];
                          if (Array.isArray(pVal)) paramsList = pVal;
                          else if (typeof pVal === 'string' && pVal.trim() !== '') {
                            try { paramsList = JSON.parse(pVal); } catch(e) {}
                          }
                          definedFunctions.push({ id: n.id, name: fnName, returnType, parameters: paramsList });
                        }
                      }
                    });
                  });

                  const currentFnName = params.functionName || '';
                  const selectedFn = definedFunctions.find(f => f.name === currentFnName);

                  return (
                    <>
                      {/* Select Function */}
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginBottom: 4 }}>
                          Select Function
                        </div>
                        <select
                          value={currentFnName}
                          onChange={e => {
                            const newFnName = e.target.value;
                            const targetFn = definedFunctions.find(f => f.name === newFnName);
                            const newArgs = targetFn ? new Array(targetFn.parameters.length).fill('') : [];
                            const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData;
                            updater(node.id, {
                              ...data,
                              params: {
                                ...params,
                                functionName: newFnName,
                                arguments: newArgs,
                                assignTo: targetFn && targetFn.returnType === 'void' ? '' : (params.assignTo || '')
                              }
                            });
                          }}
                          style={{
                            width: '100%',
                            background: 'var(--color-bg-input)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 4,
                            padding: '4px 8px',
                            color: 'var(--color-text-bright)',
                            fontSize: 11,
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="">-- Select Function --</option>
                          {definedFunctions.map(f => (
                            <option key={f.id} value={f.name}>
                              {f.name}() {f.returnType !== 'void' ? `-> ${f.returnType}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* If function is selected, show arguments */}
                      {selectedFn && (
                        <>
                          {/* Arguments */}
                          {selectedFn.parameters.length > 0 ? (
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginBottom: 6 }}>
                                Arguments
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {selectedFn.parameters.map((param, idx) => {
                                  let currentArgs: any[] = [];
                                  const argsVal = params.arguments;
                                  if (Array.isArray(argsVal)) currentArgs = argsVal;
                                  else if (typeof argsVal === 'string' && argsVal.trim() !== '') {
                                    try {
                                      const parsed = JSON.parse(argsVal);
                                      if (Array.isArray(parsed)) currentArgs = parsed;
                                    } catch(e) {}
                                  }
                                  const currentVal = currentArgs[idx] || '';

                                  return (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                      <div style={{ fontSize: 8.5, color: '#a5b3cd', fontFamily: 'monospace' }}>
                                        {param.name} ({param.type})
                                      </div>
                                      <input
                                        value={currentVal}
                                        placeholder={`e.g. ${param.type === 'int' ? '13' : param.type === 'float' ? '10.5' : 'val'}`}
                                        onChange={e => {
                                          const newArgs = [...currentArgs];
                                          while (newArgs.length <= idx) {
                                            newArgs.push('');
                                          }
                                          newArgs[idx] = e.target.value;
                                          const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData;
                                          updater(node.id, {
                                            ...data,
                                            params: { ...params, arguments: newArgs }
                                          });
                                        }}
                                        style={{
                                          width: '100%',
                                          background: 'var(--color-bg-input)',
                                          border: '1px solid var(--color-border)',
                                          borderRadius: 4,
                                          padding: '4px 6px',
                                          color: 'var(--color-text-bright)',
                                          fontSize: 10,
                                          fontFamily: 'monospace',
                                          outline: 'none',
                                        }}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: 9.5, color: '#546484', fontStyle: 'italic' }}>
                              No arguments required
                            </div>
                          )}

                          {/* Assignment Target if returnType is not void */}
                          {selectedFn.returnType !== 'void' && (
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginBottom: 4 }}>
                                Assign Return Value To
                              </div>
                              <input
                                value={params.assignTo || ''}
                                placeholder="e.g. val"
                                onChange={e => {
                                  const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData;
                                  updater(node.id, {
                                    ...data,
                                    params: { ...params, assignTo: e.target.value }
                                  });
                                }}
                                style={{
                                  width: '100%',
                                  background: 'var(--color-bg-input)',
                                  border: '1px solid var(--color-border)',
                                  borderRadius: 4,
                                  padding: '4px 8px',
                                  color: 'var(--color-text-bright)',
                                  fontSize: 11,
                                  fontFamily: 'monospace',
                                  outline: 'none',
                                }}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </>
                  );
                })()
              ) : (
                (() => {
                  const op = operationsRegistry[nodeType];
                  if (!op) {
                    return Object.entries(params).map(([key, val]) => (
                      <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                        <div style={{ fontSize: 10, color: 'var(--color-text-dim)', textTransform: 'capitalize' }}>
                          {key}
                        </div>
                        <input
                          value={val as string}
                          onChange={e => {
                            const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData;
                            updater(node.id, {
                              ...data,
                              params: { ...params, [key]: e.target.value }
                            });
                          }}
                          style={{
                            width: '100%',
                            background: 'var(--color-bg-input)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 4,
                            padding: '4px 8px',
                            color: 'var(--color-text-bright)',
                            fontSize: 11,
                            fontFamily: 'monospace',
                            outline: 'none',
                          }}
                        />
                      </div>
                    ));
                  }

                  return op.parameters.map(param => {
                    const val = params[param.id] !== undefined ? params[param.id] : (param.defaultValue || '');
                    
                    return (
                      <div key={param.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                        <div style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>
                          {param.label}
                        </div>

                        {param.type === 'select_component' ? (
                          <select
                            value={val}
                            onChange={e => {
                              const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData;
                              updater(node.id, {
                                ...data,
                                params: { ...params, [param.id]: e.target.value }
                              });
                            }}
                            style={{
                              width: '100%',
                              background: 'var(--color-bg-input)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 4,
                              padding: '4px 8px',
                              color: 'var(--color-text-bright)',
                              fontSize: 11,
                              outline: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="">-- Select Component --</option>
                            {schemaNodes
                              .filter(sn => sn.id !== 'arduino-uno')
                              .map(sn => {
                                const compId = (sn.data?.componentType as string) || sn.type || '';
                                const compDef = componentsRegistry[compId];
                                if (compDef && compDef.operations.includes(op.id)) {
                                  return (
                                    <option key={sn.id} value={sn.id}>
                                      {(sn.data.label as string)} ({compDef.name})
                                    </option>
                                  );
                                }
                                return null;
                              })}
                          </select>
                        ) : param.type === 'select_pin' ? (
                          <select
                            value={val}
                            onChange={e => {
                              const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData;
                              updater(node.id, {
                                ...data,
                                params: { ...params, [param.id]: e.target.value }
                              });
                            }}
                            style={{
                              width: '100%',
                              background: 'var(--color-bg-input)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 4,
                              padding: '4px 8px',
                              color: 'var(--color-text-bright)',
                              fontSize: 11,
                              outline: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="">-- Select Pin --</option>
                            {Object.keys(ArduinoUno.pins)
                              .filter(pin => !ArduinoUno.pins[pin].capabilities.includes('power') && !ArduinoUno.pins[pin].capabilities.includes('ground'))
                              .map(pin => (
                                <option key={pin} value={pin}>
                                  Pin {pin} ({ArduinoUno.pins[pin].capabilities.join(', ')})
                                </option>
                              ))}
                          </select>
                        ) : param.type === 'select' ? (
                          <select
                            value={val}
                            onChange={e => {
                              const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData;
                              updater(node.id, {
                                ...data,
                                params: { ...params, [param.id]: e.target.value }
                              });
                            }}
                            style={{
                              width: '100%',
                              background: 'var(--color-bg-input)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 4,
                              padding: '4px 8px',
                              color: 'var(--color-text-bright)',
                              fontSize: 11,
                              outline: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {(() => {
                              const opts = typeof param.options === 'function' ? param.options() : (param.options || []);
                              return opts.map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ));
                            })()}
                          </select>
                        ) : (
                          <input
                            value={val}
                            placeholder={param.placeholder || ''}
                            onChange={e => {
                              const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData;
                              updater(node.id, {
                                ...data,
                                params: { ...params, [param.id]: e.target.value }
                              });
                            }}
                            style={{
                              width: '100%',
                              background: 'var(--color-bg-input)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 4,
                              padding: '4px 8px',
                              color: 'var(--color-text-bright)',
                              fontSize: 11,
                              fontFamily: 'monospace',
                              outline: 'none',
                            }}
                          />
                        )}
                      </div>
                    );
                  });
                })()
              )}
            </div>
          )}
        </div>
      )}

      {/* Accordion 3: Pins (Schema view only) */}
      {pins.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div 
            onClick={() => toggleSection('pins')}
            style={{
              padding: '8px 12px',
              background: 'rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--color-text-normal)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link className="w-3.5 h-3.5 text-[#2ecc71]" /> CONNECTORS
            </span>
            <span style={{ color: '#555', fontSize: 10 }}>{openSections.pins ? '▼' : '▶'}</span>
          </div>
          {openSections.pins && (
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {pins.map(pin => (
                <div key={pin.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 6px',
                  fontSize: 10.5,
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.01)',
                  borderBottom: '1px solid rgba(255,255,255,0.02)',
                }}>
                  <span style={{ fontFamily: 'monospace', color: 'var(--color-text-dim)' }}>
                    {pin.id}
                  </span>
                  <span style={{ color: 'var(--color-text-normal)', fontWeight: 600 }}>
                    {pin.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Accordion 4: Position (Transform) */}
      <div style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div 
          onClick={() => toggleSection('transform')}
          style={{
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--color-text-normal)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Move className="w-3.5 h-3.5 text-[#e74c3c]" /> TRANSFORM
          </span>
          <span style={{ color: '#555', fontSize: 10 }}>{openSections.transform ? '▼' : '▶'}</span>
        </div>
        {openSections.transform && (
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: '#e74c3c',
                    display: 'inline-block',
                  }} />
                  <span style={{ fontSize: 9, color: 'var(--color-text-dim)', fontWeight: 600 }}>LOC X</span>
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: 'var(--color-text-bright)',
                  background: 'var(--color-bg-input)',
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid var(--color-border)',
                  textAlign: 'center',
                }}>
                  {originalNode ? Math.round(originalNode.position.x) : 0}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: '#2ecc71',
                    display: 'inline-block',
                  }} />
                  <span style={{ fontSize: 9, color: 'var(--color-text-dim)', fontWeight: 600 }}>LOC Y</span>
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: 'var(--color-text-bright)',
                  background: 'var(--color-bg-input)',
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid var(--color-border)',
                  textAlign: 'center',
                }}>
                  {originalNode ? Math.round(originalNode.position.y) : 0}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}