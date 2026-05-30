import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthRequest, requireRole } from "../middleware/auth";
import { validate, schemas } from "../middleware/validate";

const router = Router();

export default function requestRoutes(prisma: PrismaClient) {
  router.post("/", authenticate, validate(schemas.createRequest), async (req: AuthRequest, res: Response) => {
    try {
      const { rank, problemType, description } = req.body;
      const request = await prisma.coachingRequest.create({
        data: {
          userId: req.userId!,
          rank,
          problemType,
          description,
        },
      });
      res.status(201).json(request);
    } catch (error) {
      console.error("Create request error:", error);
      res.status(500).json({ error: "Failed to create request" });
    }
  });

  router.get("/my", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const requests = await prisma.coachingRequest.findMany({
        where: { userId: req.userId },
        include: {
          coach: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  router.get("/incoming", authenticate, requireRole("coach", "admin"), async (req: AuthRequest, res: Response) => {
    try {
      const where: any = {};
      if (req.userRole === "coach") {
        where.OR = [
          { status: "pending" },
          { coachId: req.userId },
        ];
      }
      const requests = await prisma.coachingRequest.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          coach: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch incoming requests" });
    }
  });

  router.post("/:id/accept", authenticate, requireRole("coach", "admin"), async (req: AuthRequest, res: Response) => {
    try {
      const request = await prisma.coachingRequest.findUnique({
        where: { id: req.params.id },
      });
      if (!request) return res.status(404).json({ error: "Request not found" });
      if (request.status !== "pending") {
        return res.status(400).json({ error: "Can only accept pending requests" });
      }
      if (request.coachId && request.coachId !== req.userId && req.userRole !== "admin") {
        return res.status(403).json({ error: "This request is already assigned to another coach" });
      }
      const updated = await prisma.coachingRequest.update({
        where: { id: req.params.id },
        data: { status: "accepted", coachId: req.userId },
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to accept request" });
    }
  });

  router.post("/:id/reject", authenticate, requireRole("coach", "admin"), async (req: AuthRequest, res: Response) => {
    try {
      const request = await prisma.coachingRequest.findUnique({
        where: { id: req.params.id },
      });
      if (!request) return res.status(404).json({ error: "Request not found" });
      if (req.userRole !== "admin" && request.coachId && request.coachId !== req.userId) {
        return res.status(403).json({ error: "Not your request to reject" });
      }
      const updated = await prisma.coachingRequest.update({
        where: { id: req.params.id },
        data: { status: "rejected", coachId: req.userRole === "admin" ? undefined : req.userId },
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to reject request" });
    }
  });

  router.post("/:id/complete", authenticate, requireRole("coach", "admin"), async (req: AuthRequest, res: Response) => {
    try {
      const request = await prisma.coachingRequest.findUnique({
        where: { id: req.params.id },
      });
      if (!request) return res.status(404).json({ error: "Request not found" });
      if (request.status !== "accepted") {
        return res.status(400).json({ error: "Can only complete accepted requests" });
      }
      if (req.userRole !== "admin" && request.coachId !== req.userId) {
        return res.status(403).json({ error: "Not your request to complete" });
      }
      const updated = await prisma.coachingRequest.update({
        where: { id: req.params.id },
        data: { status: "completed" },
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to complete request" });
    }
  });

  router.post("/:id/notes", authenticate, requireRole("coach", "admin"), async (req: AuthRequest, res: Response) => {
    try {
      const request = await prisma.coachingRequest.findUnique({
        where: { id: req.params.id },
      });
      if (!request) return res.status(404).json({ error: "Request not found" });
      if (req.userRole !== "admin" && request.coachId !== req.userId) {
        return res.status(403).json({ error: "Not your request to add notes" });
      }
      const updated = await prisma.coachingRequest.update({
        where: { id: req.params.id },
        data: { coachNotes: req.body.coachNotes },
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update notes" });
    }
  });

  router.get("/", authenticate, requireRole("admin"), async (_req: AuthRequest, res: Response) => {
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
      res.status(500).json({ error: "Failed to fetch all requests" });
    }
  });

  return router;
}
