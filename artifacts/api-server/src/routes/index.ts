import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authEmailRouter from "./authEmail";
import authRouter from "./auth";
import usersRouter from "./users";
import mentorsRouter from "./mentors";
import avatarRouter from "./avatar";
import walletRouter from "./wallet";
import leaderboardRouter from "./leaderboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authEmailRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(mentorsRouter);
router.use(avatarRouter);
router.use(walletRouter);
router.use(leaderboardRouter);

export default router;

