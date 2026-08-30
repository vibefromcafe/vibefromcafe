import {
  logSafe,
  requestIdFor,
  withRequestId,
  type RequestData,
} from "./observability";

export const onRequest: PagesFunction<unknown, string, RequestData> = async (context) => {
  const requestId = context.data.requestId ?? requestIdFor(context.request);
  context.data.requestId = requestId;
  try {
    const response = await context.next();
    if (response.status >= 500) {
      logSafe({
        event: "api_request_failed",
        level: "error",
        requestId,
        method: context.request.method,
        route: context.functionPath,
        status: response.status,
        errorType: "upstream_failure",
      });
    }
    return withRequestId(response, requestId);
  } catch {
    logSafe({
      event: "api_request_failed",
      level: "error",
      requestId,
      method: context.request.method,
      route: context.functionPath,
      status: 500,
      errorType: "unhandled",
    });
    return withRequestId(Response.json({ error: "Request failed", requestId }, { status: 500 }), requestId);
  }
};
