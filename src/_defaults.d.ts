declare var rfc6902 : {
  createPatch : (initial: any, final: any) => any;
  applyPatch : (destination: any, patch: any) => void;
};
