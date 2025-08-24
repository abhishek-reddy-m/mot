"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupFutureRates = setupFutureRates;
exports.setupFutureRatesForRoomType = setupFutureRatesForRoomType;
var date_fns_1 = require("date-fns");
var prisma_1 = require("./prisma");
/**
 * Ensures that all room types have rate records for the next 2 years
 * This creates rate records using the base price of each room type
 * Only creates records that don't already exist
 */
function setupFutureRates() {
    return __awaiter(this, void 0, void 0, function () {
        var totalCreated, roomTypes, today, twoYearsFromNow, _i, roomTypes_1, roomType, existingRatesResult, existingRates, existingDates, ratesToCreate, currentDate, formattedDate, BATCH_SIZE, i, batch, _a, batch_1, rate, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 13, , 14]);
                    console.log('Starting to setup future rates for all room types...');
                    totalCreated = 0;
                    return [4 /*yield*/, prisma_1.prisma.roomType.findMany({
                            where: { isActive: true },
                            select: {
                                id: true,
                                name: true,
                                basePrice: true,
                                propertyId: true,
                            },
                        })];
                case 1:
                    roomTypes = _b.sent();
                    if (roomTypes.length === 0) {
                        return [2 /*return*/, {
                                success: false,
                                message: 'No active room types found',
                                created: 0,
                            }];
                    }
                    today = new Date();
                    today.setHours(0, 0, 0, 0);
                    twoYearsFromNow = (0, date_fns_1.addYears)(today, 2);
                    _i = 0, roomTypes_1 = roomTypes;
                    _b.label = 2;
                case 2:
                    if (!(_i < roomTypes_1.length)) return [3 /*break*/, 12];
                    roomType = roomTypes_1[_i];
                    console.log("Processing room type: ".concat(roomType.name, " (").concat(roomType.id, ")"));
                    return [4 /*yield*/, prisma_1.prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n        SELECT date FROM room_type_rates \n        WHERE \"roomTypeId\" = ", "\n        AND date >= ", "::date\n        AND date <= ", "::date\n      "], ["\n        SELECT date FROM room_type_rates \n        WHERE \"roomTypeId\" = ", "\n        AND date >= ", "::date\n        AND date <= ", "::date\n      "])), roomType.id, today, twoYearsFromNow)];
                case 3:
                    existingRatesResult = _b.sent();
                    existingRates = Array.isArray(existingRatesResult) ? existingRatesResult : [];
                    existingDates = new Set(existingRates.map(function (rate) { return (0, date_fns_1.format)(rate.date, 'yyyy-MM-dd'); }));
                    ratesToCreate = [];
                    currentDate = new Date(today);
                    while (currentDate <= twoYearsFromNow) {
                        formattedDate = (0, date_fns_1.format)(currentDate, 'yyyy-MM-dd');
                        if (!existingDates.has(formattedDate)) {
                            ratesToCreate.push({
                                roomTypeId: roomType.id,
                                date: new Date(formattedDate),
                                price: roomType.basePrice,
                            });
                        }
                        currentDate = (0, date_fns_1.addDays)(currentDate, 1);
                    }
                    if (!(ratesToCreate.length > 0)) return [3 /*break*/, 10];
                    BATCH_SIZE = 100;
                    i = 0;
                    _b.label = 4;
                case 4:
                    if (!(i < ratesToCreate.length)) return [3 /*break*/, 9];
                    batch = ratesToCreate.slice(i, i + BATCH_SIZE);
                    _a = 0, batch_1 = batch;
                    _b.label = 5;
                case 5:
                    if (!(_a < batch_1.length)) return [3 /*break*/, 8];
                    rate = batch_1[_a];
                    return [4 /*yield*/, prisma_1.prisma.$executeRaw(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n              INSERT INTO room_type_rates (\"roomTypeId\", date, price, \"createdAt\", \"updatedAt\")\n              VALUES (", ", ", "::date, ", ", NOW(), NOW())\n              ON CONFLICT (\"roomTypeId\", date) DO NOTHING\n            "], ["\n              INSERT INTO room_type_rates (\"roomTypeId\", date, price, \"createdAt\", \"updatedAt\")\n              VALUES (", ", ", "::date, ", ", NOW(), NOW())\n              ON CONFLICT (\"roomTypeId\", date) DO NOTHING\n            "])), rate.roomTypeId, rate.date, rate.price)];
                case 6:
                    _b.sent();
                    _b.label = 7;
                case 7:
                    _a++;
                    return [3 /*break*/, 5];
                case 8:
                    i += BATCH_SIZE;
                    return [3 /*break*/, 4];
                case 9:
                    totalCreated += ratesToCreate.length;
                    console.log("Created ".concat(ratesToCreate.length, " rates for ").concat(roomType.name));
                    return [3 /*break*/, 11];
                case 10:
                    console.log("No new rates needed for ".concat(roomType.name));
                    _b.label = 11;
                case 11:
                    _i++;
                    return [3 /*break*/, 2];
                case 12: return [2 /*return*/, {
                        success: true,
                        message: "Successfully created ".concat(totalCreated, " rate records for ").concat(roomTypes.length, " room types"),
                        created: totalCreated,
                    }];
                case 13:
                    error_1 = _b.sent();
                    console.error('Error setting up future rates:', error_1);
                    return [2 /*return*/, {
                            success: false,
                            message: "Failed to set up future rates: ".concat(error_1 instanceof Error ? error_1.message : String(error_1)),
                            created: 0,
                        }];
                case 14: return [2 /*return*/];
            }
        });
    });
}
/**
 * Ensures that a specific room type has rate records for the next 2 years
 */
