"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const zod_1 = require("zod");
const listUsersQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).default(10),
    search: zod_1.z.string().trim().max(120).optional(),
    sortOrder: zod_1.z.enum(["asc", "desc"]).default("desc"),
});
const userIdParamsSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
});
const updateRoleBodySchema = zod_1.z.object({
    role: zod_1.z.enum(["USER", "ADMIN"]),
});
const updateBlockedBodySchema = zod_1.z.object({
    isBlocked: zod_1.z.boolean(),
});
const exportUsersQuerySchema = zod_1.z.object({
    search: zod_1.z.string().trim().max(120).optional(),
});
class AdminController {
    constructor(adminService) {
        this.adminService = adminService;
        this.getSummary = async (req, res) => {
            const summary = await this.adminService.getSummary();
            console.info(JSON.stringify({
                event: "admin.summary.view",
                actorUserId: req.user?.userId,
                actorEmail: req.user?.email,
            }));
            res.status(200).json(summary);
        };
        this.listUsers = async (req, res) => {
            const query = listUsersQuerySchema.parse(req.query);
            const users = await this.adminService.listUsers(query);
            console.info(JSON.stringify({
                event: "admin.users.list",
                actorUserId: req.user?.userId,
                actorEmail: req.user?.email,
                page: query.page,
                pageSize: query.pageSize,
                search: query.search ?? null,
                sortOrder: query.sortOrder,
            }));
            res.status(200).json(users);
        };
        this.updateUserRole = async (req, res) => {
            const params = userIdParamsSchema.parse(req.params);
            const body = updateRoleBodySchema.parse(req.body);
            const updatedUser = await this.adminService.updateUserRole({
                actorUserId: req.user.userId,
                userId: params.userId,
                role: body.role,
            });
            console.info(JSON.stringify({
                event: "admin.users.role.update",
                actorUserId: req.user?.userId,
                actorEmail: req.user?.email,
                targetUserId: params.userId,
                role: body.role,
            }));
            res.status(200).json({ user: updatedUser });
        };
        this.updateUserBlockState = async (req, res) => {
            const params = userIdParamsSchema.parse(req.params);
            const body = updateBlockedBodySchema.parse(req.body);
            const updatedUser = await this.adminService.setUserBlockedState({
                actorUserId: req.user.userId,
                userId: params.userId,
                isBlocked: body.isBlocked,
            });
            console.info(JSON.stringify({
                event: "admin.users.block.update",
                actorUserId: req.user?.userId,
                actorEmail: req.user?.email,
                targetUserId: params.userId,
                isBlocked: body.isBlocked,
            }));
            res.status(200).json({ user: updatedUser });
        };
        this.deleteUser = async (req, res) => {
            const params = userIdParamsSchema.parse(req.params);
            await this.adminService.deleteUser({
                actorUserId: req.user.userId,
                userId: params.userId,
            });
            console.info(JSON.stringify({
                event: "admin.users.delete",
                actorUserId: req.user?.userId,
                actorEmail: req.user?.email,
                targetUserId: params.userId,
            }));
            res.status(204).send();
        };
        this.exportUsersCsv = async (req, res) => {
            const query = exportUsersQuerySchema.parse(req.query);
            const csv = await this.adminService.exportUsersCsv(query.search);
            console.info(JSON.stringify({
                event: "admin.users.export.csv",
                actorUserId: req.user?.userId,
                actorEmail: req.user?.email,
                search: query.search ?? null,
            }));
            const timestamp = new Date().toISOString().replaceAll(":", "-");
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename=usuarios-${timestamp}.csv`);
            res.status(200).send(csv);
        };
    }
}
exports.AdminController = AdminController;
