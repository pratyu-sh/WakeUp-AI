import { Router, type IRouter } from "express";
import healthRouter from "./health";
import alarmsRouter from "./alarms";
import workoutsRouter from "./workouts";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/alarms", alarmsRouter);
router.use("/workouts", workoutsRouter);
router.use("/stats", statsRouter);

export default router;