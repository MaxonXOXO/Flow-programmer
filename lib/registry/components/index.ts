import { componentsRegistry, ComponentDefinition, ComponentPin } from './definitions';

export * from './definitions';

export const getComponentById = (id: string): ComponentDefinition | undefined => {
  return componentsRegistry[id];
};

export const getAllComponents = (): ComponentDefinition[] => {
  return Object.values(componentsRegistry);
};
