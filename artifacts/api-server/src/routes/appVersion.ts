import { Router, type IRouter } from "express";

const router: IRouter = Router();

/** Public. The phone app compares its own version with these. Set them in Render > Environment. */
router.get("/app-version", (_req, res) => {
  res.json({
    latest: process.env["APP_LATEST_VERSION"] ?? "",
    minimum: process.env["APP_MIN_VERSION"] ?? "",
    message: process.env["APP_UPDATE_MESSAGE"] ?? "",
  });
});

export default router;