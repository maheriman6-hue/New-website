(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/PerformanceRuntime.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PerformanceRuntime",
    ()=>PerformanceRuntime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/gsap/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lenis$2f$dist$2f$lenis$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lenis/dist/lenis.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$perf$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/perf.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function PerformanceRuntime() {
    _s();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLayoutEffect"])({
        "PerformanceRuntime.useLayoutEffect": ()=>{
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$perf$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["initializePerformanceMode"])();
            const lenis = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lenis$2f$dist$2f$lenis$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]({
                autoRaf: false
            });
            let probeStart = 0;
            let probeFrames = 0;
            let probeComplete = false;
            const beginFrameProbe = {
                "PerformanceRuntime.useLayoutEffect.beginFrameProbe": ()=>{
                    if (probeComplete || probeStart !== 0) return;
                    probeStart = performance.now();
                    probeFrames = 0;
                }
            }["PerformanceRuntime.useLayoutEffect.beginFrameProbe"];
            const onHeroTransition = {
                "PerformanceRuntime.useLayoutEffect.onHeroTransition": ()=>beginFrameProbe()
            }["PerformanceRuntime.useLayoutEffect.onHeroTransition"];
            const onQuoteModalOpen = {
                "PerformanceRuntime.useLayoutEffect.onQuoteModalOpen": ()=>lenis.stop()
            }["PerformanceRuntime.useLayoutEffect.onQuoteModalOpen"];
            const onQuoteModalClose = {
                "PerformanceRuntime.useLayoutEffect.onQuoteModalClose": ()=>lenis.start()
            }["PerformanceRuntime.useLayoutEffect.onQuoteModalClose"];
            const onTick = {
                "PerformanceRuntime.useLayoutEffect.onTick": (time)=>{
                    lenis.raf(time * 1000);
                    if (probeStart === 0 || probeComplete || document.visibilityState !== 'visible') return;
                    probeFrames += 1;
                    const elapsed = performance.now() - probeStart;
                    if (elapsed < 1000) return;
                    const averageFps = probeFrames * 1000 / elapsed;
                    document.documentElement.dataset.perfProbeFps = averageFps.toFixed(1);
                    probeComplete = true;
                    if (averageFps < 45) (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$perf$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["markLitePerformanceMode"])();
                }
            }["PerformanceRuntime.useLayoutEffect.onTick"];
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].ticker.lagSmoothing(0);
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].ticker.add(onTick);
            document.addEventListener('hero:transition-start', onHeroTransition);
            document.addEventListener('quote-modal:open', onQuoteModalOpen);
            document.addEventListener('quote-modal:close', onQuoteModalClose);
            return ({
                "PerformanceRuntime.useLayoutEffect": ()=>{
                    document.removeEventListener('hero:transition-start', onHeroTransition);
                    document.removeEventListener('quote-modal:open', onQuoteModalOpen);
                    document.removeEventListener('quote-modal:close', onQuoteModalClose);
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$gsap$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"].ticker.remove(onTick);
                    lenis.destroy();
                }
            })["PerformanceRuntime.useLayoutEffect"];
        }
    }["PerformanceRuntime.useLayoutEffect"], []);
    return null;
}
_s(PerformanceRuntime, "n7/vCynhJvM+pLkyL2DMQUF0odM=");
_c = PerformanceRuntime;
var _c;
__turbopack_context__.k.register(_c, "PerformanceRuntime");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/RouteTransition.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RouteTransition",
    ()=>RouteTransition
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function RouteTransition() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [isVisible, setIsVisible] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [run, setRun] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const timers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])([]);
    const isTransitioning = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "RouteTransition.useEffect": ()=>{
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                setIsVisible(false);
                isTransitioning.current = false;
            } else {
                timers.current.push(window.setTimeout({
                    "RouteTransition.useEffect": ()=>{
                        setIsVisible(false);
                        isTransitioning.current = false;
                        timers.current = [];
                    }
                }["RouteTransition.useEffect"], 2300));
            }
            const onClick = {
                "RouteTransition.useEffect.onClick": (event)=>{
                    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    const target = event.target;
                    if (!(target instanceof Element)) return;
                    const link = target.closest('a[href]');
                    if (!link || link.target || link.hasAttribute('download')) return;
                    const destination = new URL(link.href, window.location.href);
                    if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname && destination.search === window.location.search) return;
                    event.preventDefault();
                    if (isTransitioning.current) return;
                    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                        router.push(`${destination.pathname}${destination.search}${destination.hash}`);
                        return;
                    }
                    isTransitioning.current = true;
                    setRun({
                        "RouteTransition.useEffect.onClick": (current)=>current + 1
                    }["RouteTransition.useEffect.onClick"]);
                    setIsVisible(true);
                    timers.current.push(window.setTimeout({
                        "RouteTransition.useEffect.onClick": ()=>{
                            router.push(`${destination.pathname}${destination.search}${destination.hash}`);
                        }
                    }["RouteTransition.useEffect.onClick"], 520));
                    timers.current.push(window.setTimeout({
                        "RouteTransition.useEffect.onClick": ()=>{
                            setIsVisible(false);
                            isTransitioning.current = false;
                            timers.current = [];
                        }
                    }["RouteTransition.useEffect.onClick"], 2300));
                }
            }["RouteTransition.useEffect.onClick"];
            document.addEventListener('click', onClick, true);
            return ({
                "RouteTransition.useEffect": ()=>{
                    document.removeEventListener('click', onClick, true);
                    timers.current.forEach(window.clearTimeout);
                    timers.current = [];
                }
            })["RouteTransition.useEffect"];
        }
    }["RouteTransition.useEffect"], [
        router
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: [
            'route-transition',
            isVisible ? 'is-visible' : ''
        ].join(' '),
        "aria-hidden": "true",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "route-transition__sequence",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "route-transition__red"
                }, void 0, false, {
                    fileName: "[project]/components/RouteTransition.tsx",
                    lineNumber: 82,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "route-transition__black"
                }, void 0, false, {
                    fileName: "[project]/components/RouteTransition.tsx",
                    lineNumber: 83,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "route-transition__bar"
                }, void 0, false, {
                    fileName: "[project]/components/RouteTransition.tsx",
                    lineNumber: 84,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "route-transition__wordmark",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "route-transition__name",
                            children: "ZATEEF"
                        }, void 0, false, {
                            fileName: "[project]/components/RouteTransition.tsx",
                            lineNumber: 86,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "route-transition__descriptor",
                            children: "INTERNATIONAL"
                        }, void 0, false, {
                            fileName: "[project]/components/RouteTransition.tsx",
                            lineNumber: 87,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/RouteTransition.tsx",
                    lineNumber: 85,
                    columnNumber: 9
                }, this)
            ]
        }, run, true, {
            fileName: "[project]/components/RouteTransition.tsx",
            lineNumber: 81,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/RouteTransition.tsx",
        lineNumber: 77,
        columnNumber: 5
    }, this);
}
_s(RouteTransition, "Mv6NfKp4+BApDhL+nqgLPlrVLGo=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = RouteTransition;
var _c;
__turbopack_context__.k.register(_c, "RouteTransition");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/perf.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "initializePerformanceMode",
    ()=>initializePerformanceMode,
    "markLitePerformanceMode",
    ()=>markLitePerformanceMode
]);
function initializePerformanceMode() {
    const deviceMemory = navigator.deviceMemory;
    const lowHardware = (navigator.hardwareConcurrency ?? 8) <= 4 || deviceMemory !== undefined && deviceMemory <= 4;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (lowHardware || reducedMotion) {
        document.documentElement.dataset.perf = 'lite';
        return true;
    }
    delete document.documentElement.dataset.perf;
    return false;
}
function markLitePerformanceMode() {
    document.documentElement.dataset.perf = 'lite';
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_1hfeysn._.js.map