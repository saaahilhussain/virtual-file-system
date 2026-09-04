export const ROLES = {
  owner: [
    "user:view",
    "user:soft_delete",
    "user:restore",
    "user:permanent_delete",
    "user:update",
    "user:logout",
    "role:assign",
    "file:view:any",
    "file:update:any",
    "file:delete:any",
    "audit:view",
    "role:assign:any",
  ],

  admin: [
    "user:view",
    "user:soft_delete",
    "user:restore",
    "user:update",
    "user:logout",
    "file:view:any",
    "role:assign:limited",
  ],

  manager: [
    "user:view",
    "user:logout",
    // "file:view:any",
    // "file:create:any",
    // "file:update:any",
  ],

  user: [], // implicit
};
