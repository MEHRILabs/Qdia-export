import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import rfqsRouter from "./rfqs";
import suppliersRouter from "./suppliers";
import dashboardRouter from "./dashboard";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(rfqsRouter);
router.use(suppliersRouter);
router.use(dashboardRouter);
router.use(aiRouter);

export default router;
