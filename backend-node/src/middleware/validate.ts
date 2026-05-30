import { Request, Response, NextFunction } from "express";
import { z, ZodSchema } from "zod";

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({ body: req.body });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};

export const schemas = {
  register: z.object({
    body: z.object({
      name: z.string().min(2, "Name must be at least 2 characters").max(50),
      email: z.string().email("Invalid email address"),
      password: z.string().min(6, "Password must be at least 6 characters"),
    }),
  }),
  login: z.object({
    body: z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }),
  }),
  createRequest: z.object({
    body: z.object({
      rank: z.string().min(1, "Rank is required").max(50),
      problemType: z.string().min(1, "Problem type is required").max(100),
      description: z.string().min(10, "Description must be at least 10 characters").max(1000),
    }),
  }),
  requestNotes: z.object({
    body: z.object({
      coachNotes: z.string().min(1, "Notes cannot be empty").max(2000),
    }),
  }),
  updateRole: z.object({
    body: z.object({
      role: z.enum(["user", "coach", "admin"]),
    }),
  }),
};
