import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import mentorsRouter from "./mentors";
import avatarRouter from "./avatar";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(mentorsRouter);
router.use(avatarRouter);

export default router;
