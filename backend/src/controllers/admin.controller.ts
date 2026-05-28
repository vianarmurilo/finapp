import { Request, Response } from "express";
import { z } from "zod";
import { AdminService } from "../services/admin.service";

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(120).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const userIdParamsSchema = z.object({
  userId: z.string().uuid(),
});

const updateRoleBodySchema = z.object({
  role: z.enum(["USER", "ADMIN"]),
});

const updateBlockedBodySchema = z.object({
  isBlocked: z.boolean(),
});

const exportUsersQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
});

export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  getSummary = async (req: Request, res: Response): Promise<void> => {
    const summary = await this.adminService.getSummary();

    console.info(
      JSON.stringify({
        event: "admin.summary.view",
        actorUserId: req.user?.userId,
        actorEmail: req.user?.email,
      }),
    );

    res.status(200).json(summary);
  };

  listUsers = async (req: Request, res: Response): Promise<void> => {
    const query = listUsersQuerySchema.parse(req.query);
    const users = await this.adminService.listUsers(query);

    console.info(
      JSON.stringify({
        event: "admin.users.list",
        actorUserId: req.user?.userId,
        actorEmail: req.user?.email,
        page: query.page,
        pageSize: query.pageSize,
        search: query.search ?? null,
        sortOrder: query.sortOrder,
      }),
    );

    res.status(200).json(users);
  };

  updateUserRole = async (req: Request, res: Response): Promise<void> => {
    const params = userIdParamsSchema.parse(req.params);
    const body = updateRoleBodySchema.parse(req.body);

    const updatedUser = await this.adminService.updateUserRole({
      actorUserId: req.user!.userId,
      userId: params.userId,
      role: body.role,
    });

    console.info(
      JSON.stringify({
        event: "admin.users.role.update",
        actorUserId: req.user?.userId,
        actorEmail: req.user?.email,
        targetUserId: params.userId,
        role: body.role,
      }),
    );

    res.status(200).json({ user: updatedUser });
  };

  updateUserBlockState = async (req: Request, res: Response): Promise<void> => {
    const params = userIdParamsSchema.parse(req.params);
    const body = updateBlockedBodySchema.parse(req.body);

    const updatedUser = await this.adminService.setUserBlockedState({
      actorUserId: req.user!.userId,
      userId: params.userId,
      isBlocked: body.isBlocked,
    });

    console.info(
      JSON.stringify({
        event: "admin.users.block.update",
        actorUserId: req.user?.userId,
        actorEmail: req.user?.email,
        targetUserId: params.userId,
        isBlocked: body.isBlocked,
      }),
    );

    res.status(200).json({ user: updatedUser });
  };

  deleteUser = async (req: Request, res: Response): Promise<void> => {
    const params = userIdParamsSchema.parse(req.params);

    await this.adminService.deleteUser({
      actorUserId: req.user!.userId,
      userId: params.userId,
    });

    console.info(
      JSON.stringify({
        event: "admin.users.delete",
        actorUserId: req.user?.userId,
        actorEmail: req.user?.email,
        targetUserId: params.userId,
      }),
    );

    res.status(204).send();
  };

  exportUsersCsv = async (req: Request, res: Response): Promise<void> => {
    const query = exportUsersQuerySchema.parse(req.query);
    const csv = await this.adminService.exportUsersCsv(query.search);

    console.info(
      JSON.stringify({
        event: "admin.users.export.csv",
        actorUserId: req.user?.userId,
        actorEmail: req.user?.email,
        search: query.search ?? null,
      }),
    );

    const timestamp = new Date().toISOString().replaceAll(":", "-");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=usuarios-${timestamp}.csv`);
    res.status(200).send(csv);
  };
}