function setupFutureRatesForRoomType(roomTypeId) {
    return __awaiter(this, void 0, void 0, function () {
        var roomType, today, twoYearsFromNow, existingRatesResult, existingRates, existingDates, ratesToCreate, currentDate, formattedDate, BATCH_SIZE, i, batch, _i, batch_2, rate, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 11, , 12]);
                    console.log("Setting up future rates for room type ".concat(roomTypeId, "..."));
                    return [4 /*yield*/, prisma_1.prisma.roomType.findUnique({
                            where: { id: roomTypeId },
                            select: {
                                id: true,
                                name: true,
                                basePrice: true,
                            },
                        })];
                case 1:
                    roomType = _a.sent();
                    if (!roomType) {
                        return [2 /*return*/, {
                                success: false,
                                message: "Room type with ID ".concat(roomTypeId, " not found"),
                                created: 0,
                            }];
                    }
                    today = new Date();
                    today.setHours(0, 0, 0, 0);
                    twoYearsFromNow = (0, date_fns_1.addYears)(today, 2);
                    return [4 /*yield*/, prisma_1.prisma.$queryRaw(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n      SELECT date FROM room_type_rates \n      WHERE \"roomTypeId\" = ", "\n      AND date >= ", "::date\n      AND date <= ", "::date\n    "], ["\n      SELECT date FROM room_type_rates \n      WHERE \"roomTypeId\" = ", "\n      AND date >= ", "::date\n      AND date <= ", "::date\n    "])), roomTypeId, today, twoYearsFromNow)];
                case 2:
                    existingRatesResult = _a.sent();
                    existingRates = Array.isArray(existingRatesResult) ? existingRatesResult : [];
                    existingDates = new Set(existingRates.map(function (rate) { return (0, date_fns_1.format)(rate.date, 'yyyy-MM-dd'); }));
                    ratesToCreate = [];
                    currentDate = new Date(today);
                    while (currentDate <= twoYearsFromNow) {
                        formattedDate = (0, date_fns_1.format)(currentDate, 'yyyy-MM-dd');
                        if (!existingDates.has(formattedDate)) {
                            ratesToCreate.push({
                                roomTypeId: roomType.id,
                                date: new Date(formattedDate),
                                price: roomType.basePrice,
                            });
                        }
                        currentDate = (0, date_fns_1.addDays)(currentDate, 1);
                    }
                    if (!(ratesToCreate.length > 0)) return [3 /*break*/, 9];
                    BATCH_SIZE = 100;
                    i = 0;
                    _a.label = 3;
                case 3:
                    if (!(i < ratesToCreate.length)) return [3 /*break*/, 8];
                    batch = ratesToCreate.slice(i, i + BATCH_SIZE);
                    _i = 0, batch_2 = batch;
                    _a.label = 4;
                case 4:
                    if (!(_i < batch_2.length)) return [3 /*break*/, 7];
                    rate = batch_2[_i];
                    return [4 /*yield*/, prisma_1.prisma.$executeRaw(templateObject_4 || (templateObject_4 = __makeTemplateObject(["\n            INSERT INTO room_type_rates (\"roomTypeId\", date, price, \"createdAt\", \"updatedAt\")\n            VALUES (", ", ", "::date, ", ", NOW(), NOW())\n            ON CONFLICT (\"roomTypeId\", date) DO NOTHING\n          "], ["\n            INSERT INTO room_type_rates (\"roomTypeId\", date, price, \"createdAt\", \"updatedAt\")\n            VALUES (", ", ", "::date, ", ", NOW(), NOW())\n            ON CONFLICT (\"roomTypeId\", date) DO NOTHING\n          "])), rate.roomTypeId, rate.date, rate.price)];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 4];
                case 7:
                    i += BATCH_SIZE;
                    return [3 /*break*/, 3];
                case 8:
                    console.log("Created ".concat(ratesToCreate.length, " rates for ").concat(roomType.name));
                    return [2 /*return*/, {
                            success: true,
                            message: "Successfully created ".concat(ratesToCreate.length, " rate records for ").concat(roomType.name),
                            created: ratesToCreate.length,
                        }];
                case 9: return [2 /*return*/, {
                        success: true,
                        message: "All rates already exist for ".concat(roomType.name),
                        created: 0,
                    }];
                case 10: return [3 /*break*/, 12];
                case 11:
                    error_2 = _a.sent();
                    console.error('Error setting up future rates:', error_2);
                    return [2 /*return*/, {
                            success: false,
                            message: "Failed to set up future rates: ".concat(error_2 instanceof Error ? error_2.message : String(error_2)),
                            created: 0,
                        }];
                case 12: return [2 /*return*/];
            }
        });
    });
}
var templateObject_1, templateObject_2, templateObject_3, templateObject_4;
