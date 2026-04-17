import { NextFunction, Request, Response } from "express";
import { JWT_PASSWORD } from "../config";

const jwt = require("jsonwebtoken");
export const userMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers["authorization"];
  const token = header && header.split(" ")[1];
  console.log("--- Auth Debug ---");
  console.log("Token received:", token ? "Yes (starts with " + token.substring(0, 10) + "...)" : "No");
  console.log("JWT_PASSWORD present:", !!JWT_PASSWORD);
  console.log("JWT_PASSWORD length:", JWT_PASSWORD?.length);

  if (!token) {
    console.log("Auth Failed: No token");
    return res.status(401).json({
      message: "Unauthorized - No token provided",
    });
  }
  try {
    const decoded = jwt.verify(token, JWT_PASSWORD) as {
      role: string;
      id: string;
    };

    req.userId = decoded.id;
    console.log("Auth Success: UserID", req.userId);
    next();
  } catch (err: any) {
    console.log("Auth Failed: JWT verify error:", err.message);
    return res.status(401).json({
      message: "Unauthorized - " + err.message,
    });
  }
};
