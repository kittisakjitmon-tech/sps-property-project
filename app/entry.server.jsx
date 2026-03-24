import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";

const ABORT_DELAY = 5000;

export default function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  routerContext
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const userAgent = request.headers.get("user-agent") || "";

    // Bot จะได้ onAllReady (HTML ครบ 100%) / User ได้ onShellReady (stream เร็ว)
    const readyOption = isbot(userAgent) ? "onAllReady" : "onShellReady";

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        [readyOption]() {
          shellRendered = true;
          const body = new ReadableStream({
            start(controller) {
              const encoder = new TextEncoder();
              const writable = new WritableStream({
                write(chunk) {
                  controller.enqueue(
                    typeof chunk === "string" ? encoder.encode(chunk) : chunk
                  );
                },
                close() {
                  controller.close();
                },
              });
              // Pipe the React stream into our writable
              const nodeStream = {
                write(chunk) {
                  const writer = writable.getWriter();
                  writer.write(chunk);
                  writer.releaseLock();
                  return true;
                },
                end() {
                  const writer = writable.getWriter();
                  writer.close();
                  writer.releaseLock();
                },
                on() { return this; },
                removeListener() { return this; },
              };
              pipe(nodeStream);
            },
          });

          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(body, {
              headers: responseHeaders,
              status: responseStatusCode,
            })
          );
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        },
      }
    );

    setTimeout(abort, ABORT_DELAY);
  });
}
