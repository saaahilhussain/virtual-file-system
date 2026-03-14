export const ROLES = {
  Owner: [
    "user:view",
    "user:soft_delete",
    "user:restore",
    "user:permanent_delete",
    "role:assign",
    "file:view:any",
    "file:update:any",
    "file:delete:any",
    "audit:view",
    "role:assign:any",
  ],

  Admin: [
    "user:view",
    "user:soft_delete",
    "role:assign",
    "file:view:any",
    "role:assign:limited",
  ],

  Manager: [
    "user:view",
    "role:assign:basic",
    "user:logout"
    // "file:view:any",
    // "file:create:any",
    // "file:update:any",
  ],

  User: [] // implicit
};
