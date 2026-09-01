import { Router } from "express";
import { optionalClerkAuth, requireClerkAuth } from "../../../auth/clerk-auth.middleware.ts";
import { getSatelitesTleData } from "../controllers/satelites-info.controllers";
import { getConjunctionData } from "../controllers/satelites-conjuction.controllers";
import {
  getCurrentSatelliteState,
  listNearbySatelliteStates,
  listCurrentSatelliteStates,
} from "../controllers/satellite-state.controllers.ts";
import { getSatelliteHistoryRecords } from "../controllers/satellite-history.controllers.ts";
import {
  getSatelliteCatalogItem,
  getSatelliteCatalogFilterOptions,
  listSatelliteCatalog,
} from "../controllers/satellite-catalog.controllers.ts";
import {
  getAnalyticsData,
  getDataSources,
  getOverviewData,
} from "../controllers/satellite-dashboard.controllers.ts";
import {
  commissionSatelliteObject,
  createSatellitePreview,
  deleteCommissionedSatelliteObject,
  listCommissionedSatelliteObjects,
} from "../controllers/satellite-maker.controllers.ts";
import {
  compareSatelliteFinderSelection,
  screenSatelliteFinderCandidates,
} from "../controllers/satellite-finder.controllers.ts";
import {
  getGroundStationPassData,
  getSatelliteTrajectoryData,
} from "../controllers/satellite-operations.controllers.ts";
import {
  getConjunctionAnalyticsData,
  getConjunctionEventDetails,
  listConjunctionEvents,
} from "../controllers/conjunction-event.controllers.ts";
import {
  acknowledgeOperationsAlert,
  createOperationsAlert,
  listAlerts,
  resolveOperationsAlert,
} from "../controllers/alert.controllers.ts";
import {
  addUserWishlistSatellite,
  listUserWishlist,
  removeUserWishlistSatellite,
} from "../controllers/wishlist.controllers.ts";

const router: Router = Router();

router.get("/all", getSatelitesTleData);
router.get("/catalog", optionalClerkAuth, listSatelliteCatalog);
router.get("/catalog/options", optionalClerkAuth, getSatelliteCatalogFilterOptions);
router.get("/catalog/:noradCatId", optionalClerkAuth, getSatelliteCatalogItem);
router.get("/overview", getOverviewData);
router.get("/analytics", getAnalyticsData);
router.get("/sources", getDataSources);
router.get("/conjunctions/events", listConjunctionEvents);
router.get("/conjunctions/events/:eventId", getConjunctionEventDetails);
router.get("/conjunctions/analytics", getConjunctionAnalyticsData);
router.get("/alerts", listAlerts);
router.get("/wishlist", requireClerkAuth, listUserWishlist);
router.get("/states/current", optionalClerkAuth, listCurrentSatelliteStates);
router.get("/states/:noradCatId/current", optionalClerkAuth, getCurrentSatelliteState);
router.get("/finder/:noradCatId/nearby", optionalClerkAuth, listNearbySatelliteStates);
router.get("/maker/commissioned", requireClerkAuth, listCommissionedSatelliteObjects);
router.get("/:noradCatId/history", optionalClerkAuth, getSatelliteHistoryRecords);
router.post("/maker/preview", requireClerkAuth, createSatellitePreview);
router.post("/maker/commission", requireClerkAuth, commissionSatelliteObject);
router.delete("/maker/commissioned/:noradCatId", requireClerkAuth, deleteCommissionedSatelliteObject);
router.post("/finder/compare", requireClerkAuth, compareSatelliteFinderSelection);
router.post("/conjunctions/screen", requireClerkAuth, screenSatelliteFinderCandidates);
router.post("/conjunction-data", requireClerkAuth, getConjunctionData);
router.post("/trajectory", requireClerkAuth, getSatelliteTrajectoryData);
router.post("/ground-station-passes", getGroundStationPassData);
router.post("/alerts", requireClerkAuth, createOperationsAlert);
router.patch("/alerts/:alertId/acknowledge", requireClerkAuth, acknowledgeOperationsAlert);
router.patch("/alerts/:alertId/resolve", requireClerkAuth, resolveOperationsAlert);
router.post("/wishlist/:noradCatId", requireClerkAuth, addUserWishlistSatellite);
router.delete("/wishlist/:noradCatId", requireClerkAuth, removeUserWishlistSatellite);

export default router;
