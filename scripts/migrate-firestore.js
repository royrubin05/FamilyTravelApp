"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var firebase_admin_1 = __importDefault(require("firebase-admin"));
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
// Note: Ensure GOOGLE_APPLICATION_CREDENTIALS is set before running
if (firebase_admin_1.default.apps.length === 0) {
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.applicationDefault()
    });
}
var db = firebase_admin_1.default.firestore();
function migrate() {
    return __awaiter(this, void 0, void 0, function () {
        var settingsPath, settings, tripsPath, trips, batch, count, _i, trips_1, trip, ref, cleanTrip, imagesPath, images;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("🚀 Starting Firestore Migration...");
                    settingsPath = path_1.default.join(process.cwd(), 'src/data/settings.json');
                    if (!fs_1.default.existsSync(settingsPath)) return [3 /*break*/, 2];
                    settings = JSON.parse(fs_1.default.readFileSync(settingsPath, 'utf8'));
                    return [4 /*yield*/, db.collection('settings').doc('global').set(settings)];
                case 1:
                    _a.sent();
                    console.log("✅ Settings migrated.");
                    _a.label = 2;
                case 2:
                    tripsPath = path_1.default.join(process.cwd(), 'src/data/trips.json');
                    if (!fs_1.default.existsSync(tripsPath)) return [3 /*break*/, 4];
                    trips = JSON.parse(fs_1.default.readFileSync(tripsPath, 'utf8'));
                    batch = db.batch();
                    count = 0;
                    for (_i = 0, trips_1 = trips; _i < trips_1.length; _i++) {
                        trip = trips_1[_i];
                        ref = db.collection('trips').doc(trip.id);
                        cleanTrip = JSON.parse(JSON.stringify(trip));
                        batch.set(ref, cleanTrip);
                        count++;
                    }
                    return [4 /*yield*/, batch.commit()];
                case 3:
                    _a.sent();
                    console.log("\u2705 ".concat(count, " Trips migrated."));
                    _a.label = 4;
                case 4:
                    imagesPath = path_1.default.join(process.cwd(), 'src/data/cityImages.json');
                    if (!fs_1.default.existsSync(imagesPath)) return [3 /*break*/, 6];
                    images = JSON.parse(fs_1.default.readFileSync(imagesPath, 'utf8'));
                    // Store as a single document 'mapping' or individual docs?
                    // Individual docs scales better if list is huge, but single doc is easier for "get all".
                    // Let's go with single doc for now to match current usage (Config-like).
                    return [4 /*yield*/, db.collection('city_images').doc('mapping').set(images)];
                case 5:
                    // Store as a single document 'mapping' or individual docs?
                    // Individual docs scales better if list is huge, but single doc is easier for "get all".
                    // Let's go with single doc for now to match current usage (Config-like).
                    _a.sent();
                    console.log("✅ City Images migrated.");
                    _a.label = 6;
                case 6: return [2 /*return*/];
            }
        });
    });
}
migrate()
    .then(function () {
    console.log("🎉 Migration Complete!");
    process.exit(0);
})
    .catch(function (error) {
    console.error("❌ Migration Failed:", error);
    process.exit(1);
});
