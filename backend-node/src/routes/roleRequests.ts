import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthRequest, requireRole } from "../middleware/auth";

const router = Router();

export default function roleRequestRoutes(prisma: PrismaClient) {
  router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const existing = await prisma.roleRequest.findFirst({
        where: { userId: req.userId, status: "pending" },
      });
      if (existing) {
        return res.status(400).json({ error: "You already have a pending request" });
      }
      const request = await prisma.roleRequest.create({
        data: {
          userId: req.userId!,
          reason: req.body.reason || null,
        },
      });
      res.status(201).json(request);
    } catch (error) {
      console.error("Role request create error:", error);
      res.status(500).json({ error: "Failed to create role request" });
    }
  });

  router.get("/my", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const requests = await prisma.roleRequest.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: "desc" },
      });
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch role requests" });
    }
  });

  router.get("/", authenticate, requireRole("admin"), async (_req: AuthRequest, res: Response) => {
    try {
      const requests = await prisma.roleRequest.findMany({
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch role requests" });
    }
  });

  router.patch("/:id/approve", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const request = await prisma.roleRequest.findUnique({ where: { id: req.params.id } });
      if (!request) return res.status(404).json({ error: "Request not found" });
      if (request.status !== "pending") return res.status(400).json({ error: "Request already processed" });

      await prisma.$transaction([
        prisma.roleRequest.update({
          where: { id: req.params.id },
          data: { status: "approved" },
        }),
        prisma.user.update({
          where: { id: request.userId },
          data: { role: "coach" },
        }),
      ]);
      res.json({ message: "Request approved, user upgraded to coach" });
    } catch (error) {
      console.error("Role request approve error:", error);
      res.status(500).json({ error: "Failed to approve request" });
    }
  });

  router.patch("/:id/reject", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const request = await prisma.roleRequest.findUnique({ where: { id: req.params.id } });
      if (!request) return res.status(404).json({ error: "Request not found" });
      if (request.status !== "pending") return res.status(400).json({ error: "Request already processed" });

      await prisma.roleRequest.update({
        where: { id: req.params.id },
        data: { status: "rejected" },
      });
      res.json({ message: "Request rejected" });
    } catch (error) {
      res.status(500).json({ error: "Failed to reject request" });
    }
  });

  return router;
}
