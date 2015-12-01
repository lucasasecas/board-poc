declare type Patch = any;

declare var rfc6902 : {
  createPatch : (initial: any, final: any) => Patch;
  applyPatch : (destination: any, patch: Patch) => void;
};

declare type Dictionary<TValue> = { [id: string]: TValue; }

