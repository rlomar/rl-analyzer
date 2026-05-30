import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthRequest, requireRole } from "../middleware/auth";
import { validate, schemas } from "../middleware/validate";

const router = Router();

export default function adminRoutes(prisma: PrismaClient) {
  router.get("/users", authenticate, requireRole("admin"), async (_req: AuthRequest, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  router.patch("/users/:id/role", authenticate, requireRole("admin"), validate(schemas.updateRole), async (req: AuthRequest, res: Response) => {
    try {
      const { role } = req.body;
      const targetUser = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (!targetUser) return res.status(404).json({ error: "User not found" });
      if (targetUser.id === req.userId) {
        return res.status(400).json({ error: "Cannot change your own role" });
      }
      const updated = await prisma.user.update({
        where: { id: req.params.id },
        data: { role },
        select: { id: true, name: true, email: true, role: true },
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user role" });
    }
  });

  router.get("/requests", authenticate, requireRole("admin"), async (_req: AuthRequest, res: Response) => {
    try {
      const requests = await prisma.coachingRequest.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } },
          coach: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  router.delete("/requests/:id", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const request = await prisma.coachingRequest.findUnique({
        where: { id: req.params.id },
      });
      if (!request) return res.status(404).json({ error: "Request not found" });
      await prisma.coachingRequest.delete({ where: { id: req.params.id } });
      res.json({ message: "Request deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete request" });
    }
  });

  router.get("/stats", authenticate, requireRole("admin"), async (_req: AuthRequest, res: Response) => {
    try {
      const [users, requests, pending, accepted, completed, rejected] = await Promise.all([
        prisma.user.count(),
        prisma.coachingRequest.count(),
        prisma.coachingRequest.count({ where: { status: "pending" } }),
        prisma.coachingRequest.count({ where: { status: "accepted" } }),
        prisma.coachingRequest.count({ where: { status: "completed" } }),
        prisma.coachingRequest.count({ where: { status: "rejected" } }),
      ]);
      res.json({
        totalUsers: users,
        totalRequests: requests,
        pending,
        accepted,
        completed,
        rejected,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  return router;
}
