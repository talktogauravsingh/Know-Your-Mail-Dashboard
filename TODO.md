# RBAC API Implementation TODO

## Completed ✅

RBAC API fully implemented!

## Test with curl (replace TOKEN with your auth:sanctum token, assume super-admin user):

1. List roles: `curl -H "Authorization: Bearer TOKEN" http://your-app.test/api/roles`
2. Create role: `curl -X POST -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" -d '{"name":"Test Role"}' http://your-app.test/api/roles`
3. List permissions for role 1: `curl -H "Authorization: Bearer TOKEN" http://your-app.test/api/roles/1/permissions`
4. Attach permissions to role: `curl -X POST -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" -d '{"permission_ids":[1,2]}' http://your-app.test/api/roles/1/permissions`

All endpoints protected by permissions middleware (RoleMiddleware renamed to 'permissions:slug').

To run server: `php artisan serve`
