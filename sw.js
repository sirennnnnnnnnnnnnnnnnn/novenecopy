var $nvectrl;
( () => {
    var __webpack_modules__ = {
        "./packages/rpc/index.ts"(__unused_rspack_module, __webpack_exports__, __webpack_require__) {
            __webpack_require__.r(__webpack_exports__);
            __webpack_require__.d(__webpack_exports__, {
                RpcHelper: () => RpcHelper
            });
            class RpcHelper {
                methods;
                id;
                sendRaw;
                counter = 0;
                promiseCallbacks = new Map;
                constructor(methods, id, sendRaw) {
                    this.methods = methods;
                    this.id = id;
                    this.sendRaw = sendRaw
                }
                recieve(data) {
                    if (data === undefined || data === null || typeof data !== "object")
                        return;
                    const dt = data[this.id];
                    if (dt === undefined || dt === null || typeof dt !== "object")
                        return;
                    const type = dt.$type;
                    if (type === "response") {
                        const token = dt.$token;
                        const data = dt.$data;
                        const error = dt.$error;
                        const cb = this.promiseCallbacks.get(token);
                        if (!cb)
                            return;
                        this.promiseCallbacks.delete(token);
                        if (error !== undefined) {
                            cb.reject(new Error(error))
                        } else {
                            cb.resolve(data)
                        }
                    } else if (type === "request") {
                        const method = dt.$method;
                        const args = dt.$args;
                        this.methods[method](args).then(r => {
                            this.sendRaw({
                                [this.id]: {
                                    $type: "response",
                                    $token: dt.$token,
                                    $data: r?.[0]
                                }
                            }, r?.[1])
                        }
                        ).catch(err => {
                            console.error(err);
                            this.sendRaw({
                                [this.id]: {
                                    $type: "response",
                                    $token: dt.$token,
                                    $error: err?.toString() || "Unknown error"
                                }
                            }, [])
                        }
                        )
                    }
                }
                call(method, args, transfer=[]) {
                    const token = this.counter++;
                    return new Promise( (resolve, reject) => {
                        this.promiseCallbacks.set(token, {
                            resolve: resolve,
                            reject: reject
                        });
                        this.sendRaw({
                            [this.id]: {
                                $type: "request",
                                $method: method,
                                $args: args,
                                $token: token
                            }
                        }, transfer)
                    }
                    )
                }
            }
        }
    };
    var __webpack_module_cache__ = {};
    function __webpack_require__(moduleId) {
        var cachedModule = __webpack_module_cache__[moduleId];
        if (cachedModule !== undefined) {
            return cachedModule.exports
        }
        var module = __webpack_module_cache__[moduleId] = {
            exports: {}
        };
        __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
        return module.exports
    }
    ( () => {
        __webpack_require__.d = (exports, definition) => {
            for (var key in definition) {
                if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
                    Object.defineProperty(exports, key, {
                        enumerable: true,
                        get: definition[key]
                    })
                }
            }
        }
    }
    )();
    ( () => {
        __webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
    }
    )();
    ( () => {
        __webpack_require__.r = exports => {
            if (typeof Symbol !== "undefined" && Symbol.toStringTag) {
                Object.defineProperty(exports, Symbol.toStringTag, {
                    value: "Module"
                })
            }
            Object.defineProperty(exports, "__esModule", {
                value: true
            })
        }
    }
    )();
    var __webpack_exports__ = {};
    ( () => {
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, {
            route: () => route,
            shouldRoute: () => shouldRoute
        });
        var _nveworksfactory_rpc__rspack_import_0 = __webpack_require__("./packages/rpc/index.ts");
        function makeId() {
            return Math.random().toString(36).substring(2, 10)
        }
        const cookieResolvers = {};
        addEventListener("message", e => {
            if (!e.data)
                return;
            if (typeof e.data != "object")
                return;
            if (e.data.$sw$setCookieDone && typeof e.data.$sw$setCookieDone == "object") {
                const done = e.data.$sw$setCookieDone;
                const resolver = cookieResolvers[done.id];
                if (resolver) {
                    resolver();
                    delete cookieResolvers[done.id]
                }
            }
            if (e.data.$sw$initRemoteTransport && typeof e.data.$sw$initRemoteTransport == "object") {
                const {port: port, prefix: prefix} = e.data.$sw$initRemoteTransport;
                const relevantcontroller = tabs.find(tab => new URL(prefix).pathname.startsWith(tab.prefix));
                if (!relevantcontroller) {
                    return
                }
                relevantcontroller.rpc.call("initRemoteTransport", port, [port])
            }
        }
        );
        class ControllerReference {
            prefix;
            id;
            rpc;
            constructor(prefix, id, port) {
                this.prefix = prefix;
                this.id = id;
                this.rpc = new _nveworksfactory_rpc__rspack_import_0.RpcHelper({
                    sendSetCookie: async ({cookies: cookies, options: options}) => {
                        const clients1 = await self.clients.matchAll();
                        const ids = [];
                        const promises = [];
                        const isNavigation = options?.destination === "document" || options?.destination === "iframe";
                        for (const client of clients1) {
                            const id = makeId();
                            ids.push(id);
                            client.postMessage({
                                $controller$setCookie: {
                                    cookies: cookies,
                                    options: options,
                                    id: id
                                }
                            });
                            if (!isNavigation) {
                                promises.push(new Promise(resolve => {
                                    cookieResolvers[id] = () => resolve(id)
                                }
                                ))
                            }
                        }
                        if (promises.length > 0) {
                            let timeoutId;
                            let responded = false;
                            const timeoutPromise = new Promise(resolve => {
                                timeoutId = setTimeout( () => {
                                    if (!responded) {
                                        const pending = ids.filter(id => cookieResolvers[id] !== undefined);
                                        console.error("timed out waiting for set cookie response (deadlock?): " + `cookies=${cookies.length} clients=${clients1.length} ` + `pending=${pending.length}/${ids.length} ` + `clientUrls=${clients1.map(c => c.url).join(",")}`)
                                    }
                                    resolve()
                                }
                                , 1e3)
                            }
                            );
                            try {
                                await Promise.race([timeoutPromise, Promise.any(promises).then( () => {
                                    responded = true
                                }
                                ).catch( () => {}
                                )])
                            } finally {
                                if (timeoutId !== undefined)
                                    clearTimeout(timeoutId);
                                for (const id of ids) {
                                    delete cookieResolvers[id]
                                }
                            }
                        }
                    }
                },"tabchannel-" + id, (data, transfer) => {
                    port.postMessage(data, transfer)
                }
                );
                port.onmessage = e => {
                    this.rpc.recieve(e.data)
                }
                ;
                port.onmessageerror = console.error;
                this.rpc.call("ready", undefined)
            }
        }
        const tabs = [];
        addEventListener("message", e => {
            if (!e.data)
                return;
            if (typeof e.data != "object")
                return;
            if (!e.data.$controller$init)
                return;
            if (typeof e.data.$controller$init != "object")
                return;
            const init = e.data.$controller$init;
            if (init.prefix && (init.prefix.indexOf("/~/sj/") !== -1 || init.prefix.indexOf("/nc-sj/") !== -1))
                return;
            const existing = tabs.findIndex(t => t.id === init.id);
            if (existing !== -1) {
                tabs.splice(existing, 1)
            }
            tabs.push(new ControllerReference(init.prefix,init.id,e.ports[0]))
        }
        );
        function shouldRoute(event) {
            const url = new URL(event.request.url);
            const tab = tabs.find(tab => url.pathname.startsWith(tab.prefix));
            return tab !== undefined
        }
        async function route(event) {
            try {
                const url = new URL(event.request.url);
                const tab = tabs.find(tab => url.pathname.startsWith(tab.prefix));
                const client = await clients.get(event.clientId);
                const rawheaders = [...event.request.headers];
                const response = await tab.rpc.call("request", {
                    rawUrl: event.request.url,
                    rawReferrer: event.request.referrer,
                    destination: event.request.destination,
                    mode: event.request.mode,
                    referrer: event.request.referrer,
                    method: event.request.method,
                    body: event.request.body,
                    cache: event.request.cache,
                    forceCrossOriginIsolated: false,
                    initialHeaders: rawheaders,
                    rawClientUrl: client ? client.url : undefined,
                    clientId: event.clientId || event.resultingClientId
                }, event.request.body instanceof ReadableStream || event.request.body instanceof ArrayBuffer ? [event.request.body] : undefined);
                return new Response(response.body,{
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers
                })
            } catch (e) {
                console.error("Service Worker error:", e);
                return new Response("Internal Service Worker Error: " + e.message,{
                    status: 500
                })
            }
        }
        addEventListener("install", () => {
            self.skipWaiting()
        }
        );
        addEventListener("activate", event => {
            event.waitUntil(clients.claim())
        }
        );
        setTimeout(async () => {
            console.log("service worker activated, notifying clients to revive");
            for (const client of await clients.matchAll()) {
                client.postMessage({
                    $controller$swrevive: {}
                })
            }
        }
        , 100)
    }
    )();
    $nvectrl = __webpack_exports__
}
)();
var $scramjetController;
( () => {
    var e = {
        805(e, t, r) {
            r.d(t, {
                C: () => o
            });
            class o {
                methods;
                id;
                sendRaw;
                counter = 0;
                promiseCallbacks = new Map;
                constructor(e, t, r) {
                    this.methods = e,
                    this.id = t,
                    this.sendRaw = r
                }
                recieve(e) {
                    if (null == e || "object" != typeof e)
                        return;
                    let t = e[this.id];
                    if (null == t || "object" != typeof t)
                        return;
                    let r = t.$type;
                    if ("response" === r) {
                        let e = t.$token
                          , r = t.$data
                          , o = t.$error
                          , s = this.promiseCallbacks.get(e);
                        if (!s)
                            return;
                        this.promiseCallbacks.delete(e),
                        void 0 !== o ? s.reject(Error(o)) : s.resolve(r)
                    } else if ("request" === r) {
                        let e = t.$method
                          , r = t.$args;
                        this.methods[e](r).then(e => {
                            this.sendRaw({
                                [this.id]: {
                                    $type: "response",
                                    $token: t.$token,
                                    $data: e?.[0]
                                }
                            }, e?.[1])
                        }
                        ).catch(e => {
                            console.error(e),
                            this.sendRaw({
                                [this.id]: {
                                    $type: "response",
                                    $token: t.$token,
                                    $error: e?.toString() || "Unknown error"
                                }
                            }, [])
                        }
                        )
                    }
                }
                call(e, t, r=[]) {
                    let o = this.counter++;
                    return new Promise( (s, i) => {
                        this.promiseCallbacks.set(o, {
                            resolve: s,
                            reject: i
                        }),
                        this.sendRaw({
                            [this.id]: {
                                $type: "request",
                                $method: e,
                                $args: t,
                                $token: o
                            }
                        }, r)
                    }
                    )
                }
            }
        }
    }
      , t = {};
    function r(o) {
        var s = t[o];
        if (void 0 !== s)
            return s.exports;
        var i = t[o] = {
            exports: {}
        };
        return e[o](i, i.exports, r),
        i.exports
    }
    r.d = (e, t) => {
        for (var o in t)
            r.o(t, o) && !r.o(e, o) && Object.defineProperty(e, o, {
                enumerable: !0,
                get: t[o]
            })
    }
    ,
    r.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t),
    r.r = e => {
        "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(e, Symbol.toStringTag, {
            value: "Module"
        }),
        Object.defineProperty(e, "__esModule", {
            value: !0
        })
    }
    ;
    var o = {};
    ( () => {
        r.r(o),
        r.d(o, {
            route: () => a,
            shouldRoute: () => n
        });
        var e = r(805);
        let t = {};
        addEventListener("message", e => {
            if (e.data && "object" == typeof e.data) {
                if (e.data.$sw$setCookieDone && "object" == typeof e.data.$sw$setCookieDone) {
                    let r = e.data.$sw$setCookieDone
                      , o = t[r.id];
                    o && (o(),
                    delete t[r.id])
                }
                if (e.data.$sw$initRemoteTransport && "object" == typeof e.data.$sw$initRemoteTransport) {
                    let {port: t, prefix: r} = e.data.$sw$initRemoteTransport
                      , o = i.find(e => new URL(r).pathname.startsWith(e.prefix));
                    if (!o)
                        return;
                    o.rpc.call("initRemoteTransport", t, [t])
                }
            }
        }
        );
        class s {
            prefix;
            id;
            rpc;
            constructor(r, o, s) {
                this.prefix = r,
                this.id = o,
                this.rpc = new e.C({
                    sendSetCookie: async ({cookies: e, options: r}) => {
                        let o = await self.clients.matchAll()
                          , s = []
                          , i = []
                          , n = r?.destination === "document" || r?.destination === "iframe";
                        for (let a of o) {
                            let o = Math.random().toString(36).substring(2, 10);
                            s.push(o),
                            a.postMessage({
                                $controller$setCookie: {
                                    cookies: e,
                                    options: r,
                                    id: o
                                }
                            }),
                            n || i.push(new Promise(e => {
                                t[o] = () => e(o)
                            }
                            ))
                        }
                        if (i.length > 0) {
                            let r, n = !1, a = new Promise(i => {
                                r = setTimeout( () => {
                                    if (!n) {
                                        let r = s.filter(e => void 0 !== t[e]);
                                        console.error(`timed out waiting for set cookie response (deadlock?): cookies=${e.length} clients=${o.length} pending=${r.length}/${s.length} clientUrls=${o.map(e => e.url).join(",")}`)
                                    }
                                    i()
                                }
                                , 1e3)
                            }
                            );
                            try {
                                await Promise.race([a, Promise.any(i).then( () => {
                                    n = !0
                                }
                                ).catch( () => {}
                                )])
                            } finally {
                                for (let e of (void 0 !== r && clearTimeout(r),
                                s))
                                    delete t[e]
                            }
                        }
                    }
                },"tabchannel-" + o, (e, t) => {
                    s.postMessage(e, t)
                }
                ),
                s.onmessage = e => {
                    this.rpc.recieve(e.data)
                }
                ,
                s.onmessageerror = console.error,
                this.rpc.call("ready", void 0)
            }
        }
        let i = [];
        function n(e) {
            let t = new URL(e.request.url);
            return void 0 !== i.find(e => t.pathname.startsWith(e.prefix))
        }
        async function a(e) {
            try {
                let t = new URL(e.request.url)
                  , r = i.find(e => t.pathname.startsWith(e.prefix))
                  , o = await clients.get(e.clientId)
                  , s = [...e.request.headers]
                  , n = await r.rpc.call("request", {
                    rawUrl: e.request.url,
                    rawReferrer: e.request.referrer,
                    destination: e.request.destination,
                    mode: e.request.mode,
                    referrer: e.request.referrer,
                    method: e.request.method,
                    body: e.request.body,
                    cache: e.request.cache,
                    forceCrossOriginIsolated: !1,
                    initialHeaders: s,
                    rawClientUrl: o ? o.url : void 0,
                    clientId: e.clientId || e.resultingClientId
                }, e.request.body instanceof ReadableStream || e.request.body instanceof ArrayBuffer ? [e.request.body] : void 0);
                return new Response(n.body,{
                    status: n.status,
                    statusText: n.statusText,
                    headers: n.headers
                })
            } catch (e) {
                return console.error("Service Worker error:", e),
                new Response("Internal Service Worker Error: " + e.message,{
                    status: 500
                })
            }
        }
        addEventListener("message", e => {
            if (!e.data || "object" != typeof e.data || !e.data.$controller$init || "object" != typeof e.data.$controller$init)
                return;
            let t = e.data.$controller$init;
            if (t.prefix && t.prefix.indexOf("sail/go/") !== -1)
                return;
            r = i.findIndex(e => e.id === t.id);
            -1 !== r && i.splice(r, 1),
            i.push(new s(t.prefix,t.id,e.ports[0]))
        }
        ),
        addEventListener("install", () => {
            self.skipWaiting()
        }
        ),
        addEventListener("activate", e => {
            e.waitUntil(clients.claim())
        }
        ),
        setTimeout(async () => {
            for (let e of (console.log("service worker activated, notifying clients to revive"),
            await clients.matchAll()))
                e.postMessage({
                    $controller$swrevive: {}
                })
        }
        , 100)
    }
    )(),
    $scramjetController = o
}
)();

const SW_VERSION = "v22";
addEventListener("message", (e) => {
    if (e.data && e.data.type === "SKIP_WAITING")
        self.skipWaiting();
}
);
addEventListener("install", () => {
    self.skipWaiting();
}
);

addEventListener("activate", (e) => {
    e.waitUntil(self.clients.claim());
}
);

addEventListener("fetch", (e) => {
    try {
        if (self.$nvectrl && $nvectrl.shouldRoute(e)) {
            e.respondWith($nvectrl.route(e));
            return;
        }
    } catch (err) {}
    try {
        if (self.$scramjetController && $scramjetController.shouldRoute(e)) {
            e.respondWith($scramjetController.route(e));
        }
    } catch (err) {}
}
);
