import { Router, type IRouter } from "express";
import healthRouter from "./health";
import obstaclesRouter from "./obstacles";
import sosRouter from "./sos";
import safeRoomsRouter from "./safe_rooms";
import firstAidRouter from "./first_aid";
import safeZonesRouter from "./safe_zones";
import adminRouter from "./admin";
import gamificationRouter from "./gamification";
import aiRouter from "./ai";
import summaryRouter from "./summary";
import wellbeingRouter from "./wellbeing";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/obstacles", obstaclesRouter);
router.use("/sos", sosRouter);
router.use("/safe-rooms", safeRoomsRouter);
router.use("/first-aid", firstAidRouter);
router.use("/safe-zones", safeZonesRouter);
router.use("/admin", adminRouter);
router.use("/gamification", gamificationRouter);
router.use("/ai", aiRouter);
router.use("/summary", summaryRouter);
router.use("/wellbeing", wellbeingRouter);

export default router;
